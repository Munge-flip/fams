/* Throwaway verification harness for the registration send-failure fix (delete after use). */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true });

const sentCodes = [];
let failureMode = 'none'; // 'none' | 'once' | 'always'

// Patch the mailer BEFORE the controllers load so no SMTP is needed and the code is captured.
const email = require('./utils/email');
email.sendVerificationCode = async ({ to, code }) => {
  if (failureMode === 'always' || failureMode === 'once') {
    if (failureMode === 'once') failureMode = 'none';
    throw new Error('simulated provider failure');
  }
  sentCodes.push({ to, code });
  return { messageId: 'stub', previewUrl: null };
};

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('./app');

const DB_NAME = 'fams_registration_sendfix_check';
const stamp = Date.now();
const results = [];
let failures = 0;

const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -> ${detail}`}`;
  results.push(line);
  console.log(line);
  if (!ok) failures += 1;
};

let baseUrl;
let cookies = '';

const request = async (method, url, body, useCookies = true) => {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(useCookies && cookies ? { cookie: cookies } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  if (setCookies.length) cookies = setCookies.map((entry) => entry.split(';')[0]).join('; ');
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { parseError: error.message };
  }
  return { status: response.status, body: payload };
};

const login = async (identifier, password) => {
  cookies = '';
  return request('POST', '/api/auth/login', { identifier, password });
};

