const { Resend } = require('resend');

// Outbound email for FAMS through Resend's HTTPS API. Render's free tier permanently blocks
// outbound SMTP ports (25/465/587), so the API is the only delivery path that works there.
// Configured entirely through the environment so no credentials live in the code:
//   RESEND_API_KEY, MAIL_FROM, MAIL_FROM_NAME
// When Resend is not configured, sendMail throws a MailNotConfiguredError so callers can
// return a friendly message instead of pretending the message went out.
class MailNotConfiguredError extends Error {
  constructor() {
    super('Email sending is not configured. Set RESEND_API_KEY.');
    this.name = 'MailNotConfiguredError';
  }
}

const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY);

// onboarding@resend.dev is Resend's sandbox sender and needs no verified domain. In that
// mode Resend only delivers to the account owner's own verified address; reaching arbitrary
// beneficiaries requires a verified domain and MAIL_FROM set to an address on it.
const fromAddress = () => {
  const name = process.env.MAIL_FROM_NAME || 'FAMS';
  return `${name} <${process.env.MAIL_FROM || 'onboarding@resend.dev'}>`;
};

let client;

const getClient = () => {
  if (!isEmailConfigured()) {
    throw new MailNotConfiguredError();
  }

  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }

  return client;
};

const sendMail = async ({ to, subject, text, html }) => {
  const { data, error } = await getClient().emails.send({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
  });

  // The SDK returns API failures instead of throwing. Raise them so callers handle a rejected
  // send the same way as any other delivery failure, and keep the API detail server-side.
  if (error) {
    throw new Error(`Resend could not send the email: ${error.message || 'unknown error'}`);
  }

  return {
    messageId: data.id,
    previewUrl: null,
  };
};

module.exports = { isEmailConfigured, sendMail, MailNotConfiguredError };
