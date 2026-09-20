/* Throwaway preload: points the API at a dead SMTP port so every send fails (delete after use). */
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '2';
process.env.MAIL_FROM = 'no-reply@fams.test';
process.env.MAIL_FROM_NAME = 'FAMS';
