import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

function generateTransactionNumber() {
  return 'TX-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

export const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  wallet_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'wallets', key: 'id' }
  },
  transaction_number: {
    type: DataTypes.STRING(30),
    unique: true,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'topup', 'withdrawal', 'transfer', 'payment', 'bill',
      'service', 'transport', 'refund', 'fee', 'bonus'
    ),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: { min: 0.01 }
  },
  fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  phone: {
    type: DataTypes.STRING, // ajouté
  },
  provider: {
    type: DataTypes.STRING, // ajouté
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  reference: DataTypes.STRING(100),
  external_reference: DataTypes.STRING(100),

  recipient_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  recipient_info: {
    type: DataTypes.JSON,
    allowNull: true
  },
  payment_method: {
    type: DataTypes.ENUM('wallet', 'bank_card', 'bank_transfer', 'qr_code', 'mobile_money'),
    allowNull: true
  },
  metadata: DataTypes.JSON,
  processed_at: DataTypes.DATE,
  failed_reason: DataTypes.STRING(255),
  ip_address: DataTypes.STRING(45),
  user_agent: DataTypes.TEXT,
  location: DataTypes.JSON
}, {
  tableName: 'transactions',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['wallet_id'] },
    { fields: ['transaction_number'] },
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['provider'] }, // index pour requêtes rapides sur provider
    { fields: ['provider_transaction_id'] }, // recherche par id Orange
    { fields: ['created_at'] },
    { fields: ['recipient_id'] }
  ],
  hooks: {
    beforeValidate: (transaction) => {
      if (!transaction.transaction_number) {
        transaction.transaction_number = generateTransactionNumber();
      }
    }
  }
});

Transaction.beforeCreate(async (transaction) => {
  if (!transaction.transaction_number) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    transaction.transaction_number = `TXN${timestamp.slice(-8)}${random}`;
  }
});

// Méthodes d'instance
Transaction.prototype.markAsCompleted = async function() {
  this.status = 'completed';
  this.processed_at = new Date();
  await this.save();
};

Transaction.prototype.markAsFailed = async function(reason) {
  this.status = 'failed';
  this.failed_reason = reason;
  this.processed_at = new Date();
  await this.save();
};