const users = () => mongoose.connection.collection('users');
const pendingCodes = () => mongoose.connection.collection('emailverifications');
const password = 'Student#2026';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME, serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.dropDatabase();

  const server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // --- happy path: the code is generated and sent inside the registration request ----
  const goodEmail = `good${stamp}@example.com`;
  sentCodes.length = 0;
  let res = await request('POST', '/api/auth/register', { name: 'Ana Delos Reyes', email: goodEmail, password, role: 'student' });
  check('registration succeeds', res.status === 201, `${res.status} ${JSON.stringify(res.body)}`);
  check('registration reports the code as sent', res.body.data?.emailVerification?.sent === true, JSON.stringify(res.body.data?.emailVerification));
  check('the code is sent during registration, not later', sentCodes.length === 1 && sentCodes[0].to === goodEmail, JSON.stringify(sentCodes));
  const goodCode = sentCodes[0].code;

  res = await request('GET', '/api/auth/email-verification');
  check('status reports a waiting code', res.body.data?.pending === true && res.body.data?.deliveryFailed === false, JSON.stringify(res.body));

  res = await request('POST', '/api/auth/verification/confirm', { code: goodCode });
  check('the code from registration activates the account without a resend', res.status === 200 && res.body.data?.user?.emailVerified === true, `${res.status} ${JSON.stringify(res.body)}`);

  // --- failure path: registration keeps the account and records the failed send -------
  failureMode = 'always';
  const badEmail = `failed${stamp}@example.com`;
  sentCodes.length = 0;
  res = await request('POST', '/api/auth/register', { name: 'Joel Bacolod', email: badEmail, password, role: 'student' });
  check('registration still completes when the mail fails', res.status === 201, `${res.status} ${JSON.stringify(res.body)}`);
  check('registration reports the failure instead of silence', res.body.data?.emailVerification?.sent === false && /could not send/i.test(res.body.data.emailVerification.message || ''), JSON.stringify(res.body.data?.emailVerification));
  check('no code was delivered in the failure case', sentCodes.length === 0, JSON.stringify(sentCodes));

  const failedUser = await users().findOne({ email: badEmail });
  check('the account exists and is unverified', Boolean(failedUser) && failedUser.emailVerified === false, JSON.stringify(failedUser?.emailVerified));

  res = await request('GET', '/api/auth/email-verification');
  check('status explains that the send failed', res.body.data?.deliveryFailed === true, JSON.stringify(res.body));
  check('a failed send reports no waiting code', res.body.data?.pending === false, JSON.stringify(res.body));
  check('a failed send does not impose a cooldown', res.body.data?.resendAfterSeconds === 0, JSON.stringify(res.body));

  res = await request('POST', '/api/auth/verification/confirm', { code: '123456' });
  check('there is no code to confirm after a failed send', res.status === 400 && /could not send/i.test(res.body.message || ''), `${res.status} ${JSON.stringify(res.body)}`);

  res = await request('GET', '/api/auth/email-verification');
  check('the failed-send explanation survives a confirmation attempt', res.body.data?.deliveryFailed === true, JSON.stringify(res.body));

  // --- the manual fallback works on the FIRST try once mail is healthy ----------------
  failureMode = 'none';
  sentCodes.length = 0;
  res = await request('POST', '/api/auth/email-verification/request', {});
  check('resend works immediately after a failed send (no 429)', res.status === 200, `${res.status} ${JSON.stringify(res.body)}`);
  check('the resend delivers a code', sentCodes.length === 1 && sentCodes[0].to === badEmail, JSON.stringify(sentCodes));

  res = await request('GET', '/api/auth/email-verification');
  check('status clears the failure after a successful resend', res.body.data?.deliveryFailed === false && res.body.data?.pending === true, JSON.stringify(res.body));

  res = await request('POST', '/api/auth/verification/confirm', { code: sentCodes[0].code });
  check('the resent code activates the account', res.status === 200 && res.body.data?.user?.emailVerified === true, `${res.status} ${JSON.stringify(res.body)}`);

  // --- a resend that fails again keeps the explanation and stays retryable ------------
  const retryEmail = `retry${stamp}@example.com`;
  failureMode = 'none';
  sentCodes.length = 0;
  await request('POST', '/api/auth/register', { name: 'Mila Torralba', email: retryEmail, password, role: 'resident', barangay: 'Barangay Rizal' });
  const retryUser = await users().findOne({ email: retryEmail });
  const firstCode = sentCodes[0].code;

  // Let the cooldown elapse so the next resend is actually permitted, then make it fail.
  await pendingCodes().updateOne({ user: retryUser._id }, { $set: { sentAt: new Date(Date.now() - 120000), expiresAt: new Date(Date.now() - 60000) } });

  failureMode = 'always';
  res = await request('POST', '/api/auth/email-verification/request', {});
  check('a resend that fails reports the failure', res.status === 503, `${res.status} ${JSON.stringify(res.body)}`);
  res = await request('GET', '/api/auth/email-verification');
  check('a failed resend is recorded too', res.body.data?.deliveryFailed === true && res.body.data?.resendAfterSeconds === 0, JSON.stringify(res.body));

  failureMode = 'none';
  sentCodes.length = 0;
  res = await request('POST', '/api/auth/email-verification/request', {});
  check('the next resend is not blocked after a failed one', res.status === 200 && sentCodes.length === 1, `${res.status} ${JSON.stringify(res.body)}`);
  res = await request('POST', '/api/auth/verification/confirm', { code: firstCode });
  check('the code from before the failures no longer works', res.status === 400, `${res.status} ${JSON.stringify(res.body)}`);
  res = await request('POST', '/api/auth/verification/confirm', { code: sentCodes[0].code });
  check('the newly delivered code activates the account', res.status === 200, `${res.status} ${JSON.stringify(res.body)}`);

  // --- cooldown still protects a delivered code --------------------------------------
  const cooldownEmail = `cooldown${stamp}@example.com`;
  sentCodes.length = 0;
  await request('POST', '/api/auth/register', { name: 'Nena Villanueva', email: cooldownEmail, password, role: 'student' });
  const cooldownUser = await users().findOne({ email: cooldownEmail });
  res = await request('POST', '/api/auth/email-verification/request', {});
  check('resend inside the cooldown is still rate limited', res.status === 429, `${res.status} ${JSON.stringify(res.body)}`);
  check('the cooldown reports the remaining wait', Number.isFinite(res.body.data?.resendAfterSeconds) && res.body.data.resendAfterSeconds > 0, JSON.stringify(res.body));

  sentCodes.length = 0;
  await pendingCodes().updateOne({ user: cooldownUser._id }, { $set: { sentAt: new Date(Date.now() - 120000), expiresAt: new Date(Date.now() - 60000) } });
  res = await request('POST', '/api/auth/email-verification/request', {});
  check('the manual fallback works after the cooldown', res.status === 200 && sentCodes.length === 1, `${res.status} ${JSON.stringify(res.body)}`);
  res = await request('POST', '/api/auth/verification/confirm', { code: sentCodes[0].code });
  check('the freshly sent code activates the account', res.status === 200, `${res.status} ${JSON.stringify(res.body)}`);

  // --- admin view ---------------------------------------------------------------------
  const adminEmail = `admin${stamp}@example.com`;
  await users().insertOne({
    name: 'Rodel Mercado',
    email: adminEmail,
    password: await bcrypt.hash(password, 12),
    role: 'admin',
    verificationStatus: 'verified',
  });
  await login(adminEmail, password);
  res = await request('GET', '/api/admin/users');
  const listed = (res.body.data || []).find((entry) => entry.email === badEmail);
  check('admin users list shows the new account', Boolean(listed), JSON.stringify(res.body.data?.map((u) => u.email)));
  check('admin users list still reports Incomplete verification status', listed?.verificationStatus === 'incomplete', JSON.stringify(listed?.verificationStatus));
  check('admin users list carries the email verification state', listed?.emailVerified === true, JSON.stringify(listed?.emailVerified));

  // --- pre-change accounts ------------------------------------------------------------
  const legacyEmail = `legacy${stamp}@example.com`;
  await users().insertOne({
    name: 'Legacy Beneficiary',
    email: legacyEmail,
    password: await bcrypt.hash(password, 12),
    role: 'student',
    verificationStatus: 'verified',
  });
  res = await login(legacyEmail, password);
  check('a pre-change account still signs in', res.status === 200 && res.body.data?.emailVerified === undefined, `${res.status} ${JSON.stringify(res.body.data)}`);
  res = await request('POST', '/api/auth/email-verification/request', {});
  check('a confirmed account never reaches the activation endpoints', res.status === 401 && /sign in to get a verification code/i.test(res.body.message || ''), `${res.status} ${JSON.stringify(res.body)}`);

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
