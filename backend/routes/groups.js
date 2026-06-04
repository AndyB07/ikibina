const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireRole, logAction } = require('../middleware/auth');

// GET /api/groups - List all groups (Admin can view all, others can only see theirs if role allows)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = 'SELECT * FROM \`groups\`';
    let params = [];
    
    // Non-admins can only see their own group details
    if (req.user.role !== 'admin') {
      if (!req.user.group_id) {
        return res.json([]); // No group assigned
      }
      sql = 'SELECT * FROM \`groups\` WHERE id = ?';
      params = [req.user.group_id];
    }
    
    const groups = await query(sql, params);
    res.json(groups);
  } catch (err) {
    console.error('Fetch Groups Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/groups/statistics - Admin stats on sectors & districts
router.get('/statistics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const districtStats = await query(`
      SELECT district, COUNT(*) as count 
      FROM \`groups\` 
      GROUP BY district
    `);

    const sectorStats = await query(`
      SELECT district, sector, COUNT(*) as count 
      FROM \`groups\` 
      GROUP BY district, sector
    `);

    const totalCount = await query(`
      SELECT COUNT(*) as total FROM \`groups\`
    `);

    res.json({
      totalGroups: totalCount[0].total,
      districts: districtStats,
      sectors: sectorStats
    });
  } catch (err) {
    console.error('Fetch Group Stats Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/groups - Create a group (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, code, district, sector, cell, village, launch_date, launch_time, status } = req.body;
  
  if (!name || !code || !district || !sector || !cell || !village || !launch_date || !launch_time) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await query('SELECT id FROM \`groups\` WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Group code already exists' });
    }

    const result = await query(`
      INSERT INTO \`groups\` (name, code, district, sector, cell, village, launch_date, launch_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, code, district, sector, cell, village, launch_date, launch_time, status || 'active']);

    const groupId = result.insertId;

    await logAction(req.user.id, req.user.name, groupId, 'Create Group', `Created group "${name}" with code ${code}`);

    res.status(201).json({
      id: groupId,
      name,
      code,
      district,
      sector,
      cell,
      village,
      launch_date,
      launch_time,
      status: status || 'active'
    });
  } catch (err) {
    console.error('Create Group Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/groups/:id - Update group details (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const groupId = req.params.id;
  const { name, code, district, sector, cell, village, launch_date, launch_time, status } = req.body;

  if (!name || !code || !district || !sector || !cell || !village || !launch_date || !launch_time) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await query('SELECT id FROM \`groups\` WHERE id = ?', [groupId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check code uniqueness excluding self
    const codeDup = await query('SELECT id FROM \`groups\` WHERE code = ? AND id != ?', [code, groupId]);
    if (codeDup.length > 0) {
      return res.status(400).json({ message: 'Group code already in use by another group' });
    }

    await query(`
      UPDATE \`groups\` 
      SET name = ?, code = ?, district = ?, sector = ?, cell = ?, village = ?, launch_date = ?, launch_time = ?, status = ?
      WHERE id = ?
    `, [name, code, district, sector, cell, village, launch_date, launch_time, status, groupId]);

    await logAction(req.user.id, req.user.name, groupId, 'Edit Group', `Updated group details for "${name}"`);

    res.json({ message: 'Group details updated successfully' });
  } catch (err) {
    console.error('Update Group Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/groups/:id/status - Toggle active/inactive (Admin only)
router.patch('/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  const groupId = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const existing = await query('SELECT name FROM \`groups\` WHERE id = ?', [groupId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await query('UPDATE \`groups\` SET status = ? WHERE id = ?', [status, groupId]);

    await logAction(req.user.id, req.user.name, groupId, 'Toggle Group Status', `Set status of group "${existing[0].name}" to ${status}`);

    res.json({ message: `Group status changed to ${status}` });
  } catch (err) {
    console.error('Toggle Group Status Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/groups/:id - Delete group (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const groupId = req.params.id;

  try {
    const existing = await query('SELECT name FROM \`groups\` WHERE id = ?', [groupId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Set group members' group_id to null or delete? DB has ON DELETE SET NULL, which is safe.
    await query('DELETE FROM \`groups\` WHERE id = ?', [groupId]);

    await logAction(req.user.id, req.user.name, null, 'Delete Group', `Deleted group "${existing[0].name}"`);

    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Delete Group Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
