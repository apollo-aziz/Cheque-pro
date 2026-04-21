/**
 * MySQL Database API - Replaces Supabase calls
 * This module provides database operations using MySQL
 */

import { query, transaction } from './db';
import type { Check, SystemSettings } from '../types';

// ==================== CHECKS API ====================

export async function getAllChecks(): Promise<Check[]> {
  const rows = await query<any>(
    `SELECT 
      id, check_number, bank_name, amount, 
      DATE_FORMAT(issue_date, '%Y-%m-%d') as issue_date,
      DATE_FORMAT(due_date, '%Y-%m-%d') as due_date,
      entity_name, type, status, notes, image_url,
      DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') as created_at,
      fund_name, amount_in_words
    FROM checks ORDER BY due_date DESC`
  );
  return rows as Check[];
}

export async function getCheckById(id: string): Promise<Check | null> {
  const rows = await query<any>(
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
  return rows[0] as Check || null;
}

export async function createCheck(check: Omit<Check, 'id' | 'created_at'>): Promise<Check> {
  const id = crypto.randomUUID();
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
      '550e8400-e29b-41d4-a716-446655440000' // Default admin user
    ]
  );
  return getCheckById(id) as Promise<Check>;
}

export async function updateCheck(id: string, updates: Partial<Check>): Promise<Check | null> {
  const fields: string[] = [];
  const values: any[] = [];
  
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

export async function deleteCheck(id: string): Promise<boolean> {
  const result = await query<{ affectedRows: number }>('DELETE FROM checks WHERE id = ?', [id]);
  return (result as any).affectedRows > 0;
}

// ==================== SETTINGS API ====================

export async function getSettings(userId: string): Promise<SystemSettings | null> {
  const rows = await query<any>(
    `SELECT 
      user_id, company_name, currency, timezone, date_format,
      DATE_FORMAT(fiscal_start, '%Y-%m-%d') as fiscal_start,
      alert_before, alert_delay, alert_method, alert_days, logo_url
    FROM settings WHERE user_id = ?`,
    [userId]
  );
  return rows[0] as SystemSettings || null;
}

export async function updateSettings(userId: string, settings: Partial<SystemSettings>): Promise<SystemSettings | null> {
  const fields: string[] = [];
  const values: any[] = [];
  
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

// ==================== STATISTICS API ====================

export async function getCheckStatistics() {
  const [totalResult, statusResult, typeResult] = await Promise.all([
    query<any>('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM checks'),
    query<any>(`SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM checks GROUP BY status`),
    query<any>(`SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM checks GROUP BY type`)
  ]);
  
  return {
    total: totalResult[0],
    byStatus: statusResult,
    byType: typeResult
  };
}

export async function getUpcomingChecks(days: number = 7) {
  const rows = await query<any>(
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
