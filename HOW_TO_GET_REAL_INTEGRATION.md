# How to Get REAL Mobile Money Integration

## Current Status: SANDBOX/SIMULATION MODE
Your system is currently in testing mode. The phone prompts are simulated in the UI.

## To Get REAL Phone Prompts Working:

### Option 1: MTN MoMo Rwanda

1. **Register as MTN MoMo Partner**
   - Visit: https://momodeveloper.mtn.com
   - Create account
   - Subscribe to "Collection" product
   - Complete KYB (Know Your Business) verification

2. **Get Sandbox Credentials First**
   - API User ID
   - API Key
   - Primary Subscription Key
   - Test in sandbox with test phone numbers

3. **Apply for Production Access**
   - Submit business documents
   - Tax clearance certificate
   - RDB registration
   - Wait for approval (1-2 weeks)

4. **Get Production Credentials**
   - Production API User
   - Production API Key
   - Production Subscription Key

5. **Update Your .env File**
   ```env
   MTN_API_URL=https://proxy.momoapi.mtn.com
   MTN_API_USER=your_production_api_user
   MTN_API_KEY=your_production_api_key
   MTN_SUBSCRIPTION_KEY=your_production_subscription_key
   ```

### Option 2: Airtel Money Rwanda

1. **Contact Airtel Business**
   - Email: business@rw.airtel.com
   - Phone: +250 788 177 000
   - Request "Airtel Money Merchant API Access"

2. **Submit Documents**
   - Business registration
   - Tax ID
   - Bank account details
   - ID of business owner

3. **Get API Credentials**
   - Client ID
   - Client Secret
   - Merchant Code

4. **Update Your .env File**
   ```env
   AIRTEL_API_URL=https://openapi.airtel.africa
   AIRTEL_CLIENT_ID=your_client_id
   AIRTEL_CLIENT_SECRET=your_client_secret
   ```

### Option 3: Use Payment Gateway (EASIER!)

Instead of direct integration, use a payment gateway that handles both:

#### **Flutterwave** (Recommended)
- Website: https://flutterwave.com/rw
- Supports: MTN MoMo, Airtel Money, Cards
- Faster approval process
- Better documentation

#### **Paypack**
- Website: https://paypack.rw
- Rwanda-specific
- Supports MTN & Airtel
- Local support team

## Testing in Sandbox Mode

While waiting for production approval, you can test with MTN Sandbox:

1. **Get Sandbox Credentials**
   ```bash
   # Use MTN Developer Portal sandbox environment
   # You get test credentials immediately
   ```

2. **Use Test Phone Numbers**
   - MTN provides test numbers that actually receive prompts
   - Format: Specific test numbers they provide

3. **Update .env for Sandbox**
   ```env
   MTN_API_URL=https://sandbox.momodeveloper.mtn.com
   MTN_API_USER=sandbox_user_id
   MTN_API_KEY=sandbox_key
   MTN_SUBSCRIPTION_KEY=sandbox_subscription_key
   ```

## Current Simulation Explanation

Your app currently shows:
- ✅ UI mockup of phone prompt
- ✅ Full payment flow logic
- ✅ Database updates
- ✅ Transaction references

It does NOT send real SMS/USSD prompts because:
- ❌ No real API credentials configured
- ❌ Not approved by MTN/Airtel yet
- ❌ Running in local development mode

## Quick Start for Production

**Fastest Path (1-2 weeks):**

1. Register with **Flutterwave Rwanda**
   - Fill online form
   - Submit documents
   - Get approved in ~3 days
   - Start accepting payments

2. **Replace your integration:**
   ```javascript
   // Instead of direct MTN/Airtel API calls
   // Use Flutterwave SDK
   
   FlutterwaveCheckout({
     public_key: "FLWPUBK-xxx",
     amount: 5000,
     currency: "RWF",
     payment_options: "mobilemoneyghana,card",
     customer: {
       phone_number: paymentPhone,
     },
     callback: function(data) {
       // Payment successful
       updateContribution(data.tx_ref);
     }
   });
   ```

## Need Help?

Contact these companies directly:

**MTN Rwanda:**
- Business Hotline: 100
- Email: business@mtn.com

**Airtel Rwanda:**
- Business: +250 788 177 000
- Email: business@rw.airtel.com

**Flutterwave:**
- Website: https://flutterwave.com/rw
- Support: support@flutterwave.com

## Bottom Line

To get REAL phone prompts:
1. Choose integration method (direct or gateway)
2. Register with provider
3. Get approved
4. Get real credentials
5. Update .env file
6. Test with real money in production

**Current simulation is perfect for development and demos!**
