import express from 'express';           
import { User, Wallet } from '../models/index.js';
import {authenticateUser} from '../middleware/auth.js';

const router = express.Router();

// Récupération du profil utilisateur OK
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Wallet,
        as: 'wallet',
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// Mise à jour du profil OK
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { first_name, last_name, phone, preferences } = req.body;

    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    await req.user.update(updateData);

    res.json({
      message: 'Profil mis à jour avec succès',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

// Changement de mot de passe OK
router.put('/change-password', authenticateUser, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Vérifier le mot de passe actuel
    const isValidPassword = await req.user.validatePassword(current_password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Mettre à jour le mot de passe
    req.user.password_hash = new_password;
    await req.user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

// Définir un PIN OK
router.post('/set-pin', authenticateUser, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN invalide (4-6 chiffres requis)' });
    }

    await req.user.setPin(pin);

    res.json({ message: 'PIN défini avec succès' });
  } catch (error) {
    console.error('Erreur définition PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la définition du PIN' });
  }
});

// Vérifier un PIN OK
router.post('/verify-pin', authenticateUser, async (req, res) => {
  try {
    const { pin } = req.body;

    const isValidPin = await req.user.validatePin(pin);
    if (!isValidPin) {
      return res.status(401).json({ error: 'PIN incorrect' });
    }

    res.json({ message: 'PIN vérifié avec succès' });
  } catch (error) {
    console.error('Erreur vérification PIN:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du PIN' });
  }
});

// Activation biométrique OK
router.post('/enable-biometric', authenticateUser, async (req, res) => {
  try {
    const { biometric_data } = req.body;

    req.user.biometric_enabled = true;
    req.user.biometric_data = biometric_data; // Données chiffrées côté client
    await req.user.save();

    res.json({ message: 'Authentification biométrique activée avec succès' });
  } catch (error) {
    console.error('Erreur activation biométrique:', error);
    res.status(500).json({ error: 'Erreur lors de l\'activation biométrique' });
  }
});

// Désactivation biométrique OK
router.post('/disable-biometric', authenticateUser, async (req, res) => {
  try {
    req.user.biometric_enabled = false;
    req.user.biometric_data = null;
    await req.user.save();

    res.json({ message: 'Authentification biométrique désactivée avec succès' });
  } catch (error) {
    console.error('Erreur désactivation biométrique:', error);
    res.status(500).json({ error: 'Erreur lors de la désactivation biométrique' });
  }
});

// Enregistrer token d'appareil pour les notifications push OK
router.post('/device-token', authenticateUser, async (req, res) => {
  try {
    const { device_token, platform } = req.body;

    // Récupération et normalisation des device_tokens
    let deviceTokens = [];

    if (Array.isArray(req.user.device_tokens)) {
      // Cas normal : déjà un tableau
      deviceTokens = req.user.device_tokens;
    } else if (typeof req.user.device_tokens === 'string') {
      // Cas JSON string en base
      try {
        deviceTokens = JSON.parse(req.user.device_tokens) || [];
      } catch (err) {
        console.warn("Impossible de parser device_tokens JSON :", err);
        deviceTokens = [];
      }
    } else if (req.user.device_tokens) {
      // Cas objet unique → on le transforme en tableau
      deviceTokens = [req.user.device_tokens];
    }

    // Éviter les doublons
    if (!deviceTokens.some(token => token.token === device_token)) {
      deviceTokens.push({
        token: device_token,
        platform,
        registered_at: new Date()
      });
    }

    // Sauvegarde dans l'utilisateur
    // Si ta colonne est de type JSON en base, tu peux garder un tableau
    // Sinon, on stringify
    if (Array.isArray(req.user.device_tokens) || req.user.device_tokens === null) {
      req.user.device_tokens = deviceTokens;
    } else {
      req.user.device_tokens = JSON.stringify(deviceTokens);
    }

    await req.user.save();

    res.json({ message: 'Token d\'appareil enregistré avec succès' });

  } catch (error) {
    console.error('Erreur enregistrement token:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du token' });
  }
});

// Supprimer token d'appareil OK
router.delete('/device-token', authenticateUser, async (req, res) => {
  try {
    const { device_token } = req.body;

    // S'assurer que device_tokens est un tableau
    if (!Array.isArray(req.user.device_tokens)) {
      req.user.device_tokens = [];
    }

    req.user.device_tokens = req.user.device_tokens.filter(token => token !== device_token);
    await req.user.save();

    res.json({ message: 'Token d\'appareil supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression token:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du token' });
  }
});

// Suppression de compte OK
router.delete('/account', authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;

    // Vérifier le mot de passe pour la sécurité
    const isValidPassword = await req.user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Vérifier que le solde est à zéro
    const wallet = await req.user.getWallet();
    if (wallet && parseFloat(wallet.balance) > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer le compte avec un solde positif',
        balance: wallet.balance
      });
    }

    // Marquer comme inactif au lieu de supprimer
    req.user.is_active = false;
    req.user.email = `deleted_${Date.now()}_${req.user.email}`;
    req.user.phone = `deleted_${Date.now()}_${req.user.phone}`;
    await req.user.save();

    res.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
  }
});

export default router;