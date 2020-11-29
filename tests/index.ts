import { useContainer as routingUseContainer } from 'routing-controllers';
import { useContainer as ormUseContainer } from 'typeorm';
import Container from 'typedi';
import { TestUtils } from './TestUtils';

routingUseContainer(Container);
ormUseContainer(Container);

declare global {
  // eslint-disable-next-line no-redeclare
  namespace jest {
    interface Matchers<R> {
      toMatchArrayContents(expected: any[], sortKey?: string): CustomMatcherResult;
    }
  }
}

expect.extend({
  toMatchArrayContents: TestUtils.toMatchArrayContents,
});
