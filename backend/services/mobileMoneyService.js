const axios = require('axios');

class MobileMoneyService {
  constructor() {
    this.mtnConfig = {
      apiUrl: process.env.MTN_API_URL || 'https://sandbox.momodeveloper.mtn.com',
      apiUser: process.env.MTN_API_USER,
      apiKey: process.env.MTN_API_KEY,
      subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY
    };

    this.airtelConfig = {
      apiUrl: process.env.AIRTEL_API_URL || 'https://openapiuat.airtel.africa',
      clientId: process.env.AIRTEL_CLIENT_ID,
      clientSecret: process.env.AIRTEL_CLIENT_SECRET
    };
  }

  async requestMTNPayment(phone, amount, reference) {
    try {
      const token = await this.getMTNToken();
      
      await axios.post(
        `${this.mtnConfig.apiUrl}/collection/v1_0/requesttopay`,
        {
          amount: amount.toString(),
          currency: 'RWF',
          externalId: reference,
          payer: { partyIdType: 'MSISDN', partyId: phone },
          payerMessage: 'Tontine Contribution',
          payeeNote: `Payment for ${reference}`
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': reference,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.mtnConfig.subscriptionKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, transactionId: reference };
    } catch (error) {
      console.error('MTN Payment Request Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'MTN payment request failed' };
    }
  }

  async checkMTNStatus(transactionId) {
    try {
      const token = await this.getMTNToken();

      const response = await axios.get(
        `${this.mtnConfig.apiUrl}/collection/v1_0/requesttopay/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.mtnConfig.subscriptionKey
          }
        }
      );

      return { status: response.data.status, reference: transactionId };
    } catch (error) {
      console.error('MTN Status Check Error:', error.response?.data || error.message);
      return { status: 'FAILED', reference: transactionId };
    }
  }

  async requestAirtelPayment(phone, amount, reference) {
    try {
      const token = await this.getAirtelToken();

      const response = await axios.post(
        `${this.airtelConfig.apiUrl}/merchant/v1/payments/`,
        {
          reference: reference,
          subscriber: { country: 'RW', currency: 'RWF', msisdn: phone },
          transaction: { amount: amount, country: 'RW', currency: 'RWF', id: reference }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Country': 'RW',
            'X-Currency': 'RWF'
          }
        }
      );

      return { success: true, transactionId: response.data.data?.transaction?.id || reference };
    } catch (error) {
      console.error('Airtel Payment Request Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Airtel payment request failed' };
    }
  }

  async checkAirtelStatus(transactionId) {
    try {
      const token = await this.getAirtelToken();

      const response = await axios.get(
        `${this.airtelConfig.apiUrl}/standard/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Country': 'RW',
            'X-Currency': 'RWF'
          }
        }
      );

      return {
        status: response.data.data?.transaction?.status === 'TS' ? 'SUCCESSFUL' : 'PENDING',
        reference: transactionId
      };
    } catch (error) {
      console.error('Airtel Status Check Error:', error.response?.data || error.message);
      return { status: 'FAILED', reference: transactionId };
    }
  }

  async getMTNToken() {
    try {
      const response = await axios.post(
        `${this.mtnConfig.apiUrl}/collection/token/`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.mtnConfig.subscriptionKey,
            'Authorization': `Basic ${Buffer.from(`${this.mtnConfig.apiUser}:${this.mtnConfig.apiKey}`).toString('base64')}`
          }
        }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error('Failed to get MTN token');
    }
  }

  async getAirtelToken() {
    try {
      const response = await axios.post(
        `${this.airtelConfig.apiUrl}/auth/oauth2/token`,
        { client_id: this.airtelConfig.clientId, client_secret: this.airtelConfig.clientSecret, grant_type: 'client_credentials' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error('Failed to get Airtel token');
    }
  }
}

module.exports = new MobileMoneyService();
