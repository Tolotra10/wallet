import express from 'express';
import { Wallet, User, sequelize } from '../models/index.js';
import { BankCard } from '../models/BankCard.js';
import { Transaction } from '../models/Transaction.js';
import { authenticateUser, requireKYC, requireActiveWallet } from '../middleware/auth.js';
import { validateBankCard, validateTransaction } from '../middleware/validation.js';
import { createAndSendNotification, emailTemplates, sendEmail } from '../utils/notifications.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import crypto from 'crypto';
import { authenticateAdmin } from '../middleware/auth.js';
import { isValidIBAN } from 'ibantools';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { depositFromMvola, withdrawToMvola, payWithWallet } from '../controllers/mvola.controller.js';


const router = express.Router();

// Récupérer les informations du portefeuille OK
router.get('/', authenticateUser, async (req, res) => {
  try {
    // Récupérer le wallet avec l'utilisateur et ses cartes
    const wallet = await Wallet.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: User,
        as: 'user',
        include: [{
          model: BankCard,
          as: 'bankCards',
          where: { is_active: true },
          required: false
        }]
      }]
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Portefeuille non trouvé' });
    }

    res.json({
      wallet: wallet.toJSON()
    });
  } catch (error) {
    console.error('Erreur récupération portefeuille:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du portefeuille' });
  }
});

// Ajouter uniquement une carte VISA
router.post('/cards', authenticateUser, requireKYC, validateBankCard, async (req, res) => {
  try {
    const { card_number, expiry_month, expiry_year, cvv, cardholder_name, billing_address } = req.body;

    // ✅ Vérifier si la carte est une VISA
    if (!card_number.startsWith('4')) {
      return res.status(400).json({ error: "Seules les cartes VISA sont acceptées." });
    }

    // 🔐 Tokenisation (à remplacer par un service PCI-DSS réel)
    const cardToken = encrypt(card_number);

    // Vérification via Visa API (sandbox)
    const visaResponse = await visaApi.cardValidation({
      cardNumber: card_number,
      expiryMonth: expiry_month,
      expiryYear: expiry_year,
      cvv
    });

    if (!visaResponse.valid) {
      return res.status(400).json({ error: "Carte VISA invalide." });
    }

    // Vérifier si c’est la première carte active
    const existingCards = await BankCard.count({ where: { user_id: req.user.id, is_active: true } });
    const isDefault = existingCards === 0;

    // Sauvegarde en BDD
    const bankCard = await BankCard.create({
      user_id: req.user.id,
      card_token: cardToken.encrypted,
      last_four: card_number.slice(-4),
      brand: 'visa',
      card_type: 'debit', // ou récupéré via l’API Visa BIN lookup
      expiry_month,
      expiry_year,
      cardholder_name,
      is_default: isDefault,
      billing_address,
      verification_status: 'verified'
    });

    await createAndSendNotification(req.user.id, {
      title: 'Nouvelle carte VISA ajoutée',
      message: `Carte VISA se terminant par ${card_number.slice(-4)} ajoutée avec succès.`,
      type: 'security',
      channels: ['push', 'email']
    });

    res.status(201).json({
      message: 'Carte VISA ajoutée avec succès',
      card: bankCard.toJSON()
    });
  } catch (error) {
    console.error('Erreur ajout carte VISA:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la carte' });
  }
});

// Lister les cartes bancaires OK
router.get('/cards', authenticateUser, async (req, res) => {
  try {
    const cards = await BankCard.findAll({
      where: { user_id: req.user.id, is_active: true },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      cards: cards.map(card => card.toJSON())
    });
  } catch (error) {
    console.error('Erreur récupération cartes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des cartes' });
  }
});

// Mettre à jour le statut KYC d'un utilisateur (admin)
router.patch('/kyc/status', authenticateAdmin, async (req, res) => {
  try {
    const { userId, status, reason } = req.body;

    // Validation des données
    if (!userId || !status) {
      return res.status(400).json({ error: 'userId et status sont requis' });
    }

    // Vérifier que le status est valide
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status KYC invalide' });
    }

    // Trouver l'utilisateur
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Mettre à jour le status KYC
    user.kyc_status = status;
    if (reason) {
      user.kyc_rejection_reason = reason;
    }

    // Si approuvé, mettre à jour la date de validation
    if (status === 'APPROVED') {
      user.kyc_validated_at = new Date();
    }

    await user.save();

    // Envoyer une notification à l'utilisateur
    const notificationTitle = status === 'APPROVED' ?
      'Vérification KYC approuvée' :
      'Mise à jour du statut KYC';

    const notificationBody = status === 'REJECTED' ?
      `Votre vérification KYC a été rejetée. Raison: ${reason}` :
      `Votre statut KYC a été mis à jour en: ${status}`;

    await sendNotification(user.device_tokens, {
      title: notificationTitle,
      body: notificationBody
    });

    res.json({
      message: 'Statut KYC mis à jour avec succès',
      user: {
        id: user.id,
        kyc_status: user.kyc_status,
        kyc_validated_at: user.kyc_validated_at,
        kyc_rejection_reason: user.kyc_rejection_reason
      }
    });

  } catch (error) {
    console.error('Erreur mise à jour KYC:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut KYC' });
  }
});

