export default function AdminSectionPlaceholder({ title }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">ADMINISTRATION</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">This area is ready for the next admin implementation phase.</p>
    </section>
  );
}
