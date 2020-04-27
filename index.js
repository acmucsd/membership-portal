const server = require('./src');
const { initializeAdmin } = require('./src/db');
const config = require('./src/config');
const log = require('./src/logger');

// ensures an admin account is created
initializeAdmin();

// starts the server
server.listen(config.port, () => {
  log.info('Started server on port %d.', config.port);
});