// Définir une carte par défaut OK
router.put('/cards/:cardId/default', authenticateUser, async (req, res) => {
  try {
    const { cardId } = req.params;

    // Retirer le statut par défaut de toutes les cartes
    await BankCard.update(
      { is_default: false },
      { where: { user_id: req.user.id } }
    );

    // Définir la nouvelle carte par défaut
    const [updatedRows] = await BankCard.update(
      { is_default: true },
      { where: { id: cardId, user_id: req.user.id, is_active: true } }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }

    res.json({ message: 'Carte définie par défaut avec succès' });
  } catch (error) {
    console.error('Erreur définition carte par défaut:', error);
    res.status(500).json({ error: 'Erreur lors de la définition de la carte par défaut' });
  }
});

// Supprimer une carte bancaire OK
router.delete('/cards/:cardId', authenticateUser, async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await BankCard.findOne({
      where: { id: cardId, user_id: req.user.id, is_active: true }
    });

    if (!card) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }

    // Marquer comme inactive au lieu de supprimer
    card.is_active = false;
    await card.save();

    // Si c'était la carte par défaut, définir une autre carte par défaut
    if (card.is_default) {
      const nextCard = await BankCard.findOne({
        where: { user_id: req.user.id, is_active: true },
        order: [['created_at', 'DESC']]
      });

      if (nextCard) {
        nextCard.is_default = true;
        await nextCard.save();
      }
    }

    res.json({ message: 'Carte supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression carte:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la carte' });
  }
});

// Recharger le portefeuille OK
router.post('/topup', authenticateUser, requireKYC, requireActiveWallet, validateTransaction, async (req, res) => {
  try {
    const { amount, card_id, description = 'Recharge portefeuille' } = req.body;

    // Vérifier la carte bancaire
    const card = await BankCard.findOne({
      where: { id: card_id, user_id: req.user.id, is_active: true }
    });

    if (!card) {
      return res.status(404).json({ error: 'Carte bancaire non trouvée' });
    }

    // Simuler le paiement par carte (en production, intégrer avec un processeur de paiement)
    const paymentSuccess = Math.random() > 0.1; // 90% de succès

    if (!paymentSuccess) {
      return res.status(400).json({ error: 'Échec du paiement par carte bancaire' });
    }

    // Générer un numéro unique pour la transaction
    const transactionNumber = crypto.randomBytes(8).toString('hex');

    // Créer la transaction
    const transaction = await Transaction.create({
      user_id: req.user.id,
      wallet_id: req.wallet.id,
      type: 'credit',
      category: 'topup',
      amount,
      description,
      status: 'completed',
      payment_method: 'bank_card',
      transaction_number: transactionNumber,
      metadata: {
        card_id: card.id,
        card_last_four: card.last_four
      },
      processed_at: new Date()
    });

    // Mettre à jour le solde du portefeuille
    await req.wallet.addBalance(amount, description);

    // Mettre à jour la dernière utilisation de la carte
    card.last_used = new Date();
    await card.save();

    // Envoyer notification et email
    await createAndSendNotification(req.user.id, {
      title: 'Recharge effectuée',
      message: `Votre portefeuille a été rechargé de ${amount}€.`,
      type: 'transaction',
      channels: ['push', 'email']
    });

    const transactionEmail = emailTemplates.transactionAlert(amount, 'credit', description);
    await sendEmail(req.user.email, transactionEmail.subject, transactionEmail.html);

    res.status(201).json({
      message: 'Recharge effectuée avec succès',
      transaction: transaction.toJSON(),
      new_balance: req.wallet.balance
    });
  } catch (error) {
    console.error('Erreur recharge:', error);
    res.status(500).json({ error: 'Erreur lors de la recharge' });
  }
});

// Vérification BIC

