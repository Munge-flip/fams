// Accent palette for beneficiary-facing program cards. Every colour is reused from the
// palette already used across the app (blue = the app accent / under review, amber =
// near capacity and deadlines, green = available / approved, red = denied / at
// capacity, gray = neutral). Keep this list short so the card never grows an ad hoc
// palette.

// Single accent for the discovery-feed cards. Blue is the hue the app already uses as
// its accent (verification badges, release schedule panels, the "under review" pill),
// so the strip and the category label reuse it instead of inventing a per-category
// palette. Category is a label only — colour meaning lives in slots, status, deadline.

export const cardAccent = { border: 'border-l-blue-600', text: 'text-blue-600' };

const categoryLabels = {
  scholarship: 'Scholarship',
  barangay: 'Barangay aid',
  emergency: 'Emergency aid',
};

export const categoryLabel = (category) => categoryLabels[category] || 'Financial aid';

// Slots: green while there is room, amber at 20% or less remaining, red when full.
// Mirrors the amber at-capacity treatment used in the admin programs table.
const NEARLY_FULL_RATIO = 0.2;

export const slotAccent = (slots, approvedCount) => {
  if (!Number.isInteger(slots) || slots < 0) {
    return { tone: 'unknown', remaining: null, text: 'text-gray-600' };
  }

  const occupied = Number.isInteger(approvedCount) && approvedCount > 0 ? approvedCount : 0;
  const remaining = Math.max(slots - occupied, 0);

  if (remaining === 0) return { tone: 'full', remaining, text: 'text-red-700' };
  if (remaining / slots <= NEARLY_FULL_RATIO) return { tone: 'nearly_full', remaining, text: 'text-amber-700' };
  return { tone: 'available', remaining, text: 'text-green-700' };
};

export const slotsLabel = (slots, slotState) => {
  if (slotState.tone === 'unknown') return 'Slots available';
  if (slotState.remaining === 0) return 'No slots left';
  return `${slotState.remaining} of ${slots} slots left`;
};

// Deadlines: amber within a week, red once passed, neutral otherwise.
const DEADLINE_WARNING_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const deadlineAccent = (deadline, now = Date.now()) => {
  const time = deadline ? new Date(deadline).getTime() : NaN;
  if (Number.isNaN(time)) return { tone: 'unknown', text: 'text-gray-600' };

  const daysLeft = (time - now) / DAY_MS;
  if (daysLeft < 0) return { tone: 'past', text: 'text-red-700' };
  if (daysLeft <= DEADLINE_WARNING_DAYS) return { tone: 'soon', text: 'text-amber-700' };
  return { tone: 'neutral', text: 'text-gray-600' };
};
