/**
 * Export Utilities
 * Handles CSV and PDF export functionality for sessions and financial data
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    currency = 'USD'
  } = options;

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
  const hourlyRate = project.hourlyRate || project.rate || 0;
  const totalAmount = (totalHours * hourlyRate).toFixed(2);

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

  // Table of sessions - Itemized line items (Toptal-style)
  const tableData = [];

  // Each session is its own line item for transparency
  projectSessions.forEach(session => {
    const sessionHours = (session.duration / 60).toFixed(2);
    const sessionAmount = (sessionHours * hourlyRate).toFixed(2);

    tableData.push([
      session.date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      session.description,
      sessionHours,
      `${currency === 'USD' ? '$' : currency}${hourlyRate.toFixed(2)}`,
      `${currency === 'USD' ? '$' : currency}${sessionAmount}`
    ]);
  });

  doc.autoTable({
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
  doc.text(`${currency === 'USD' ? '$' : currency}${totalAmount}`, valueX, yPos, { align: 'right' });
  yPos += 6;

  // Tax (if applicable)
  if (taxRate > 0) {
    const taxAmount = (parseFloat(totalAmount) * taxRate).toFixed(2);
    doc.text(`Tax (${(taxRate * 100).toFixed(1)}%):`, labelX, yPos);
    doc.text(`${currency === 'USD' ? '$' : currency}${taxAmount}`, valueX, yPos, { align: 'right' });
    yPos += 6;

    // Total with tax
    const totalWithTax = (parseFloat(totalAmount) + parseFloat(taxAmount)).toFixed(2);
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(labelX, yPos, valueX, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL DUE:', labelX, yPos);
    doc.text(`${currency === 'USD' ? '$' : currency}${totalWithTax}`, valueX, yPos, { align: 'right' });
  } else {
    // Total without tax
    yPos += 2;
    doc.setDrawColor(200);
    doc.line(labelX, yPos, valueX, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL DUE:', labelX, yPos);
    doc.text(`${currency === 'USD' ? '$' : currency}${totalAmount}`, valueX, yPos, { align: 'right' });
  }

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

  // Open PDF in new window for preview and download
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
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
  doc.setTextColor(balance >= 0 ? [0, 128, 0] : [255, 0, 0]);
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

  doc.autoTable({
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

  // Open PDF in new window for preview and download
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
};
