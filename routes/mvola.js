import express from "express";
import { MvolaService } from "../services/mvola.service.js";
import { authenticateUser, requireKYC, requireActiveWallet } from "../middleware/auth.js";
import { sequelize, Wallet, Transaction } from "../models/index.js";

const router = express.Router();
const mvola = new MvolaService();

//Wallet → Mvola
router.post(
  "/deposit",
  authenticateUser,
  requireKYC,
  requireActiveWallet,
  async (req, res) => {
    const t = await sequelize.transaction(); // Début de la transaction Sequelize

    try {
      const { phone, amount } = req.body;

      if (!phone || !amount) {
        return res.status(400).json({ message: "Numéro et montant requis" });
      }

      // 1️⃣ Vérifier la balance du wallet
      const wallet = await Wallet.findOne({ where: { user_id: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (!wallet || wallet.balance < amount) {
        await t.rollback();
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      // 2️⃣ Initier le paiement Mvola
      const result = await mvola.requestToPay(amount, phone, "Transfert Wallet → Mvola");

      // 3️⃣ Débiter le wallet
      wallet.balance -= amount;
      await wallet.save({ transaction: t });

      // 4️⃣ Enregistrer la transaction
      const transactionRecord = await Transaction.create({
        user_id: req.user.id,
        wallet_id: wallet.id,
        amount,
        description: "Transfert Wallet → Mvola",
        type: "credit",
        provider: "mvola",
        category: "transfer",
        phone,
        status: "pending",
        external_reference: result.transactionId,
      }, { transaction: t });

      // ✅ Commit de la transaction
      await t.commit();

      res.json({
        message: "Transaction initiée avec succès",
        transactionId: transactionRecord.id,
        mvolaTransactionId: result.transactionId,
        mvolaResponse: result.data,
      });
    } catch (error) {
      // 🔴 Rollback en cas d'erreur
      await t.rollback();
      res.status(500).json({ message: error.message });
    }
  }
);

// Mvola → Wallet
router.post(
  "/topup",
  authenticateUser,
  requireKYC,
  async (req, res) => {
    const t = await sequelize.transaction();

    try {
      const { phone, amount } = req.body;

      if (!phone || !amount) {
        return res.status(400).json({ message: "Numéro et montant requis" });
      }

      // 1️⃣ Vérifier que le wallet de l'utilisateur existe
      const wallet = await Wallet.findOne({
        where: { user_id: req.user.id },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!wallet) {
        await t.rollback();
        return res.status(404).json({ message: "Wallet introuvable" });
      }

      const result = await mvola.requestToPay(amount, phone, "Dépôt Mvola → Wallet");
      console.log("DEBUG MVola requestToPay result:", result);

      const externalRef = result.transactionId
        || result.serverCorrelationId
        || result.transactionReference;

      const transactionRecord = await Transaction.create({
        user_id: req.user.id,
        wallet_id: wallet.id,
        amount,
        description: "Dépôt Mvola → Wallet",
        type: "credit",
        provider: "mvola",
        phone,
        status: "pending",
        category: "transfer",
        external_reference: externalRef,  // ✅ bon champ
      }, { transaction: t });
      await t.commit();


      res.json({
        message: "Dépôt initié. Veuillez confirmer via USSD sur votre numéro MVola.",
        transactionId: transactionRecord.id,
        mvolaTransactionId: result.transactionId,
        mvolaResponse: result.data,
      });
    } catch (error) {
      await t.rollback();
      res.status(500).json({ message: error.message });
    }
  }
);

// Callback MVola → confirmation du paiement
router.post("/callback", async (req, res) => {
  try {
    const { status } = req.body;

    const transactionId = req.body.transactionId
      || req.body.serverCorrelationId
      || req.body.transactionReference;

    const transaction = await Transaction.findOne({
      where: { external_reference: transactionId }
    });

    if (!transaction) return res.status(404).json({ message: "Transaction introuvable" });

    if (status === "SUCCESSFUL") {
      const t = await sequelize.transaction();
      try {
        const wallet = await Wallet.findOne({ 
          where: { user_id: transaction.user_id }, 
          transaction: t, 
          lock: t.LOCK.UPDATE 
        });
        
        // Utiliser Sequelize.literal pour l'opération mathématique
        await wallet.increment('balance', { 
          by: transaction.amount,
          transaction: t
        });

        transaction.status = "completed";
        transaction.processed_at = new Date();
        await transaction.save({ transaction: t });

        await t.commit();
      } catch (error) {
        await t.rollback();
        throw error;
      }
    } else {
      transaction.status = "failed";
      transaction.failed_reason = "Payment not successful";
      transaction.processed_at = new Date();
      await transaction.save();
    }

    res.json({ message: "Callback traité" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
