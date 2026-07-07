/**
 * Export Utilities
 * Handles CSV and PDF export functionality for sessions and financial data
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  // UTF-8 BOM so Excel detects the encoding instead of mangling non-ASCII.
  const payload = mimeType.includes('csv') ? '\uFEFF' + content : content;
  const blob = new Blob([payload], { type: mimeType });
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
 * Resolve a project's hourly rate. Projects loaded via useProjects expose
 * `rate` (mapped from the DB's hourly_rate); older callers passed `hourlyRate`.
 * @param {Object} project - Project object
 * @returns {number} Hourly rate
 */
export const getProjectRate = (project) => parseFloat(project?.rate ?? project?.hourlyRate) || 0;

/**
 * Collect one project's sessions within an optional date range,
 * sorted oldest-first.
 * @param {Object} sessions - Sessions object grouped by date
 * @param {string} projectId - Project to collect for
 * @param {Object} options - { startDate, endDate } Date filters
 * @returns {Array} [{ date, description, duration, mode, tags }]
 */
export const getProjectSessionsInRange = (sessions, projectId, options = {}) => {
  const { startDate, endDate } = options;
  const result = [];
  Object.values(sessions).forEach(dayData => {
    (dayData.sessions || [])
      .filter(s => s.projectId === projectId)
      .forEach(session => {
        const sessionDate = new Date(session.timestamp);
        if (startDate && sessionDate < startDate) return;
        if (endDate && sessionDate > endDate) return;
        result.push({
          date: sessionDate,
          description: session.description || '',
          duration: session.duration,
          mode: session.mode,
          tags: session.tags || []
        });
      });
  });
  result.sort((a, b) => a.date - b.date);
  return result;
};

