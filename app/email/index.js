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
      link: `${config.client.domain}/resetPassword/${code}`,
    }),
  };
  sendEmail(data).catch((error) => {
    log.warn(`Failed to send password reset email to ${config.email.user}: ${error}`);
  });
};

module.exports = { sendPasswordReset };
