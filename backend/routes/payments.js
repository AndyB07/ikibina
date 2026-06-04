const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireRole, logAction } = require('../middleware/auth');
const momoService = require('../services/mobileMoneyService');

// GET /api/payments - Get payments list
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT p.*, u.name as member_name, u.email as member_email
      FROM payments p
      JOIN users u ON p.user_id = u.id
    `;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees all payments
    } else if (req.user.role === 'chief') {
      // Chief sees payments in their group
      sql += ' WHERE p.group_id = ?';
      params = [req.user.group_id];
    } else {
      // Member sees only their own payments
      sql += ' WHERE p.user_id = ?';
      params = [req.user.id];
    }

    sql += ' ORDER BY p.created_at DESC';
    const payments = await query(sql, params);
    res.json(payments);
  } catch (err) {
    console.error('Fetch Payments Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payments/stats - Financial metrics for MTN vs Airtel
router.get('/stats', authenticateToken, requireRole(['chief', 'admin']), async (req, res) => {
  try {
    let sql = `
      SELECT 
        provider,
        COUNT(*) as count,
        SUM(amount) as total_collected
      FROM payments
      WHERE status = 'completed'
    `;
    let params = [];

    if (req.user.role === 'chief') {
      sql += ' AND group_id = ?';
      params = [req.user.group_id];
    }

    sql += ' GROUP BY provider';
    const stats = await query(sql, params);
    
    // Format response
    const formattedStats = {
      MTN: { count: 0, total: 0 },
      Airtel: { count: 0, total: 0 },
      totalCollected: 0,
      totalCount: 0
    };

    stats.forEach(item => {
      const provider = item.provider;
      if (formattedStats[provider]) {
        formattedStats[provider].count = item.count;
        formattedStats[provider].total = parseFloat(item.total_collected || 0);
      }
      formattedStats.totalCollected += parseFloat(item.total_collected || 0);
      formattedStats.totalCount += item.count;
    });

    res.json(formattedStats);
  } catch (err) {
    console.error('Fetch Payment Stats Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments - Submit mobile money payment with Request-To-Pay
router.post('/', authenticateToken, async (req, res) => {
  const { payment_type, target_id, provider, phone_number, amount } = req.body;
  const userId = req.user.id;
  const groupId = req.user.group_id;

  if (!payment_type || !target_id || !provider || !phone_number || !amount) {
    return res.status(400).json({ message: 'All fields (payment_type, target_id, provider, phone_number, amount) are required' });
  }

  if (!['MTN', 'Airtel'].includes(provider)) {
    return res.status(400).json({ message: 'Provider must be MTN or Airtel only' });
  }

  if (!['contribution', 'fine', 'loan_repayment'].includes(payment_type)) {
    return res.status(400).json({ message: 'Invalid payment type' });
  }

  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than zero' });
  }

  try {
    // Generate unique transaction reference
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    const reference = `TONTINE-${timestamp}${random}`;

    // Validate target exists
    if (payment_type === 'contribution') {
      const cont = await query('SELECT * FROM contributions WHERE id = ?', [target_id]);
      if (cont.length === 0) return res.status(404).json({ message: 'Contribution record not found' });
      if (cont[0].status === 'paid') return res.status(400).json({ message: 'Contribution is already paid' });
    } else if (payment_type === 'fine') {
      const fine = await query('SELECT * FROM fines WHERE id = ?', [target_id]);
      if (fine.length === 0) return res.status(404).json({ message: 'Fine record not found' });
      if (fine[0].status === 'paid') return res.status(400).json({ message: 'Fine is already paid' });
    } else if (payment_type === 'loan_repayment') {
      const loan = await query('SELECT * FROM loans WHERE id = ?', [target_id]);
      if (loan.length === 0) return res.status(404).json({ message: 'Loan record not found' });
      if (loan[0].status !== 'approved') return res.status(400).json({ message: 'Loan is not approved' });
      if (loan[0].repayment_status === 'fully_paid') return res.status(400).json({ message: 'Loan is already fully repaid' });
    }

    // Send Request-To-Pay to provider
    let result;
    if (provider === 'MTN') {
      result = await momoService.requestMTNPayment(phone_number, amount, reference);
    } else {
      result = await momoService.requestAirtelPayment(phone_number, amount, reference);
    }

    if (!result.success) {
      return res.status(500).json({ message: result.error || 'Payment request failed' });
    }

    // Insert pending payment record
    const paymentResult = await query(`
      INSERT INTO payments (group_id, user_id, payment_type, target_id, amount, provider, phone_number, reference_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [groupId, userId, payment_type, target_id, amount, provider, phone_number, reference]);

    await logAction(userId, req.user.name, groupId, 'Payment Request', `Initiated ${provider} payment request of RWF ${amount} (Ref: ${reference})`);

    res.status(201).json({
      message: 'Payment request sent. Please approve on your phone.',
      payment: {
        id: paymentResult.insertId,
        reference_number: reference,
        amount,
        provider,
        phone_number,
        payment_type,
        status: 'pending',
        created_at: new Date()
      }
    });

  } catch (err) {
    console.error('Process Payment Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/request-prompt - Chief sends a payment request/prompt to member
router.post('/request-prompt', authenticateToken, requireRole(['chief']), async (req, res) => {
  const { member_id, payment_type, target_id, amount } = req.body;
  const groupId = req.user.group_id;

  if (!member_id || !payment_type || !target_id || !amount) {
    return res.status(400).json({ message: 'member_id, payment_type, target_id, and amount are required' });
  }

  try {
    // Check if member exists in Chief's group
    const member = await query('SELECT name, phone FROM users WHERE id = ? AND group_id = ?', [member_id, groupId]);
    if (member.length === 0) {
      return res.status(404).json({ message: 'Member not found in your group' });
    }

    const memberName = member[0].name;
    const memberPhone = member[0].phone;

    // Create a pending payment log to keep track of request
    const timestamp = Date.now().toString().slice(-6);
    const reference = `REQ-MOMO-${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;

    await query(`
      INSERT INTO payments (group_id, user_id, payment_type, target_id, amount, provider, phone_number, reference_number, status)
      VALUES (?, ?, ?, ?, ?, 'MTN', ?, ?, 'pending')
    `, [groupId, member_id, payment_type, target_id, amount, memberPhone, reference]);

    // Send notifications to the member
    const title = '📲 Mobile Money Payment Request';
    const message = `Chief ${req.user.name} has requested a mobile money payment of RWF ${parseFloat(amount).toLocaleString()} for your ${payment_type.replace('_', ' ')}. Please click to pay via MTN/Airtel.`;
    
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, 'payment_reminder', ?, ?)
    `, [groupId, member_id, title, message]);

    // Log audit
    await logAction(
      req.user.id,
      req.user.name,
      groupId,
      'Initiate MoMo Prompt',
      `Requested mobile money payment of RWF ${amount} from ${memberName}`
    );

    res.json({ message: `Simulated Mobile Money payment prompt sent to ${memberName} successfully!` });
  } catch (err) {
    console.error('Request Prompt Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/:id/approve-pending - Complete a pending payment request
router.post('/:id/approve-pending', authenticateToken, async (req, res) => {
  const paymentId = req.params.id;
  const { provider, phone_number } = req.body;

  if (!provider || !phone_number) {
    return res.status(400).json({ message: 'provider and phone_number are required' });
  }

  try {
    const payRes = await query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    if (payRes.length === 0) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    const payment = payRes[0];
    if (payment.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to complete this payment' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment is not in pending status' });
    }

    // Process actual update on target item
    if (payment.payment_type === 'contribution') {
      await query(`
        UPDATE contributions 
        SET status = 'paid', payment_date = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [payment.target_id]);
    } else if (payment.payment_type === 'fine') {
      await query(`
        UPDATE fines 
        SET status = 'paid' 
        WHERE id = ?
      `, [payment.target_id]);
    } else if (payment.payment_type === 'loan_repayment') {
      const loanRes = await query('SELECT * FROM loans WHERE id = ?', [payment.target_id]);
      if (loanRes.length > 0) {
        await query(`
          INSERT INTO loan_repayments (loan_id, amount)
          VALUES (?, ?)
        `, [payment.target_id, payment.amount]);

        const newPaid = parseFloat(loanRes[0].total_paid || 0) + parseFloat(payment.amount);
        const repaymentStatus = newPaid >= parseFloat(loanRes[0].amount) ? 'fully_paid' : 'partially_paid';

        await query(`
          UPDATE loans 
          SET total_paid = ?, repayment_status = ? 
          WHERE id = ?
        `, [newPaid, repaymentStatus, payment.target_id]);
      }
    }

    // Update payment record to completed
    const timestamp = Date.now().toString().slice(-6);
    const newReference = `TXN-${provider.toUpperCase()}-${timestamp}${Math.floor(1000 + Math.random() * 9000)}`;

    await query(`
      UPDATE payments
      SET status = 'completed', provider = ?, phone_number = ?, reference_number = ?
      WHERE id = ?
    `, [provider, phone_number, newReference, paymentId]);

    // Log the transaction in audits
    await logAction(
      req.user.id,
      req.user.name,
      payment.group_id,
      'Approve MoMo Prompt',
      `Approved requested ${provider} payment of RWF ${payment.amount} (Ref: ${newReference})`
    );

    res.json({ message: 'Requested payment completed successfully!', reference_number: newReference });

  } catch (err) {
    console.error('Approve Pending Payment Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// GET /api/payments/:id/status - Check payment status
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const payment = await query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (payment.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const paymentData = payment[0];

    if (paymentData.status === 'completed') {
      return res.json({ status: 'SUCCESSFUL', reference: paymentData.reference_number });
    }

    if (paymentData.status === 'failed') {
      return res.json({ status: 'FAILED', reference: paymentData.reference_number });
    }

    // Check status from provider
    let statusResult;
    if (paymentData.provider === 'MTN') {
      statusResult = await momoService.checkMTNStatus(paymentData.reference_number);
    } else {
      statusResult = await momoService.checkAirtelStatus(paymentData.reference_number);
    }

    // Update if status changed
    if (statusResult.status === 'SUCCESSFUL') {
      await processSuccessfulPayment(paymentData);
    } else if (statusResult.status === 'FAILED') {
      await query('UPDATE payments SET status = ? WHERE id = ?', ['failed', req.params.id]);
    }

    res.json(statusResult);
  } catch (err) {
    console.error('Check Status Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payments/webhook - Receive payment confirmation from MTN/Airtel
router.post('/webhook', async (req, res) => {
  const { status, reference } = req.body;

  try {
    const payment = await query('SELECT * FROM payments WHERE reference_number = ?', [reference]);
    if (payment.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const paymentData = payment[0];

    if (status === 'SUCCESSFUL') {
      await processSuccessfulPayment(paymentData);
      res.json({ message: 'Payment confirmed' });
    } else {
      await query('UPDATE payments SET status = ? WHERE reference_number = ?', ['failed', reference]);
      res.json({ message: 'Payment failed' });
    }
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to process successful payment
async function processSuccessfulPayment(payment) {
  if (payment.payment_type === 'contribution') {
    await query('UPDATE contributions SET status = ?, payment_date = CURRENT_TIMESTAMP WHERE id = ?', ['paid', payment.target_id]);
  } else if (payment.payment_type === 'fine') {
    await query('UPDATE fines SET status = ? WHERE id = ?', ['paid', payment.target_id]);
  } else if (payment.payment_type === 'loan_repayment') {
    const loan = await query('SELECT * FROM loans WHERE id = ?', [payment.target_id]);
    if (loan.length > 0) {
      await query('INSERT INTO loan_repayments (loan_id, amount) VALUES (?, ?)', [payment.target_id, payment.amount]);
      const newPaid = parseFloat(loan[0].total_paid || 0) + parseFloat(payment.amount);
      const repaymentStatus = newPaid >= parseFloat(loan[0].amount) ? 'fully_paid' : 'partially_paid';
      await query('UPDATE loans SET total_paid = ?, repayment_status = ? WHERE id = ?', [newPaid, repaymentStatus, payment.target_id]);
    }
  }

  await query('UPDATE payments SET status = ? WHERE id = ?', ['completed', payment.id]);
}