/**
 * Billable totals for a set of project sessions.
 * @param {Object} project - Project object (rate source)
 * @param {Array} projectSessions - Sessions from getProjectSessionsInRange
 * @returns {Object} { totalMinutes, totalHours, hourlyRate, totalAmount }
 */
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'CHF ',
  SEK: 'kr '
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${Number(amount).toFixed(2)}`;
};

/**
 * Collapse sessions into one line item per local day.
 * @param {Array} projectSessions - Sessions from getProjectSessionsInRange
 * @returns {Array} [{ date, sessionCount, descriptions, totalMinutes, totalHours }]
 */
export const groupSessionsByDay = (projectSessions) => {
  const byDay = new Map();
  projectSessions.forEach(session => {
    const key = `${session.date.getFullYear()}-${session.date.getMonth()}-${session.date.getDate()}`;
    if (!byDay.has(key)) {
      byDay.set(key, { date: session.date, sessionCount: 0, descriptions: [], totalMinutes: 0 });
    }
    const day = byDay.get(key);
    day.sessionCount += 1;
    day.totalMinutes += session.duration;
    if (session.description && !day.descriptions.includes(session.description)) {
      day.descriptions.push(session.description);
    }
  });
  return Array.from(byDay.values()).map(day => ({
    ...day,
    totalHours: day.totalMinutes / 60
  }));
};

export const calcInvoiceTotals = (project, projectSessions) => {
  const totalMinutes = projectSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = totalMinutes / 60;
  const hourlyRate = getProjectRate(project);
  return {
    totalMinutes,
    totalHours,
    hourlyRate,
    totalAmount: totalHours * hourlyRate
  };
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

const pad2 = (n) => String(n).padStart(2, '0');

// Local-time ISO date (YYYY-MM-DD) — timesheets are local-time documents.
const toLocalISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toLocalTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const timesheetFilename = (startDate, endDate, ext) => {
  const range = startDate || endDate
    ? `${startDate ? toLocalISODate(startDate) : 'start'}_${endDate ? toLocalISODate(endDate) : toLocalISODate(new Date())}`
    : `all-time-${toLocalISODate(new Date())}`;
  return `pompay-timesheet-${range}.${ext}`;
};

/**
 * Build timesheet rows: flattened, filtered, chronological (oldest first).
 * One row per session with computed start/end, decimal hours, and billable
 * amount (breaks never bill).
 * @param {Object} sessions - Sessions object grouped by date
 * @param {Object} options - { startDate, endDate, projectId, projects }
 * @returns {Array} rows
 */
export const buildTimesheetRows = (sessions, options = {}) => {
  const { startDate, endDate, projectId, projects = [] } = options;

  const rows = [];
  Object.values(sessions).forEach(dayData => {
    (dayData.sessions || []).forEach(session => {
      const start = new Date(session.timestamp);
      if (startDate && start < startDate) return;
      if (endDate && start > endDate) return;
      if (projectId && session.projectId !== projectId) return;

      const project = projects.find(p => p.id === session.projectId);
      const rate = getProjectRate(project);
      const durationMin = session.duration || 0;
      const durationHours = durationMin / 60;
      const isBillable = session.mode === 'focus' && rate > 0;

      rows.push({
        start,
        end: new Date(start.getTime() + durationMin * 60000),
        projectName: project?.name || 'No Project',
        description: session.description || '',
        tags: session.tags || [],
        mode: session.mode,
        durationMin,
        durationHours,
        rate,
        isBillable,
        amount: isBillable ? durationHours * rate : 0,
        wasSuccessful: session.wasSuccessful !== false
      });
    });
  });

  rows.sort((a, b) => a.start - b.start);
  return rows;
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
  const { startDate, endDate } = options;
  const rows = buildTimesheetRows(sessions, options);

  // Machine-friendly timesheet layout (Toggl/Harvest-style): ISO date,
  // separate start/end times, decimal hours, explicit currency, no
  // totals row (totals break imports — spreadsheets can SUM the column).
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Project',
    'Description',
    'Tags',
    'Type',
    'Status',
    'Duration (min)',
    'Duration (hours)',
    'Billable',
    'Hourly Rate',
    'Amount',
    'Currency'
  ];

  const rowMapper = (row) => [
    toLocalISODate(row.start),
    toLocalTime(row.start),
    toLocalTime(row.end),
    row.projectName,
    row.description,
    row.tags.join('; '),
    row.mode,
    row.wasSuccessful ? 'Completed' : 'Interrupted',
    row.durationMin,
    row.durationHours.toFixed(2),
    row.isBillable ? 'Yes' : 'No',
    row.rate.toFixed(2),
    row.amount.toFixed(2),
    'USD'
  ];

  const csv = arrayToCSV(rows, headers, rowMapper);
  downloadFile(csv, timesheetFilename(startDate, endDate, 'csv'), 'text/csv;charset=utf-8;');
};

/**
 * Export a timesheet as a client-ready PDF report.
 * @param {Object} sessions - Sessions object grouped by date
 * @param {Object} options - { startDate, endDate, projectId, projects }
 * @returns {void} Triggers PDF download
 */
export const exportTimesheetToPDF = (sessions, options = {}) => {
  const { startDate, endDate } = options;
  const rows = buildTimesheetRows(sessions, options);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Timesheet', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rangeText = startDate || endDate
    ? `${startDate ? toLocalISODate(startDate) : 'Beginning'} — ${endDate ? toLocalISODate(endDate) : toLocalISODate(new Date())}`
    : 'All time';
  doc.text(rangeText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  const tableData = rows.map(row => [
    toLocalISODate(row.start),
    `${toLocalTime(row.start)}–${toLocalTime(row.end)}`,
    row.projectName,
    row.description,
    row.durationHours.toFixed(2),
    row.isBillable ? `$${row.rate.toFixed(2)}` : '—',
    row.isBillable ? `$${row.amount.toFixed(2)}` : '—'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Time', 'Project', 'Description', 'Hours', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 30 },
      3: { cellWidth: 46 },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' }
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  const totalHours = rows.reduce((sum, r) => sum + r.durationHours, 0);
  const billableHours = rows.filter(r => r.isBillable).reduce((sum, r) => sum + r.durationHours, 0);
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const summaryX = pageWidth - 20;
  doc.text(`Total hours: ${totalHours.toFixed(2)}`, summaryX, yPos, { align: 'right' });
  yPos += 6;
  doc.text(`Billable hours: ${billableHours.toFixed(2)}`, summaryX, yPos, { align: 'right' });
  yPos += 6;
  doc.setFontSize(12);
  doc.text(`Total amount: $${totalAmount.toFixed(2)}`, summaryX, yPos, { align: 'right' });

  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text(`${rows.length} sessions • Generated ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: 'center' });

  doc.save(timesheetFilename(startDate, endDate, 'pdf'));
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
  // Most recent first for the summary listing
  const projectSessions = getProjectSessionsInRange(sessions, project.id, options).reverse();

  const totals = calcInvoiceTotals(project, projectSessions);
  const totalMinutes = totals.totalMinutes;
  const totalHours = totals.totalHours.toFixed(2);
  const totalEarnings = totals.totalAmount.toFixed(2);

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
    `Hourly Rate,$${getProjectRate(project).toFixed(2)}`,
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
    'SESSION DETAILS'
  ];

  // Session rows via the shared escaper — locale dates and free-text
  // descriptions contain commas and would corrupt the columns otherwise.
  const detailsCSV = arrayToCSV(
    projectSessions,
    ['Date', 'Start Time', 'Description', 'Duration (min)', 'Mode', 'Tags'],
    (session) => [
      toLocalISODate(session.date),
      toLocalTime(session.date),
      session.description,
      session.duration,
      session.mode,
      (session.tags || []).join('; ')
    ]
  );

  const csv = [...summaryLines, detailsCSV].join('\n');

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `project-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${dateStr}.csv`;

  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

