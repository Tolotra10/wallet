import { v4 as uuidv4 } from 'uuid';
import { initCollection, getCollectionStatus, initPayout, getPayoutStatus, refundCollection } from '../services/orange.service.js';
import { Transaction } from '../models/Transaction.js';
import { Wallet } from '../models/Wallet.js';

export const startTopup = async (req, res, next) => {
  try {
    const { amount, msisdn, description } = req.body;
    if (!amount || !msisdn) return res.status(400).json({ error: 'amount and msisdn required' });

    const externalId = `COLL_${uuidv4()}`;
    const apiResp = await initCollection({ amount, payerMsisdn: msisdn, externalId, description });

    // Persist pending transaction
    const tx = await Transaction.create({
      user_id: req.user?.id || null,
      type: 'TOPUP',
      provider: 'ORANGE_MONEY',
      provider_reference: apiResp?.transaction_id || apiResp?.payment_id || null,
      external_id: externalId,
      amount,
      currency: process.env.ORANGE_CURRENCY || 'MGA',
      status: 'PENDING',
      meta: apiResp,
    });

    res.json({ transaction: tx, redirect: apiResp?.payment_url || null, api: apiResp });
  } catch (err) {
    next(err);
  }
};

export const checkTopupStatus = async (req, res, next) => {
  try {
    const { external_id, provider_reference } = req.query;
    const apiResp = await getCollectionStatus({ transactionId: provider_reference, externalId: external_id });
    res.json(apiResp);
  } catch (err) { next(err); }
};

export const webhook = async (req, res, next) => {
  try {
    // Orange will POST transaction updates here
    // Typical fields (may vary): external_id, transaction_id, status, amount, currency
    const { external_id, transaction_id, status, amount, currency } = req.body;

    const tx = await Transaction.findOne({ where: { external_id } });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    tx.provider_reference = tx.provider_reference || transaction_id;
    tx.provider_status = status;

    if (status === 'SUCCESS' || status === 'COMPLETED') {
      tx.status = 'SUCCESS';
      await tx.save();
      // Credit wallet
      const wallet = await Wallet.findOne({ where: { user_id: tx.user_id } });
      if (wallet) {
        wallet.balance = Number(wallet.balance) + Number(amount);
        await wallet.save();
      }
    } else if (status === 'FAILED' || status === 'CANCELED') {
      tx.status = 'FAILED';
      await tx.save();
    } else {
      // PENDING or other
      await tx.save();
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const startPayout = async (req, res, next) => {
  try {
    const { amount, msisdn, description } = req.body;
    if (!amount || !msisdn) return res.status(400).json({ error: 'amount and msisdn required' });

    // Check wallet balance first
    const wallet = await Wallet.findOne({ where: { user_id: req.user.id } });
    if (!wallet || Number(wallet.balance) < Number(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const externalId = `PAYOUT_${uuidv4()}`;
    const apiResp = await initPayout({ amount, payeeMsisdn: msisdn, externalId, description });

    const tx = await Transaction.create({
      user_id: req.user.id,
      type: 'WITHDRAWAL',
      provider: 'ORANGE_MONEY',
      provider_reference: apiResp?.transaction_id || apiResp?.payout_id || null,
      external_id: externalId,
      amount,
      currency: process.env.ORANGE_CURRENCY || 'MGA',
      status: 'PENDING',
      meta: apiResp,
    });

    // Optionally place a hold on funds
    wallet.balance = Number(wallet.balance) - Number(amount);
    await wallet.save();

    res.json({ transaction: tx, api: apiResp });
  } catch (err) { next(err); }
};

export const checkPayoutStatus = async (req, res, next) => {
  try {
    const { external_id, provider_reference } = req.query;
    const apiResp = await getPayoutStatus({ transactionId: provider_reference, externalId: external_id });
    res.json(apiResp);
  } catch (err) { next(err); }
};

export const refundTopup = async (req, res, next) => {
  try {
    const { original_provider_transaction_id, amount, reason } = req.body;
    if (!original_provider_transaction_id || !amount) return res.status(400).json({ error: 'id and amount required' });
    const apiResp = await refundCollection({ originalTransactionId: original_provider_transaction_id, amount, reason });
    res.json(apiResp);
  } catch (err) { next(err); }
};
