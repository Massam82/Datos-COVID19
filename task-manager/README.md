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

## Despliegue en la nube (para usar desde el celular)

Este proyecto no requiere base de datos externa, así que se puede desplegar
gratis en [Render](https://render.com) usando el `render.yaml` incluido en la
raíz del repositorio:

1. Crear una cuenta gratuita en Render con tu cuenta de GitHub.
2. En el panel, elegir **New +** → **Blueprint** y seleccionar este
   repositorio.
3. Render detecta `render.yaml` automáticamente y crea el servicio web
   (`npm install` como build y `npm start` como arranque).
4. Al terminar el despliegue obtendrás una URL pública (por ejemplo
   `https://mi-agenda.onrender.com`) que puedes abrir desde el navegador de
   cualquier celular.
5. En iPhone, desde Safari, puedes tocar **Compartir → Agregar a pantalla de
   inicio** para que se abra como una app, sin la barra de navegador.

> Nota: en el plan gratuito de Render el disco es efímero, por lo que los
> datos guardados en `data/db.json` pueden reiniciarse si se vuelve a
> desplegar el servicio. Para uso personal continuo sin perder datos,
> considera un plan con disco persistente o migrar a una base de datos
> externa (por ejemplo, PostgreSQL gestionado por Render, también gratuito).

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
