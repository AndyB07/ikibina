const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports - Consolidated group report
router.get('/', authenticateToken, async (req, res) => {
  let targetGroupId = req.user.group_id;

  if (req.user.role === 'admin') {
    // Admin can specify group_id in query, or see all combined if null
    targetGroupId = req.query.group_id || null;
  }

  try {
    let sqlGroupFilter = '';
    let params = [];
    if (targetGroupId) {
      sqlGroupFilter = ' WHERE group_id = ?';
      params = [targetGroupId];
    }

    // 1. Contributions Summary
    const contribs = await query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'missed' THEN amount ELSE 0 END) as total_missed,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_count
      FROM contributions
      ${sqlGroupFilter}
    `, params);

    // 2. Attendance Summary
    const att = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count
      FROM attendance
      ${sqlGroupFilter}
    `, params);

    // 3. Loans Summary
    const loans = await query(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'pending_chief' OR status = 'pending_admin' THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_disbursed,
        SUM(CASE WHEN status = 'approved' THEN total_paid ELSE 0 END) as total_repaid
      FROM loans
      ${sqlGroupFilter}
    `, params);

    // 4. Fines Summary
    const fines = await query(`
      SELECT 
        COUNT(*) as total_fines,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_outstanding
      FROM fines
      ${sqlGroupFilter}
    `, params);

    // 5. Member count
    let memberSql = "SELECT COUNT(*) as member_count FROM users WHERE role = 'member'";
    if (targetGroupId) {
      memberSql += " AND group_id = ?";
    }
    const memberRes = await query(memberSql, params);

    // Group Savings calculation
    const totalPaidContributions = parseFloat(contribs[0]?.total_paid || 0);
    const totalPaidFines = parseFloat(fines[0]?.total_collected || 0);
    const totalRepayments = parseFloat(loans[0]?.total_repaid || 0);
    const totalDisbursedLoans = parseFloat(loans[0]?.total_disbursed || 0);
    const groupSavings = totalPaidContributions + totalPaidFines + totalRepayments - totalDisbursedLoans;

    res.json({
      group_id: targetGroupId,
      members: memberRes[0]?.member_count || 0,
      savings: groupSavings,
      contributions: {
        total_paid: totalPaidContributions,
        total_pending: parseFloat(contribs[0]?.total_pending || 0),
        total_missed: parseFloat(contribs[0]?.total_missed || 0),
        paid_count: contribs[0]?.paid_count || 0,
        pending_count: contribs[0]?.pending_count || 0,
        missed_count: contribs[0]?.missed_count || 0
      },
      attendance: {
        present: att[0]?.present_count || 0,
        absent: att[0]?.absent_count || 0,
        late: att[0]?.late_count || 0,
        total: att[0]?.total_records || 0,
        rate: att[0]?.total_records > 0 ? Math.round((att[0]?.present_count / att[0]?.total_records) * 100) : 100
      },
      loans: {
        total_applications: loans[0]?.total_applications || 0,
        approved_count: loans[0]?.approved_count || 0,
        pending_count: loans[0]?.pending_count || 0,
        total_disbursed: totalDisbursedLoans,
        total_repaid: totalRepayments,
        outstanding: totalDisbursedLoans - totalRepayments
      },
      fines: {
        total_fines: fines[0]?.total_fines || 0,
        total_collected: totalPaidFines,
        total_outstanding: parseFloat(fines[0]?.total_outstanding || 0)
      }
    });
  } catch (err) {
    console.error('Generate Report Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
