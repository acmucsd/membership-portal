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
    log.warn(`Failed to send password reset email to ${email}: ${error}`);
  });
};

const emailVerificationTemplate = readTemplate('emailVerification.ejs');
const sendEmailVerification = async (email, firstName, code) => {
  const data = {
    to: email,
    from: config.email.user,
    subject: 'ACM UCSD Membership Portal Email Verification',
    html: ejs.render(emailVerificationTemplate, {
      firstName,
      link: `${config.client}/verifyEmail/${code}`,
    }),
  };
  return sendEmail(data);
};

const orderConfirmationTemplate = readTemplate('orderConfirmation.ejs');
const sendOrderConfirmation = (email, firstName, order) => {
  const data = {
    to: email,
    from: config.email.user,
    subject: 'ACM UCSD Merch Store Order Confirmation',
    html: ejs.render(orderConfirmationTemplate, { firstName, order }),
  };
  sendEmail(data).catch((error) => {
    log.warn(`Failed to send order confirmation email to ${email}: ${error}`);
  });
};

module.exports = { sendPasswordReset, sendEmailVerification, sendOrderConfirmation };
