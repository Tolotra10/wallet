import { Wallet } from "../models/Wallet.js";
import { Transaction } from "../models/Transaction.js";
import { MvolaService } from "../services/mvola.service.js";

const mvola = new MvolaService();

// 💳 Dépôt depuis MVola vers Wallet
export const depositFromMvola = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    const result = await mvola.requestToPay(amount, phone, "Dépôt Wallet", "payment");

    // Créer transaction en attente
    const tx = await Transaction.create({
      user_id: req.user.id,
      amount,
      type: "deposit",
      status: "pending",
      transaction_number: result.transactionId,
    });

    res.json({ message: "Dépôt initié", transaction: tx, mvola: result.data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 💸 Retrait Wallet vers MVola
export const withdrawToMvola = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: "Solde insuffisant" });
    }

    const result = await mvola.requestToPay(amount, phone, "Retrait Wallet", "transfer");

    // Débiter le wallet immédiatement (ou après callback si tu veux sécuriser)
    wallet.balance -= amount;
    await wallet.save();

    const tx = await Transaction.create({
      user_id: req.user.id,
      amount,
      type: "withdraw",
      status: "pending",
      transaction_number: result.transactionId,
    });

    res.json({ message: "Retrait initié", transaction: tx, mvola: result.data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🛒 Paiement interne via Wallet
export const payWithWallet = async (req, res) => {
  try {
    const { receiverId, amount } = req.body;

    const payerWallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    const receiverWallet = await Wallet.findOne({ where: { user_id: receiverId } });

    if (!payerWallet || payerWallet.balance < amount) {
      return res.status(400).json({ message: "Solde insuffisant" });
    }

    // Débit / Crédit
    payerWallet.balance -= amount;
    receiverWallet.balance += amount;
    await payerWallet.save();
    await receiverWallet.save();

    const tx = await Transaction.create({
      user_id: req.user.id,
      amount,
      type: "wallet_payment",
      status: "success",
      transaction_number: `WALLET-${Date.now()}`,
    });

    res.json({ message: "Paiement réussi", transaction: tx });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
