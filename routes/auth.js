import express from 'express'; 
import {User} from '../models/User.js'
import {Wallet} from '../models/Wallet.js'
import {generateTokenPair, verifyRefreshToken} from '../utils/jwt.js';
import {generateOTP} from '../utils/encryption.js';
import {createAndSendNotification, emailTemplates, sendEmail} from '../utils/notifications.js';
import {validateRegister, validateLogin, validate2FA } from '../middleware/validation.js';
import {Op} from 'sequelize';
import {authenticateUser} from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

                       
const router = express.Router();  


// Inscription OK 
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phone }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Un compte existe déjà avec cet email ou ce téléphone'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      first_name,
      last_name,
      email,
      phone,
      password_hash: password
    });

    // Générer un numéro de portefeuille unique
    const walletNumber = `WALLET-${uuidv4()}`;

    // Créer le portefeuille associé
    await Wallet.create({
      user_id: user.id,
      wallet_number: walletNumber
    });

    // Générer les tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email });

    // Sauvegarder le refresh token
    user.refresh_token = tokens.refreshToken;
    await user.save();

    // Envoyer email de bienvenue
    const welcomeEmail = emailTemplates.welcome(user.first_name);
    await sendEmail(user.email, welcomeEmail.subject, welcomeEmail.html);

    // Créer notification de bienvenue
    await createAndSendNotification(user.id, {
      title: 'Bienvenue sur MyWallet !',
      message: 'Votre compte a été créé avec succès. Commencez par vérifier votre identité.',
      type: 'system',
      channels: ['push']
    });

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: user.toJSON(),
      wallet_number: walletNumber,
      tokens
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

// Connexion OK
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Trouver l'utilisateur par email ou téléphone
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { phone: identifier }]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Vérifier si le compte est bloqué
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Compte bloqué. Contactez le support.' });
    }

    // Vérifier si le compte est temporairement verrouillé
    if (user.locked_until && new Date() < user.locked_until) {
      return res.status(423).json({ 
        error: 'Compte temporairement verrouillé',
        locked_until: user.locked_until
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      // Incrémenter les tentatives de connexion
      user.login_attempts += 1;
      
      // Verrouiller le compte après 5 tentatives
      if (user.login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await user.save();
      
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Réinitialiser les tentatives de connexion
    user.login_attempts = 0;
    user.locked_until = null;
    user.last_login = new Date();

    // Si 2FA activé, générer et envoyer le code
    if (user.two_factor_enabled) {
      const otpCode = generateOTP();
      user.two_factor_secret = otpCode;
      await user.save();

      // Envoyer le code par email et SMS
    console.log('Code 2FA généré pour user', user.id, ':', otpCode);

      const otpEmail = emailTemplates.otpCode(otpCode);
      await sendEmail(user.email, otpEmail.subject, otpEmail.html);

      return res.json({
        message: 'Code 2FA envoyé',
        requires_2fa: true,
        user_id: user.id
      });
    }

    // Générer les tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email, type: 'user' });
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.json({
      message: 'Connexion réussie',
      user: user.toJSON(),
      tokens
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Vérification 2FA OK
router.post('/verify-2fa', validate2FA, async (req, res) => {
  try {
    const { user_id, code } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le code 2FA
    if (user.two_factor_secret !== code) {
      return res.status(401).json({ error: 'Code 2FA incorrect' });
    }

    // Effacer le code temporaire
    user.two_factor_secret = null;
    user.last_login = new Date();

    // Générer les tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email });
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.json({
      message: 'Authentification 2FA réussie',
      user: user.toJSON(),
      tokens
    });
  } catch (error) {
    console.error('Erreur 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification 2FA' });
  }
});

// Rafraîchissement du token OK
router.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: 'Token de rafraîchissement requis' });
    }

    // Vérifier le token de rafraîchissement
    const decoded = verifyRefreshToken(refresh_token);
    
    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== refresh_token) {
      return res.status(401).json({ error: 'Token de rafraîchissement invalide' });
    }

    // Générer de nouveaux tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email });
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.json({
      message: 'Token rafraîchi avec succès',
      tokens
    });
  } catch (error) {
    console.error('Erreur rafraîchissement token:', error);
    res.status(401).json({ error: 'Token de rafraîchissement invalide' });
  }
});

// Déconnexion OK
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    // Supprimer le refresh token
    req.user.refresh_token = null;
    await req.user.save();

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});


// Activation 2FA OK
router.post('/enable-2fa', authenticateUser, async (req, res) => {
  try {
    req.user.two_factor_enabled = true;
    await req.user.save();

    await createAndSendNotification(req.user.id, {
      title: 'Authentification 2FA activée',
      message: 'L\'authentification à deux facteurs a été activée sur votre compte.',
      type: 'security',
      channels: ['push', 'email']
    });

    res.json({ message: 'Authentification 2FA activée avec succès' });
  } catch (error) {
    console.error('Erreur activation 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de l\'activation 2FA' });
  }
});

// Désactivation 2FA OK
router.post('/disable-2fa', authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;

    // Vérifier le mot de passe pour la sécurité
    const isValidPassword = await req.user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    req.user.two_factor_enabled = false;
    req.user.two_factor_secret = null;
    await req.user.save();

    // await createAndSendNotification(req.user.id, {
    //   title: 'Authentification 2FA désactivée',
    //   message: 'L\'authentification à deux facteurs a été désactivée sur votre compte.',
    //   type: 'security',
    //   channels: ['push', 'email']
    // });

    res.json({ message: 'Authentification 2FA désactivée avec succès' });
  } catch (error) {
    console.error('Erreur désactivation 2FA:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation 2FA' });
  }
});

export default router;