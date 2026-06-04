# MTN MoMo Sandbox Setup - Step by Step Guide

## Step 1: Register on MTN Developer Portal

1. Go to: https://momodeveloper.mtn.com/signup
2. Fill in your details:
   - Email address
   - Password
   - First name / Last name
   - Country: Rwanda
3. Verify your email
4. Login at: https://momodeveloper.mtn.com/login

## Step 2: Subscribe to Collection Product

1. After login, go to "Products"
2. Click on "Collection" (this is for receiving payments)
3. Click "Subscribe"
4. Select "Primary Key" - copy and save it
   - This is your `MTN_SUBSCRIPTION_KEY`

## Step 3: Create Sandbox User (Using API or Portal)

### Option A: Using MTN Portal (Easier)
1. Go to "Sandbox" section
2. Click "User Provisioning"
3. Generate a User
4. Save the credentials shown

### Option B: Using Command Line (Recommended)

Open your terminal and run these commands:

```bash
# 1. Generate a UUID for your API User (this will be your MTN_API_USER)
# Use online tool: https://www.uuidgenerator.net/
# Or use this command:
node -e "console.log(require('crypto').randomUUID())"

# Example output: 9c9e6f4d-6b0b-4c3d-8f5e-1a2b3c4d5e6f
# Save this as YOUR_API_USER_ID
```

```bash
# 2. Create API User in MTN Sandbox
# Replace YOUR_SUBSCRIPTION_KEY with the key from Step 2
# Replace YOUR_API_USER_ID with the UUID you generated

curl -X POST \
  https://sandbox.momodeveloper.mtn.com/v1_0/apiuser \
  -H 'Content-Type: application/json' \
  -H 'Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY' \
  -H 'X-Reference-Id: YOUR_API_USER_ID' \
  -d '{
    "providerCallbackHost": "webhook.site"
  }'

# If successful, you'll get HTTP 201 Created (no body)
```

```bash
# 3. Generate API Key for your API User
curl -X POST \
  https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/YOUR_API_USER_ID/apikey \
  -H 'Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY'

# Response will be:
# {
#   "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
# }
# Save this as YOUR_API_KEY
```

## Step 4: Update Your .env File

```env
# MTN MoMo Sandbox Configuration
MTN_API_URL=https://sandbox.momodeveloper.mtn.com
MTN_API_USER=9c9e6f4d-6b0b-4c3d-8f5e-1a2b3c4d5e6f
MTN_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
MTN_SUBSCRIPTION_KEY=your_primary_subscription_key_here
```

Replace with your actual values!

## Step 5: Test Your Credentials

Run this test script:

```bash
cd backend
node test-mtn-connection.js
```

## Step 6: Restart Your Backend

```bash
cd backend
npm start
```

## Step 7: Test Payment in Your App

Use MTN Sandbox test numbers:
- Test phone: 46733123450 (European test number)
- Or any number in format: 46XXXXXXXXX

**Note:** In sandbox mode, payments are simulated. You won't get real SMS but the API will respond successfully.

## Verification Checklist

✅ Registered on MTN Developer Portal
✅ Subscribed to Collection product
✅ Got Primary Subscription Key
✅ Created API User (UUID)
✅ Generated API Key
✅ Updated .env file
✅ Restarted backend
✅ Ready to test!

## Common Issues

**Error: "Access denied"**
- Check your Subscription Key is correct
- Make sure you subscribed to "Collection" product

**Error: "Invalid credentials"**
- Verify API User and API Key match
- Make sure UUID format is correct

**Error: "Resource not found"**
- Check the API URL is correct (sandbox vs production)
- Verify your API User was created successfully

## Next Steps

Once sandbox works:
1. Test thoroughly with sandbox
2. Apply for production access
3. Get production credentials
4. Update .env with production URLs
5. Go live!

## Support

MTN Developer Support:
- Email: apidevelopersupport@mtn.com
- Portal: https://momodeveloper.mtn.com/support