/**
 * Generate professional PDF invoice (Toptal-style)
 * @param {Object} project - Project object
 * @param {Object} sessions - Sessions data
 * @param {Object} options - Invoice options
 * @returns {void} Triggers PDF download
 */
export const generatePDFInvoice = (project, sessions, options = {}) => {
  const {
    startDate,
    endDate,
    invoiceNumber,
    clientName,
    clientEmail,
    clientAddress,
    yourName,
    yourEmail,
    yourAddress,
    yourTaxId,
    notes,
    dueDate,
    paymentTerms = 'Net 30',
    taxRate = 0,
    currency = 'USD',
    groupByDay = false
  } = options;

  const projectSessions = getProjectSessionsInRange(sessions, project.id, { startDate, endDate })
    .map(s => ({ ...s, description: s.description || 'Work session' }));

  const totals = calcInvoiceTotals(project, projectSessions);
  const totalHours = totals.totalHours.toFixed(2);
  const hourlyRate = totals.hourlyRate;
  const totalAmount = totals.totalAmount.toFixed(2);

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header - Invoice Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Invoice details - two columns
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Left column - From (Your Business)
  const leftX = 20;
  doc.setFont('helvetica', 'bold');
  doc.text('From:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  if (yourName) {
    doc.text(yourName, leftX, yPos);
    yPos += 5;
  }
  if (yourAddress) {
    const addressLines = doc.splitTextToSize(yourAddress, 80);
    doc.text(addressLines, leftX, yPos);
    yPos += addressLines.length * 5;
  }
  if (yourEmail) {
    doc.text(yourEmail, leftX, yPos);
    yPos += 5;
  }
  if (yourTaxId) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Tax ID: ${yourTaxId}`, leftX, yPos);
    doc.setTextColor(0);
    doc.setFontSize(10);
    yPos += 5;
  }

  // Right column - Invoice Info
  const rightX = pageWidth - 20;
  let rightYPos = 35;
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: `, rightX - 60, rightYPos);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNumber || `INV-${Date.now()}`, rightX, rightYPos, { align: 'right' });
  rightYPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Date: ', rightX - 60, rightYPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString(), rightX, rightYPos, { align: 'right' });
  rightYPos += 5;

  if (dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date: ', rightX - 60, rightYPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(dueDate).toLocaleDateString(), rightX, rightYPos, { align: 'right' });
    rightYPos += 5;
  }

  // Payment Terms
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms: ', rightX - 60, rightYPos);
  doc.setFont('helvetica', 'normal');
  doc.text(paymentTerms, rightX, rightYPos, { align: 'right' });
  rightYPos += 5;

  yPos = Math.max(yPos, rightYPos) + 10;

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  if (clientName) {
    doc.text(clientName, leftX, yPos);
    yPos += 5;
  }
  if (clientAddress) {
    const clientAddressLines = doc.splitTextToSize(clientAddress, 80);
    doc.text(clientAddressLines, leftX, yPos);
    yPos += clientAddressLines.length * 5;
  }
  if (clientEmail) {
    doc.text(clientEmail, leftX, yPos);
    yPos += 5;
  }

  yPos += 10;

  // Project name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Project: ${project.name}`, leftX, yPos);
  yPos += 10;

  // Line items: per-session for transparency, or collapsed per day for
  // long billing periods.
  const formatItemDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const tableData = groupByDay
    ? groupSessionsByDay(projectSessions).map(day => [
        formatItemDate(day.date),
        `${day.descriptions.join('; ') || 'Work'} (${day.sessionCount} session${day.sessionCount !== 1 ? 's' : ''})`,
        day.totalHours.toFixed(2),
        formatMoney(hourlyRate, currency),
        formatMoney(day.totalHours * hourlyRate, currency)
      ])
    : projectSessions.map(session => {
        const sessionHours = session.duration / 60;
        return [
          formatItemDate(session.date),
          session.description,
          sessionHours.toFixed(2),
          formatMoney(hourlyRate, currency),
          formatMoney(sessionHours * hourlyRate, currency)
        ];
      });

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Description', 'Hours', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 75 },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Summary section with professional formatting
  const summaryX = pageWidth - 70;
  const labelX = summaryX - 25;
  const valueX = summaryX + 30;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.text('Subtotal:', labelX, yPos);
  doc.text(formatMoney(totalAmount, currency), valueX, yPos, { align: 'right' });
  yPos += 6;

  // Tax (if applicable)
  const taxAmount = taxRate > 0 ? parseFloat(totalAmount) * taxRate : 0;
  if (taxRate > 0) {
    doc.text(`Tax (${(taxRate * 100).toFixed(1)}%):`, labelX, yPos);
    doc.text(formatMoney(taxAmount, currency), valueX, yPos, { align: 'right' });
    yPos += 6;
  }

  yPos += 2;
  doc.setDrawColor(200);
  doc.line(labelX, yPos, valueX, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL DUE:', labelX, yPos);
  doc.text(formatMoney(parseFloat(totalAmount) + taxAmount, currency), valueX, yPos, { align: 'right' });

  yPos += 10;

  // Add summary info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${projectSessions.length} sessions • ${totalHours} hours total`, labelX, yPos);
  doc.setTextColor(0);
  yPos += 10;

  // Notes
  if (notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', leftX, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
    doc.text(splitNotes, leftX, yPos);
    yPos += splitNotes.length * 5;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: 'center' });

  // Download with a stable filename (window.open of a blob is popup-blocker prone)
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`invoice-${safeName}-${dateStr}.pdf`);
};

