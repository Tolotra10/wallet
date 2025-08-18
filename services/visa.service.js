import axios from "axios";

const VISA_API_BASE = "https://sandbox.api.visa.com"; // En production: api.visa.com
const VISA_USER_ID = process.env.VISA_USER_ID;
const VISA_PASSWORD = process.env.VISA_PASSWORD;

export const visaApi = {
  async cardValidation({ cardNumber, expiryMonth, expiryYear, cvv }) {
    const res = await axios.post(
      `${VISA_API_BASE}/paai/cardvalidation/v1/validate`,
      {
        primaryAccountNumber: cardNumber,
        cardCvv2Value: cvv,
        cardExpiryDate: { month: expiryMonth, year: expiryYear }
      },
      { auth: { username: VISA_USER_ID, password: VISA_PASSWORD } }
    );
    return res.data;
  },

  async pushFunds({ recipientCard, amount, currency }) {
    const res = await axios.post(
      `${VISA_API_BASE}/visadirect/fundstransfer/v1/pushfundstransactions`,
      {
        recipientPrimaryAccountNumber: recipientCard,
        transactionAmount: amount,
        transactionCurrencyCode: currency
      },
      { auth: { username: VISA_USER_ID, password: VISA_PASSWORD } }
    );
    return res.data;
  },

  async pullFunds({ sourceCard, amount, currency }) {
    const res = await axios.post(
      `${VISA_API_BASE}/visadirect/fundstransfer/v1/pullfundstransactions`,
      {
        sourcePrimaryAccountNumber: sourceCard,
        transactionAmount: amount,
        transactionCurrencyCode: currency
      },
      { auth: { username: VISA_USER_ID, password: VISA_PASSWORD } }
    );
    return res.data;
  }
};
