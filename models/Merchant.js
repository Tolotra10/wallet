import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Merchant = sequelize.define('Merchant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  merchant_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  business_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  business_type: {
    type: DataTypes.ENUM(
      'restaurant', 'retail', 'service', 'online', 
      'healthcare', 'education', 'other'
    ),
    allowNull: false
  },
  contact_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  address: {
    type: DataTypes.JSON,
    allowNull: false
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
    defaultValue: 'pending'
  },
  kyc_status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  kyc_documents: {
    type: DataTypes.JSON,
    allowNull: true
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 2.50
  },
  settlement_frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    defaultValue: 'weekly'
  },
  bank_details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  api_key: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  webhook_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  monthly_volume: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  total_transactions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'merchants',
  indexes: [
    { fields: ['merchant_id'] },
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['kyc_status'] }
  ]
});

// Hook pour générer l'ID marchand
Merchant.beforeCreate(async (merchant) => {
  if (!merchant.merchant_id) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    merchant.merchant_id = `MER${timestamp.slice(-6)}${random}`;
  }
});
