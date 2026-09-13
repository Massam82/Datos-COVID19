const express = require('express');
const path = require('path');
const store = require('./src/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

app.get('/api/meta', (req, res) => {
  res.json({ types: store.TYPES, statuses: store.STATUSES, priorities: store.PRIORITIES });
});

app.get(
  '/api/stats',
  asyncRoute(async (req, res) => {
    res.json(await store.getStats());
  })
);

app.get(
  '/api/activities',
  asyncRoute(async (req, res) => {
    const { type, status, date, from, to, q } = req.query;
    res.json(await store.listActivities({ type, status, date, from, to, q }));
  })
);

app.get(
  '/api/activities/:id',
  asyncRoute(async (req, res) => {
    const activity = await store.getActivity(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(activity);
  })
);

app.post(
  '/api/activities',
  asyncRoute(async (req, res) => {
    const activity = await store.createActivity(req.body || {});
    res.status(201).json(activity);
  })
);

app.put(
  '/api/activities/:id',
  asyncRoute(async (req, res) => {
    const activity = await store.updateActivity(req.params.id, req.body || {});
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(activity);
  })
);

app.patch(
  '/api/activities/:id/status',
  asyncRoute(async (req, res) => {
    const { status } = req.body || {};
    const activity = await store.updateActivity(req.params.id, { status });
    if (!activity) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(activity);
  })
);

app.delete(
  '/api/activities/:id',
  asyncRoute(async (req, res) => {
    const ok = await store.deleteActivity(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.status(204).end();
  })
);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message, details: err.details });
});

app.listen(PORT, () => {
  console.log(`Task manager escuchando en http://localhost:${PORT}`);
});
