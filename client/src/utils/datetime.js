// Release times are stored as 24-hour 'HH:MM' strings (see the release validation in
// server/controllers/programController.js), so display is the only place that converts them.
// One formatter keeps the start and end of a window consistent — no mixed 24-hour/12-hour
// output — and reuses Intl, the formatting API the rest of the app already uses for dates.
// No date library is a dependency, so none is added.

const TIME_FORMATTER = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

// The 12-hour label for a stored time, or the original value when it is not a time at all.
export const formatTime = (value) => {
  const raw = String(value ?? '').trim();
  const match = TIME_PATTERN.exec(raw);
  if (!match) return raw;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return raw;

  // A fixed date keeps the clock reading dependent only on the stored value. Narrow
  // no-break spaces (some ICU versions emit them before AM/PM) are normalised to a space.
  return TIME_FORMATTER.format(new Date(2000, 0, 1, hours, minutes)).replace(/\u202f/g, ' ');
};

// '18:40 - 19:40' -> '6:40 PM - 7:40 PM'. A missing side drops the separator rather than
// leaving a dangling dash.
export const formatTimeRange = (start, end) => {
  const from = formatTime(start);
  const to = formatTime(end);

  if (!from) return to;
  if (!to) return from;
  return `${from} - ${to}`;
};
