const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const log = require('../logger');

sgMail.setApiKey(config.email.apiKey);

const readTemplate = (filename) => fs.readFileSync(path.join(__dirname, `./templates/${filename}`), 'utf-8');
// data = { to, from, subject, text | html }
const sendEmail = (data) => sgMail.send(data);

const passwordResetTemplate = readTemplate('passwordReset.ejs');
const sendPasswordReset = (email, firstName, code) => {
  const data = {
    to: email,
    from: config.email.user,
    subject: 'ACM UCSD Membership Portal Password Reset',
    html: ejs.render(passwordResetTemplate, {
      firstName,
      link: `${config.client}/resetPassword/${code}`,
    }),
  };
  sendEmail(data).catch((error) => {
    log.warn(`Failed to send password reset email to ${config.email.user}: ${error}`);
  });
};

const emailVerificationTemplate = readTemplate('emailVerification.ejs');
const sendEmailVerification = async (email, firstName, code) => new Promise((resolve, reject) => {
  const data = {
    to: email,
    from: config.email.user,
    subject: 'ACM UCSD Membership Portal Email Verification',
    html: ejs.render(emailVerificationTemplate, {
      firstName,
      link: `${config.client}/verifyEmail/${email}/${code}`,
    }),
  };
  sendEmail(data).then(() => {
    log.info(`Sent verification email to ${email}`);
    resolve();
  }).catch((error) => {
    log.warn(`Failed to send email verification email to ${config.email.user}: ${error}`);
    reject();
  });
});

module.exports = { sendPasswordReset, sendEmailVerification };
