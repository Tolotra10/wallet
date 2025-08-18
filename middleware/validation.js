import { body, param, query, validationResult } from 'express-validator';
import { User} from '../models/User.js';
import bcrypt from 'bcryptjs';

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Données invalides',
      details: errors.array()
    });
  }
  next();
};

// Validations pour l'authentification
const validateRegister = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('phone')
  .matches(/^0\d{8,9}$/) // Commence par 0, suivi de 8 ou 9 chiffres
  .withMessage('Numéro de téléphone invalide'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial'),
  handleValidationErrors
];

const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email ou téléphone requis'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis'),
  handleValidationErrors
];

const validate2FA = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Code 2FA invalide'),
  handleValidationErrors
];

// Validations pour les transactions
const validateTransaction = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Montant invalide'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description requise'),
  body('recipient_id')
    .optional()
    .isUUID()
    .withMessage('ID destinataire invalide'),
  handleValidationErrors
];

// Validations pour les cartes bancaires
const validateBankCard = [
  body('card_number')
    .isCreditCard()
    .withMessage('Numéro de carte invalide'),
  body('expiry_month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Mois d\'expiration invalide'),
  body('expiry_year')
    .isInt({ min: new Date().getFullYear() })
    .withMessage('Année d\'expiration invalide'),
  body('cvv')
    .isLength({ min: 3, max: 4 })
    .isNumeric()
    .withMessage('CVV invalide'),
  body('cardholder_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nom du titulaire invalide'),
  handleValidationErrors
];

// Validations pour les factures
const validateBillPayment = [
  body('provider_id')
    .isUUID()
    .withMessage('ID fournisseur invalide'),
  body('account_number')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Numéro de compte requis'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Montant invalide'),
  handleValidationErrors
];

// Validations pour les QR codes
const validateQRGeneration = [
  body('type')
    .isIn(['static', 'dynamic', 'merchant'])
    .withMessage('Type de QR code invalide'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Montant invalide'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description trop longue'),
  handleValidationErrors
];

// Validations pour les réservations de transport
const validateTransportBooking = [
  body('transport_type')
    .isIn(['bus', 'train', 'metro', 'plane', 'taxi', 'rideshare'])
    .withMessage('Type de transport invalide'),
  body('departure_city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ville de départ invalide'),
  body('arrival_city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ville d\'arrivée invalide'),
  body('departure_time')
    .isISO8601()
    .withMessage('Date de départ invalide'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Prix invalide'),
  handleValidationErrors
];

// Validations pour les paramètres UUID
const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('ID invalide'),
  handleValidationErrors
];

// Validations pour la pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide'),
  handleValidationErrors
];

// async function validatePassword(req, res, next) {
//   try {
//     const { password } = req.body;
//     if (!password) {
//       return res.status(400).json({ error: 'Mot de passe requis pour confirmation' });
//     }

//     const user = await User.findByPk(req.user.id, {
//       attributes: { include: ['password_hash'] }
//     });

//     if (!user) {
//       return res.status(404).json({ error: 'Utilisateur non trouvé' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password_hash);

//     if (!isMatch) {
//       return res.status(401).json({ error: 'Mot de passe incorrect' });
//     }

//     next();
//   } catch (error) {
//     console.error('Erreur validatePassword:', error);
//     res.status(500).json({ error: 'Erreur de validation du mot de passe' });
//   }
// }



export {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validate2FA,
  validateTransaction,
  validateBankCard,
  validateBillPayment,
  validateQRGeneration,
  validateTransportBooking,
  validateUUID,
  validatePagination,
  // validatePassword
};