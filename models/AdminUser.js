import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const AdminUser = sequelize.define('AdminUser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'moderator', 'support'),
    defaultValue: 'admin'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  two_factor_secret: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'admin_users',
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['is_active'] }
  ]
});

// Hooks pour le hachage du mot de passe
AdminUser.beforeCreate(async (admin) => {
  if (admin.password_hash) {
    admin.password_hash = await bcrypt.hash(admin.password_hash, 12);
  }
});

AdminUser.beforeUpdate(async (admin) => {
  if (admin.changed('password_hash')) {
    admin.password_hash = await bcrypt.hash(admin.password_hash, 12);
  }
});

// Méthodes d'instance
AdminUser.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

AdminUser.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password_hash;
  delete values.two_factor_secret;
  return values;
};
