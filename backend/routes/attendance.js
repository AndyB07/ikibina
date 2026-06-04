const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, logAction } = require('../middleware/auth');

// GET /api/attendance/meetings - List meetings scheduled
router.get('/meetings', authenticateToken, async (req, res) => {
  try {
    let sql = 'SELECT m.*, g.name as group_name FROM meetings m JOIN \`groups\` g ON m.group_id = g.id';
    let params = [];

    if (req.user.role !== 'admin') {
      sql += ' WHERE m.group_id = ?';
      params = [req.user.group_id];
    }

    sql += ' ORDER BY m.meeting_date DESC';
    const meetings = await query(sql, params);
    res.json(meetings);
  } catch (err) {
    console.error('Fetch Meetings Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/meetings - Schedule/Create a meeting (Admin or Chief)
router.post('/meetings', authenticateToken, async (req, res) => {
  const { meeting_date, meeting_time, notes, group_id } = req.body;
  const targetGroupId = req.user.role === 'admin' ? group_id : req.user.group_id;

  if (!meeting_date || !meeting_time || !targetGroupId) {
    return res.status(400).json({ message: 'Meeting date, time and group are required' });
  }

  try {
    const result = await query(`
      INSERT INTO meetings (group_id, meeting_date, meeting_time, notes)
      VALUES (?, ?, ?, ?)
    `, [targetGroupId, meeting_date, meeting_time, notes || '']);

    const meetingId = result.insertId;

    // Fetch all members of this group and pre-insert attendance records as 'absent' by default, or let them be blank.
    // Pre-inserting empty records makes it easy to edit them on the UI.
    const groupMembers = await query('SELECT id FROM users WHERE group_id = ? AND role = \'member\'', [targetGroupId]);
    
    for (const member of groupMembers) {
      // Check if attendance record exists
      const existing = await query('SELECT id FROM attendance WHERE meeting_id = ? AND member_id = ?', [meetingId, member.id]);
      if (existing.length === 0) {
        await query(`
          INSERT INTO attendance (group_id, member_id, meeting_id, status)
          VALUES (?, ?, ?, 'absent')
        `, [targetGroupId, member.id, meetingId]);
      }
    }

    await logAction(req.user.id, req.user.name, targetGroupId, 'Schedule Meeting', `Scheduled a meeting on ${meeting_date} at ${meeting_time}`);

    res.status(201).json({
      id: meetingId,
      group_id: targetGroupId,
      meeting_date,
      meeting_time,
      notes
    });
  } catch (err) {
    console.error('Create Meeting Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance - View attendance log based on role
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT a.*, u.name as member_name, g.name as group_name, m.meeting_date, m.meeting_time
      FROM attendance a
      JOIN users u ON a.member_id = u.id
      JOIN \`groups\` g ON a.group_id = g.id
      JOIN meetings m ON a.meeting_id = m.id
    `;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees all
    } else if (req.user.role === 'chief') {
      sql += ' WHERE a.group_id = ?';
      params = [req.user.group_id];
    } else {
      sql += ' WHERE a.member_id = ?';
      params = [req.user.id];
    }

    sql += ' ORDER BY m.meeting_date DESC, u.name ASC';
    const logs = await query(sql, params);
    res.json(logs);
  } catch (err) {
    console.error('Fetch Attendance Logs Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/mark - Mark attendance (Chief or Admin)
router.post('/mark', authenticateToken, async (req, res) => {
  const { meeting_id, attendance_list } = req.body; // array of { member_id, status }
  
  if (!meeting_id || !Array.isArray(attendance_list)) {
    return res.status(400).json({ message: 'meeting_id and attendance_list (array) are required' });
  }

  try {
    // Validate meeting existence and ownership
    const meetingRes = await query('SELECT group_id FROM meetings WHERE id = ?', [meeting_id]);
    if (meetingRes.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const meetingGroupId = meetingRes[0].group_id;

    if (req.user.role !== 'admin' && req.user.group_id !== meetingGroupId) {
      return res.status(403).json({ message: 'Unauthorized to mark attendance for this group' });
    }

    for (const record of attendance_list) {
      const { member_id, status } = record; // present, absent, late
      if (!['present', 'absent', 'late'].includes(status)) continue;

      // Check if attendance already exists
      const existing = await query('SELECT id, status FROM attendance WHERE meeting_id = ? AND member_id = ?', [meeting_id, member_id]);
      
      let fineAmount = 0.00;
      let fineStatus = 'none';

      if (status === 'absent') {
        fineAmount = 1000.00; // 1000 RWF for absence
        fineStatus = 'unpaid';
      } else if (status === 'late') {
        fineAmount = 500.00; // 500 RWF for being late
        fineStatus = 'unpaid';
      }

      if (existing.length > 0) {
        // Update attendance
        await query(`
          UPDATE attendance 
          SET status = ?, fine_amount = ?, fine_status = ? 
          WHERE meeting_id = ? AND member_id = ?
        `, [status, fineAmount, fineStatus, meeting_id, member_id]);
      } else {
        // Insert attendance
        await query(`
          INSERT INTO attendance (group_id, member_id, meeting_id, status, fine_amount, fine_status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [meetingGroupId, member_id, meeting_id, status, fineAmount, fineStatus]);
      }

      // If fine is triggered, insert it into the fines table as well
      if (fineAmount > 0) {
        const fineType = status === 'absent' ? 'meeting_absence' : 'late_payment';
        const description = status === 'absent' ? 'Meeting absence fee triggered automatically' : 'Late attendance fee triggered automatically';
        
        // Check if fine already logged for this meeting & member
        const fineExists = await query('SELECT id FROM fines WHERE group_id = ? AND member_id = ? AND type = ? AND created_at >= (SELECT created_at FROM meetings WHERE id = ?)', [meetingGroupId, member_id, fineType, meeting_id]);
        
        if (fineExists.length === 0) {
          await query(`
            INSERT INTO fines (group_id, member_id, type, amount, status, description)
            VALUES (?, ?, ?, ?, 'unpaid', ?)
          `, [meetingGroupId, member_id, fineType, fineAmount, description]);

          // Create notification for member
          await query(`
            INSERT INTO notifications (group_id, member_id, type, title, message)
            VALUES (?, ?, 'emergency', 'Discipline Fine Issued', ?)
          `, [meetingGroupId, member_id, `You have been fined RWF ${fineAmount} for meeting status: ${status}.`]);
        }
      }
    }

    await logAction(req.user.id, req.user.name, meetingGroupId, 'Mark Attendance', `Logged attendance for meeting ID ${meeting_id}`);

    res.json({ message: 'Attendance marked successfully' });
  } catch (err) {
    console.error('Mark Attendance Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
