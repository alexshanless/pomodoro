/**
 * Export Utilities
 * Handles CSV and PDF export functionality for sessions and financial data
 */

/**
 * Convert array of objects to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header strings
 * @param {Function} rowMapper - Function to map each object to array of values
 * @returns {string} CSV formatted string
 */
const arrayToCSV = (data, headers, rowMapper) => {
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  data.forEach(item => {
    const values = rowMapper(item).map(value => {
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = value === null || value === undefined ? '' : String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
};

/**
 * Trigger browser download of a file
 * @param {string} content - File content
 * @param {string} filename - Name for the downloaded file
 * @param {string} mimeType - MIME type of the file
 */
const downloadFile = (content, filename, mimeType = 'text/csv') => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDateForExport = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Export Pomodoro sessions to CSV
 * @param {Object} sessions - Sessions object grouped by date
 * @param {Object} options - Export options
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @param {string} options.projectId - Filter by project ID
 * @param {Array} options.projects - Array of project objects for name lookup
 * @returns {void} Triggers download
 */
export const exportSessionsToCSV = (sessions, options = {}) => {
  const { startDate, endDate, projectId, projects = [] } = options;

  // Flatten sessions and filter
  const allSessions = [];
  Object.entries(sessions).forEach(([date, dayData]) => {
    if (dayData.sessions) {
      dayData.sessions.forEach(session => {
        const sessionDate = new Date(session.timestamp);

        // Apply filters
        if (startDate && sessionDate < startDate) return;
        if (endDate && sessionDate > endDate) return;
        if (projectId && session.projectId !== projectId) return;

        // Find project details
        const project = projects.find(p => p.id === session.projectId);

        allSessions.push({
          date: sessionDate,
          projectName: project?.name || 'No Project',
          description: session.description || '',
          duration: session.duration,
          mode: session.mode,
          tags: session.tags || [],
          hourlyRate: project?.hourlyRate || 0,
          wasSuccessful: session.wasSuccessful
        });
      });
    }
  });

  // Sort by date (most recent first)
  allSessions.sort((a, b) => b.date - a.date);

  // Define headers
  const headers = [
    'Date',
    'Project',
    'Description',
    'Duration (min)',
    'Mode',
    'Tags',
    'Hourly Rate ($)',
    'Earnings ($)',
    'Status'
  ];

  // Map rows
  const rowMapper = (session) => {
    const earnings = ((session.duration / 60) * session.hourlyRate).toFixed(2);
    return [
      formatDateForExport(session.date),
      session.projectName,
      session.description,
      session.duration,
      session.mode,
      (session.tags || []).join('; '),
      session.hourlyRate.toFixed(2),
      earnings,
      session.wasSuccessful ? 'Completed' : 'Interrupted'
    ];
  };

  // Generate CSV
  const csv = arrayToCSV(allSessions, headers, rowMapper);

  // Generate filename with date range
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `pomodoro-sessions-${dateStr}.csv`;

  // Download
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Export financial transactions to CSV
 * @param {Array} incomes - Array of income transactions
 * @param {Array} spendings - Array of spending transactions
 * @param {Object} options - Export options
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @param {string} options.projectId - Filter by project ID
 * @param {Array} options.projects - Array of project objects for name lookup
 * @returns {void} Triggers download
 */
export const exportFinancialToCSV = (incomes, spendings, options = {}) => {
  const { startDate, endDate, projectId, projects = [] } = options;

  // Combine and transform transactions
  const allTransactions = [
    ...incomes.map(income => ({
      ...income,
      type: 'Income',
      category: 'Income'
    })),
    ...spendings.map(spending => ({
      ...spending,
      type: 'Spending'
    }))
  ];

  // Filter transactions
  const filteredTransactions = allTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);

    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;
    if (projectId && transaction.project_id !== projectId) return false;

    return true;
  });

  // Sort by date (most recent first)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Define headers
  const headers = [
    'Date',
    'Type',
    'Description',
    'Category',
    'Amount ($)',
    'Project',
    'Recurring',
    'Recurring Type'
  ];

  // Map rows
  const rowMapper = (transaction) => {
    const project = projects.find(p => p.id === transaction.project_id);
    return [
      formatDateForExport(transaction.date),
      transaction.type,
      transaction.description,
      transaction.category || 'N/A',
      transaction.amount.toFixed(2),
      project?.name || 'No Project',
      transaction.is_recurring ? 'Yes' : 'No',
      transaction.recurring_type || 'N/A'
    ];
  };

  // Generate CSV
  const csv = arrayToCSV(filteredTransactions, headers, rowMapper);

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `financial-transactions-${dateStr}.csv`;

  // Download
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Export project summary to CSV
 * @param {Object} project - Project object
 * @param {Object} sessions - All sessions data
 * @param {Array} incomes - Array of income transactions
 * @param {Array} spendings - Array of spending transactions
 * @param {Object} options - Export options
 * @returns {void} Triggers download
 */
export const exportProjectSummaryToCSV = (project, sessions, incomes, spendings, options = {}) => {
  const { startDate, endDate } = options;

  // Get project sessions
  const projectSessions = [];
  Object.entries(sessions).forEach(([date, dayData]) => {
    if (dayData.sessions) {
      dayData.sessions
        .filter(s => s.projectId === project.id)
        .forEach(session => {
          const sessionDate = new Date(session.timestamp);
          if (startDate && sessionDate < startDate) return;
          if (endDate && sessionDate > endDate) return;

          projectSessions.push({
            date: sessionDate,
            description: session.description || '',
            duration: session.duration,
            mode: session.mode,
            tags: session.tags || []
          });
        });
    }
  });

  // Sort by date
  projectSessions.sort((a, b) => b.date - a.date);

  // Calculate totals
  const totalMinutes = projectSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(2);
  const totalEarnings = (totalHours * (project.hourlyRate || 0)).toFixed(2);

  // Get project transactions
  const projectIncomes = incomes.filter(i => i.project_id === project.id);
  const projectSpendings = spendings.filter(s => s.project_id === project.id);
  const totalIncome = projectIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalSpending = projectSpendings.reduce((sum, s) => sum + s.amount, 0);
  const balance = totalIncome - totalSpending;

  // Create summary content
  const summaryLines = [
    `Project Summary: ${project.name}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'PROJECT DETAILS',
    `Project Number,${project.projectNumber || project.id}`,
    `Hourly Rate,$${(project.hourlyRate || 0).toFixed(2)}`,
    `Time Estimate,${project.timeEstimate || 0} minutes`,
    '',
    'TIME TRACKING SUMMARY',
    `Total Sessions,${projectSessions.length}`,
    `Total Minutes,${totalMinutes}`,
    `Total Hours,${totalHours}`,
    `Calculated Earnings,$${totalEarnings}`,
    '',
    'FINANCIAL SUMMARY',
    `Total Income,$${totalIncome.toFixed(2)}`,
    `Total Spending,$${totalSpending.toFixed(2)}`,
    `Balance,$${balance.toFixed(2)}`,
    '',
    '',
    'SESSION DETAILS',
    'Date,Description,Duration (min),Mode,Tags'
  ];

  // Add session rows
  projectSessions.forEach(session => {
    summaryLines.push(
      `${formatDateForExport(session.date)},${session.description},${session.duration},${session.mode},"${(session.tags || []).join('; ')}"`
    );
  });

  const csv = summaryLines.join('\n');

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `project-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${dateStr}.csv`;

  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Generate simple text invoice (can be enhanced with PDF library later)
 * @param {Object} project - Project object
 * @param {Object} sessions - Sessions data
 * @param {Object} options - Invoice options
 * @returns {void} Triggers download
 */
export const generateTextInvoice = (project, sessions, options = {}) => {
  const { startDate, endDate, invoiceNumber, clientName, notes } = options;

  // Get project sessions in date range
  const projectSessions = [];
  Object.entries(sessions).forEach(([date, dayData]) => {
    if (dayData.sessions) {
      dayData.sessions
        .filter(s => s.projectId === project.id)
        .forEach(session => {
          const sessionDate = new Date(session.timestamp);
          if (startDate && sessionDate < startDate) return;
          if (endDate && sessionDate > endDate) return;

          projectSessions.push({
            date: sessionDate,
            description: session.description || 'Work session',
            duration: session.duration
          });
        });
    }
  });

  // Sort by date
  projectSessions.sort((a, b) => a.date - b.date);

  // Calculate totals
  const totalMinutes = projectSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(2);
  const hourlyRate = project.hourlyRate || 0;
  const totalAmount = (totalHours * hourlyRate).toFixed(2);

  // Generate invoice content
  const invoiceLines = [
    '═══════════════════════════════════════════════════════════════',
    '                            INVOICE',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Invoice Number: ${invoiceNumber || 'INV-' + Date.now()}`,
    `Invoice Date: ${new Date().toLocaleDateString()}`,
    `Project: ${project.name}`,
    `Client: ${clientName || 'N/A'}`,
    '',
    '───────────────────────────────────────────────────────────────',
    'LINE ITEMS',
    '───────────────────────────────────────────────────────────────',
    '',
  ];

  // Group sessions by date for cleaner invoice
  const sessionsByDate = {};
  projectSessions.forEach(session => {
    const dateKey = session.date.toLocaleDateString();
    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = {
        date: dateKey,
        sessions: [],
        totalMinutes: 0
      };
    }
    sessionsByDate[dateKey].sessions.push(session);
    sessionsByDate[dateKey].totalMinutes += session.duration;
  });

  // Add line items
  Object.values(sessionsByDate).forEach(day => {
    const hours = (day.totalMinutes / 60).toFixed(2);
    const amount = (hours * hourlyRate).toFixed(2);
    invoiceLines.push(`${day.date}`);
    invoiceLines.push(`  ${day.sessions.length} session(s), ${hours} hours @ $${hourlyRate.toFixed(2)}/hr = $${amount}`);
    day.sessions.forEach(session => {
      invoiceLines.push(`    • ${session.description} (${session.duration} min)`);
    });
    invoiceLines.push('');
  });

  invoiceLines.push('───────────────────────────────────────────────────────────────');
  invoiceLines.push('SUMMARY');
  invoiceLines.push('───────────────────────────────────────────────────────────────');
  invoiceLines.push('');
  invoiceLines.push(`Total Sessions: ${projectSessions.length}`);
  invoiceLines.push(`Total Hours: ${totalHours}`);
  invoiceLines.push(`Hourly Rate: $${hourlyRate.toFixed(2)}`);
  invoiceLines.push('');
  invoiceLines.push(`TOTAL AMOUNT DUE: $${totalAmount}`);
  invoiceLines.push('');

  if (notes) {
    invoiceLines.push('───────────────────────────────────────────────────────────────');
    invoiceLines.push('NOTES');
    invoiceLines.push('───────────────────────────────────────────────────────────────');
    invoiceLines.push('');
    invoiceLines.push(notes);
    invoiceLines.push('');
  }

  invoiceLines.push('═══════════════════════════════════════════════════════════════');
  invoiceLines.push(`Generated: ${new Date().toLocaleString()}`);
  invoiceLines.push('═══════════════════════════════════════════════════════════════');

  const invoiceContent = invoiceLines.join('\n');

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `invoice-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${dateStr}.txt`;

  downloadFile(invoiceContent, filename, 'text/plain;charset=utf-8;');
};
