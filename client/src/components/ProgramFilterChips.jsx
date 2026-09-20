import FilterDropdown from './FilterDropdown';
import { categoryLabel } from '../utils/accents';
import { assistanceTypeLabel } from '../utils/assistance';
import { hasActiveFilters } from '../utils/programFilters';

// Chips reuse the card accent token for their selected state, so filters and cards share
// one palette. Selected = filled accent, unselected = outlined neutral. Typography sits on
// the inner span because index.css applies `font: inherit` to buttons unlayered, which
// outranks Tailwind's utility layer on the button element itself.
const chipBase = 'inline-flex min-h-9 max-w-[12rem] items-center rounded-full border px-3 outline-none transition focus:ring-2 focus:ring-black/15';
const chipLabel = 'truncate text-xs font-semibold';
const chipIdle = 'border-gray-300 bg-white text-gray-700 hover:border-gray-400';
const chipSelected = 'border-blue-600 bg-blue-600 text-white';

export default function ProgramFilterChips({ options, filters, onChange, onClear }) {
  const withAll = (allLabel, values, format) => [
    { value: '', label: allLabel },
    ...values.map((value) => ({ value, label: format(value) })),
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Program filters">
      <FilterDropdown
        label="Filter by category"
        options={withAll('All categories', options.categories, categoryLabel)}
        value={filters.category}
        onChange={(value) => onChange('category', value)}
      />

      <FilterDropdown
        label="Filter by assistance type"
        options={withAll('All assistance', options.assistanceTypes, assistanceTypeLabel)}
        value={filters.assistanceType}
        onChange={(value) => onChange('assistanceType', value)}
      />

      <FilterDropdown
        label="Filter by eligibility or barangay"
        options={withAll('All eligibility', options.eligibilities, (eligibility) => eligibility)}
        value={filters.eligibility}
        onChange={(value) => onChange('eligibility', value)}
      />

      <button
        type="button"
        aria-pressed={filters.availableOnly}
        title="Show only programs that still have slots"
        className={`${chipBase} ${filters.availableOnly ? chipSelected : chipIdle}`}
        onClick={() => onChange('availableOnly', !filters.availableOnly)}
      >
        <span className={chipLabel}>Slots available</span>
      </button>

      {hasActiveFilters(filters) && (
        <button type="button" className={`${chipBase} ${chipIdle}`} onClick={onClear}><span className={chipLabel}>Clear filters</span></button>
      )}
    </div>
  );
}
