import { Connection } from 'typeorm';
import { flatten } from 'underscore';
import { PortalEvent } from './PortalEvent';

export class PortalState {
  constructor(private readonly state: PortalEvent[]) {}

  public static of(events: PortalEvent[]) {
    console.log(events);
    return new PortalState(events);
  }

  public static from(state: PortalState, events: PortalEvent[]) {
    return new PortalState(state.events().concat(events));
  }

  public write(conn: Connection): void {
    console.log(this.state);
    const entities = flatten(this.state.map((pe) => pe.decompose()));
    console.log(entities);
    // conn.manager.save(entities);
  }

  public events(): PortalEvent[] {
    return this.state;
  }
}
