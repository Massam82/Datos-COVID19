const { Pool } = require('pg');
const crypto = require('crypto');
const { TYPES, validate, validationError } = require('./constants');

const useSsl = !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

const ready = pool.query(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

function toApi(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    date: row.date,
    time: row.time,
    location: row.location,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function listActivities(filters = {}) {
  await ready;
  const clauses = [];
  const values = [];

  const add = (sql, value) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.type) add('type = ?', filters.type);
  if (filters.status) add('status = ?', filters.status);
  if (filters.date) add('date = ?', filters.date);
  if (filters.from) add('date >= ?', filters.from);
  if (filters.to) add('date <= ?', filters.to);
  if (filters.q) {
    values.push(`%${filters.q.toLowerCase()}%`);
    clauses.push(
      `(lower(title) LIKE $${values.length} OR lower(description) LIKE $${values.length} OR lower(location) LIKE $${values.length})`
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM activities ${where} ORDER BY date ASC, time ASC`,
    values
  );
  return rows.map(toApi);
}

async function getActivity(id) {
  await ready;
  const { rows } = await pool.query('SELECT * FROM activities WHERE id = $1', [id]);
  return rows[0] ? toApi(rows[0]) : null;
}

async function createActivity(payload) {
  await ready;
  const errors = validate(payload);
  if (errors.length) throw validationError(errors);

  const activity = {
    id: crypto.randomUUID(),
    title: String(payload.title).trim(),
    description: payload.description ? String(payload.description).trim() : '',
    type: payload.type || 'tarea',
    date: payload.date,
    time: payload.time || '',
    location: payload.location ? String(payload.location).trim() : '',
    priority: payload.priority || 'media',
    status: payload.status || 'pendiente',
    notes: payload.notes ? String(payload.notes).trim() : '',
  };

  const { rows } = await pool.query(
    `INSERT INTO activities (id, title, description, type, date, time, location, priority, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      activity.id,
      activity.title,
      activity.description,
      activity.type,
      activity.date,
      activity.time,
      activity.location,
      activity.priority,
      activity.status,
      activity.notes,
    ]
  );
  return toApi(rows[0]);
}

async function updateActivity(id, payload) {
  await ready;
  const errors = validate(payload, { partial: true });
  if (errors.length) throw validationError(errors);

  const current = await getActivity(id);
  if (!current) return null;

  const merged = { ...current, ...payload };
  const { rows } = await pool.query(
    `UPDATE activities SET
       title = $2, description = $3, type = $4, date = $5, time = $6,
       location = $7, priority = $8, status = $9, notes = $10, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      merged.title,
      merged.description || '',
      merged.type,
      merged.date,
      merged.time || '',
      merged.location || '',
      merged.priority,
      merged.status,
      merged.notes || '',
    ]
  );
  return toApi(rows[0]);
}

async function deleteActivity(id) {
  await ready;
  const { rowCount } = await pool.query('DELETE FROM activities WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getStats() {
  await ready;
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);
  const notDone = "status NOT IN ('completada', 'cancelada')";

  const [total, todayCount, overdue, upcoming, completed, byType] = await Promise.all([
    pool.query('SELECT count(*)::int AS c FROM activities'),
    pool.query(`SELECT count(*)::int AS c FROM activities WHERE date = $1 AND ${notDone}`, [today]),
    pool.query(`SELECT count(*)::int AS c FROM activities WHERE date < $1 AND ${notDone}`, [today]),
    pool.query(
      `SELECT count(*)::int AS c FROM activities WHERE date > $1 AND date <= $2 AND ${notDone}`,
      [today, in7Str]
    ),
    pool.query(`SELECT count(*)::int AS c FROM activities WHERE status = 'completada'`),
    pool.query(`SELECT type, count(*)::int AS c FROM activities WHERE ${notDone} GROUP BY type`),
  ]);

  const byTypeMap = TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
  for (const row of byType.rows) byTypeMap[row.type] = row.c;

  return {
    total: total.rows[0].c,
    today: todayCount.rows[0].c,
    overdue: overdue.rows[0].c,
    upcoming: upcoming.rows[0].c,
    completed: completed.rows[0].c,
    byType: byTypeMap,
  };
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  getStats,
};
