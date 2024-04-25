import { addAliases } from 'module-alias';

// Any changes to aliases must be mirrored in tsconfig.json and jest.config.json as well!!
addAliases({
  '@controllers': `${__dirname}/api/controllers`,
  '@decorators': `${__dirname}/api/decorators`,
  '@middleware': `${__dirname}/api/middleware`,
  '@validators': `${__dirname}/api/validators`,
  '@config': `${__dirname}/config`,
  '@error': `${__dirname}/error`,
  '@models': `${__dirname}/models`,
  '@repositories': `${__dirname}/repositories`,
  '@services': `${__dirname}/services`,
  '@tests': `${__dirname}/tests`,
  '@customtypes': `${__dirname}/types`,
  '@utils': `${__dirname}/utils`,
});
