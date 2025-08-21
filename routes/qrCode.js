import express from "express";
import QRCode from "qrcode";
import { sequelize } from '../config/database.js';
import { authenticateAdmin,authenticateUserOrAdmin } from "../middleware/auth.js";
import { PendingQRTransaction, Transaction, Wallet } from "../models/index.js"

const router = express.Router();

// router.post(
//   "/generate-qr",
//   authenticateAdmin,   // ✅ seulement admins
//   async (req, res) => {
//     try {
//       const { category, amount } = req.body;

//       if (!category || !amount) {
//         return res.status(400).json({ message: "Catégorie et montant requis" });
//       }

//       // Générer un ID unique pour cette transaction
//       const transactionId = uuidv4();

//       // Enregistrer une transaction en attente
//       const transaction = await Transaction.create({
//         id: transactionId,
//         amount,
//         description: `Paiement ${category}`,
//         type: "debit",         // car ce sera un débit pour l’utilisateur
//         provider: "wallet",
//         status: "pending",
//         category,
//       });

//       // Contenu du QR (JSON encodé)
//       const qrPayload = {
//         transactionId: transaction.id,
//         amount,
//         category,
//       };

//       const qrCodeData = await QRCode.toDataURL(JSON.stringify(qrPayload));

//       res.json({
//         message: "QR généré avec succès",
//         qrCode: qrCodeData,
//         transactionId: transaction.id,
//       });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   }
// );

// Fonction pour générer un numéro de transaction unique
function generateTransactionNumber() {
  const prefix = 'TRX';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}
