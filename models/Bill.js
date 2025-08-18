import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Bill = sequelize.define('Bill', {
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
  provider_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bill_providers',
      key: 'id'
    }
  },
  bill_number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  account_number: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  transaction_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'transactions',
      key: 'id'
    }
  },
  external_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  auto_pay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminder_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'bills',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['provider_id'] },
    { fields: ['bill_number'] },
    { fields: ['status'] },
    { fields: ['due_date'] }
  ]
});

// Hook pour générer le numéro de facture
Bill.beforeCreate(async (bill) => {
  if (!bill.bill_number) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    bill.bill_number = `BILL${timestamp.slice(-6)}${random}`;
  }
});
