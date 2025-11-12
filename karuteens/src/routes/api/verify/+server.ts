import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// M-Pesa helper functions
function timestamp() {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

function base64(str: string) {
  return Buffer.from(str).toString('base64');
}

async function getAccessToken(consumerKey: string, consumerSecret: string) {
  const auth = base64(`${consumerKey}:${consumerSecret}`);
  const response = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await response.json();
  return data.access_token;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { phone } = await request.json();

    // Validate phone number (Kenyan format)
    if (!phone || !phone.match(/^254[17]\d{8}$/)) {
      return json({ error: 'Invalid phone number. Use format: 254XXXXXXXXX' }, { status: 400 });
    }

    // Get M-Pesa credentials from environment
    const consumerKey = env.MPESA_CONSUMER_KEY;
    const consumerSecret = env.MPESA_CONSUMER_SECRET;
    const shortcode = env.MPESA_BUSINESS_SHORTCODE;
    const passkey = env.MPESA_PASSKEY;
    const callbackUrl = env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback';
    const transactionType = env.MPESA_TRANSACTION_TYPE || 'CustomerBuyGoodsOnline';
    const partyB = env.MPESA_PARTYB;

    // Debug logging
    console.log('M-Pesa Config Check:', {
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      hasShortcode: !!shortcode,
      hasPasskey: !!passkey,
      hasPartyB: !!partyB,
      shortcode,
      partyB,
      transactionType
    });

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !partyB) {
      const missing = [];
      if (!consumerKey) missing.push('MPESA_CONSUMER_KEY');
      if (!consumerSecret) missing.push('MPESA_CONSUMER_SECRET');
      if (!shortcode) missing.push('MPESA_BUSINESS_SHORTCODE');
      if (!passkey) missing.push('MPESA_PASSKEY');
      if (!partyB) missing.push('MPESA_PARTYB');
      
      return json({ 
        error: 'M-Pesa configuration missing', 
        missing,
        help: 'Add these to karuteens/.env.local'
      }, { status: 500 });
    }

    // Get access token
    let token;
    try {
      token = await getAccessToken(consumerKey, consumerSecret);
      console.log('Access token obtained successfully');
    } catch (error: any) {
      console.error('Failed to get access token:', error);
      return json({ 
        error: 'Failed to authenticate with M-Pesa', 
        details: error.message 
      }, { status: 500 });
    }

    // Generate password
    const ts = timestamp();
    const password = base64(`${shortcode}${passkey}${ts}`);

    // STK Push payload
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: transactionType,
      Amount: 10,
      PartyA: phone,
      PartyB: partyB,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: 'Verification',
      TransactionDesc: 'Account Verification Fee'
    };

    // Send STK Push request
    let response;
    try {
      response = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('STK Push response status:', response.status);
    } catch (error: any) {
      console.error('STK Push request failed:', error);
      return json({ 
        error: 'Failed to send STK push', 
        details: error.message 
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('STK Push response data:', data);

    if (data.ResponseCode === '0') {
      return json({
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        message: 'STK push sent successfully. Please check your phone to complete payment.'
      });
    } else {
      return json({
        error: data.errorMessage || 'Failed to initiate payment',
        details: data
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('M-Pesa STK Push error:', error);
    return json({
      error: 'Failed to process verification payment',
      details: error.message
    }, { status: 500 });
  }
};
