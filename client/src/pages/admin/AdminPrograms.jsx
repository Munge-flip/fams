import { useEffect, useMemo, useState } from 'react';
import {
  createProgram,
  deleteProgram,
  getProgramById,
  getPrograms,
  updateProgram,
} from '../../services/programService';

const emptyForm = {
  title: '',
  description: '',
  eligibility: '',
  slots: '',
  deadline: '',
  category: 'scholarship',
  status: 'active',
};

const categoryLabels = {
  scholarship: 'Scholarship',
  barangay: 'Barangay',
  emergency: 'Emergency',
};

const errorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;

const formatDate = (date) => new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(date));

const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const toFormValues = (program) => ({
  title: program.title || '',
  description: program.description || '',
  eligibility: program.eligibility || '',
  slots: String(program.slots ?? ''),
  deadline: toDateInput(program.deadline),
  category: program.category || 'scholarship',
  status: program.status || 'active',
});

function validateForm(form, includeStatus) {
  for (const field of ['title', 'description', 'eligibility']) {
    if (!form[field].trim()) return `${field[0].toUpperCase()}${field.slice(1)} is required.`;
  }

  const slots = Number(form.slots);
  if (!form.slots.trim() || !Number.isInteger(slots) || slots < 0) return 'Slots must be an integer greater than or equal to 0.';
  if (!form.deadline || Number.isNaN(new Date(form.deadline).getTime())) return 'Deadline must be a valid date.';
  if (!Object.hasOwn(categoryLabels, form.category)) return 'Select a valid category.';
  if (includeStatus && !['active', 'closed'].includes(form.status)) return 'Select a valid status.';

  return '';
}

