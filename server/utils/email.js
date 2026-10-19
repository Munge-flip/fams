const dns = require('dns');
const net = require('net');
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

let transporterPromise;

const createTransporter = async () => {
  const port = Number(process.env.SMTP_PORT || 587);
  const host = process.env.SMTP_HOST;

  // Nodemailer 10 resolves A and AAAA records itself and picks from the combined list,
  // which bypasses dns.setDefaultResultOrder(). Render cannot route outbound IPv6, so
  // resolve the SMTP host to IPv4 here and keep the hostname for TLS SNI and certificate
  // validation. Otherwise a connection can land on an unroutable IPv6 address.
  const address = net.isIP(host) ? host : (await dns.promises.lookup(host, { family: 4 })).address;

  return nodemailer.createTransport({
    host: address,
    servername: net.isIP(host) ? undefined : host,
    port,
    // Port 465 is implicit TLS; anything else negotiates STARTTLS.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new MailNotConfiguredError();
  }

  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      // Let the next send retry resolution instead of caching the failure forever.
      transporterPromise = null;
      throw error;
    });
  }

  return transporterPromise;
};

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
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
