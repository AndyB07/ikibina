# MTN MoMo & Airtel Money Integration

## Overview
Your system now supports MTN MoMo and Airtel Money payments with Request-To-Pay flow.

## How It Works

### Step 1: Member Initiates Payment
```json
POST /api/payments
{
  "phone": "0788xxxxxx",
  "amount": 5000,
  "provider": "MTN",
  "payment_type": "contribution",
  "target_id": 1
}
```

### Step 2: System Sends Request-To-Pay
- Server calls MTN/Airtel API
- Payment prompt sent to customer's phone
- Payment record created with status: "pending"

### Step 3: Customer Receives Notification
Customer sees:
```
Payment Request
Amount: 5,000 RWF
Merchant: Your Tontine
Approve?
```

### Step 4: Customer Enters PIN
Customer approves with their MoMo/Airtel PIN

### Step 5: Provider Processes Payment
- Money deducted from wallet
- Transaction status becomes SUCCESSFUL

### Step 6: System Receives Confirmation
```json
POST /api/payments/webhook
{
  "status": "SUCCESSFUL",
  "reference": "TONTINE-001"
}
```

Database updates:
```sql
UPDATE contributions SET status='paid' WHERE id=1;
UPDATE payments SET status='completed' WHERE reference_number='TONTINE-001';
```

## API Endpoints

### 1. Submit Payment Request
```
POST /api/payments
```
**Request:**
```json
{
  "payment_type": "contribution|fine|loan_repayment",
  "target_id": 1,
  "provider": "MTN|Airtel",
  "phone_number": "0788123456",
  "amount": 5000
}
```

**Response:**
```json
{
  "message": "Payment request sent. Please approve on your phone.",
  "payment": {
    "id": 123,
    "reference_number": "TONTINE-123456",
    "status": "pending"
  }
}
```

### 2. Check Payment Status
```
GET /api/payments/:id/status
```

**Response:**
```json
{
  "status": "SUCCESSFUL|PENDING|FAILED",
  "reference": "TONTINE-123456"
}
```

### 3. Webhook (Provider Callback)
```
POST /api/payments/webhook
```

**Request:**
```json
{
  "status": "SUCCESSFUL",
  "reference": "TONTINE-123456"
}
```

## Setup Instructions

### 1. Get API Credentials

**MTN MoMo:**
1. Register at https://momodeveloper.mtn.com
2. Subscribe to Collections product
3. Get your API User, API Key, and Subscription Key

**Airtel Money:**
1. Contact Airtel Business
2. Get Client ID and Client Secret

### 2. Update .env File
```env
MTN_API_URL=https://sandbox.momodeveloper.mtn.com
MTN_API_USER=<your_mtn_api_user>
MTN_API_KEY=<your_mtn_api_key>
MTN_SUBSCRIPTION_KEY=<your_mtn_subscription_key>

AIRTEL_API_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=<your_airtel_client_id>
AIRTEL_CLIENT_SECRET=<your_airtel_client_secret>
```

### 3. For Production
Change URLs to production endpoints:
- MTN: `https://proxy.momoapi.mtn.com`
- Airtel: `https://openapi.airtel.africa`

## Testing

### Test Payment Flow
```bash
# 1. Initiate payment
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_type": "contribution",
    "target_id": 1,
    "provider": "MTN",
    "phone_number": "0788123456",
    "amount": 5000
  }'

# 2. Check status
curl http://localhost:5000/api/payments/123/status \
  -H "Authorization: Bearer <token>"

# 3. Simulate webhook (for testing)
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUCCESSFUL",
    "reference": "TONTINE-123456"
  }'
```

## Frontend Integration Example

```javascript
// Submit payment
const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    payment_type: 'contribution',
    target_id: contributionId,
    provider: 'MTN',
    phone_number: '0788123456',
    amount: 5000
  })
});

const { payment } = await response.json();

// Poll for status
const checkStatus = setInterval(async () => {
  const statusRes = await fetch(`/api/payments/${payment.id}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { status } = await statusRes.json();
  
  if (status === 'SUCCESSFUL') {
    clearInterval(checkStatus);
    alert('Payment completed!');
  } else if (status === 'FAILED') {
    clearInterval(checkStatus);
    alert('Payment failed');
  }
}, 3000);
```

## Files Created/Modified

1. **backend/services/mobileMoneyService.js** - MTN/Airtel API integration
2. **backend/routes/payments.js** - Updated payment routes
3. **backend/.env** - Added API credentials
4. **package.json** - Added axios dependency
