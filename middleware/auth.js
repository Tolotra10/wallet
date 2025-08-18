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

export const authorizeRoles = (...roles) => {
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

export {
  authenticateUser,
  authenticateAdmin,
  requirePermission,
  requireKYC,
  requireActiveWallet
};