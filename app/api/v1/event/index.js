const express = require('express');
const error = require('../../../error');
const { Event } = require('../../../db');
const { authenticated } = require('../auth');

const router = express.Router();

/**
 * Get all past events as an ordered list of public events, sorted by ascending start date/time. Supports
 * pagination using the 'offset' and 'limit' query parameters.
 */
router.get('/past', (req, res, next) => {
  const offset = parseInt(req.query.offset, 10);
  const limit = parseInt(req.query.limit, 10);
  Event.getPastEvents(offset, limit).then((events) => {
    res.json({ error: null, events: events.map((e) => e.getPublic()) });
  }).catch(next);
});

/**
 * Get all future events as an ordered list of public events, sorted by ascending start date/time. Supports
 * pagination using the 'offset' and 'limit' query parameters.
 */
router.get('/future', (req, res, next) => {
  const offset = parseInt(req.query.offset, 10);
  const limit = parseInt(req.query.limit, 10);
  Event.getFutureEvents(offset, limit).then((events) => {
    res.json({ error: null, events: events.map((e) => e.getPublic()) });
  }).catch(next);
});

router.route('/adminFetch/:uuid?')
  /**
   * All further requests on this route require admin access.
   */
  .all(authenticated, (req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  /**
   * Get all events, all events by committee, or a single event. If an event UUID is provided in the URI,
   * returns the matching event or null if no such event was found. Otherwise if no event UUID is provided
   * in the URI, returns all events. If the 'committee' field is provided as a query parameter, returns all
   * events hosted by that committee. Supports pagination using the 'offset' and 'limit' query parameters.
   */
  .get((req, res, next) => {
    // if UUID is provided, return matching event
    if (req.params.uuid && req.params.uuid.trim()) {
      Event.findByUUID(req.params.uuid).then((event) => {
        // if event found, return the public event (or admin version if user is admin), else null
        res.json({ error: null, event: event ? event.getPublic(true) : null });
      }).catch(next);
    // else (UUID is not provided), return all events
    } else {
      const offset = parseInt(req.query.offset, 10);
      const limit = parseInt(req.query.limit, 10);
      const { committee } = req.query;
      // if committee is provided, return all events for committee, else return all events
      const getEvents = committee ? Event.getCommitteeEvents(committee, offset, limit) : Event.getAll(offset, limit);
      getEvents.then((events) => {
        res.json({ error: null, events: events.map((e) => e.getPublic(true)) });
      }).catch(next);
    }
  });

router.route('/:uuid?')

  /**
   * Get all events, all events by committee, or a single event. If an event UUID is provided in the URI,
   * returns the matching event or null if no such event was found. Otherwise if no event UUID is provided
   * in the URI, returns all events. If the 'committee' field is provided as a query parameter, returns all
   * events hosted by that committee. Supports pagination using the 'offset' and 'limit' query parameters.
   */
  .get((req, res, next) => {
    // if UUID is provided, return matching event
    if (req.params.uuid && req.params.uuid.trim()) {
      Event.findByUUID(req.params.uuid).then((event) => {
        // if event found, return the public event (or admin version if user is admin), else null
        res.json({ error: null, event: event ? event.getPublic(false) : null });
      }).catch(next);
    // else (UUID is not provided), return all events
    } else {
      const offset = parseInt(req.query.offset, 10);
      const limit = parseInt(req.query.limit, 10);
      const { committee } = req.query;
      // if committee is provided, return all events for committee, else return all events
      const getEvents = committee ? Event.getCommitteeEvents(committee, offset, limit) : Event.getAll(offset, limit);
      getEvents.then((events) => {
        res.json({ error: null, events: events.map((e) => e.getPublic(false)) });
      }).catch(next);
    }
  })

  /**
   * All further requests on this route require admin access.
   */
  .all(authenticated, (req, res, next) => {
    if (!req.user.isAdmin()) return next(new error.Forbidden());
    return next();
  })

  /**
   * Adds an event, given an 'event' object in the request body, and returns the newly created event upon
   * success. Required fields: title, description, start, end, attendanceCode, pointValue, requiresStaff.
   * Optional fields: committee, thumbnail, cover, location, eventLink, staffPointBonus. All other fields
   * will be ignored.
   */
  .post((req, res, next) => {
    if (req.params.uuid) return next(new error.BadRequest('UUID must not be provided'));
    if (!req.body.event) return next(new error.BadRequest('Event must be provided'));

    const datesProvided = req.body.event.start && req.body.event.end;
    if (datesProvided && new Date(req.body.event.start) > new Date(req.body.event.end)) {
      return next(new error.BadRequest('Start date must be before end date'));
    }

    Event.create(Event.sanitize(req.body.event)).then((event) => {
      res.json({ error: null, event: event.getPublic() });
    }).catch(next);
  })

  /**
   * Updates an event, given an event UUID in the URI and a partial 'event' object with updated fields
   * in the request body, and returns the updated event. Fields that may be updated: title, description,
   * start, end, attendanceCode, pointValue, requiresStaff, staffPointBonus, committee, thumbnail, cover,
   * location, eventLink. All other fields will be ignored.
   */
  .patch((req, res, next) => {
    if (!req.params.uuid || !req.params.uuid.trim() || !req.body.event) {
      return next(new error.BadRequest('UUID and partial event object must be provided'));
    }

    const datesProvided = req.body.event.start && req.body.event.end;
    if (datesProvided && new Date(req.body.event.start) > new Date(req.body.event.end)) {
      return next(new error.BadRequest('Start date must be before end date'));
    }

    Event.findByUUID(req.params.uuid).then((event) => {
      if (!event) throw new error.BadRequest('No such event found');
      return event.update(Event.sanitize(req.body.event));
    }).then((event) => {
      res.json({ error: null, event: event.getPublic() });
    }).catch(next);
  })

  /**
   * Deletes an event, given an event UUID in the URI, and returns the number of events deleted (1 if
   * successful, 0 if no such event found).
   */
  .delete((req, res, next) => {
    if (!req.params.uuid) return next(new error.BadRequest('UUID must be provided'));
    Event.destroyByUUID(req.params.uuid).then((numDeleted) => {
      res.json({ error: null, numDeleted });
    }).catch(next);
  });

module.exports = { router };
