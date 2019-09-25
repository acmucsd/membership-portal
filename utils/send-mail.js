
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SEND_GRID_API_KEY);
const msg = {
  to: 'acmucsdmailing@gmail.com',
  from: 'acmucsdmailing@gmail.com',
  subject: 'Hello ACM User! Please confirm you email here',
  text: 'Click here to verify your email',
  html: '<a href="#">Click here to verify your email</a>',
};
sgMail.send(msg)