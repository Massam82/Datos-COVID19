const TYPE_LABELS = {
  tarea: 'Tarea',
  trabajo: 'Trabajo',
  cita_medica: 'Cita médica',
  cita_trabajo: 'Cita de trabajo',
  otro: 'Otro',
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

let meta = { types: [], statuses: [], priorities: [] };
let activeQuickFilter = null;

const els = {
  todayLabel: document.getElementById('todayLabel'),
  statToday: document.getElementById('statToday'),
  statOverdue: document.getElementById('statOverdue'),
  statUpcoming: document.getElementById('statUpcoming'),
  statCompleted: document.getElementById('statCompleted'),
  agenda: document.getElementById('agenda'),
  emptyState: document.getElementById('emptyState'),
  fQuery: document.getElementById('fQuery'),
  fType: document.getElementById('fType'),
  fStatus: document.getElementById('fStatus'),
  fDate: document.getElementById('fDate'),
  btnClearFilters: document.getElementById('btnClearFilters'),
  btnNew: document.getElementById('btnNew'),
  btnEmptyNew: document.getElementById('btnEmptyNew'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  form: document.getElementById('activityForm'),
  fId: document.getElementById('fId'),
  fTitle: document.getElementById('fTitle'),
  fTypeInput: document.getElementById('fTypeInput'),
  fPriority: document.getElementById('fPriority'),
  fDateInput: document.getElementById('fDateInput'),
  fTime: document.getElementById('fTime'),
  fLocation: document.getElementById('fLocation'),
  fDescription: document.getElementById('fDescription'),
  fNotes: document.getElementById('fNotes'),
  fStatusInput: document.getElementById('fStatusInput'),
  formError: document.getElementById('formError'),
  btnCancel: document.getElementById('btnCancel'),
  stats: document.getElementById('stats'),
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatGroupDate(dateStr) {
  const today = todayISO();
  const d = new Date(`${dateStr}T00:00:00`);
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const formatted = d.toLocaleDateString('es-ES', options);
  if (dateStr === today) return { label: `Hoy · ${formatted}`, cls: 'is-today' };
  if (dateStr < today) return { label: formatted, cls: 'is-overdue' };
  return { label: formatted, cls: '' };
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || 'Error de red');
    err.details = body.details;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function populateSelects() {
  const typeOptions = meta.types
    .map((t) => `<option value="${t}">${TYPE_LABELS[t] || t}</option>`)
    .join('');
  const statusOptions = meta.statuses
    .map((s) => `<option value="${s}">${STATUS_LABELS[s] || s}</option>`)
    .join('');

  els.fType.insertAdjacentHTML('beforeend', typeOptions);
  els.fStatus.insertAdjacentHTML('beforeend', statusOptions);
  els.fTypeInput.innerHTML = typeOptions;
  els.fStatusInput.innerHTML = statusOptions;
}

async function loadMeta() {
  meta = await api('/api/meta');
  populateSelects();
}

async function loadStats() {
  const stats = await api('/api/stats');
  els.statToday.textContent = stats.today;
  els.statOverdue.textContent = stats.overdue;
  els.statUpcoming.textContent = stats.upcoming;
  els.statCompleted.textContent = stats.completed;
}

function buildQuery() {
  const params = new URLSearchParams();
  if (els.fQuery.value.trim()) params.set('q', els.fQuery.value.trim());
  if (els.fType.value) params.set('type', els.fType.value);
  if (els.fStatus.value) params.set('status', els.fStatus.value);
  if (els.fDate.value) params.set('date', els.fDate.value);
  return params.toString();
}

function applyQuickFilter(activities) {
  if (!activeQuickFilter) return activities;
  const today = todayISO();
  const notDone = (a) => a.status !== 'completada' && a.status !== 'cancelada';
  if (activeQuickFilter === 'today') return activities.filter((a) => a.date === today && notDone(a));
  if (activeQuickFilter === 'overdue') return activities.filter((a) => a.date < today && notDone(a));
  if (activeQuickFilter === 'upcoming') {
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString().slice(0, 10);
    return activities.filter((a) => a.date > today && a.date <= in7Str && notDone(a));
  }
  if (activeQuickFilter === 'completed') return activities.filter((a) => a.status === 'completada');
  return activities;
}

function renderCard(activity) {
  const isDone = activity.status === 'completada';
  const timeLabel = activity.time || '';
  return `
    <div class="card ${isDone ? 'is-done' : ''}" data-id="${activity.id}">
      <input type="checkbox" class="card-checkbox" ${isDone ? 'checked' : ''} title="Marcar como completada" />
      <div class="card-body">
        <div class="card-top">
          <span class="badge badge-${activity.type}">${TYPE_LABELS[activity.type] || activity.type}</span>
          <span class="badge badge-priority-${activity.priority}">${activity.priority}</span>
          ${timeLabel ? `<span class="card-time">🕒 ${timeLabel}</span>` : ''}
        </div>
        <p class="card-title">${escapeHtml(activity.title)}</p>
        <p class="card-meta">
          ${STATUS_LABELS[activity.status] || activity.status}
          ${activity.location ? ` · 📍 ${escapeHtml(activity.location)}` : ''}
        </p>
        ${activity.description ? `<p class="card-desc">${escapeHtml(activity.description)}</p>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-icon" data-action="edit" title="Editar">✏️</button>
        <button class="btn-icon" data-action="delete" title="Eliminar">🗑️</button>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadActivities() {
  const qs = buildQuery();
  let activities = await api(`/api/activities${qs ? `?${qs}` : ''}`);
  activities = applyQuickFilter(activities);

  if (!activities.length) {
    els.agenda.innerHTML = '';
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  const groups = new Map();
  for (const activity of activities) {
    if (!groups.has(activity.date)) groups.set(activity.date, []);
    groups.get(activity.date).push(activity);
  }

  const html = [...groups.entries()]
    .map(([date, items]) => {
      const { label, cls } = formatGroupDate(date);
      return `
        <div class="agenda-group">
          <h3 class="agenda-group-title ${cls}">${label}</h3>
          ${items.map(renderCard).join('')}
        </div>
      `;
    })
    .join('');

  els.agenda.innerHTML = html;
}

async function refreshAll() {
  await Promise.all([loadStats(), loadActivities()]);
}

function openModal(activity = null) {
  els.form.reset();
  els.formError.hidden = true;
  if (activity) {
    els.modalTitle.textContent = 'Editar actividad';
    els.fId.value = activity.id;
    els.fTitle.value = activity.title;
    els.fTypeInput.value = activity.type;
    els.fPriority.value = activity.priority;
    els.fDateInput.value = activity.date;
    els.fTime.value = activity.time || '';
    els.fLocation.value = activity.location || '';
    els.fDescription.value = activity.description || '';
    els.fNotes.value = activity.notes || '';
    els.fStatusInput.value = activity.status;
  } else {
    els.modalTitle.textContent = 'Nueva actividad';
    els.fId.value = '';
    els.fDateInput.value = todayISO();
    els.fStatusInput.value = 'pendiente';
    els.fPriority.value = 'media';
  }
  els.modal.showModal();
}

function closeModal() {
  els.modal.close();
}

async function handleSubmit(e) {
  e.preventDefault();
  const payload = {
    title: els.fTitle.value,
    type: els.fTypeInput.value,
    priority: els.fPriority.value,
    date: els.fDateInput.value,
    time: els.fTime.value,
    location: els.fLocation.value,
    description: els.fDescription.value,
    notes: els.fNotes.value,
    status: els.fStatusInput.value,
  };

  try {
    const id = els.fId.value;
    if (id) {
      await api(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/activities', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal();
    await refreshAll();
  } catch (err) {
    els.formError.textContent = (err.details || []).join(' ') || err.message;
    els.formError.hidden = false;
  }
}

async function handleAgendaClick(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.classList.contains('card-checkbox')) {
    const newStatus = e.target.checked ? 'completada' : 'pendiente';
    await api(`/api/activities/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
    await refreshAll();
    return;
  }

  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'edit') {
    const activity = await api(`/api/activities/${id}`);
    openModal(activity);
  } else if (action === 'delete') {
    if (confirm('¿Eliminar esta actividad?')) {
      await api(`/api/activities/${id}`, { method: 'DELETE' });
      await refreshAll();
    }
  }
}

function handleStatCardClick(e) {
  const card = e.target.closest('.stat-card');
  if (!card) return;
  const filter = card.dataset.filter;
  activeQuickFilter = activeQuickFilter === filter ? null : filter;
  [...els.stats.children].forEach((c) => c.classList.toggle('active', c.dataset.filter === activeQuickFilter));
  loadActivities();
}

function setupEvents() {
  els.btnNew.addEventListener('click', () => openModal());
  els.btnEmptyNew.addEventListener('click', () => openModal());
  els.btnCancel.addEventListener('click', closeModal);
  els.form.addEventListener('submit', handleSubmit);
  els.agenda.addEventListener('click', handleAgendaClick);
  els.stats.addEventListener('click', handleStatCardClick);

  els.btnClearFilters.addEventListener('click', () => {
    els.fQuery.value = '';
    els.fType.value = '';
    els.fStatus.value = '';
    els.fDate.value = '';
    activeQuickFilter = null;
    [...els.stats.children].forEach((c) => c.classList.remove('active'));
    loadActivities();
  });

  let debounceTimer;
  const debouncedLoad = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadActivities, 250);
  };
  els.fQuery.addEventListener('input', debouncedLoad);
  els.fType.addEventListener('change', loadActivities);
  els.fStatus.addEventListener('change', loadActivities);
  els.fDate.addEventListener('change', loadActivities);
}

async function init() {
  els.todayLabel.textContent = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  setupEvents();
  await loadMeta();
  await refreshAll();
}

init();
