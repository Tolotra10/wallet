import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import crypto from 'crypto';

export const BankCard = sequelize.define('BankCard', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  card_token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  last_four: {
    type: DataTypes.STRING(4),
    allowNull: false
  },
  brand: {
    type: DataTypes.ENUM('visa', 'mastercard', 'amex', 'discover'),
    allowNull: false
  },
  card_type: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: false
  },
  expiry_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  expiry_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: new Date().getFullYear()
    }
  },
  cardholder_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  billing_address: {
    type: DataTypes.JSON,
    allowNull: true
  },
  verification_status: {
    type: DataTypes.ENUM('pending', 'verified', 'failed'),
    defaultValue: 'pending'
  },
  last_used: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bank_cards',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['card_token'] },
    { fields: ['is_default'] },
    { fields: ['is_active'] }
  ]
});

// Hook pour générer le token de carte
BankCard.beforeCreate(async (card) => {
  if (!card.card_token) {
    card.card_token = crypto.randomBytes(32).toString('hex');
  }
});

// Méthode pour vérifier si la carte est expirée
BankCard.prototype.isExpired = function() {
  const now = new Date();
  const expiry = new Date(this.expiry_year, this.expiry_month - 1);
  return now > expiry;
};
