const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({ activities: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { activities: [] };
  }
}

function writeDb(data) {
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, DB_PATH);
}

const TYPES = ['tarea', 'trabajo', 'cita_medica', 'cita_trabajo', 'otro'];
const STATUSES = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
const PRIORITIES = ['baja', 'media', 'alta'];

function listActivities(filters = {}) {
  const { activities } = readDb();
  let result = [...activities];

  if (filters.type) result = result.filter((a) => a.type === filters.type);
  if (filters.status) result = result.filter((a) => a.status === filters.status);
  if (filters.date) result = result.filter((a) => a.date === filters.date);
  if (filters.from) result = result.filter((a) => a.date >= filters.from);
  if (filters.to) result = result.filter((a) => a.date <= filters.to);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q)
    );
  }

  result.sort((a, b) => {
    const dateCompare = (a.date || '').localeCompare(b.date || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.time || '').localeCompare(b.time || '');
  });

  return result;
}

function getActivity(id) {
  const { activities } = readDb();
  return activities.find((a) => a.id === id) || null;
}

function validate(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial || payload.title !== undefined) {
    if (!payload.title || !String(payload.title).trim()) {
      errors.push('El campo "title" es obligatorio.');
    }
  }
  if (!partial || payload.date !== undefined) {
    if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      errors.push('El campo "date" es obligatorio con formato YYYY-MM-DD.');
    }
  }
  if (payload.type !== undefined && !TYPES.includes(payload.type)) {
    errors.push(`El campo "type" debe ser uno de: ${TYPES.join(', ')}.`);
  }
  if (payload.status !== undefined && !STATUSES.includes(payload.status)) {
    errors.push(`El campo "status" debe ser uno de: ${STATUSES.join(', ')}.`);
  }
  if (payload.priority !== undefined && !PRIORITIES.includes(payload.priority)) {
    errors.push(`El campo "priority" debe ser uno de: ${PRIORITIES.join(', ')}.`);
  }
  if (payload.time !== undefined && payload.time !== '' && !/^\d{2}:\d{2}$/.test(payload.time)) {
    errors.push('El campo "time" debe tener formato HH:MM.');
  }

  return errors;
}

function createActivity(payload) {
  const errors = validate(payload);
  if (errors.length) {
    const err = new Error('Datos invalidos');
    err.details = errors;
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
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
    createdAt: now,
    updatedAt: now,
  };

  const db = readDb();
  db.activities.push(activity);
  writeDb(db);
  return activity;
}

function updateActivity(id, payload) {
  const errors = validate(payload, { partial: true });
  if (errors.length) {
    const err = new Error('Datos invalidos');
    err.details = errors;
    err.status = 400;
    throw err;
  }

  const db = readDb();
  const idx = db.activities.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  const current = db.activities[idx];
  const updated = {
    ...current,
    ...payload,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  db.activities[idx] = updated;
  writeDb(db);
  return updated;
}

function deleteActivity(id) {
  const db = readDb();
  const idx = db.activities.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  db.activities.splice(idx, 1);
  writeDb(db);
  return true;
}

function getStats() {
  const { activities } = readDb();
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  const notDone = (a) => a.status !== 'completada' && a.status !== 'cancelada';

  return {
    total: activities.length,
    today: activities.filter((a) => a.date === today && notDone(a)).length,
    overdue: activities.filter((a) => a.date < today && notDone(a)).length,
    upcoming: activities.filter((a) => a.date > today && a.date <= in7Str && notDone(a)).length,
    completed: activities.filter((a) => a.status === 'completada').length,
    byType: TYPES.reduce((acc, t) => {
      acc[t] = activities.filter((a) => a.type === t && notDone(a)).length;
      return acc;
    }, {}),
  };
}

module.exports = {
  TYPES,
  STATUSES,
  PRIORITIES,
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  getStats,
};
