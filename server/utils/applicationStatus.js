// Single source of truth for application status semantics. Controllers must import
// from here instead of redeclaring status sets, so slot accounting can never drift.

const applicationStatuses = ['submitted', 'under_review', 'approved', 'denied', 'cash_released'];

// A beneficiary may only reapply after `denied`; every other status is an active
// claim on the program (cash_released is the completed form of an approval).
const activeApplicationStatuses = ['submitted', 'under_review', 'approved', 'cash_released'];

// Statuses that occupy a slot. Accepted beneficiaries hold a slot, and released aid
// is permanent: `cash_released` occupies a slot exactly like `approved`. Only
// `denied` and the in-review statuses (submitted, under_review) do not occupy one.
const slotOccupyingStatuses = ['approved', 'cash_released'];

const applicationTransitions = {
  submitted: ['under_review'],
  under_review: ['approved', 'denied'],
  approved: ['cash_released'],
  denied: [],
  cash_released: ['approved'],
};

const occupiesSlot = (status) => slotOccupyingStatuses.includes(status);

// `slots` is how many beneficiaries a program can accept; 0 means no slots at all.
// Programs without a numeric slot count are never full.
const isProgramFull = (slots, occupiedCount) => (
  Number.isInteger(slots) && slots >= 0 ? occupiedCount >= slots : false
);

module.exports = {
  activeApplicationStatuses,
  applicationStatuses,
  applicationTransitions,
  isProgramFull,
  occupiesSlot,
  slotOccupyingStatuses,
};
