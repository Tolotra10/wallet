import crypto from 'crypto';

export function orangeWebhookAuth(req, res, next) {
  try {
    const merchantKey = process.env.ORANGE_OM_MERCHANT_KEY;
    const signature = req.header('X-Signature') || req.header('x-signature');
    if (!merchantKey || !signature) return next(); // skip if not configured

    const bodyRaw = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', merchantKey).update(bodyRaw).digest('hex');
    if (expected !== signature) {
      return res.status(401).json({ error: 'Invalid Orange signature' });
    }
    next();
  } catch (e) {
    next(e);
  }
}