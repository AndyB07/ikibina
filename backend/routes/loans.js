const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireRole, logAction } = require('../middleware/auth');

// GET /api/loans/savings - Get current group savings
async function getGroupSavings(groupId) {
  if (!groupId) return 0;
  
  // Paid contributions
  const contrRes = await query(`
    SELECT SUM(amount) as total FROM contributions 
    WHERE group_id = ? AND status = 'paid'
  `, [groupId]);
  const paidContributions = parseFloat(contrRes[0].total || 0);

  // Paid fines
  const fineRes = await query(`
    SELECT SUM(amount) as total FROM fines 
    WHERE group_id = ? AND status = 'paid'
  `, [groupId]);
  const paidFines = parseFloat(fineRes[0].total || 0);

  // Repayments made
  const repayRes = await query(`
    SELECT SUM(lr.amount) as total 
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    WHERE l.group_id = ?
  `, [groupId]);
  const repayments = parseFloat(repayRes[0].total || 0);

  // Approved loans (disbursed money)
  const loanRes = await query(`
    SELECT SUM(amount) as total FROM loans 
    WHERE group_id = ? AND status = 'approved'
  `, [groupId]);
  const disbursedLoans = parseFloat(loanRes[0].total || 0);

  // Group Savings = Contributions + Fines + Repayments - Disbursed Loans
  return paidContributions + paidFines + repayments - disbursedLoans;
}

