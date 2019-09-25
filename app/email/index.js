const sgMail = require('@sendgrid/mail');
const config = require('../config');

sgMail.setApiKey(config.email.apiKey);

const sendEmail = (to, subject, text, html) => sgMail.send({ to, from: config.email.from, subject, text, html });

module.exports = sendEmail;
