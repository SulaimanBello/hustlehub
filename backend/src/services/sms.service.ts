import axios from 'axios';
import config from '../config';

/**
 * SMS Service - Supports multiple providers
 * Currently implements: Twilio, Termii, Africa's Talking
 */

interface SMSProvider {
  sendOTP(phoneNumber: string, otpCode: string): Promise<boolean>;
}

class TwilioProvider implements SMSProvider {
  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      const { accountSid, authToken, phoneNumber: fromNumber } = config.sms.twilio;

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials not configured');
      }

      const message = `Your HustleHub verification code is: ${otpCode}. Valid for ${config.business.otpExpiryMinutes} minutes.`;

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: message,
        }),
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
        }
      );

      console.log('📱 SMS sent via Twilio:', response.data.sid);
      return true;
    } catch (error) {
      console.error('❌ Twilio SMS failed:', error);
      return false;
    }
  }
}

class TermiiProvider implements SMSProvider {
  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      const { apiKey, senderId } = config.sms.termii;

      if (!apiKey) {
        throw new Error('Termii API key not configured');
      }

      const message = `Your HustleHub verification code is: ${otpCode}. Valid for ${config.business.otpExpiryMinutes} minutes.`;

      const response = await axios.post('https://api.ng.termii.com/api/sms/send', {
        to: phoneNumber,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey,
      });

      console.log('📱 SMS sent via Termii:', response.data.message_id);
      return true;
    } catch (error) {
      console.error('❌ Termii SMS failed:', error);
      return false;
    }
  }
}

class AfricasTalkingProvider implements SMSProvider {
  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      const { apiKey, username } = config.sms.africasTalking;

      if (!apiKey || !username) {
        throw new Error('Africa\'s Talking credentials not configured');
      }

      const message = `Your HustleHub verification code is: ${otpCode}. Valid for ${config.business.otpExpiryMinutes} minutes.`;

      const response = await axios.post(
        'https://api.africastalking.com/version1/messaging',
        new URLSearchParams({
          username: username,
          to: phoneNumber,
          message: message,
        }),
        {
          headers: {
            'apiKey': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('📱 SMS sent via Africa\'s Talking');
      return true;
    } catch (error) {
      console.error('❌ Africa\'s Talking SMS failed:', error);
      return false;
    }
  }
}

// Mock provider for development/testing
class MockProvider implements SMSProvider {
  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    console.log('📱 [MOCK SMS] To:', phoneNumber, 'Code:', otpCode);
    console.log(`   Message: Your HustleHub verification code is: ${otpCode}`);
    return true;
  }
}

// Factory to get the right provider
function getProvider(): SMSProvider {
  const provider = config.sms.provider;

  if (config.env === 'development' && provider === 'mock') {
    return new MockProvider();
  }

  switch (provider) {
    case 'twilio':
      return new TwilioProvider();
    case 'termii':
      return new TermiiProvider();
    case 'africas-talking':
      return new AfricasTalkingProvider();
    default:
      console.warn(`⚠️ Unknown SMS provider: ${provider}, using mock`);
      return new MockProvider();
  }
}

// Main SMS service export
export const SMSService = {
  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    const provider = getProvider();
    return provider.sendOTP(phoneNumber, otpCode);
  },
};
