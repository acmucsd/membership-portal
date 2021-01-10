import 'reflect-metadata';
import { useContainer as routingUseContainer } from 'routing-controllers';
import { useContainer as ormUseContainer } from 'typeorm';
import Container from 'typedi';

routingUseContainer(Container);
ormUseContainer(Container);
