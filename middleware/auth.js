import jwt from 'jsonwebtoken'
import { User } from '../models/User.js';
import { AdminUser } from '../models/AdminUser.js';

// Middleware d'authentification pour les utilisateurs
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.is_active || user.is_blocked) {
      return res.status(401).json({ error: 'Utilisateur non autorisé' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// Middleware d'authentification pour les administrateurs
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await AdminUser.findByPk(decoded.id);
    if (!admin) return res.status(401).json({ error: 'Admin introuvable' });

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
};

// Middleware de vérification des permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Authentification administrateur requise' });
    }

    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Permission insuffisante' });
    }

    next();
  };
};

// Middleware de vérification KYC
const requireKYC = (req, res, next) => {
  if (req.user.kyc_status !== 'verified') {
    return res.status(403).json({ 
      error: 'Vérification KYC requise',
      kyc_status: req.user.kyc_status
    });
  }
  next();
};

// Middleware de vérification du portefeuille non gelé
const requireActiveWallet = async (req, res, next) => {
  try {
    const wallet = await req.user.getWallet();
    if (!wallet || wallet.is_frozen) {
      return res.status(403).json({ 
        error: 'Portefeuille gelé ou inexistant',
        reason: wallet?.freeze_reason
      });
    }
    req.wallet = wallet;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification du portefeuille' });
  }
};

// middlewares/auth.js
const authenticateUserOrAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: "Token manquant" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.type) {
      return res.status(401).json({ error: "Type d'utilisateur non spécifié dans le token" });
    }

    let user;
    let isAdmin = false;

    // Vérifier le type d'utilisateur à partir du token
    if (decoded.type === 'admin') {
      user = await AdminUser.findOne({
        where: { id: decoded.id },
        attributes: { exclude: ['password'] }
      });
      isAdmin = true;
    } else {
      user = await User.findOne({
        where: { id: decoded.id },
        attributes: { exclude: ['password'] }
      });
    }

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non trouvé" });
    }

    // Vérifier si l'utilisateur est actif
    if (user.status === 'inactive') {
      return res.status(401).json({ error: "Compte utilisateur inactif" });
    }

    // Ajouter les informations de l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status
    };
    req.isAdmin = isAdmin;

    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Token invalide" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expiré" });
    }
    return res.status(500).json({ error: "Erreur lors de l'authentification" });
  }
};

export {
  authenticateUser,
  authenticateAdmin,
  requirePermission,
  requireKYC,
  requireActiveWallet,
  authenticateUserOrAdmin,
  authorizeRoles
};