const { pool } = require('./db');

async function addTestContributions() {
  try {
    // Get a member to add contributions for
    const [members] = await pool.query("SELECT id, group_id, name FROM users WHERE role = 'member' LIMIT 1");
    
    if (members.length === 0) {
      console.log('No members found. Please create a member first.');
      return;
    }

    const member = members[0];
    console.log(`Adding pending contributions for: ${member.name}`);

    // Add 3 pending contributions
    for (let week = 3; week <= 5; week++) {
      await pool.query(`
        INSERT INTO contributions (group_id, member_id, amount, status, week_number)
        VALUES (?, ?, 5000.00, 'pending', ?)
      `, [member.group_id, member.id, week]);
      console.log(`✓ Added Week ${week} contribution (pending)`);
    }

    console.log('\nTest contributions added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addTestContributions();
