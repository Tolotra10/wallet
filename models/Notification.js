import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Notification = sequelize.define('Notification', {
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'transaction', 'security', 'promotion', 'system', 
      'bill', 'transport', 'service', 'kyc'
    ),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  channels: {
    type: DataTypes.JSON,
    defaultValue: ['push']
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  action_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['is_read'] },
    { fields: ['is_sent'] },
    { fields: ['priority'] }
  ]
});