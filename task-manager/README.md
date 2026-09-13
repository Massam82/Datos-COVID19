# Mi Agenda — Gestor de actividades

Aplicación web para gestionar y controlar tareas, trabajos, citas médicas, citas
de trabajo y demás actividades diarias de una persona.

## Características

- Crear, editar, completar y eliminar actividades.
- Tipos de actividad: tarea, trabajo, cita médica, cita de trabajo, otro.
- Prioridad (baja/media/alta) y estado (pendiente/en progreso/completada/cancelada).
- Panel con indicadores: actividades de hoy, vencidas, próximos 7 días y completadas.
- Filtros por tipo, estado, fecha y búsqueda de texto libre.
- Vista de agenda agrupada por día.
- Persistencia local en un archivo JSON (sin necesidad de base de datos externa).

## Requisitos

- Node.js 18 o superior.

## Instalación y ejecución

```bash
cd task-manager
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

Para desarrollo con recarga automática al guardar cambios:

```bash
npm run dev
```

## Estructura del proyecto

```
task-manager/
  server.js          # Servidor Express y rutas de la API REST
  src/store.js        # Capa de datos (lectura/escritura del archivo JSON)
  data/db.json         # Base de datos local (se crea automáticamente)
  public/               # Frontend (HTML, CSS, JS sin frameworks)
```

## API REST

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|---------------------------------------|
| GET    | /api/meta                     | Tipos, estados y prioridades válidos |
| GET    | /api/stats                    | Estadísticas del panel               |
| GET    | /api/activities                | Lista de actividades (con filtros)   |
| GET    | /api/activities/:id            | Detalle de una actividad             |
| POST   | /api/activities                | Crear actividad                      |
| PUT    | /api/activities/:id            | Actualizar actividad                 |
| PATCH  | /api/activities/:id/status     | Cambiar solo el estado               |
| DELETE | /api/activities/:id            | Eliminar actividad                   |

Filtros soportados en `GET /api/activities`: `type`, `status`, `date`, `from`,
`to`, `q` (búsqueda en título, descripción y lugar).
