const server = require('./app');
const { initializeAdmin } = require('./app/db');
const log = require('./app/logger');

// ensures an admin account is created
initializeAdmin();

// starts the server
server.listen(server.config.port, () => {
  log.info('Started server on port %d.', server.config.port);
});
