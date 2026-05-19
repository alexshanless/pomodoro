// Shared date helpers. Pure functions, no React deps.

// Parse a YYYY-MM-DD (or ISO) string as a local-timezone Date.
// Avoids the UTC-midnight offset that `new Date('YYYY-MM-DD')` introduces.
export const parseLocalDate = (dateString) => {
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// "Today" / "Yesterday" bucketing, falling back to "MMM D" or "MMM D, YYYY".
export const formatRelativeDate = (dateString, { includeYear = false } = {}) => {
  const date = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear && { year: 'numeric' }),
  });
};

// Returns { startDate, endDate } for a named filter. Default: today.
// Supported: 'today', '7d', '30d', '90d', '1y'.
export const getDateRangeForFilter = (filter) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (filter) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'today':
    default:
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

// True if a YYYY-MM-DD date string falls within [startDate, endDate].
export const isDateInRange = (dateString, startDate, endDate) => {
  const date = parseLocalDate(dateString);
  return date >= startDate && date <= endDate;
};
