import { sequelize } from '../config/database.js';
import {User} from './User.js';
import {Wallet} from './Wallet.js';
import {Transaction} from './Transaction.js';
import {BankCard} from './BankCard.js';
import {Bill} from './Bill.js';
import {BillProvider} from './BillProvider.js';
import {QRCode} from './QRCode.js';
import {Service} from './Service.js';
import {Transport} from './Transport.js';
import {Notification} from './Notification.js';
import {Merchant} from './Merchant.js';
import {AdminUser} from './AdminUser.js';
import {AuditLog} from './AuditLog.js';

// Définition des associations
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(BankCard, { foreignKey: 'user_id', as: 'bankCards' });
BankCard.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Wallet.hasMany(Transaction, { foreignKey: 'wallet_id', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

User.hasMany(Bill, { foreignKey: 'user_id', as: 'bills' });
Bill.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Bill.belongsTo(BillProvider, { foreignKey: 'provider_id', as: 'provider' });
BillProvider.hasMany(Bill, { foreignKey: 'provider_id', as: 'bills' });

User.hasMany(QRCode, { foreignKey: 'user_id', as: 'qrCodes' });
QRCode.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Merchant.hasMany(QRCode, { foreignKey: 'merchant_id', as: 'qrCodes' });
QRCode.belongsTo(Merchant, { foreignKey: 'merchant_id', as: 'merchant' });

User.hasMany(Transport, { foreignKey: 'user_id', as: 'transports' });
Transport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  sequelize,
  User,
  Wallet,
  Transaction,
  BankCard,
  Bill,
  BillProvider,
  QRCode,
  Service,
  Transport,
  Notification,
  Merchant,
  AdminUser,
  AuditLog
};