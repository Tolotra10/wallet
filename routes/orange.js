import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { orangeWebhookAuth } from '../middleware/orangeWebhookAuth.js';
import { startTopup, checkTopupStatus, webhook, startPayout, checkPayoutStatus, refundTopup } from '../controllers/orange.controller.js';

const router = express.Router();

// Start a collection (top-up)
router.post('/collections/start', authenticateUser, startTopup);
// Poll collection status
router.get('/collections/status', authenticateUser, checkTopupStatus);
// Webhook (no auth; Orange server calls this). Protect with signature validator if configured
router.post('/webhook', express.json({ type: '*/*' }), orangeWebhookAuth, webhook);

// Start a payout (withdrawal)
router.post('/payouts/start', authenticateUser, startPayout);
// Poll payout status
router.get('/payouts/status', authenticateUser, checkPayoutStatus);

// Refund a completed collection
router.post('/collections/refund', authenticateUser, refundTopup);

export default router;