/* Throwaway harness for the verified-login gate (delete after use).
   Run: node tmp-login-gate-check.cjs */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true });

const sentCodes = [];

// Patch the mailer BEFORE the controllers load so no SMTP is needed and codes are captured.
const email = require('./utils/email');
email.sendVerificationCode = async ({ to, code }) => {
  sentCodes.push({ to, code });
  return { messageId: 'stub', previewUrl: null };
};

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('./app');

const DB_NAME = 'fams_login_gate_check';
const stamp = Date.now();
const password = 'Student#2026';
const results = [];
let failures = 0;

const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${detail}`}`;
  results.push(line);
  console.log(line);
  if (!ok) failures += 1;
};

let baseUrl;

// `cookie` is the raw Cookie header the request carries; `sent` collects what it set back.
const call = async (method, url, { body, cookie } = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { parseError: error.message };
  }

  return { status: response.status, body: payload, setCookies };
};

const cookieValue = (setCookies, name) => {
  const entry = setCookies.find((line) => line.startsWith(`${name}=`));
  if (!entry) return undefined;
  return { value: entry.split(';')[0].slice(name.length + 1), cleared: /Expires=Thu, 01 Jan 1970/i.test(entry) };
};

const users = () => mongoose.connection.collection('users');

const register = async (payload) => call('POST', '/api/auth/register', { body: payload });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();

  const server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // --- a fresh registration holds an activation ticket, not a session -----------------
  const blockedEmail = `blocked${stamp}@example.com`;
  sentCodes.length = 0;
  let res = await register({ name: 'Ana Delos Reyes', email: blockedEmail, password, role: 'student' });
  check('registration succeeds', res.status === 201, `${res.status} ${JSON.stringify(res.body)}`);
  const registerTicket = cookieValue(res.setCookies, 'fams_verify');
  check('registration hands over an activation ticket', Boolean(registerTicket?.value), JSON.stringify(res.setCookies));
  check('registration hands over no session', cookieValue(res.setCookies, 'fams_token') === undefined, JSON.stringify(res.setCookies));
  const blockedUser = await users().findOne({ email: blockedEmail });
  check('the account is stored unverified', blockedUser?.emailVerified === false, JSON.stringify(blockedUser?.emailVerified));

  // --- signing in before verifying is refused -----------------------------------------
  res = await call('POST', '/api/auth/login', { body: { identifier: blockedEmail, password } });
  check('an unverified account cannot sign in', res.status === 403, `${res.status} ${JSON.stringify(res.body)}`);
  check('the refusal is friendly', /verify your email before signing in/i.test(res.body.message || ''), res.body.message);
  check('the refusal names the reason', res.body.data?.code === 'email_unverified', JSON.stringify(res.body.data));
  check('the refusal names the address to verify', res.body.data?.email === blockedEmail, JSON.stringify(res.body.data));
  check('the refusal issues no session', cookieValue(res.setCookies, 'fams_token') === undefined, JSON.stringify(res.setCookies));
  const loginTicket = cookieValue(res.setCookies, 'fams_verify');
  check('the refusal issues an activation ticket instead', Boolean(loginTicket?.value), JSON.stringify(res.setCookies));

  // --- the ticket opens the verification endpoints and nothing else --------------------
  const ticket = `fams_verify=${loginTicket.value}`;
  res = await call('GET', '/api/auth/email-verification', { cookie: ticket });
  check('the ticket reports the pending code and the address', res.status === 200 && res.body.data?.pending === true && res.body.data?.email === blockedEmail, `${res.status} ${JSON.stringify(res.body)}`);

  res = await call('GET', '/api/auth/me', { cookie: ticket });
  check('the ticket cannot open an authenticated page', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);

  res = await call('GET', '/api/auth/me', { cookie: `fams_token=${loginTicket.value}` });
  check('the ticket is not accepted as a session', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);

  res = await call('POST', '/api/auth/email-verification/request', { cookie: undefined, body: {} });
  check('codes cannot be requested without the ticket', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);
  res = await call('POST', '/api/auth/verification/confirm', { cookie: undefined, body: { code: '000000' } });
  check('codes cannot be confirmed without the ticket', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);

  // --- a session cookie left over from the browse-but-restrict model stops working -----
  const leftover = jwt.sign({ id: blockedUser._id.toString(), role: 'student', name: 'Ana Delos Reyes' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res = await call('GET', '/api/auth/me', { cookie: `fams_token=${leftover}` });
  check('a session issued before the gate is refused', res.status === 401 && res.body.data?.code === 'email_unverified', `${res.status} ${JSON.stringify(res.body)}`);
  res = await call('POST', '/api/applications', { cookie: `fams_token=${leftover}`, body: { program: blockedUser._id.toString() } });
  check('that leftover session cannot reach beneficiary actions either', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);

  // --- resend from the verify screen, reached from a blocked sign-in -------------------
  sentCodes.length = 0;
  res = await call('POST', '/api/auth/email-verification/request', { cookie: ticket, body: {} });
  check('a resend inside the cooldown is refused with the remaining wait', res.status === 429 && Number.isFinite(res.body.data?.resendAfterSeconds) && sentCodes.length === 0, `${res.status} ${JSON.stringify(res.body)}`);

  // Let the cooldown pass, then resend for real.
  await mongoose.connection.collection('emailverifications').updateOne({ user: blockedUser._id }, { $set: { sentAt: new Date(Date.now() - 120000) } });
  sentCodes.length = 0;
  res = await call('POST', '/api/auth/email-verification/request', { cookie: ticket, body: {} });
  check('the resent code is delivered', res.status === 200 && sentCodes.length === 1 && sentCodes[0].to === blockedEmail, `${res.status} ${JSON.stringify(res.body)}`);

  // --- verification activates the account and retires the ticket -----------------------
  res = await call('POST', '/api/auth/verification/confirm', { cookie: ticket, body: { code: sentCodes[0].code } });
  check('the code activates the account', res.status === 200 && res.body.data?.user?.emailVerified === true, `${res.status} ${JSON.stringify(res.body)}`);
  check('activation clears the activation ticket', cookieValue(res.setCookies, 'fams_verify')?.cleared === true, JSON.stringify(res.setCookies));
  check('activation does not sign the account in', cookieValue(res.setCookies, 'fams_token') === undefined, JSON.stringify(res.setCookies));

  // --- the verified account signs in normally -----------------------------------------
  res = await call('POST', '/api/auth/login', { body: { identifier: blockedEmail, password } });
  check('the verified account signs in', res.status === 200 && res.body.data?.emailVerified === true, `${res.status} ${JSON.stringify(res.body)}`);
  const session = cookieValue(res.setCookies, 'fams_token');
  check('signing in issues a session', Boolean(session?.value), JSON.stringify(res.setCookies));
  res = await call('GET', '/api/auth/me', { cookie: `fams_token=${session.value}` });
  check('the session opens authenticated pages', res.status === 200 && res.body.data?.email === blockedEmail, `${res.status} ${JSON.stringify(res.body)}`);

  // --- email changes still run on the session, through the shared confirm endpoint -----
  const nextEmail = `moved${stamp}@example.com`;
  sentCodes.length = 0;
  res = await call('POST', '/api/auth/email-change/request', { cookie: `fams_token=${session.value}`, body: { email: nextEmail, currentPassword: password } });
  check('a signed-in account can start an email change', res.status === 200 && sentCodes.length === 1, `${res.status} ${JSON.stringify(res.body)}`);
  res = await call('POST', '/api/auth/verification/confirm', { cookie: `fams_token=${session.value}`, body: { code: sentCodes[0].code } });
  check('the email change still confirms with the session alone', res.status === 200 && res.body.data?.user?.email === nextEmail, `${res.status} ${JSON.stringify(res.body)}`);

  // --- accounts created before email verification existed are untouched ----------------
  const legacyEmail = `legacy${stamp}@example.com`;
  await users().insertOne({
    name: 'Legacy Beneficiary',
    email: legacyEmail,
    password: await bcrypt.hash(password, 12),
    role: 'student',
    verificationStatus: 'verified',
  });
  res = await call('POST', '/api/auth/login', { body: { identifier: legacyEmail, password } });
  check('a pre-change account still signs in', res.status === 200 && res.body.data?.emailVerified === undefined, `${res.status} ${JSON.stringify(res.body)}`);

  // --- admins are untouched ------------------------------------------------------------
  const adminEmail = `admin${stamp}@example.com`;
  await users().insertOne({
    name: 'Rodel Mercado',
    email: adminEmail,
    password: await bcrypt.hash(password, 12),
    role: 'admin',
    verificationStatus: 'verified',
    emailVerified: false,
  });
  res = await call('POST', '/api/auth/login', { body: { identifier: adminEmail, password } });
  check('admin sign-in ignores the email verification gate', res.status === 200, `${res.status} ${JSON.stringify(res.body)}`);
  const adminSession = cookieValue(res.setCookies, 'fams_token');
  check('admin sign-in still issues a session', Boolean(adminSession?.value), JSON.stringify(res.setCookies));
  res = await call('GET', '/api/admin/users', { cookie: `fams_token=${adminSession.value}` });
  check('the admin portal still loads', res.status === 200, `${res.status} ${JSON.stringify(res.body)}`);

  // --- a blocked sign-in leaves no way to reach beneficiary actions ---------------------
  const secondEmail = `second${stamp}@example.com`;
  sentCodes.length = 0;
  res = await register({ name: 'Joel Bacolod', email: secondEmail, password, role: 'resident' });
  const secondTicket = cookieValue(res.setCookies, 'fams_verify');
  res = await call('POST', '/api/auth/login', { body: { identifier: secondEmail, password } });
  const secondLoginTicket = cookieValue(res.setCookies, 'fams_verify');
  const secondUser = await users().findOne({ email: secondEmail });
  const combined = `fams_verify=${secondLoginTicket.value}; fams_token=${secondTicket.value}`;
  res = await call('GET', '/api/applications', { cookie: combined });
  check('a blocked sign-in reaches no beneficiary data', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);
  res = await call('POST', '/api/documents/upload', { cookie: combined, body: {} });
  check('a blocked sign-in uploads no documents', res.status === 401, `${res.status} ${JSON.stringify(res.body)}`);
  check('the unverified account is still unverified', secondUser?.emailVerified === false, JSON.stringify(secondUser?.emailVerified));

  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  process.exit(failures ? 1 : 0);
};

run().catch((error) => {
  console.error('harness crashed:', error);
  process.exit(2);
});
