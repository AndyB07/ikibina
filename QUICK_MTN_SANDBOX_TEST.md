# Quick Test with MTN Sandbox

## Get Free Test Credentials (5 minutes):

1. Go to: https://momodeveloper.mtn.com
2. Sign up (free)
3. Go to "Sandbox User Provisioning"
4. Create API User
5. Generate API Key
6. Subscribe to "Collection" product

## Update .env with your sandbox credentials:

```env
MTN_API_URL=https://sandbox.momodeveloper.mtn.com
MTN_API_USER=<your_generated_uuid>
MTN_API_KEY=<your_generated_key>
MTN_SUBSCRIPTION_KEY=<your_collection_key>
```

## Restart your backend:
```bash
cd backend
npm start
```

## Test with MTN's test phone numbers:
- They will give you specific test numbers
- These numbers WILL receive actual prompts in sandbox

## OR: Keep using simulation for now

The simulation works perfectly for:
- Development
- Demos to clients
- Testing business logic
- UI/UX verification

When you're ready to go live, follow the full integration guide!
