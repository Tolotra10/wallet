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
import {PendingQRTransaction} from './PendingQRTransaction.js';

// Définition des associations

User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(BankCard, { foreignKey: 'user_id', as: 'bankCards' });
BankCard.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Bill, { foreignKey: 'user_id', as: 'bills' });
Bill.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(QRCode, { foreignKey: 'user_id', as: 'qrCodes' });
QRCode.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transport, { foreignKey: 'user_id', as: 'transports' });
Transport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// AdminUser Associations
AdminUser.hasOne(Wallet, { foreignKey: 'admin_id', as: 'wallet' });
Wallet.belongsTo(AdminUser, { foreignKey: 'admin_id', as: 'admin' });

AdminUser.hasMany(Transaction, { foreignKey: 'admin_id', as: 'transactions' });
Transaction.belongsTo(AdminUser, { foreignKey: 'admin_id', as: 'admin' });

AdminUser.hasMany(Notification, { foreignKey: 'admin_id', as: 'notifications' });
Notification.belongsTo(AdminUser, { foreignKey: 'admin_id', as: 'admin' });

// Wallet Associations
Wallet.hasMany(Transaction, { foreignKey: 'wallet_id', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

// Bill Associations
Bill.belongsTo(BillProvider, { foreignKey: 'provider_id', as: 'provider' });
BillProvider.hasMany(Bill, { foreignKey: 'provider_id', as: 'bills' });

// Merchant Associations
Merchant.hasMany(QRCode, { foreignKey: 'merchant_id', as: 'qrCodes' });
QRCode.belongsTo(Merchant, { foreignKey: 'merchant_id', as: 'merchant' });

// PendingQRTransaction Associations
Transaction.belongsTo(PendingQRTransaction, { foreignKey: 'qr_code_id', as: 'pendingQRTransaction' });
PendingQRTransaction.hasMany(Transaction, { foreignKey: 'qr_code_id', as: 'transactions' });

// Transaction Associations supplémentaires
Transaction.belongsTo(PendingQRTransaction, { foreignKey: 'pending_qr_transaction_id', as: 'pendingQrTransaction' });
PendingQRTransaction.hasOne(Transaction, { foreignKey: 'pending_qr_transaction_id', as: 'transaction' });

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
  AuditLog,
  PendingQRTransaction  
};