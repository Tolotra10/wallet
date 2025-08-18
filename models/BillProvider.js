import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const BillProvider = sequelize.define('BillProvider', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'electricity', 'water', 'gas', 'internet', 'mobile', 
      'insurance', 'credit_card', 'loan', 'subscription', 'other'
    ),
    allowNull: false
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  api_endpoint: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  api_key: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  api_config: {
    type: DataTypes.JSON,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fee_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  fee_fixed: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  min_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1.00
  },
  max_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 10000.00
  },
  processing_time: {
    type: DataTypes.STRING(50),
    defaultValue: 'Instantané'
  },
  supported_countries: {
    type: DataTypes.JSON,
    defaultValue: ['FR']
  }
}, {
  tableName: 'bill_providers',
  indexes: [
    { fields: ['category'] },
    { fields: ['is_active'] }
  ]
});
