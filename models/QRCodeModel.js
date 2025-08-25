import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const QRCodeModel = sequelize.define('QRCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  merchant_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'merchants',
      key: 'id'
    }
  },
  qr_data: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  qr_image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('static', 'dynamic', 'merchant'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  max_usage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'qr_codes',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['merchant_id'] },
    { fields: ['qr_code'] },
    { fields: ['type'] },
    { fields: ['is_active'] }
  ]
});

// Méthode pour vérifier si le QR code est valide
QRCodeModel.prototype.isValid = function() {
  if (!this.is_active) return false;
  if (this.expires_at && new Date() > this.expires_at) return false;
  if (this.max_usage && this.usage_count >= this.max_usage) return false;
  return true;
};
