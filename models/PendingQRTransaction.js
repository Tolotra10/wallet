// models/PendingQRTransaction.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PendingQRTransaction = sequelize.define('PendingQRTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transaction_number: {
    type: DataTypes.STRING(30),
    unique: true,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: { min: 0.01 }
  },
  category: {
    type: DataTypes.ENUM(
      'topup', 'withdrawal', 'transfer', 'payment', 'bill',
      'service', 'transport', 'refund', 'fee', 'bonus'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'used', 'expired'),
    defaultValue: 'pending'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'pending_qr_transactions',
  underscored: true,
  indexes: [
    { fields: ['transaction_number'] },
    { fields: ['status'] },
    { fields: ['expires_at'] }
  ]
});