// Beneficiary-facing program filtering. The list endpoint already returns every active
// program in one response and the pages filter client-side, so this stays client-side.
import { slotAccent } from './accents';

export const emptyFilters = {
  category: '',
  assistanceType: '',
  eligibility: '',
  availableOnly: false,
};

export const hasActiveFilters = (filters) => Boolean(
  filters.category || filters.assistanceType || filters.eligibility || filters.availableOnly,
);

// A program stops accepting applications in two distinct ways, and the two must never be
// conflated: `closed` means an admin closed it, `full` means every slot is occupied.
// Full is derived from the same slotAccent computation the cards use for "No slots left",
// which mirrors the admin programs table capacity rule and the server-side isProgramFull
// (slots of 0 means no slots, a missing or non-numeric slot count means unlimited).
export const programAvailability = (program) => {
  if (program?.status === 'closed') return 'closed';
  return slotAccent(program?.slots, program?.approvedCount).tone === 'full' ? 'full' : 'available';
};

// A program is only "available" when it is open and still holds a free slot.
export const hasAvailableSlots = (program) => programAvailability(program) === 'available';

// Options come from the loaded programs, so they always reflect real data.
export const filterOptions = (programs) => {
  const unique = (values) => [...new Set(values.filter(Boolean))].sort();

  return {
    categories: unique(programs.map((program) => program.category)),
    assistanceTypes: unique(programs.map((program) => program.assistanceType)),
    eligibilities: unique(programs.map((program) => program.eligibility)),
  };
};

export const applyProgramFilters = (programs, filters) => programs.filter((program) => (
  (!filters.category || program.category === filters.category)
  && (!filters.assistanceType || program.assistanceType === filters.assistanceType)
  && (!filters.eligibility || program.eligibility === filters.eligibility)
  && (!filters.availableOnly || hasAvailableSlots(program))
));
