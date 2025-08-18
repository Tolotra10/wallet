import axios from 'axios';
import crypto from 'crypto';

const baseURL = process.env.ORANGE_BASE_URL || 'https://api.orange.com';

// Create a dedicated axios instance with sane defaults & tracing
const client = axios.create({ baseURL, timeout: 15000 });

client.interceptors.request.use((config) => {
  config.headers['User-Agent'] = 'WalletApp-Node/1.0';
  if (process.env.ORANGE_OM_SUBSCRIPTION_KEY) {
    // Some Orange APIs require this header (Ocp-Apim-Subscription-Key)
    config.headers['Ocp-Apim-Subscription-Key'] = process.env.ORANGE_OM_SUBSCRIPTION_KEY;
  }
  return config;
});

// Simple in-memory token cache (replace with Redis if needed)
let tokenCache = { access_token: null, expires_at: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.access_token && now < tokenCache.expires_at - 30000) {
    return tokenCache.access_token;
  }
  const creds = Buffer.from(`${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`).toString('base64');
  const res = await client.post('/oauth/v3/token', new URLSearchParams({ grant_type: 'client_credentials' }), {
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const { access_token, expires_in } = res.data;
  tokenCache = { access_token, expires_at: Date.now() + (expires_in * 1000) };
  return access_token;
}

function signPayloadIfNeeded(payloadStr) {
  const key = process.env.ORANGE_OM_MERCHANT_KEY;
  if (!key) return null;
  return crypto.createHmac('sha256', key).update(payloadStr).digest('hex');
}
// ------------------------------
// Collections (customer -> merchant)
// ------------------------------
export async function initCollection({ amount, payerMsisdn, externalId, description }) {
  const accessToken = await getAccessToken();

  // Common Orange Money Collections endpoint varies by region; keep path configurable
  const path = '/orange-money-webpay/dev/v1/payments'; // adjust to prod path when ORANGE_ENV=production

  const payload = {
    amount,
    currency: process.env.ORANGE_CURRENCY || 'MGA',
    customer_msisdn: payerMsisdn,
    external_id: externalId,
    payee_note: description || 'Wallet topup',
    payer_message: description || 'Wallet topup',
    callback_url: process.env.ORANGE_NOTIFY_URL,
  };

  const serialized = JSON.stringify(payload);
  const signature = signPayloadIfNeeded(serialized);

  const res = await client.post(path, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(signature ? { 'X-Signature': signature } : {}),
    },
  });
  return res.data; // should include payment URL or transaction reference depending on product
}

export async function getCollectionStatus({ transactionId, externalId }) {
  const accessToken = await getAccessToken();
  // Status endpoint can be e.g. /payments/{id} or by externalId
  const path = externalId
    ? `/orange-money-webpay/dev/v1/payments?external_id=${encodeURIComponent(externalId)}`
    : `/orange-money-webpay/dev/v1/payments/${encodeURIComponent(transactionId)}`;
  const res = await client.get(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

// ------------------------------
// Disbursements / Payouts (merchant -> customer)
// ------------------------------
export async function initPayout({ amount, payeeMsisdn, externalId, description }) {
  const accessToken = await getAccessToken();
  const path = '/orange-money-webpay/dev/v1/payouts'; // adjust per product/region
  const payload = {
    amount,
    currency: process.env.ORANGE_CURRENCY || 'MGA',
    payee_msisdn: payeeMsisdn,
    external_id: externalId,
    description: description || 'Wallet withdrawal',
    callback_url: process.env.ORANGE_NOTIFY_URL,
  };
  const serialized = JSON.stringify(payload);
  const signature = signPayloadIfNeeded(serialized);

  const res = await client.post(path, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(signature ? { 'X-Signature': signature } : {}),
    },
  });
  return res.data;
}

export async function getPayoutStatus({ transactionId, externalId }) {
  const accessToken = await getAccessToken();
  const path = externalId
    ? `/orange-money-webpay/dev/v1/payouts?external_id=${encodeURIComponent(externalId)}`
    : `/orange-money-webpay/dev/v1/payouts/${encodeURIComponent(transactionId)}`;
  const res = await client.get(path, { headers: { Authorization: `Bearer ${accessToken}` } });
  return res.data;
}

// ------------------------------
// Refunds (reverse a successful collection)
// ------------------------------
export async function refundCollection({ originalTransactionId, amount, reason }) {
  const accessToken = await getAccessToken();
  const path = `/orange-money-webpay/dev/v1/payments/${encodeURIComponent(originalTransactionId)}/refunds`;
  const payload = { amount, reason: reason || 'Customer requested refund' };
  const res = await client.post(path, payload, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return res.data;
}