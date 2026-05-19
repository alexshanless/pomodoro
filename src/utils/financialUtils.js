// Net balance for a project = sum(incomes) - sum(spendings) for that project_id.
// Coerces amount with parseFloat so raw Supabase string amounts are handled safely.
export const calcProjectBalance = (projectId, incomes = [], spendings = []) => {
  const sum = (rows) =>
    rows
      .filter((t) => t.project_id === projectId)
      .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  return sum(incomes) - sum(spendings);
};
