const { TYPES, STATUSES, PRIORITIES } = require('./constants');

const impl = process.env.DATABASE_URL ? require('./store-postgres') : require('./store-file');

if (process.env.DATABASE_URL) {
  console.log('Almacenamiento: PostgreSQL (persistente)');
} else {
  console.log('Almacenamiento: archivo JSON local (define DATABASE_URL para usar PostgreSQL)');
}

module.exports = {
  TYPES,
  STATUSES,
  PRIORITIES,
  ...impl,
};