// GET /api/loans/group-savings/:groupId - API endpoint for savings
router.get('/group-savings/:groupId', authenticateToken, async (req, res) => {
  const groupId = req.params.groupId;
  try {
    const savings = await getGroupSavings(groupId);
    res.json({ savings });
  } catch (err) {
    console.error('Fetch Savings Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/loans/metrics/:memberId - Check eligibility metrics
router.get('/metrics/:memberId', authenticateToken, async (req, res) => {
  const memberId = req.params.memberId;
  try {
    // 1. Attendance consistency
    const attRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present
      FROM attendance
      WHERE member_id = ?
    `, [memberId]);
    const totalAtt = attRes[0].total || 0;
    const presentAtt = attRes[0].present || 0;
    const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

    // 2. Contribution consistency
    const contrRes = await query(`
      SELECT COUNT(*) as pending_count FROM contributions
      WHERE member_id = ? AND status = 'pending'
    `, [memberId]);
    const pendingContributions = contrRes[0].pending_count || 0;

    // 3. User details to fetch group
    const userRes = await query('SELECT group_id FROM users WHERE id = ?', [memberId]);
    const groupId = userRes[0]?.group_id;
    const groupSavings = await getGroupSavings(groupId);

    res.json({
      attendanceRate,
      pendingContributions,
      groupSavings,
      isEligible: attendanceRate >= 75 && pendingContributions === 0
    });
  } catch (err) {
    console.error('Fetch Metrics Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/loans - List loans depending on RBAC
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT l.*, u.name as member_name, u.email as member_email, g.name as group_name 
      FROM loans l
      JOIN users u ON l.member_id = u.id
      JOIN \`groups\` g ON l.group_id = g.id
    `;
    let params = [];

    if (req.user.role === 'admin') {
      // Sees all
    } else if (req.user.role === 'chief') {
      sql += ' WHERE l.group_id = ?';
      params = [req.user.group_id];
    } else {
      sql += ' WHERE l.member_id = ?';
      params = [req.user.id];
    }

    sql += ' ORDER BY l.created_at DESC';
    const loans = await query(sql, params);
    res.json(loans);
  } catch (err) {
    console.error('Fetch Loans Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/loans/apply - Apply for loan (Member only)
router.post('/apply', authenticateToken, requireRole(['member']), async (req, res) => {
  const { amount, purpose, term_months } = req.body;
  const groupId = req.user.group_id;
  const memberId = req.user.id;

  if (!amount || !purpose || !term_months) {
    return res.status(400).json({ message: 'Amount, purpose, and term_months are required' });
  }

  try {
    // Check group savings first
    const savings = await getGroupSavings(groupId);
    if (parseFloat(amount) > savings) {
      return res.status(400).json({ 
        message: `Requested loan amount (RWF ${amount}) exceeds current group savings (RWF ${savings}).` 
      });
    }

    // Monthly installment calculation
    const monthly_installment = parseFloat(amount) / parseInt(term_months);

    const result = await query(`
      INSERT INTO loans (group_id, member_id, amount, purpose, term_months, monthly_installment, status, repayment_status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending_chief', 'unpaid')
    `, [groupId, memberId, amount, purpose, term_months, monthly_installment]);

    const loanId = result.insertId;

    // Send notification to Chief of the group
    const chiefs = await query('SELECT id FROM users WHERE group_id = ? AND role = \'chief\'', [groupId]);
    if (chiefs.length > 0) {
      await query(`
        INSERT INTO notifications (group_id, member_id, type, title, message)
        VALUES (?, ?, 'loan_update', 'New Loan Application', ?)
      `, [groupId, chiefs[0].id, `${req.user.name} applied for a loan of RWF ${amount}. Please review.`]);
    }

    await logAction(memberId, req.user.name, groupId, 'Apply Loan', `Applied for a loan of RWF ${amount}`);

    res.status(201).json({
      id: loanId,
      amount,
      purpose,
      term_months,
      monthly_installment,
      status: 'pending_chief'
    });
  } catch (err) {
    console.error('Apply Loan Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/loans/:id/recommend - Chief recommends loan (Chief only)
router.post('/:id/recommend', authenticateToken, requireRole(['chief']), async (req, res) => {
  const loanId = req.params.id;
  const { decision, remarks } = req.body; // decision = 'approve' or 'reject'

  if (!decision || !['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Decision (approve/reject) is required' });
  }

  try {
    const loanRes = await query('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (loanRes.length === 0) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    const loan = loanRes[0];
    if (loan.group_id !== req.user.group_id) {
      return res.status(403).json({ message: 'Unauthorized to review this loan' });
    }

    const nextStatus = decision === 'approve' ? 'pending_admin' : 'rejected';

    await query(`
      UPDATE loans 
      SET status = ?, chief_recommendation = ? 
      WHERE id = ?
    `, [nextStatus, remarks || 'Chief recommended ' + decision, loanId]);

    // Send notifications
    if (nextStatus === 'pending_admin') {
      // Notify Admin
      const admins = await query('SELECT id FROM users WHERE role = \'admin\'');
      for (const admin of admins) {
        await query(`
          INSERT INTO notifications (group_id, member_id, type, title, message)
          VALUES (NULL, ?, 'loan_update', 'Loan Requires Admin Approval', ?)
        `, [admin.id, `Loan ID ${loanId} recommended by Chief. Requires final approval.`]);
      }
    } else {
      // Notify Member of Chief's rejection
      await query(`
        INSERT INTO notifications (group_id, member_id, type, title, message)
        VALUES (?, ?, 'loan_update', 'Loan Rejected by Chief', ?)
      `, [loan.group_id, loan.member_id, `Your loan of RWF ${loan.amount} was rejected by your Chief.`]);
    }

    await logAction(req.user.id, req.user.name, loan.group_id, 'Recommend Loan', `Chief reviewed loan ID ${loanId} and set status to ${nextStatus}`);

    res.json({ message: `Loan recommended status updated to ${nextStatus}` });
  } catch (err) {
    console.error('Recommend Loan Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/loans/:id/approve - Admin final approval (Admin only)
router.post('/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  const loanId = req.params.id;
  const { decision, remarks } = req.body; // decision = 'approve' or 'reject'

  if (!decision || !['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Decision (approve/reject) is required' });
  }

  try {
    const loanRes = await query('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (loanRes.length === 0) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    const loan = loanRes[0];
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected';

    await query(`
      UPDATE loans 
      SET status = ?, admin_remarks = ? 
      WHERE id = ?
    `, [nextStatus, remarks || 'Admin decision: ' + decision, loanId]);

    // Notify Member and Chief
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, 'loan_update', 'Loan Decision Update', ?)
    `, [loan.group_id, loan.member_id, `Your loan application for RWF ${loan.amount} has been ${nextStatus} by the Admin.`]);

    await logAction(req.user.id, req.user.name, loan.group_id, 'Approve Loan', `Admin resolved loan ID ${loanId} to status ${nextStatus}`);

    res.json({ message: `Loan status finalized to ${nextStatus}` });
  } catch (err) {
    console.error('Approve Loan Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/loans/:id/repay - Record repayment (Member pays, or Chief records)
router.post('/:id/repay', authenticateToken, async (req, res) => {
  const loanId = req.params.id;
  const { amount } = req.body;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Valid repayment amount is required' });
  }

  try {
    const loanRes = await query('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (loanRes.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const loan = loanRes[0];
    
    // RBAC validation
    if (req.user.role === 'member' && loan.member_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to repay this loan' });
    }
    if (req.user.role === 'chief' && loan.group_id !== req.user.group_id) {
      return res.status(403).json({ message: 'Unauthorized to repay for this group' });
    }

    if (loan.status !== 'approved') {
      return res.status(400).json({ message: 'Loan is not approved' });
    }

    const currentPaid = parseFloat(loan.total_paid || 0);
    const newPaid = currentPaid + parseFloat(amount);
    
    let repaymentStatus = 'partially_paid';
    if (newPaid >= parseFloat(loan.amount)) {
      repaymentStatus = 'fully_paid';
    }

    // Insert repayment record
    await query(`
      INSERT INTO loan_repayments (loan_id, amount)
      VALUES (?, ?)
    `, [loanId, amount]);

    // Update loan summary
    await query(`
      UPDATE loans 
      SET total_paid = ?, repayment_status = ? 
      WHERE id = ?
    `, [newPaid, repaymentStatus, loanId]);

    // Log action
    const memberRes = await query('SELECT name FROM users WHERE id = ?', [loan.member_id]);
    const memberName = memberRes[0]?.name || 'Member';

    await logAction(
      req.user.id,
      req.user.name,
      loan.group_id,
      'Loan Repayment',
      `Repayment of RWF ${amount} for loan ID ${loanId} (${memberName})`
    );

    res.json({
      message: 'Repayment recorded successfully',
      loan: {
        id: loanId,
        total_paid: newPaid,
        repayment_status: repaymentStatus
      }
    });
  } catch (err) {
    console.error('Repay Loan Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
