// Mirrors `activeApplicationStatuses` in server/controllers/applicationController.js.
// `denied` is the only status that frees a beneficiary to apply again.
export const ACTIVE_APPLICATION_STATUSES = ['submitted', 'under_review', 'approved', 'cash_released'];

export const isActiveApplication = (application) => (
  Boolean(application) && ACTIVE_APPLICATION_STATUSES.includes(application.status)
);

const programIdOf = (application) => {
  const program = application?.program;
  if (!program) return '';
  return String(program._id || program);
};

const submittedTime = (application) => {
  const value = application?.submittedAt || application?.updatedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

// Applications arrive newest-first from the API; sort defensively so the callers
// always reason about the most recent application for a program.
export const latestApplicationForProgram = (applications, programId) => {
  if (!Array.isArray(applications) || !programId) return null;
  const target = String(programId);

  return applications
    .filter((application) => programIdOf(application) === target)
    .reduce((latest, application) => (
      !latest || submittedTime(application) >= submittedTime(latest) ? application : latest
    ), null);
};

export const activeApplicationForProgram = (applications, programId) => {
  const latest = latestApplicationForProgram(applications, programId);
  return isActiveApplication(latest) ? latest : null;
};

// Status reached when the aid has been handed over (see the Application status enum).
export const RELEASED_APPLICATION_STATUS = 'cash_released';

// Programs the current beneficiary has already received aid for. Their deadline is no
// longer actionable for that user, while every other user keeps seeing the program.
export const releasedProgramIds = (applications) => new Set(
  (Array.isArray(applications) ? applications : [])
    .filter((application) => application?.status === RELEASED_APPLICATION_STATUS)
    .map((application) => programIdOf(application))
    .filter(Boolean),
);
