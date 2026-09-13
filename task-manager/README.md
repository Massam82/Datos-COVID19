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
- Persistencia en PostgreSQL cuando hay una base de datos configurada, con
  respaldo automático en un archivo JSON local para desarrollo sin configurar
  nada.

## Requisitos

- Node.js 18 o superior.
- Opcional: una base de datos PostgreSQL (recomendado para producción, ver
  despliegue más abajo).

## Instalación y ejecución (desarrollo local)

```bash
cd task-manager
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`. Sin configurar
nada, los datos se guardan en `data/db.json`.

## Persistencia con PostgreSQL

Si defines la variable de entorno `DATABASE_URL` con una cadena de conexión
de PostgreSQL, la app la detecta automáticamente al iniciar y usa esa base de
datos en vez del archivo JSON (crea la tabla `activities` sola si no existe):

```bash
DATABASE_URL="postgres://usuario:clave@host:5432/nombre_bd" npm start
```

## Despliegue en la nube (para usar desde el celular)

Se puede desplegar gratis en [Render](https://render.com) usando el
`render.yaml` incluido en la raíz del repositorio, que además provisiona una
base de datos PostgreSQL gratuita y la conecta automáticamente:

1. Crear una cuenta gratuita en Render con tu cuenta de GitHub.
2. En el panel, elegir **New +** → **Blueprint** y seleccionar este
   repositorio.
3. Render detecta `render.yaml` automáticamente y crea:
   - Una base de datos PostgreSQL (`mi-agenda-db`).
   - El servicio web (`npm install` como build y `npm start` como arranque),
     con `DATABASE_URL` ya configurada apuntando a esa base de datos.
4. Al terminar el despliegue obtendrás una URL pública (por ejemplo
   `https://mi-agenda.onrender.com`) que puedes abrir desde el navegador de
   cualquier celular.
5. En iPhone, desde Safari, puedes tocar **Compartir → Agregar a pantalla de
   inicio** para que se abra como una app, sin la barra de navegador.

Como los datos ahora viven en PostgreSQL (no en el disco del servicio web),
persisten aunque el servicio se reinicie o se vuelva a desplegar.

> Nota: el plan gratuito de PostgreSQL en Render tiene una vigencia limitada
> (actualmente 30 días) antes de requerir upgrade a un plan pago para seguir
> usándola. Para uso permanente sin interrupciones, cambia el `plan` de la
> base de datos en `render.yaml` a un plan pago cuando corresponda.

Para desarrollo con recarga automática al guardar cambios:

```bash
npm run dev
```

## Estructura del proyecto

```
task-manager/
  server.js               # Servidor Express y rutas de la API REST
  src/store.js             # Elige backend segun DATABASE_URL
  src/store-postgres.js     # Backend PostgreSQL (produccion)
  src/store-file.js          # Backend archivo JSON (desarrollo local)
  src/constants.js            # Tipos/estados validos y validacion compartida
  data/db.json                 # Base de datos local (se crea automáticamente)
  public/                       # Frontend (HTML, CSS, JS sin frameworks)
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
