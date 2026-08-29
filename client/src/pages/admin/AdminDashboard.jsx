const overviewCards = [
  { label: 'Total Programs', detail: 'Program totals will appear here.' },
  { label: 'Pending Applications', detail: 'Pending applications will appear here.' },
  { label: 'Approved', detail: 'Approved applications will appear here.' },
  { label: 'Cash Released', detail: 'Released aid records will appear here.' },
];

export default function AdminDashboard() {
  return (
    <>
      <section>
        <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">OVERVIEW</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black sm:text-4xl">Admin dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">Monitor financial-assistance programs and application activity from one workspace.</p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Application overview">
        {overviewCards.map((card) => (
          <article className="min-h-36 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" key={card.label}>
            <h2 className="text-sm font-semibold text-gray-700">{card.label}</h2>
            <div className="mt-5 h-8 w-16 rounded bg-gray-100" aria-hidden="true" />
            <p className="mt-4 text-xs leading-5 text-gray-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="recent-applications-heading">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 id="recent-applications-heading" className="text-lg font-bold text-black">Recent Applications</h2>
          <p className="mt-1 text-sm text-gray-600">Recent submissions will appear here once application review is connected.</p>
        </div>
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-sm font-medium text-gray-600">No application data is displayed yet.</p>
        </div>
      </section>
    </>
  );
}
