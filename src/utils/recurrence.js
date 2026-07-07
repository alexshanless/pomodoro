// Cap occurrence generation per anchor so a corrupt/ancient anchor date
// can't loop unbounded (400 weekly occurrences ≈ 7.5 years of catch-up).
export const MAX_OCCURRENCES = 400;

// Deterministic UTC interval math so every device computes identical
// occurrence timestamps (required for the unique-index dedup to work).
// Always computed from the anchor date (not the previous occurrence) so
// month-end clamping doesn't drift: Jan 31 → Feb 28 → Mar 31.
export const addInterval = (base, type, n) => {
  const d = new Date(base);
  if (type === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7 * n);
    return d;
  }
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (type === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() + n);
  } else {
    d.setUTCMonth(d.getUTCMonth() + n);
  }
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
};

// Occurrence timestamps due between the anchor date and `now` that are not
// already present for that anchor. `existingKeys` holds "<anchorId>|<iso>"
// strings for occurrences that already exist.
export const getMissingOccurrences = (anchor, existingKeys, now = Date.now()) => {
  const missing = [];
  for (let n = 1; n <= MAX_OCCURRENCES; n++) {
    const occurrence = addInterval(anchor.date, anchor.recurring_type, n);
    if (occurrence.getTime() > now) break;
    const iso = occurrence.toISOString();
    if (!existingKeys.has(`${anchor.id}|${iso}`)) {
      missing.push(iso);
    }
  }
  return missing;
};