function ProgramForm({ mode, form, formError, submitting, onCancel, onChange, onSubmit }) {
  const isCreating = mode === 'create';

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="program-form-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-black" id="program-form-heading">{isCreating ? 'Create program' : 'Edit program'}</h2>
          <p className="mt-1 text-sm text-gray-600">{isCreating ? 'Add a financial-assistance program for applicants.' : 'Update the selected program details.'}</p>
        </div>
        <button className="min-h-10 rounded-lg px-3 text-sm font-semibold text-gray-700 underline underline-offset-4" type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
      </div>

      {formError && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</p>}

      <form className="mt-5 grid gap-5 lg:grid-cols-2" onSubmit={onSubmit} noValidate>
        <label className="block lg:col-span-2" htmlFor="program-title">
          <span className="text-sm font-semibold text-gray-800">Title</span>
          <input className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-title" name="title" value={form.title} onChange={onChange} disabled={submitting} required />
        </label>
        <label className="block lg:col-span-2" htmlFor="program-description">
          <span className="text-sm font-semibold text-gray-800">Description</span>
          <textarea className="mt-2 block min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-description" name="description" value={form.description} onChange={onChange} disabled={submitting} required />
        </label>
        <label className="block lg:col-span-2" htmlFor="program-eligibility">
          <span className="text-sm font-semibold text-gray-800">Eligibility</span>
          <textarea className="mt-2 block min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-eligibility" name="eligibility" value={form.eligibility} onChange={onChange} disabled={submitting} required />
        </label>
        <label className="block" htmlFor="program-slots">
          <span className="text-sm font-semibold text-gray-800">Slots</span>
          <input className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-slots" name="slots" type="number" min="0" step="1" inputMode="numeric" value={form.slots} onChange={onChange} disabled={submitting} required />
        </label>
        <label className="block" htmlFor="program-deadline">
          <span className="text-sm font-semibold text-gray-800">Deadline</span>
          <input className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-deadline" name="deadline" type="date" value={form.deadline} onChange={onChange} disabled={submitting} required />
        </label>
        <label className="block" htmlFor="program-category">
          <span className="text-sm font-semibold text-gray-800">Category</span>
          <select className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-category" name="category" value={form.category} onChange={onChange} disabled={submitting}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {isCreating && (
          <label className="block" htmlFor="program-status">
            <span className="text-sm font-semibold text-gray-800">Status</span>
            <select className="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10" id="program-status" name="status" value={form.status} onChange={onChange} disabled={submitting}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        )}
        <div className="flex items-end lg:col-span-2">
          <button className="min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? (isCreating ? 'Creating…' : 'Saving…') : (isCreating ? 'Create program' : 'Save changes')}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AdminPrograms() {
  const [programs, setPrograms] = useState([]);
  const [recentlyClosed, setRecentlyClosed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formMode, setFormMode] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [message, setMessage] = useState('');

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await getPrograms();
      setPrograms(response.data);
    } catch (error) {
      setLoadError(errorMessage(error, 'Unable to load aid programs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const visiblePrograms = useMemo(() => [
    ...programs,
    ...recentlyClosed.filter((closedProgram) => !programs.some((program) => program._id === closedProgram._id)),
  ], [programs, recentlyClosed]);

  const closeForm = () => {
    setFormMode('');
    setEditingId('');
    setForm(emptyForm);
    setFormError('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreate = () => {
    setMessage('');
    setForm(emptyForm);
    setFormError('');
    setEditingId('');
    setFormMode('create');
  };

  const handleEdit = async (id) => {
    try {
      setActionId(id);
      setMessage('');
      setFormError('');
      const response = await getProgramById(id);
      setForm(toFormValues(response.data));
      setEditingId(id);
      setFormMode('edit');
    } catch (error) {
      setLoadError(errorMessage(error, 'Unable to load this program for editing.'));
    } finally {
      setActionId('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isCreating = formMode === 'create';
    const validationError = validateForm(form, isCreating);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      eligibility: form.eligibility.trim(),
      slots: Number(form.slots),
      deadline: form.deadline,
      category: form.category,
    };

    if (isCreating) payload.status = form.status;

    try {
      setSubmitting(true);
      setFormError('');
      setMessage('');
      const response = isCreating ? await createProgram(payload) : await updateProgram(editingId, payload);
      const savedProgram = response.data;

      if (savedProgram.status === 'closed') {
        setRecentlyClosed((current) => [...current.filter((program) => program._id !== savedProgram._id), savedProgram]);
        setMessage(isCreating ? 'Program created as closed. It is shown for this session only.' : 'Program updated and remains shown as recently closed for this session only.');
      } else {
        setRecentlyClosed((current) => current.filter((program) => program._id !== savedProgram._id));
        setMessage(isCreating ? 'Program created successfully.' : 'Program updated successfully.');
      }

      closeForm();
      await loadPrograms();
    } catch (error) {
      setFormError(errorMessage(error, isCreating ? 'Unable to create the program.' : 'Unable to update the program.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (program) => {
    const nextStatus = program.status === 'active' ? 'closed' : 'active';
    const action = nextStatus === 'closed' ? 'close' : 'reopen';
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} “${program.title}”?`)) return;

    try {
      setActionId(program._id);
      setMessage('');
      const response = await updateProgram(program._id, { status: nextStatus });
      const updatedProgram = response.data;

      if (nextStatus === 'closed') {
        setRecentlyClosed((current) => [...current.filter((item) => item._id !== updatedProgram._id), updatedProgram]);
        setMessage('Program closed. It remains visible as recently closed until this page is refreshed.');
      } else {
        setRecentlyClosed((current) => current.filter((item) => item._id !== updatedProgram._id));
        setMessage('Program reopened successfully.');
      }

      await loadPrograms();
    } catch (error) {
      setLoadError(errorMessage(error, `Unable to ${action} this program.`));
    } finally {
      setActionId('');
    }
  };

  const handleDelete = async (program) => {
    if (!window.confirm(`Delete “${program.title}”? This cannot be undone.`)) return;

    try {
      setActionId(program._id);
      setMessage('');
      await deleteProgram(program._id);
      setRecentlyClosed((current) => current.filter((item) => item._id !== program._id));
      setMessage('Program deleted successfully.');
      await loadPrograms();
    } catch (error) {
      if (error.response?.status === 409) {
        setLoadError('Programs with applications cannot be deleted.');
      } else {
        setLoadError(errorMessage(error, 'Unable to delete this program.'));
      }
    } finally {
      setActionId('');
    }
  };

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-gray-500">ADMINISTRATION</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-black">Programs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Create and maintain financial-assistance programs available to applicants.</p>
        </div>
        <button className="min-h-11 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleCreate} disabled={submitting}>Create program</button>
      </section>

      {formMode && <ProgramForm mode={formMode} form={form} formError={formError} submitting={submitting} onCancel={closeForm} onChange={handleFormChange} onSubmit={handleSubmit} />}

      {message && <p className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">{message}</p>}
      {loadError && <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert"><span>{loadError}</span><button className="min-h-10 shrink-0 rounded-lg border border-red-300 px-3 font-semibold" type="button" onClick={loadPrograms}>Retry</button></div>}
      {recentlyClosed.length > 0 && <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Recently closed programs are shown only for this open page so they can be reopened. The API does not return closed programs after a page refresh.</p>}

      <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="program-list-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-black" id="program-list-heading">Program list</h2>
            <p className="mt-1 text-sm text-gray-600">Active programs are loaded from the current API.</p>
          </div>
          <button className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={loadPrograms} disabled={loading}>Refresh</button>
        </div>

        {loading && <p className="p-6 text-sm text-gray-600" role="status">Loading programs…</p>}
        {!loading && !loadError && visiblePrograms.length === 0 && <p className="p-6 text-sm text-gray-600">No active programs are available. Create a program to get started.</p>}
        {!loading && visiblePrograms.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Title</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Category</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Deadline</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Slots</th>
                  <th className="px-5 py-3 font-semibold" scope="col">Status</th>
                  <th className="px-5 py-3 font-semibold sm:px-6" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {visiblePrograms.map((program) => {
                  const busy = actionId === program._id;
                  const isClosed = program.status === 'closed';
                  return (
                    <tr key={program._id} className={isClosed ? 'bg-amber-50/50' : 'bg-white'}>
                      <td className="max-w-xs px-5 py-4 font-semibold text-black sm:px-6">{program.title}</td>
                      <td className="px-5 py-4 text-gray-700">{categoryLabels[program.category] || program.category}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-700">{formatDate(program.deadline)}</td>
                      <td className="px-5 py-4 text-gray-700">{program.slots}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isClosed ? 'bg-gray-200 text-gray-800' : 'bg-green-100 text-green-800'}`}>{isClosed ? 'Closed' : 'Active'}</span></td>
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex min-w-64 flex-wrap gap-2">
                          <button className="min-h-9 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => handleEdit(program._id)} disabled={busy || submitting}>{busy ? 'Loading…' : 'Edit'}</button>
                          <button className="min-h-9 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => handleStatusChange(program)} disabled={busy || submitting}>{busy ? 'Saving…' : (isClosed ? 'Reopen' : 'Close')}</button>
                          <button className="min-h-9 rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => handleDelete(program)} disabled={busy || submitting}>{busy ? 'Working…' : 'Delete'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