//Créer un QR code pour une transaction OK
router.post(
  "/generate-qr",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { category, amount } = req.body;

      if (!category || !amount) {
        return res.status(400).json({ message: "Catégorie et montant requis" });
      }

      const validCategories = [
        'topup', 'withdrawal', 'transfer', 'payment', 'bill',
        'service', 'transport', 'refund', 'fee', 'bonus'
      ];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Catégorie invalide" });
      }

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Montant invalide" });
      }

      const transaction_number = generateTransactionNumber();

      // Créer une date d'expiration (par exemple, 24h après création)
      const expires_at = new Date();
      expires_at.setHours(expires_at.getHours() + 24);

      // Utiliser PendingQRTransaction au lieu de Transaction
      const pendingTransaction = await PendingQRTransaction.create({
        transaction_number,
        amount,
        category,
        status: 'pending',
        expires_at
      });

      const qrPayload = {
        transactionId: pendingTransaction.id,
        transaction_number: pendingTransaction.transaction_number,
        amount,
        category
      };

      const qrCodeData = await QRCode.toDataURL(JSON.stringify(qrPayload));

      res.json({
        message: "QR généré avec succès",
        qrCode: qrCodeData,
        transactionId: pendingTransaction.id,
        transaction_number: pendingTransaction.transaction_number
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

//Scanner le QR code pour payer une transaction
// router.post("/pay", authenticateUser, async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const { transactionId } = req.body;

//     if (!transactionId) {
//       return res.status(400).json({ message: "transactionId requis" });
//     }

//     // Vérifier que la transaction QR existe et est valide
//     const pendingTransaction = await PendingQRTransaction.findByPk(transactionId, { transaction: t });
//     if (!pendingTransaction || pendingTransaction.status !== "pending") {
//       await t.rollback();
//       return res.status(404).json({ message: "Transaction invalide ou déjà traitée" });
//     }

//     // Vérifier si la transaction n'a pas expiré
//     if (new Date() > new Date(pendingTransaction.expires_at)) {
//       pendingTransaction.status = "expired";
//       await pendingTransaction.save({ transaction: t });
//       await t.rollback();
//       return res.status(400).json({ message: "Transaction expirée" });
//     }

//     // Récupérer wallet utilisateur
//     const wallet = await Wallet.findOne({
//       where: { user_id: req.user.id },
//       transaction: t,
//       lock: t.LOCK.UPDATE
//     });

//     if (!wallet) {
//       await t.rollback();
//       return res.status(404).json({ message: "Wallet introuvable" });
//     }

//     // Vérifier solde suffisant
//     const amount = parseFloat(pendingTransaction.amount);
//     if (parseFloat(wallet.balance) < amount) {
//       await t.rollback();
//       return res.status(400).json({ message: "Solde insuffisant" });
//     }

//     // Débiter le wallet
//     wallet.balance = parseFloat(wallet.balance) - amount;
//     await wallet.save({ transaction: t });

//     // Créer la transaction réelle
//     const transaction = await Transaction.create({
//       transaction_number: pendingTransaction.transaction_number,
//       amount: pendingTransaction.amount,
//       description: `Paiement ${pendingTransaction.category} via QR`,
//       type: "debit",
//       provider: "wallet",
//       status: "success",
//       category: pendingTransaction.category,
//       payment_method: "qr_code",
//       user_id: req.user.id,
//       wallet_id: wallet.id,
//       currency: "EUR"
//     }, { transaction: t });

//     // Marquer la transaction QR comme utilisée
//     pendingTransaction.status = "used";
//     await pendingTransaction.save({ transaction: t });

//     await t.commit();

//     res.json({
//       message: "Paiement effectué avec succès",
//       transactionId: transaction.id,
//       newBalance: wallet.balance
//     });
//   } catch (error) {
//     await t.rollback();
//     res.status(500).json({ message: error.message });
//   }
// });
function generateWalletNumber() {
  const prefix = 'WAL';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

router.post("/pay", authenticateUserOrAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: "transactionId requis" });
    }

    // Vérifier que la transaction QR existe et est valide
    const pendingTransaction = await PendingQRTransaction.findByPk(transactionId, { transaction: t });
    if (!pendingTransaction || pendingTransaction.status !== "pending") {
      await t.rollback();
      return res.status(404).json({ message: "Transaction invalide ou déjà traitée" });
    }

    // Vérifier si la transaction n'a pas expiré
    if (new Date() > new Date(pendingTransaction.expires_at)) {
      pendingTransaction.status = "expired";
      await pendingTransaction.save({ transaction: t });
      await t.rollback();
      return res.status(400).json({ message: "Transaction expirée" });
    }

    // Si c'est un admin, on utilise ou crée un wallet admin
    let wallet;
    if (req.isAdmin) {
      wallet = await Wallet.findOne({
        where: { user_id: req.user.id },
        transaction: t
      });

      if (!wallet) {
        // Créer un nouveau wallet admin avec un solde initial élevé
        wallet = await Wallet.create({
          user_id: req.user.id,
          wallet_number: generateWalletNumber(),
          balance: 1000000, // 1 million comme solde initial
          currency: 'EUR',
          status: 'active'
        }, { transaction: t });
      }
    } else {
      wallet = await Wallet.findOne({
        where: { user_id: req.user.id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
    }

    if (!wallet) {
      await t.rollback();
      return res.status(404).json({ message: "Wallet introuvable" });
    }

    // Vérifier solde suffisant
    const amount = parseFloat(pendingTransaction.amount);
    if (parseFloat(wallet.balance) < amount) {
      await t.rollback();
      return res.status(400).json({ message: "Solde insuffisant" });
    }

    // Débiter le wallet
    wallet.balance = parseFloat(wallet.balance) - amount;
    await wallet.save({ transaction: t });

    // Créer la transaction réelle
    const transaction = await Transaction.create({
      transaction_number: pendingTransaction.transaction_number,
      amount: pendingTransaction.amount,
      description: `Paiement ${pendingTransaction.category} via QR`,
      type: "debit",
      provider: "wallet",
      status: "completed", // Changed from "success" to "completed" to match enum
      category: pendingTransaction.category,
      payment_method: "qr_code",
      user_id: wallet.user_id,
      wallet_id: wallet.id,
      currency: "EUR",
      qr_code_id: transactionId  // Ajout de cette ligne
    }, { transaction: t });

    // Marquer la transaction QR comme utilisée
    pendingTransaction.status = "used";
    await pendingTransaction.save({ transaction: t });

    await t.commit();

    res.json({
      message: "Paiement effectué avec succès",
      transactionId: transaction.id,
      newBalance: wallet.balance
    });
  } catch (error) {
    await t.rollback();
    console.error('Error details:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
