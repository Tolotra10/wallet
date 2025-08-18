import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Transport = sequelize.define('Transport', {
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
  booking_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  transport_type: {
    type: DataTypes.ENUM('bus', 'train', 'metro', 'plane', 'taxi', 'rideshare'),
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  departure_city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  arrival_city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  departure_station: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  arrival_station: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  departure_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  arrival_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  seat_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  class: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  status: {
    type: DataTypes.ENUM('booked', 'confirmed', 'cancelled', 'completed'),
    defaultValue: 'booked'
  },
  ticket_data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  external_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  transaction_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'transactions',
      key: 'id'
    }
  }
}, {
  tableName: 'transports',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['booking_number'] },
    { fields: ['transport_type'] },
    { fields: ['status'] },
    { fields: ['departure_time'] }
  ]
});

// Hook pour générer le numéro de réservation
Transport.beforeCreate(async (transport) => {
  if (!transport.booking_number) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    transport.booking_number = `TRP${timestamp.slice(-6)}${random}`;
  }
});
