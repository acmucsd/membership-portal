const Sequelize = require('sequelize');
const express = require('express');
const error = require('../../../error');
const { Event, Activity, Attendance, db } = require('../../../db');

const router = express.Router();

/**
 * Gets the attendance for a single event or for the user as a list of public attendance records.
 */
router.route('/:uuid?')
  .get((req, res, next) => {
    // maps each Attendance object to its public version
    const callback = (attendance) => res.json({ error: null, attendance: attendance.map((a) => a.getPublic()) });
    if (req.params.uuid) {
      // if an event UUID is provided, returns all attendance records for that event, i.e. all users that attended
      Attendance.getAttendanceForEvent(req.params.uuid).then(callback).catch(next);
    } else {
      // otherwise, returns all attendance records for the user, i.e. all events this user attended
      Attendance.getAttendanceForUser(req.user.uuid).then(callback).catch(next);
    }
  });

/**
 * Records that the user attended an event and returns the public version of the event.
 */
router.route('/attend')
  .post((req, res, next) => {
    if (!req.body.event.attendanceCode) return next(new error.BadRequest('Attendance code must be provided'));

    const now = new Date();
    Event.findByAttendanceCode(req.body.event.attendanceCode).then((event) => {
      if (!event) throw new error.UserError("Oh no! That code didn't work.");
      if (now < event.startDate || now > event.endDate) {
        throw new error.UserError('You can only enter the attendance code during the event!');
      }

      // use a database transaction to ensure the invariant ("user has not attended event")
      // holds true before committing any changes, therefore ensuring users cannot get duplicate
      // points for attending the same event due to other transactions
      return db.transaction({
        // disallows dirty reads and varying/non repeated reads
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, (transaction) => Attendance.userAttendedEvent(req.user.uuid, event.uuid).then((attended) => {
        if (attended) throw new error.UserError('You have already attended this event!');

        // simultaneously execute three promises
        return Promise.all([
          // mark the event as attended by the user
          Attendance.attendEvent(req.user.uuid, event.uuid),
          // add an entry for this attendance in the user's activity
          Activity.attendedEvent(req.user.uuid, event.title, event.attendancePoints),
          // add the points for the event to the user's point total
          req.user.addPoints(event.attendancePoints),
        ]);
      })).then(() => {
        res.json({ error: null, event: event.getPublic() });
      });
    }).catch(next);
  });

module.exports = { router };
