const express = require('express');
const path = require('path');
const store = require('./src/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/meta', (req, res) => {
  res.json({ types: store.TYPES, statuses: store.STATUSES, priorities: store.PRIORITIES });
});

app.get('/api/stats', (req, res) => {
  res.json(store.getStats());
});

app.get('/api/activities', (req, res) => {
  const { type, status, date, from, to, q } = req.query;
  res.json(store.listActivities({ type, status, date, from, to, q }));
});

app.get('/api/activities/:id', (req, res) => {
  const activity = store.getActivity(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Actividad no encontrada' });
  res.json(activity);
});

app.post('/api/activities', (req, res) => {
  try {
    const activity = store.createActivity(req.body || {});
    res.status(201).json(activity);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

app.put('/api/activities/:id', (req, res) => {
  try {
    const activity = store.updateActivity(req.params.id, req.body || {});
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(activity);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

app.patch('/api/activities/:id/status', (req, res) => {
  try {
    const { status } = req.body || {};
    const activity = store.updateActivity(req.params.id, { status });
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(activity);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
});

app.delete('/api/activities/:id', (req, res) => {
  const ok = store.deleteActivity(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Actividad no encontrada' });
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Task manager escuchando en http://localhost:${PORT}`);
});
