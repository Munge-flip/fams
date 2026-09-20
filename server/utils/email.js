const nodemailer = require('nodemailer');

// Outbound email for FAMS. Configured entirely through the environment so no credentials
// live in the code:
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_FROM_NAME
// When SMTP is not configured, sendMail throws a MailNotConfiguredError so callers can
// return a friendly message instead of pretending the message went out.
class MailNotConfiguredError extends Error {
  constructor() {
    super('Email sending is not configured. Set SMTP_HOST and the related SMTP variables.');
    this.name = 'MailNotConfiguredError';
  }
}

const isEmailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

const fromAddress = () => {
  const name = process.env.MAIL_FROM_NAME || 'FAMS';
  return `"${name}" <${process.env.MAIL_FROM}>`;
};

let transporter;

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new MailNotConfiguredError();
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 is implicit TLS; anything else negotiates STARTTLS.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }

  return transporter;
};

const sendMail = async ({ to, subject, text, html }) => {
  const info = await getTransporter().sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
  });

  // Message id and preview URL are useful for local development (Ethereal and friends).
  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
};

const sendVerificationCode = ({ to, code, expiresInMinutes }) => sendMail({
  to,
  subject: 'Your FAMS verification code',
  text: [
    `Your FAMS verification code is ${code}.`,
    '',
    `It expires in ${expiresInMinutes} minutes.`,
    'If you did not request this change, you can ignore this email and your address will stay the same.',
  ].join('\n'),
  html: [
    '<p>Your FAMS verification code is <strong style="font-size:20px;letter-spacing:2px">' + code + '</strong>.</p>',
    `<p>It expires in ${expiresInMinutes} minutes.</p>`,
    '<p>If you did not request this change, you can ignore this email and your address will stay the same.</p>',
  ].join(''),
});

module.exports = { isEmailConfigured, sendMail, sendVerificationCode, MailNotConfiguredError };
