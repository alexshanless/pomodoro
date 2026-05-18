// Shared formatting helpers. Pure functions, no React deps.

export const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

// Like formatMinutes but suppresses "0m" when the value is a whole number of hours.
export const formatMinutesCompact = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
};

export const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;

// Accounting-style: negatives wrapped in parentheses.
export const formatCurrencySigned = (amount) => {
  const value = amount || 0;
  return value >= 0 ? `$${value.toFixed(2)}` : `($${Math.abs(value).toFixed(2)})`;
};

// "Mon DD, YYYY" — the project's de facto display format.
export const formatDate = (dateInput) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
