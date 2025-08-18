import axios from "axios";

export class MvolaService {
  constructor() {
    this.baseUrl = process.env.MVOLA_BASE_URL;
    this.apiUser = process.env.MVOLA_API_USER;
    this.apiKey = process.env.MVOLA_API_KEY;
    this.partnerName = process.env.MVOLA_PARTNER_NAME;
  }

  async getAccessToken() {
    const auth = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString("base64");
    const response = await axios.post(
      `${this.baseUrl}/oauth2/token`,
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  }

  async requestToPay(amount, phone, description, type = "payment") {
    const token = await this.getAccessToken();
    const transactionId = `TX-${Date.now()}`;
    const reference = `REF-${Date.now()}`;

    const response = await axios.post(
      `${this.baseUrl}/mvola/mm/transactions/type/${type}`, // type=payment (cash-in) ou transfer (cash-out)
      {
        amount,
        currency: "Ar",
        descriptionText: description,
        requestingOrganisationTransactionReference: reference,
        payer: {
          partyIdType: "MSISDN",
          partyId: phone, // 26134xxxxxx
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Partner-Name": this.partnerName,
          "X-Reference-Id": transactionId,
          "Content-Type": "application/json",
        },
      }
    );

    return { transactionId, data: response.data };
  }
}

