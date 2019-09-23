
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');
const msg = {
  to: 'acmucsdmailing@gmail.com',
  from: 'acmucsdmailing@gmail.com',
  subject: 'Hello ACM User! Please confirm you email here',
  text: 'Click here to verify your email',
  html: '<a href="#">Click here to verify your email</a>',
};
sgMail.send(msg)