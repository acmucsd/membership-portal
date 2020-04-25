const server = require('./src');
const { initializeAdmin } = require('./src/db');
const log = require('./src/logger');

// ensures an admin account is created
initializeAdmin();

// starts the server
server.listen(server.config.port, () => {
  log.info('Started server on port %d.', server.config.port);
});
