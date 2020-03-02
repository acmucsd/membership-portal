const Sequelize = require('sequelize');
const express = require('express');
const error = require('../../../error');
const { Event, Activity, Attendance, db } = require('../../../db');

const router = express.Router();

router.route('/:uuid?')

  /**
   * Gets the attendance for a single event or for the user as a list of public attendance records. If
   * an event UUID is provided in the URI, returns all attendance records for that event, i.e. all users
   * that attended. Otherwise, returns all attendance records for the current user, i.e. all events the
   * current user attended.
   */
  .get((req, res, next) => {
    const callback = (attendance) => res.json({ error: null, attendance: attendance.map((a) => a.getPublic()) });
    if (req.params.uuid) {
      Attendance.getAttendanceForEvent(req.params.uuid).then(callback).catch(next);
    } else {
      Attendance.getAttendanceForUser(req.user.uuid).then(callback).catch(next);
    }
  })

  /**
   * Records that the user attended an event and returns the public version of the event, given
   * `attendanceCode` and 'asStaff' in the request body.
   */
  .post((req, res, next) => {
    if (!req.body.attendanceCode) return next(new error.BadRequest('Attendance code must be provided'));

    const now = new Date();
    Event.findByAttendanceCode(req.body.attendanceCode).then((event) => {
      if (!event) throw new error.UserError("Oh no! That code didn't work.");
      if (now < new Date(event.start) || now > new Date(event.end)) {
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
        if (!('asStaff' in req.body)) req.body.asStaff = false;
        const attendedAsStaff = req.body.asStaff && req.user.isStaff() && event.requiresStaff;
        const pointsEarned = attendedAsStaff ? event.pointValue + event.staffPointBonus : event.pointValue;
        return Promise.all([
          // mark the event as attended by the user
          Attendance.attendEvent(req.user.uuid, event.uuid, attendedAsStaff),
          // add an entry for this attendance in the user's activity
          Activity.attendedEvent(req.user.uuid, event.title, pointsEarned, attendedAsStaff),
          // add the points for the event to the user's point total
          req.user.addPoints(pointsEarned),
        ]);
      })).then(() => {
        res.json({ error: null, event: event.getPublic() });
      });
    }).catch(next);
  });

module.exports = { router };
