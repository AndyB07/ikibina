require('dotenv').config();
const axios = require('axios');

async function testMTNConnection() {
  console.log('\n🧪 Testing MTN MoMo Sandbox Connection...\n');

  const config = {
    apiUrl: process.env.MTN_API_URL,
    apiUser: process.env.MTN_API_USER,
    apiKey: process.env.MTN_API_KEY,
    subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY
  };

  // Check if credentials are set
  console.log('1. Checking credentials in .env file...');
  if (!config.apiUser || config.apiUser.includes('<')) {
    console.log('   ❌ MTN_API_USER not set properly');
    console.log('   📝 Generate a UUID: https://www.uuidgenerator.net/');
    return;
  }
  if (!config.apiKey || config.apiKey.includes('<')) {
    console.log('   ❌ MTN_API_KEY not set properly');
    console.log('   📝 Generate using the curl command in the setup guide');
    return;
  }
  if (!config.subscriptionKey || config.subscriptionKey.includes('<')) {
    console.log('   ❌ MTN_SUBSCRIPTION_KEY not set properly');
    console.log('   📝 Get from MTN Developer Portal > Products > Collection');
    return;
  }
  console.log('   ✅ All credentials present\n');

  // Test 1: Get Access Token
  console.log('2. Testing authentication (getting access token)...');
  try {
    const tokenResponse = await axios.post(
      `${config.apiUrl}/collection/token/`,
      {},
      {
        headers: {
          'Ocp-Apim-Subscription-Key': config.subscriptionKey,
          'Authorization': `Basic ${Buffer.from(`${config.apiUser}:${config.apiKey}`).toString('base64')}`
        }
      }
    );

    if (tokenResponse.data.access_token) {
      console.log('   ✅ Successfully authenticated!');
      console.log(`   🔑 Access Token: ${tokenResponse.data.access_token.substring(0, 20)}...`);
      console.log(`   ⏰ Expires in: ${tokenResponse.data.expires_in} seconds\n`);
    }
  } catch (error) {
    console.log('   ❌ Authentication failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.statusText}`);
      console.log(`   Details: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    console.log('\n   📋 Troubleshooting:');
    console.log('   - Verify your Subscription Key is correct');
    console.log('   - Make sure you subscribed to "Collection" product');
    console.log('   - Check API User UUID is valid');
    console.log('   - Verify API Key matches your API User\n');
    return;
  }

  // Test 2: Check Account Balance
  console.log('3. Testing API access (checking account balance)...');
  try {
    const token = await getMTNToken(config);
    const balanceResponse = await axios.get(
      `${config.apiUrl}/collection/v1_0/account/balance`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': config.subscriptionKey
        }
      }
    );

    console.log('   ✅ API access working!');
    console.log(`   💰 Sandbox Balance: ${balanceResponse.data.availableBalance} ${balanceResponse.data.currency}\n`);
  } catch (error) {
    console.log('   ⚠️  Balance check failed (this is sometimes expected in sandbox)');
    if (error.response && error.response.status !== 500) {
      console.log(`   Error: ${error.response.status} - ${error.response.statusText}\n`);
    } else {
      console.log('   (Balance endpoint may not be available in all sandbox environments)\n');
    }
  }

  // Test 3: Simulate Request to Pay
  console.log('4. Testing Request-To-Pay functionality...');
  try {
    const token = await getMTNToken(config);
    const referenceId = require('crypto').randomUUID();
    
    const requestToPayResponse = await axios.post(
      `${config.apiUrl}/collection/v1_0/requesttopay`,
      {
        amount: '100',
        currency: 'EUR',
        externalId: referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: '46733123450'
        },
        payerMessage: 'Test Payment',
        payeeNote: 'Test from Ikibina'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': config.subscriptionKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Request-To-Pay sent successfully!');
    console.log(`   📱 Reference ID: ${referenceId}\n`);

    // Wait a bit then check status
    console.log('5. Checking payment status...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await axios.get(
      `${config.apiUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': 'sandbox',
          'Ocp-Apim-Subscription-Key': config.subscriptionKey
        }
      }
    );

    console.log(`   ✅ Payment Status: ${statusResponse.data.status}`);
    console.log(`   📊 Details: ${JSON.stringify(statusResponse.data, null, 2)}\n`);

  } catch (error) {
    console.log('   ❌ Request-To-Pay test failed');
    if (error.response) {
      console.log(`   Error: ${error.response.status} - ${error.response.statusText}`);
      console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}\n`);
    } else {
      console.log(`   Error: ${error.message}\n`);
    }
    return;
  }

  console.log('✅ ALL TESTS PASSED! Your MTN MoMo integration is working!\n');
  console.log('🚀 You can now:');
  console.log('   - Test payments in your app');
  console.log('   - Use test phone numbers provided by MTN');
  console.log('   - Apply for production credentials when ready\n');
}

async function getMTNToken(config) {
  const response = await axios.post(
    `${config.apiUrl}/collection/token/`,
    {},
    {
      headers: {
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
        'Authorization': `Basic ${Buffer.from(`${config.apiUser}:${config.apiKey}`).toString('base64')}`
      }
    }
  );
  return response.data.access_token;
}

// Run the test
testMTNConnection().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