/**
 * Export financial transactions to PDF
 * @param {Array} incomes - Array of income transactions
 * @param {Array} spendings - Array of spending transactions
 * @param {Object} options - Export options
 * @returns {void} Triggers PDF download
 */
export const exportFinancialToPDF = (incomes, spendings, options = {}) => {
  const { startDate, endDate, projects = [] } = options;

  // Combine and filter transactions
  const allTransactions = [
    ...incomes.map(income => ({ ...income, type: 'Income' })),
    ...spendings.map(spending => ({ ...spending, type: 'Spending' }))
  ];

  const filteredTransactions = allTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;
    return true;
  });

  // Sort by date (most recent first)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpending = filteredTransactions
    .filter(t => t.type === 'Spending')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalSpending;

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let dateRangeText = 'All Time';
  if (startDate || endDate) {
    dateRangeText = `${startDate ? startDate.toLocaleDateString() : 'Beginning'} - ${endDate ? endDate.toLocaleDateString() : 'Present'}`;
  }
  doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary boxes
  const boxWidth = 50;
  const boxHeight = 20;
  const boxSpacing = 10;
  const startX = (pageWidth - (boxWidth * 3 + boxSpacing * 2)) / 2;

  // Income box
  doc.setFillColor(200, 255, 200);
  doc.rect(startX, yPos, boxWidth, boxHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Income', startX + boxWidth / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(0, 128, 0);
  doc.text(`$${totalIncome.toFixed(2)}`, startX + boxWidth / 2, yPos + 16, { align: 'center' });
  doc.setTextColor(0);

  // Spending box
  doc.setFillColor(255, 200, 200);
  doc.rect(startX + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Spending', startX + boxWidth + boxSpacing + boxWidth / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(255, 0, 0);
  doc.text(`$${totalSpending.toFixed(2)}`, startX + boxWidth + boxSpacing + boxWidth / 2, yPos + 16, { align: 'center' });
  doc.setTextColor(0);

  // Balance box
  const balanceColor = balance >= 0 ? [200, 255, 200] : [255, 200, 200];
  doc.setFillColor(...balanceColor);
  doc.rect(startX + (boxWidth + boxSpacing) * 2, yPos, boxWidth, boxHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Balance', startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 8, { align: 'center' });
  doc.setFontSize(14);
  if (balance >= 0) {
    doc.setTextColor(0, 128, 0);
  } else {
    doc.setTextColor(255, 0, 0);
  }
  doc.text(`$${balance.toFixed(2)}`, startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 16, { align: 'center' });
  doc.setTextColor(0);

  yPos += boxHeight + 15;

  // Transactions table
  const tableData = filteredTransactions.map(transaction => {
    const project = projects.find(p => p.id === transaction.project_id);
    return [
      new Date(transaction.date).toLocaleDateString(),
      transaction.type,
      transaction.description,
      project?.name || '-',
      transaction.type === 'Income' ? `$${transaction.amount.toFixed(2)}` : '-',
      transaction.type === 'Spending' ? `$${transaction.amount.toFixed(2)}` : '-'
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Type', 'Description', 'Project', 'Income', 'Spending']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 60 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    styles: { fontSize: 9 },
    didParseCell: function(data) {
      if (data.column.index === 4 && data.cell.raw && data.cell.raw !== '-') {
        data.cell.styles.textColor = [0, 128, 0];
      }
      if (data.column.index === 5 && data.cell.raw && data.cell.raw !== '-') {
        data.cell.styles.textColor = [255, 0, 0];
      }
    }
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: 'center' });

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`financial-report-${dateStr}.pdf`);
};
