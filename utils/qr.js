import QRCode from 'qrcode';

export async function generatePaymentQR(data) {
  // "data" can be a deep link or payment URL returned by Orange
  return await QRCode.toDataURL(data);
}