// Validation BIC
function isValidBIC(bic) {
  // Format : 8 ou 11 caractères, respectant le standard ISO 9362
  const bicPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return bicPattern.test(bic.toUpperCase());
}
// Génération numéro unique de transaction
function generateTransactionNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TX-${timestamp}-${random}`;
}

// Retrait vers compte bancaire avec validation IBAN et BIC OK
// router.post('/withdraw', authenticateUser, requireKYC, requireActiveWallet, validateTransaction,
//   async (req, res) => {
//     try {
//       const { amount, bank_account, description = 'Retrait vers compte bancaire' } = req.body;

//       // Vérification IBAN
//       if (!bank_account || !bank_account.iban || !isValidIBAN(bank_account.iban)) {
//         return res.status(400).json({ error: 'IBAN invalide' });
//       }

//       // Vérification BIC
//       if (!bank_account.bic || !isValidBIC(bank_account.bic)) {
//         return res.status(400).json({ error: 'BIC invalide' });
//       }

//       // Vérifier le solde disponible
//       if (!req.wallet.canSpend(amount)) {
//         return res.status(400).json({ error: 'Solde insuffisant ou limites dépassées' });
//       }

//       // Créer la transaction
//       const transaction = await Transaction.create({
//         transaction_number: generateTransactionNumber(),
//         user_id: req.user.id,
//         wallet_id: req.wallet.id,
//         type: 'debit',
//         category: 'withdrawal',
//         amount,
//         description,
//         status: 'processing',
//         payment_method: 'bank_transfer',
//         metadata: {
//           bank_account
//         }
//       });

//       // Déduire le montant du portefeuille
//       await req.wallet.deductBalance(amount, description);

//       // Simuler traitement bancaire (95% de succès)
//       setTimeout(async () => {
//         try {
//           const success = Math.random() > 0.05;

//           if (success) {
//             transaction.status = 'completed';
//             transaction.processed_at = new Date();
//             await transaction.save();

//             await createAndSendNotification(req.user.id, {
//               title: 'Retrait effectué',
//               message: `Retrait de ${amount}€ effectué vers votre compte bancaire.`,
//               type: 'transaction',
//               channels: ['push', 'email']
//             });
//           } else {
//             transaction.status = 'failed';
//             transaction.failed_reason = 'Échec du virement bancaire';
//             transaction.processed_at = new Date();
//             await transaction.save();

//             await req.wallet.addBalance(amount, 'Remboursement retrait échoué');

//             await createAndSendNotification(req.user.id, {
//               title: 'Retrait échoué',
//               message: `Le retrait de ${amount}€ a échoué. Le montant a été remboursé.`,
//               type: 'transaction',
//               channels: ['push', 'email']
//             });
//           }
//         } catch (error) {
//           console.error('Erreur traitement retrait:', error);
//         }
//       }, 5000);

//       // Réponse immédiate
//       res.status(201).json({
//         message: 'Demande de retrait en cours de traitement',
//         transaction: transaction.toJSON(),
//         new_balance: req.wallet.balance
//       });
//     } catch (error) {
//       console.error('Erreur retrait:', error);
//       res.status(500).json({ error: 'Erreur lors du retrait' });
//     }
//   }
// );

// Envoyer de l'argent du wallet vers une carte VISA
router.post('/wallet-to-card', authenticateUser, requireKYC, async (req, res) => {
  try {
    const { card_id, amount, currency } = req.body;

    const card = await BankCard.findOne({ where: { id: card_id, user_id: req.user.id } });
    if (!card || card.brand !== 'visa') {
      return res.status(400).json({ error: "Carte VISA introuvable ou invalide." });
    }

    // Débit du wallet interne
    const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Solde insuffisant dans le wallet." });
    }
    wallet.balance -= amount;
    await wallet.save();

    // Appel Visa Direct API (Push Funds)
    const visaResponse = await visaApi.pushFunds({
      recipientCard: card.card_token,
      amount,
      currency
    });

    res.status(200).json({
      message: "Transfert wallet → carte VISA effectué",
      transactionId: visaResponse.transactionId
    });
  } catch (error) {
    console.error("Erreur wallet-to-card:", error);
    res.status(500).json({ error: "Impossible d'envoyer les fonds." });
  }
});

// Charger le wallet depuis une carte VISA
router.post('/card-to-wallet', authenticateUser, requireKYC, async (req, res) => {
  try {
    const { card_id, amount, currency } = req.body;

    const card = await BankCard.findOne({ where: { id: card_id, user_id: req.user.id } });
    if (!card || card.brand !== 'visa') {
      return res.status(400).json({ error: "Carte VISA introuvable ou invalide." });
    }

    // Appel Visa Direct API (Pull Funds)
    const visaResponse = await visaApi.pullFunds({
      sourceCard: card.card_token,
      amount,
      currency
    });

    // Crédit du wallet interne
    const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    wallet.balance += amount;
    await wallet.save();

    res.status(200).json({
      message: "Transfert carte VISA → wallet effectué",
      transactionId: visaResponse.transactionId
    });
  } catch (error) {
    console.error("Erreur card-to-wallet:", error);
    res.status(500).json({ error: "Impossible de charger le wallet." });
  }
});

// Envoyer de l'argent (P2P) OK
router.post('/send', authenticateUser, requireKYC, requireActiveWallet, validateTransaction, async (req, res) => {
  try {
    const { amount, recipient_identifier, description = 'Envoi d\'argent', password } = req.body;

    // Vérifier que le mot de passe est fourni
    if (!password) {
      return res.status(400).json({ error: 'Le mot de passe est requis pour effectuer un transfert' });
    }

    // Récupérer l'utilisateur avec son mot de passe
    const sender = await User.findByPk(req.user.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'password_hash']
    });

    if (!sender || !sender.password_hash) {
      return res.status(401).json({ error: 'Impossible de vérifier le mot de passe' });
    }

    // Vérifier le mot de passe de l'utilisateur
    const isPasswordValid = await bcrypt.compare(password, sender.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Trouver le destinataire
    const recipient = await User.findOne({
      where: {
        [Op.or]: [
          { email: recipient_identifier },
          { phone: recipient_identifier }
        ],
        is_active: true
      },
      include: [{ model: Wallet, as: 'wallet' }]
    });

    if (!recipient || !recipient.wallet) {
      return res.status(404).json({ error: 'Destinataire non trouvé' });
    }

    if (recipient.id === req.user.id) {
      return res.status(400).json({ error: 'Impossible d\'envoyer de l\'argent à soi-même' });
    }

    // Vérifier que l'expéditeur peut dépenser ce montant
    if (!req.wallet.canSpend(amount)) {
      return res.status(400).json({ error: 'Solde insuffisant ou limites dépassées' });
    }

    // Créer les transactions (débit pour l'expéditeur, crédit pour le destinataire)
    const senderTransaction = await Transaction.create({
      user_id: req.user.id,
      wallet_id: req.wallet.id,
      type: 'debit',
      category: 'transfer',
      amount,
      description,
      status: 'completed',
      recipient_id: recipient.id,
      recipient_info: {
        name: `${recipient.first_name} ${recipient.last_name}`,
        email: recipient.email
      },
      processed_at: new Date()
    });

    const recipientTransaction = await Transaction.create({
      user_id: recipient.id,
      wallet_id: recipient.wallet.id,
      type: 'credit',
      category: 'transfer',
      amount,
      description: `Reçu de ${sender.first_name} ${sender.last_name}`,
      status: 'completed',
      recipient_id: sender.id,
      recipient_info: {
        name: `${sender.first_name} ${sender.last_name}`,
        email: sender.email
      },
      processed_at: new Date()
    });

    // Mettre à jour les soldes
    await req.wallet.deductBalance(amount, description);
    await recipient.wallet.addBalance(amount, `Reçu de ${sender.first_name} ${sender.last_name}`);

    // Notifications
    await createAndSendNotification(sender.id, {
      title: 'Envoi effectué',
      message: `Vous avez envoyé ${amount}€ à ${recipient.first_name} ${recipient.last_name}.`,
      type: 'transaction',
      channels: ['push']
    });

    await createAndSendNotification(recipient.id, {
      title: 'Argent reçu',
      message: `Vous avez reçu ${amount}€ de ${sender.first_name} ${sender.last_name}.`,
      type: 'transaction',
      channels: ['push', 'email']
    });

    res.status(201).json({
      message: 'Envoi effectué avec succès',
      sender_transaction: senderTransaction.toJSON(),
      recipient_transaction: recipientTransaction.toJSON(),
      new_balance: req.wallet.balance
    });
  } catch (error) {
    console.error('Erreur envoi argent:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi d\'argent' });
  }
});

// Historique des transactions du portefeuille OK
router.get('/transactions', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { user_id: req.user.id };
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (status) whereClause.status = status;

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id',
        'type',
        'category',
        'amount',
        'description',
        'status',
        'recipient_info',
        'processed_at',
        'created_at'
      ]
    });

    // Formater les transactions de manière sûre
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      status: transaction.status,
      recipient_info: transaction.recipient_info,
      processed_at: transaction.processed_at,
      created_at: transaction.created_at
    }));

    const response = {
      status: 'success',
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Erreur récupération transactions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des transactions',
      error: error.message
    });
  }
});

//Mvola
router.post("/deposit", authenticateUser, depositFromMvola);
router.post("/withdraw", authenticateUser, withdrawToMvola);
router.post("/pay", authenticateUser, payWithWallet);


export default router;
