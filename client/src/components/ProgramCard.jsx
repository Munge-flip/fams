const categoryLabels = {
  scholarship: 'Scholarship',
  barangay: 'Barangay aid',
  emergency: 'Emergency aid',
};

const formatDeadline = (deadline) => new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(deadline));

export default function ProgramCard({ program }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700">
          {categoryLabels[program.category] || 'Financial aid'}
        </span>
        <span className="shrink-0 text-xs font-medium text-gray-600">Deadline {formatDeadline(program.deadline)}</span>
      </div>
      <h2 className="mt-4 text-lg font-bold leading-6 text-black">{program.title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{program.description}</p>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Eligibility</p>
        <p className="mt-1 text-sm leading-5 text-gray-700">{program.eligibility}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-black">{program.slots} available slots</p>
        <button
          className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-500 disabled:cursor-not-allowed"
          type="button"
          disabled
          title="Applications open in Day 5"
        >
          Apply now
        </button>
      </div>
    </article>
  );
}
