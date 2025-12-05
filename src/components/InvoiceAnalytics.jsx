import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IoDownloadOutline, IoDocumentTextOutline, IoCalendarOutline, IoFunnelOutline, IoStatsChartOutline, IoTrendingUp, IoCheckmarkCircle, IoTimeOutline, IoWarningOutline } from 'react-icons/io5';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useProjects } from '../hooks/useProjects';
import { exportFinancialToCSV, exportFinancialToPDF } from '../utils/exportUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/InvoiceAnalytics.css';

const InvoiceAnalytics = () => {
  const { incomes, spendings } = useFinancialTransactions();
  const { projects } = useProjects();

  // Filter states
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let start = new Date();

    if (dateRange === 'custom') {
      return { start: customStartDate || start, end: customEndDate || now };
    }

    switch (dateRange) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case 'quarter':
        start.setMonth(Math.floor(now.getMonth() / 3) * 3);
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0);
        start.setDate(1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Filter transactions based on selections
  const filteredTransactions = useMemo(() => {
    let filtered = [...incomes.map(i => ({ ...i, type: 'income' })), ...spendings.map(s => ({ ...s, type: 'spending' }))];

    // Filter by date
    filtered = filtered.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(t => t.project_id === selectedProject);
    }

    // Filter by status (for this demo, we'll use type as status proxy)
    if (selectedStatus === 'paid') {
      filtered = filtered.filter(t => t.type === 'income');
    } else if (selectedStatus === 'pending') {
      filtered = filtered.filter(t => t.type === 'spending');
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [incomes, spendings, selectedProject, selectedStatus, startDate, endDate]);

  // Calculate quick stats
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalSpending = filteredTransactions
      .filter(t => t.type === 'spending')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const balance = totalIncome - totalSpending;

    // Get previous period for comparison
    const periodLength = endDate - startDate;
    const prevStart = new Date(startDate.getTime() - periodLength);
    const prevEnd = new Date(endDate.getTime() - periodLength);

    const prevIncome = [...incomes, ...spendings]
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate >= prevStart && tDate < prevEnd;
      })
      .filter(t => incomes.includes(t))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const changePercent = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100) : 0;

    return {
      totalIncome,
      totalSpending,
      balance,
      transactionCount: filteredTransactions.length,
      changePercent
    };
  }, [filteredTransactions, incomes, spendings, startDate, endDate]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const dayMap = {};
    const dayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const groupByWeek = dayCount > 60;

    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      let key;

      if (groupByWeek) {
        // Group by week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        // Group by day
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!dayMap[key]) {
        dayMap[key] = { date: key, income: 0, spending: 0, net: 0 };
      }

      if (t.type === 'income') {
        dayMap[key].income += parseFloat(t.amount);
      } else {
        dayMap[key].spending += parseFloat(t.amount);
      }
      dayMap[key].net = dayMap[key].income - dayMap[key].spending;
    });

    return Object.values(dayMap).slice(-20); // Last 20 periods
  }, [filteredTransactions, startDate, endDate]);

  // Prepare table data grouped by project
  const tableData = useMemo(() => {
    const projectMap = {};

    filteredTransactions.forEach(t => {
      const project = projects.find(p => p.id === t.project_id);
      const projectName = project?.name || 'No Project';
      const projectId = t.project_id || 'none';

      if (!projectMap[projectId]) {
        projectMap[projectId] = {
          id: projectId,
          name: projectName,
          income: 0,
          spending: 0,
          transactions: 0,
          color: project?.color || '#999'
        };
      }

      if (t.type === 'income') {
        projectMap[projectId].income += parseFloat(t.amount);
      } else {
        projectMap[projectId].spending += parseFloat(t.amount);
      }
      projectMap[projectId].transactions++;
    });

    return Object.values(projectMap).sort((a, b) => (b.income - b.spending) - (a.income - a.spending));
  }, [filteredTransactions, projects]);

  const handleExportCSV = () => {
    try {
      console.log('Export CSV clicked, filteredTransactions:', filteredTransactions.length);

      // Split filteredTransactions back into incomes and spendings
      const filteredIncomes = filteredTransactions.filter(t => t.type === 'income');
      const filteredSpendings = filteredTransactions.filter(t => t.type === 'spending');

      console.log('Filtered incomes:', filteredIncomes.length, 'spendings:', filteredSpendings.length);

      exportFinancialToCSV(filteredIncomes, filteredSpendings, {
        startDate,
        endDate,
        projects
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV: ' + error.message);
    }
  };

  const handleExportPDF = () => {
    try {
      console.log('Export PDF clicked, filteredTransactions:', filteredTransactions.length);

      // Split filteredTransactions back into incomes and spendings
      const filteredIncomes = filteredTransactions.filter(t => t.type === 'income');
      const filteredSpendings = filteredTransactions.filter(t => t.type === 'spending');

      console.log('Filtered incomes:', filteredIncomes.length, 'spendings:', filteredSpendings.length);

      exportFinancialToPDF(filteredIncomes, filteredSpendings, {
        startDate,
        endDate,
        projects
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{payload[0].payload.date}</p>
          <p className="tooltip-income">Income: {formatCurrency(payload[0].value)}</p>
          <p className="tooltip-spending">Spending: {formatCurrency(payload[1]?.value || 0)}</p>
          <p className="tooltip-net">Net: {formatCurrency(payload[0].payload.net)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="invoice-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-left">
          <h1>Invoice Analytics</h1>
          <p className="header-subtitle">Financial reporting and insights</p>
        </div>
        <div className="header-right">
          <button className="export-btn-outline" onClick={handleExportCSV}>
            <IoDownloadOutline size={18} />
            Export CSV
          </button>
          <button className="export-btn-primary" onClick={handleExportPDF}>
            <IoDocumentTextOutline size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>
            <IoFunnelOutline size={16} />
            Project
          </label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>
            <IoStatsChartOutline size={16} />
            Type
          </label>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All Transactions</option>
            <option value="paid">Income Only</option>
            <option value="pending">Spending Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <IoCalendarOutline size={16} />
            Date Range
          </label>
          <select value={dateRange} onChange={(e) => {
            setDateRange(e.target.value);
            if (e.target.value === 'custom') {
              setShowDatePicker(true);
            }
          }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue-card">
          <div className="stat-icon">
            <IoTrendingUp size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h3 className="stat-value">{formatCurrency(stats.totalIncome)}</h3>
            <p className={`stat-change ${stats.changePercent >= 0 ? 'positive' : 'negative'}`}>
              {stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(1)}% vs previous period
            </p>
          </div>
        </div>

        <div className="stat-card spending-card">
          <div className="stat-icon">
            <IoWarningOutline size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Spending</p>
            <h3 className="stat-value">{formatCurrency(stats.totalSpending)}</h3>
            <p className="stat-meta">{filteredTransactions.filter(t => t.type === 'spending').length} transactions</p>
          </div>
        </div>

        <div className="stat-card balance-card">
          <div className="stat-icon">
            <IoCheckmarkCircle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Net Balance</p>
            <h3 className={`stat-value ${stats.balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(stats.balance)}
            </h3>
            <p className="stat-meta">Profit margin: {stats.totalIncome > 0 ? ((stats.balance / stats.totalIncome) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>

        <div className="stat-card transactions-card">
          <div className="stat-icon">
            <IoTimeOutline size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Transactions</p>
            <h3 className="stat-value">{stats.transactionCount}</h3>
            <p className="stat-meta">In selected period</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-section">
        <div className="section-header">
          <h2>Revenue Trends</h2>
          <p className="section-subtitle">Income vs Spending over time</p>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="income" fill="#4CAF50" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spending" fill="#f44336" name="Spending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-btn ${activeTab === 'detailed' ? 'active' : ''}`}
          onClick={() => setActiveTab('detailed')}
        >
          Detailed Transactions
        </button>
        <button
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          By Project
        </button>
      </div>

      {/* Data Tables */}
      <div className="data-section">
        {activeTab === 'summary' && (
          <div className="summary-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="align-right">Income</th>
                  <th className="align-right">Spending</th>
                  <th className="align-right">Net</th>
                  <th className="align-right">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div className="project-cell">
                        <div className="project-dot" style={{ backgroundColor: row.color }}></div>
                        {row.name}
                      </div>
                    </td>
                    <td className="align-right income-text">{formatCurrency(row.income)}</td>
                    <td className="align-right spending-text">{formatCurrency(row.spending)}</td>
                    <td className={`align-right ${row.income - row.spending >= 0 ? 'income-text' : 'spending-text'}`}>
                      {formatCurrency(row.income - row.spending)}
                    </td>
                    <td className="align-right">{row.transactions}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Total</strong></td>
                  <td className="align-right income-text"><strong>{formatCurrency(stats.totalIncome)}</strong></td>
                  <td className="align-right spending-text"><strong>{formatCurrency(stats.totalSpending)}</strong></td>
                  <td className={`align-right ${stats.balance >= 0 ? 'income-text' : 'spending-text'}`}>
                    <strong>{formatCurrency(stats.balance)}</strong>
                  </td>
                  <td className="align-right"><strong>{stats.transactionCount}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {activeTab === 'detailed' && (
          <div className="detailed-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Project</th>
                  <th className="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, idx) => {
                  const project = projects.find(p => p.id === transaction.project_id);
                  return (
                    <tr key={idx}>
                      <td>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`type-badge ${transaction.type}`}>
                          {transaction.type === 'income' ? 'Income' : 'Spending'}
                        </span>
                      </td>
                      <td>{transaction.description}</td>
                      <td>{project?.name || '-'}</td>
                      <td className={`align-right ${transaction.type === 'income' ? 'income-text' : 'spending-text'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="projects-view">
            <div className="projects-grid">
              {tableData.map(row => (
                <div key={row.id} className="project-card">
                  <div className="project-card-header">
                    <div className="project-dot" style={{ backgroundColor: row.color }}></div>
                    <h3>{row.name}</h3>
                  </div>
                  <div className="project-card-stats">
                    <div className="project-stat">
                      <span className="stat-label-small">Income</span>
                      <span className="stat-value-small income-text">{formatCurrency(row.income)}</span>
                    </div>
                    <div className="project-stat">
                      <span className="stat-label-small">Spending</span>
                      <span className="stat-value-small spending-text">{formatCurrency(row.spending)}</span>
                    </div>
                    <div className="project-stat">
                      <span className="stat-label-small">Net</span>
                      <span className={`stat-value-small ${row.income - row.spending >= 0 ? 'income-text' : 'spending-text'}`}>
                        {formatCurrency(row.income - row.spending)}
                      </span>
                    </div>
                    <div className="project-stat">
                      <span className="stat-label-small">Transactions</span>
                      <span className="stat-value-small">{row.transactions}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="modal-overlay" onClick={() => setShowDatePicker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Select Date Range</h3>
            <div className="date-picker-group">
              <div className="date-picker-field">
                <label>Start Date</label>
                <DatePicker
                  selected={customStartDate}
                  onChange={(date) => setCustomStartDate(date)}
                  selectsStart
                  startDate={customStartDate}
                  endDate={customEndDate}
                  inline
                />
              </div>
              <div className="date-picker-field">
                <label>End Date</label>
                <DatePicker
                  selected={customEndDate}
                  onChange={(date) => setCustomEndDate(date)}
                  selectsEnd
                  startDate={customStartDate}
                  endDate={customEndDate}
                  minDate={customStartDate}
                  inline
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDatePicker(false)}>Apply</button>
              <button onClick={() => {
                setCustomStartDate(null);
                setCustomEndDate(null);
                setDateRange('30d');
                setShowDatePicker(false);
              }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceAnalytics;
