const { pool } = require('./db');
const bcrypt = require('bcryptjs');

async function initDB() {
  console.log("Initializing database tables...");
  
  // 1. Groups Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`groups\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL,
      \`code\` VARCHAR(50) UNIQUE NOT NULL,
      \`district\` VARCHAR(100) NOT NULL,
      \`sector\` VARCHAR(100) NOT NULL,
      \`cell\` VARCHAR(100) NOT NULL,
      \`village\` VARCHAR(100) NOT NULL,
      \`launch_date\` DATE NOT NULL,
      \`launch_time\` TIME NOT NULL,
      \`status\` ENUM('active', 'inactive') DEFAULT 'active',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("- Groups table created or verified.");

  // 2. Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL,
      \`email\` VARCHAR(100) UNIQUE NOT NULL,
      \`phone\` VARCHAR(20) NOT NULL,
      \`password\` VARCHAR(255) NOT NULL,
      \`role\` ENUM('admin', 'chief', 'member') NOT NULL,
      \`status\` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      \`group_id\` INT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE SET NULL
    )
  `);
  console.log("- Users table created or verified.");

  // 3. Contributions Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`contributions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`member_id\` INT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`payment_date\` TIMESTAMP NULL,
      \`status\` ENUM('paid', 'pending', 'missed') DEFAULT 'pending',
      \`week_number\` INT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`member_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Contributions table created or verified.");

  // 4. Meetings Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`meetings\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`meeting_date\` DATE NOT NULL,
      \`meeting_time\` TIME NOT NULL,
      \`notes\` TEXT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Meetings table created or verified.");

  // 5. Attendance Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`attendance\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`member_id\` INT NOT NULL,
      \`meeting_id\` INT NOT NULL,
      \`status\` ENUM('present', 'absent', 'late') NOT NULL,
      \`fine_amount\` DECIMAL(10, 2) DEFAULT 0.00,
      \`fine_status\` ENUM('none', 'unpaid', 'paid') DEFAULT 'none',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`member_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`meeting_id\`) REFERENCES \`meetings\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Attendance table created or verified.");

  // 6. Loans Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`loans\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`member_id\` INT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`purpose\` TEXT NOT NULL,
      \`status\` ENUM('pending_chief', 'pending_admin', 'approved', 'rejected') DEFAULT 'pending_chief',
      \`repayment_status\` ENUM('unpaid', 'partially_paid', 'fully_paid') DEFAULT 'unpaid',
      \`term_months\` INT NOT NULL DEFAULT 3,
      \`monthly_installment\` DECIMAL(15, 2) NOT NULL,
      \`total_paid\` DECIMAL(15, 2) DEFAULT 0.00,
      \`chief_recommendation\` TEXT NULL,
      \`admin_remarks\` TEXT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`member_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Loans table created or verified.");

  // 7. Loan Repayments Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`loan_repayments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`loan_id\` INT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`payment_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`loan_id\`) REFERENCES \`loans\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Loan Repayments table created or verified.");

  // 8. Fines Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`fines\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`member_id\` INT NOT NULL,
      \`type\` ENUM('late_payment', 'meeting_absence', 'rule_violation') NOT NULL,
      \`amount\` DECIMAL(10, 2) NOT NULL,
      \`status\` ENUM('unpaid', 'paid') DEFAULT 'unpaid',
      \`description\` TEXT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`member_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Fines table created or verified.");

  // 9. Notifications Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NULL,
      \`member_id\` INT NULL,
      \`type\` ENUM('payment_reminder', 'meeting_reminder', 'loan_update', 'voting_announcement', 'winner_notification', 'emergency', 'system') NOT NULL,
      \`title\` VARCHAR(150) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`is_read\` BOOLEAN DEFAULT FALSE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`member_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Notifications table created or verified.");

  // 10. Audit Logs Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`audit_logs\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT NULL,
      \`username\` VARCHAR(100) NOT NULL,
      \`group_id\` INT NULL,
      \`action\` VARCHAR(100) NOT NULL,
      \`details\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE SET NULL
    )
  `);
  console.log("- Audit Logs table created or verified.");

  // 11. Messages Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`messages\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`sender_id\` INT NOT NULL,
      \`message\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Messages table created or verified.");

  // 12. Payments Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`payments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`group_id\` INT NOT NULL,
      \`user_id\` INT NOT NULL,
      \`payment_type\` ENUM('contribution', 'fine', 'loan_repayment') NOT NULL,
      \`target_id\` INT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`provider\` ENUM('MTN', 'Airtel') NOT NULL,
      \`phone_number\` VARCHAR(20) NOT NULL,
      \`reference_number\` VARCHAR(50) UNIQUE NOT NULL,
      \`status\` ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    )
  `);
  console.log("- Payments table created or verified.");

  // SEED DATA
  console.log("\nSeeding default data...");

  // Check if admin exists
  const [admins] = await pool.query("SELECT * FROM users WHERE email = 'admin@ikibina.com'");
  if (admins.length === 0) {
    const adminPass = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (name, email, phone, password, role, status, group_id)
      VALUES ('System Admin', 'admin@ikibina.com', '+250780000000', ?, 'admin', 'active', NULL)
    `, [adminPass]);
    console.log("- Hashed and seeded Admin (admin@ikibina.com / admin123)");
  }

  // Create a default group
  const [existingGroups] = await pool.query("SELECT * FROM \`groups\` WHERE code = 'G-ABIZ-001'");
  let groupId;
  if (existingGroups.length === 0) {
    const [result] = await pool.query(`
      INSERT INTO \`groups\` (name, code, district, sector, cell, village, launch_date, launch_time, status)
      VALUES ('Abizerwa Group', 'G-ABIZ-001', 'Gasabo', 'Kimironko', 'Kibagabaga', 'Karuruma', '2026-01-10', '10:00:00', 'active')
    `);
    groupId = result.insertId;
    console.log(`- Seeded Abizerwa Group (ID: ${groupId})`);
    
    // Log group creation
    await pool.query(`
      INSERT INTO audit_logs (username, group_id, action, details)
      VALUES ('System Admin', ?, 'Create Group', 'System auto-seeded Abizerwa Group')
    `, [groupId]);
  } else {
    groupId = existingGroups[0].id;
  }

  // Create a Chief
  const [chiefs] = await pool.query("SELECT * FROM users WHERE email = 'chief@ikibina.com'");
  let chiefId;
  if (chiefs.length === 0) {
    const chiefPass = await bcrypt.hash('chief123', 10);
    const [result] = await pool.query(`
      INSERT INTO users (name, email, phone, password, role, status, group_id)
      VALUES ('Jean Chief', 'chief@ikibina.com', '+250781111111', ?, 'chief', 'active', ?)
    `, [chiefPass, groupId]);
    chiefId = result.insertId;
    console.log(`- Seeded Chief: Jean Chief (chief@ikibina.com / chief123) for Group ID: ${groupId}`);
    
    // Seed contributions and a fine for Chief to verify personal payments
    await pool.query(`
      INSERT INTO contributions (group_id, member_id, amount, payment_date, status, week_number)
      VALUES (?, ?, 5000.00, NULL, 'pending', 1)
    `, [groupId, chiefId]);
    await pool.query(`
      INSERT INTO contributions (group_id, member_id, amount, payment_date, status, week_number)
      VALUES (?, ?, 5000.00, NULL, 'pending', 2)
    `, [groupId, chiefId]);
    await pool.query(`
      INSERT INTO fines (group_id, member_id, type, amount, description, status)
      VALUES (?, ?, 'late_payment', 1000.00, 'Late attendance fine', 'unpaid')
    `, [groupId, chiefId]);
    console.log("- Seeded Contributions and Fine for Jean Chief");
  } else {
    chiefId = chiefs[0].id;
  }

  // Create a Member
  const [members] = await pool.query("SELECT * FROM users WHERE email = 'member@ikibina.com'");
  let memberId;
  if (members.length === 0) {
    const memberPass = await bcrypt.hash('member123', 10);
    const [result] = await pool.query(`
      INSERT INTO users (name, email, phone, password, role, status, group_id)
      VALUES ('Marie Member', 'member@ikibina.com', '+250782222222', ?, 'member', 'active', ?)
    `, [memberPass, groupId]);
    memberId = result.insertId;
    console.log(`- Seeded Member: Marie Member (member@ikibina.com / member123) for Group ID: ${groupId}`);
  } else {
    memberId = members[0].id;
  }

  // Seed default contribution for week 1
  const [conts] = await pool.query("SELECT * FROM contributions WHERE member_id = ?", [memberId]);
  if (conts.length === 0) {
    await pool.query(`
      INSERT INTO contributions (group_id, member_id, amount, payment_date, status, week_number)
      VALUES (?, ?, 5000.00, CURRENT_TIMESTAMP, 'paid', 1)
    `, [groupId, memberId]);
    await pool.query(`
      INSERT INTO contributions (group_id, member_id, amount, payment_date, status, week_number)
      VALUES (?, ?, 5000.00, NULL, 'pending', 2)
    `, [groupId, memberId]);
    console.log("- Seeded Contributions for Marie Member (Week 1 Paid, Week 2 Pending)");
  }

  // Seed default meeting
  const [meetings] = await pool.query("SELECT * FROM meetings WHERE group_id = ?", [groupId]);
  let meetingId;
  if (meetings.length === 0) {
    const [result] = await pool.query(`
      INSERT INTO meetings (group_id, meeting_date, meeting_time, notes)
      VALUES (?, '2026-05-20', '18:00:00', 'Inaugural group meeting to discuss loans.')
    `, [groupId]);
    meetingId = result.insertId;
    console.log(`- Seeded Meeting (ID: ${meetingId})`);
    
    // Seed attendance
    await pool.query(`
      INSERT INTO attendance (group_id, member_id, meeting_id, status)
      VALUES (?, ?, ?, 'present')
    `, [groupId, memberId, meetingId]);
    await pool.query(`
      INSERT INTO attendance (group_id, member_id, meeting_id, status)
      VALUES (?, ?, ?, 'present')
    `, [groupId, chiefId, meetingId]);
    console.log("- Seeded Attendance (Marie and Jean present)");
  }

  console.log("Database initialized successfully!");
  process.exit(0);
}

initDB().catch(err => {
  console.error("Error initializing database:", err);
  process.exit(1);
});
