import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Transaction } from './Transaction.js';
import { Op } from 'sequelize';

export const Wallet = sequelize.define('Wallet', {
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
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  daily_limit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1000.00
  },
  monthly_limit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 10000.00
  },
  daily_spent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  monthly_spent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  is_frozen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  freeze_reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  wallet_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'wallets',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['wallet_number'] },
    { fields: ['is_frozen'] }
  ]
});

// Hook pour générer le numéro de portefeuille
Wallet.beforeCreate(async (wallet) => {
  if (!wallet.wallet_number) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    wallet.wallet_number = `WLT${timestamp.slice(-6)}${random}`;
  }
});

// Méthodes d'instance
Wallet.prototype.canSpend = async function(amount) {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h glissantes

  // Somme des transactions "debit" sur 24h en statut "completed" ou "processing"
  const recentWithdrawals = await Transaction.sum('amount', {
    where: {
      wallet_id: this.id,
      type: 'debit',
      status: { [Op.in]: ['completed', 'processing'] },
      createdAt: { [Op.gte]: since }
    }
  }) || 0;

  const availableBalance = parseFloat(this.balance);
  const dailyLimitLeft = parseFloat(this.daily_limit) - parseFloat(recentWithdrawals);

  if (amount > availableBalance) {
    console.log('Erreur : montant supérieur au solde disponible');
    return false;
  }

  if (amount > dailyLimitLeft) {
    console.log('Erreur : montant supérieur à la limite journalière restante');
    return false;
  }
  return true;
};

Wallet.prototype.addBalance = async function(amount, description = 'Recharge') {
  this.balance = parseFloat(this.balance) + parseFloat(amount);
  await this.save();
  return this.balance;
};

Wallet.prototype.deductBalance = async function(amount, description = 'Paiement') {
  if (!this.canSpend(amount)) {
    throw new Error('Fonds insuffisants ou limites dépassées');
  }
  
  this.balance = parseFloat(this.balance) - parseFloat(amount);
  this.daily_spent = parseFloat(this.daily_spent) + parseFloat(amount);
  this.monthly_spent = parseFloat(this.monthly_spent) + parseFloat(amount);
  await this.save();
  return this.balance;
};