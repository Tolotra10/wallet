import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Service = sequelize.define('Service', {
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
      'food', 'shopping', 'travel', 'entertainment', 
      'health', 'education', 'finance', 'other'
    ),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  website_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  api_endpoint: {
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
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  cashback_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  terms_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  supported_countries: {
    type: DataTypes.JSON,
    defaultValue: ['FR']
  }
}, {
  tableName: 'services',
  indexes: [
    { fields: ['category'] },
    { fields: ['is_active'] },
    { fields: ['is_featured'] }
  ]
});
