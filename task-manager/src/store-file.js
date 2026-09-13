const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TYPES, validate, validationError } = require('./constants');

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

async function listActivities(filters = {}) {
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

async function getActivity(id) {
  const { activities } = readDb();
  return activities.find((a) => a.id === id) || null;
}

async function createActivity(payload) {
  const errors = validate(payload);
  if (errors.length) throw validationError(errors);

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

async function updateActivity(id, payload) {
  const errors = validate(payload, { partial: true });
  if (errors.length) throw validationError(errors);

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

async function deleteActivity(id) {
  const db = readDb();
  const idx = db.activities.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  db.activities.splice(idx, 1);
  writeDb(db);
  return true;
}

async function getStats() {
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
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  getStats,
};
