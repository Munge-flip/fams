const details = {
  submitted: { label: 'Submitted', color: 'bg-gray-700', text: 'text-gray-700' },
  under_review: { label: 'Under review', color: 'bg-blue-600', text: 'text-blue-700' },
  approved: { label: 'Approved', color: 'bg-green-600', text: 'text-green-700' },
  denied: { label: 'Denied', color: 'bg-red-600', text: 'text-red-700' },
  cash_released: { label: 'Cash released', color: 'bg-emerald-900', text: 'text-emerald-900' },
};

export const statusLabel = (status) => details[status]?.label || status;

export function StatusBadge({ status }) {
  const detail = details[status] || details.submitted;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${detail.color} text-white`}>{statusLabel(status)}</span>;
}

export default function ApplicationStatus({ status }) {
  const steps = ['submitted', 'under_review', 'approved', 'cash_released'];
  const current = steps.indexOf(status);
  const denied = status === 'denied';

  return (
    <div className="mt-5">
      {denied ? <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">This application was denied.</p> : (
        <ol className="grid grid-cols-4 gap-1" aria-label="Application progress">
          {steps.map((step, index) => {
            const complete = index <= current;
            return <li className="min-w-0" key={step}>
              <span className={`block h-2 rounded-full ${complete ? details[status]?.color || 'bg-gray-700' : 'bg-gray-200'}`} />
              <span className={`mt-2 block text-center text-[10px] font-semibold leading-3 ${complete ? details[status]?.text || 'text-gray-700' : 'text-gray-400'}`}>{statusLabel(step)}</span>
            </li>;
          })}
        </ol>
      )}
    </div>
  );
}
