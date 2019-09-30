const sgMail = require('@sendgrid/mail');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const config = require('../config');

sgMail.setApiKey(config.email.apiKey);

const readTemplate = (filename) => fs.readFileSync(path.join(__dirname, `./templates/${filename}`), 'utf-8');
// data = { to, from, subject, text | html }
const sendEmail = (data) => sgMail.send(data);

const passwordResetTemplate = readTemplate('passwordReset.ejs');
const sendPasswordReset = (email, firstName, code) => {
  const data = {
    to: email,
    from: config.email.user,
    subject: 'ACM UCSD Membership Portal Password Rest',
    html: ejs.render(passwordResetTemplate, {
      firstName,
      link: `https://acmucsd.com/resetPassword/${code}`,
    }),
  };
  sendEmail(data);
};

module.exports = { sendPasswordReset };
