const TYPES = ['tarea', 'trabajo', 'cita_medica', 'cita_trabajo', 'otro'];
const STATUSES = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
const PRIORITIES = ['baja', 'media', 'alta'];

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

function validationError(errors) {
  const err = new Error('Datos invalidos');
  err.details = errors;
  err.status = 400;
  return err;
}

module.exports = { TYPES, STATUSES, PRIORITIES, validate, validationError };
