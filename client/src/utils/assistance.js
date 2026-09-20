// Assistance displayed to admins and beneficiaries always comes from the program's
// configured `assistanceValue`. Applications carry no per-application amount override.
export const formatAmount = (amount) => `₱${new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(amount)}`;

// Cash programs store a peso amount, food programs store a short text description.
export const assistanceValueText = (program) => {
  const { assistanceType, assistanceValue } = program || {};
  if (assistanceValue === undefined || assistanceValue === null || assistanceValue === '') {
    return '';
  }

  return assistanceType === 'food' ? String(assistanceValue) : formatAmount(Number(assistanceValue));
};

export const assistanceLabel = (program) => (program?.assistanceType === 'food' ? 'Assistance' : 'Amount');

export const assistanceTypeLabels = {
  cash: 'Cash Assistance',
  food: 'Food Assistance',
};

export const assistanceTypeLabel = (assistanceType) => assistanceTypeLabels[assistanceType] || 'Assistance';
