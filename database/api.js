const { query, transaction } = require('./db');

async function getAllChecks() {
  const rows = await query(
    `SELECT 
      id, check_number, bank_name, amount, 
      DATE_FORMAT(issue_date, '%Y-%m-%d') as issue_date,
      DATE_FORMAT(due_date, '%Y-%m-%d') as due_date,
      entity_name, type, status, notes, image_url,
      DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at,
      fund_name, amount_in_words
    FROM checks ORDER BY created_at DESC`
  );
  return rows;
}

async function getCheckById(id) {
  const rows = await query(
    `SELECT 
      id, check_number, bank_name, amount,
      DATE_FORMAT(issue_date, '%Y-%m-%d') as issue_date,
      DATE_FORMAT(due_date, '%Y-%m-%d') as due_date,
      entity_name, type, status, notes, image_url,
      DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at,
      fund_name, amount_in_words
    FROM checks WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function createCheck(check) {
  const id = require('crypto').randomUUID();
  await query(
    `INSERT INTO checks (
      id, check_number, bank_name, amount, issue_date, due_date,
      entity_name, type, status, notes, image_url, fund_name, amount_in_words, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      check.check_number,
      check.bank_name,
      check.amount,
      check.issue_date,
      check.due_date,
      check.entity_name,
      check.type,
      check.status,
      check.notes || null,
      check.image_url || null,
      check.fund_name || null,
      check.amount_in_words || null,
      check.created_by || '550e8400-e29b-41d4-a716-446655440000'
    ]
  );
  return getCheckById(id);
}

async function updateCheck(id, updates) {
  const fields = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return getCheckById(id);

  values.push(id);
  await query(
    `UPDATE checks SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getCheckById(id);
}

async function deleteCheck(id) {
  const result = await query('DELETE FROM checks WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getSettings(userId) {
  const rows = await query(
    `SELECT 
      user_id, company_name, currency, timezone, date_format,
      DATE_FORMAT(fiscal_start, '%Y-%m-%d') as fiscal_start,
      alert_before, alert_delay, alert_method, alert_days, logo_url, ai_enabled
    FROM settings WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function updateSettings(userId, settings) {
  const fields = [];
  const values = [];

  Object.entries(settings).forEach(([key, value]) => {
    if (value !== undefined && key !== 'user_id') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) return getSettings(userId);

  values.push(userId);
  await query(
    `UPDATE settings SET ${fields.join(', ')} WHERE user_id = ?`,
    values
  );

  return getSettings(userId);
}

async function getCheckStatistics() {
  const [totalResult, statusResult, typeResult] = await Promise.all([
    query('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM checks'),
    query(`SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM checks GROUP BY status`),
    query(`SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM checks GROUP BY type`)
  ]);

  return {
    total: totalResult[0],
    byStatus: statusResult,
    byType: typeResult
  };
}

async function getUpcomingChecks(days = 7) {
  const rows = await query(
    `SELECT 
      id, check_number, bank_name, amount, due_date, entity_name, type, status
    FROM checks 
    WHERE due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
    AND status = 'pending'
    ORDER BY due_date ASC`,
    [days]
  );
  return rows;
}

async function getUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function createUser(user) {
  const id = require('crypto').randomUUID();
  await query(
    `INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`,
    [id, user.email, user.password_hash, user.full_name || '', user.role || 'user']
  );
  return { id, email: user.email, full_name: user.full_name, role: user.role || 'user' };
}

module.exports = {
  getAllChecks,
  getCheckById,
  createCheck,
  updateCheck,
  deleteCheck,
  getSettings,
  updateSettings,
  getCheckStatistics,
  getUpcomingChecks,
  getUserByEmail,
  createUser
};
