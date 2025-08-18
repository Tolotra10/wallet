import express from "express";
import { MvolaService } from "../services/mvola.service.js";
import { authenticateUser,requireKYC,requireActiveWallet } from "../middleware/auth.js";
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


export default router;
