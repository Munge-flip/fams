/* Throwaway preload: selects the SMTP target for the end-to-end runs.
   node -r ./tmp-smtp-env.cjs index.js           -> local sink on 127.0.0.1:2525
   SMTP_PORT=2 node -r ./tmp-smtp-env.cjs index.js -> dead port, sends fail                */
process.env.SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1';
process.env.SMTP_PORT = process.env.SMTP_PORT || '2525';
process.env.MAIL_FROM = process.env.MAIL_FROM || 'no-reply@fams.test';
process.env.MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'FAMS';
