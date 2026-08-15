const cookieOptions = () => {
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE || 7);

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: cookieExpireDays * 24 * 60 * 60 * 1000,
    path: '/',
  };
};

module.exports = cookieOptions;
