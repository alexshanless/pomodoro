import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IoTrashOutline, IoClose, IoDocumentTextOutline, IoCalendarOutline, IoInformationCircleOutline, IoDownloadOutline, IoChevronDown, IoTrendingUp, IoTrendingDown } from 'react-icons/io5';

const FinancialOverview = () => {
  const [incomes, setIncomes] = useState([]);
  const [spendings, setSpending] = useState([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showSpendingForm, setShowSpendingForm] = useState(false);
  const [showLogView, setShowLogView] = useState(false);
  const [filterType] = useState('date');

  // Date range filter
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Time filter for quick filters (7d, 30d, etc.)
  const [timeFilter, setTimeFilter] = useState('all');

  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date());

  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingDescription, setSpendingDescription] = useState('');
  const [spendingCategory, setSpendingCategory] = useState('Food');
  const [spendingDate, setSpendingDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');

  const categories = [
    'Food',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Bills',
    'Healthcare',
    'Education',
    'Other'
  ];

  useEffect(() => {
    const loadedIncomes = JSON.parse(localStorage.getItem('incomes') || '[]');
    const loadedSpendings = JSON.parse(localStorage.getItem('spendings') || '[]');
    setIncomes(loadedIncomes);
    setSpending(loadedSpendings);
  }, []);

  const saveIncomes = (newIncomes) => {
    localStorage.setItem('incomes', JSON.stringify(newIncomes));
    setIncomes(newIncomes);
  };

  const saveSpendings = (newSpendings) => {
    localStorage.setItem('spendings', JSON.stringify(newSpendings));
    setSpending(newSpendings);
  };

  const handleAddIncome = (e) => {
    e.preventDefault();
    if (!incomeAmount || !incomeDescription) return;

    const newIncome = {
      id: Date.now(),
      amount: parseFloat(incomeAmount),
      description: incomeDescription,
      date: incomeDate.toISOString()
    };

    const updatedIncomes = [...incomes, newIncome];
    saveIncomes(updatedIncomes);

    setIncomeAmount('');
    setIncomeDescription('');
    setIncomeDate(new Date());
    setShowIncomeForm(false);
    setShowAddDropdown(false);
  };

  const handleAddSpending = (e) => {
    e.preventDefault();
    if (!spendingAmount || !spendingDescription) return;

    const newSpending = {
      id: Date.now(),
      amount: parseFloat(spendingAmount),
      description: spendingDescription,
      category: spendingCategory,
      date: spendingDate.toISOString(),
      isRecurring,
      recurringType: isRecurring ? recurringType : null
    };

    const updatedSpendings = [...spendings, newSpending];
    saveSpendings(updatedSpendings);

    setSpendingAmount('');
    setSpendingDescription('');
    setSpendingCategory('Food');
    setSpendingDate(new Date());
    setIsRecurring(false);
    setRecurringType('monthly');
    setShowSpendingForm(false);
    setShowAddDropdown(false);
  };

  const deleteTransaction = (id, type) => {
    if (type === 'income') {
      const updated = incomes.filter(income => income.id !== id);
      saveIncomes(updated);
    } else {
      const updated = spendings.filter(spending => spending.id !== id);
      saveSpendings(updated);
    }
  };

  // Get date range based on time filter
  const getTimeFilterDates = (filter) => {
    const now = new Date();
    const start = new Date();

    switch(filter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case '7d':
        start.setDate(now.getDate() - 7);
        return { start, end: now };
      case '30d':
        start.setDate(now.getDate() - 30);
        return { start, end: now };
      case '90d':
        start.setDate(now.getDate() - 90);
        return { start, end: now };
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        return { start, end: now };
      default:
        return null;
    }
  };

  // Combined filter check
  const isInFilterRange = (dateString) => {
    const date = new Date(dateString);

    // If custom date range is set, use that
    if (startDate || endDate) {
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    }

    // Otherwise use time filter
    if (timeFilter === 'all') return true;

    const filterDates = getTimeFilterDates(timeFilter);
    if (!filterDates) return true;

    return date >= filterDates.start && date <= filterDates.end;
  };

  // Prepare data for horizontal bar chart by month
  const getMonthlyChartData = () => {
    const monthMap = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      monthMap[monthKey] = {
        month: monthName,
        income: 0,
        spending: 0,
        allocated: 0 // Budget/allocated amount
      };
    }

    // Aggregate income by month
    incomes.filter(income => isInFilterRange(income.date)).forEach(income => {
      const date = new Date(income.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthMap[monthKey]) {
        monthMap[monthKey].income += income.amount;
      }
    });

    // Aggregate spending by month
    spendings.filter(spending => isInFilterRange(spending.date)).forEach(spending => {
      const date = new Date(spending.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthMap[monthKey]) {
        monthMap[monthKey].spending += spending.amount;
      }
    });

    // Calculate allocated (average or budget - for now use 120% of spending as demo)
    Object.keys(monthMap).forEach(key => {
      monthMap[key].allocated = monthMap[key].spending * 1.2;
    });

    return Object.values(monthMap).reverse(); // Most recent on top
  };

  // Get all transactions sorted
  const getAllTransactions = () => {
    const allTransactions = [
      ...incomes.map(income => ({ ...income, type: 'income' })),
      ...spendings.map(spending => ({ ...spending, type: 'spending' }))
    ];

    // Sort by filterType
    if (filterType === 'date') {
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (filterType === 'spending') {
      allTransactions.sort((a, b) => {
        if (a.type === 'spending' && b.type === 'spending') {
          return b.amount - a.amount;
        }
        if (a.type === 'spending') return -1;
        if (b.type === 'spending') return 1;
        return 0;
      });
    } else if (filterType === 'income') {
      allTransactions.sort((a, b) => {
        if (a.type === 'income' && b.type === 'income') {
          return b.amount - a.amount;
        }
        if (a.type === 'income') return -1;
        if (b.type === 'income') return 1;
        return 0;
      });
    }

    return allTransactions;
  };

  const chartData = getMonthlyChartData();
  const transactions = getAllTransactions();

  const getTotalIncome = () => {
    const filtered = incomes.filter(income => isInFilterRange(income.date));
    return filtered.reduce((sum, income) => sum + income.amount, 0);
  };

  const getTotalSpendings = () => {
    const filtered = spendings.filter(spending => isInFilterRange(spending.date));
    return filtered.reduce((sum, spending) => sum + spending.amount, 0);
  };

  const getBalance = () => getTotalIncome() - getTotalSpendings();

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

  // Calculate delta (change from previous period)
  const calculateDelta = () => {
    const currentBalance = getBalance();
    const totalIncome = getTotalIncome();
    const totalSpending = getTotalSpendings();

    // For demo, calculate 18.4% increase
    const changePercent = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome * 100) : 0;

    return {
      value: currentBalance,
      percent: changePercent,
      isPositive: changePercent >= 0
    };
  };

  const delta = calculateDelta();

  return (
    <div className='financial-overview'>
      {/* Subnav - Right below main nav */}
      <div className='financial-subnav'>
        <div className='subnav-left'>
          <button
            className='filter-btn-outline'
            onClick={() => setShowDatePickerModal(true)}
          >
            <IoCalendarOutline size={18} />
            <span>{(startDate || endDate) ? 'Date: ' + (startDate ? startDate.toLocaleDateString() : '...') + ' - ' + (endDate ? endDate.toLocaleDateString() : '...') : 'Filter By Date'}</span>
          </button>
          {(startDate || endDate) && (
            <button
              className='clear-date-filter-btn'
              onClick={clearDateFilter}
              title='Clear date filter'
            >
              <IoClose size={22} />
            </button>
          )}
        </div>
        <div className='subnav-right'>
          <button
            className='log-activity-btn-outline'
            onClick={() => setShowLogView(!showLogView)}
            title={showLogView ? 'Hide Log' : 'Show Activity Log'}
          >
            <IoDocumentTextOutline size={20} />
          </button>
          <div className='add-dropdown-container'>
            <button
              className='add-btn-white'
              onClick={() => setShowAddDropdown(!showAddDropdown)}
            >
              Add
            </button>
            {showAddDropdown && (
              <div className='dropdown-menu'>
                <button onClick={() => { setShowIncomeForm(true); setShowSpendingForm(false); setShowAddDropdown(false); }}>
                  Add Income
                </button>
                <button onClick={() => { setShowSpendingForm(true); setShowIncomeForm(false); setShowAddDropdown(false); }}>
                  Add Spending
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Filter Modal */}
      {showDatePickerModal && (
        <div className='form-modal' onClick={() => setShowDatePickerModal(false)}>
          <div className='date-filter-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>Filter By Date</h3>
              <button className='close-modal-btn' onClick={() => setShowDatePickerModal(false)}>
                ×
              </button>
            </div>
            <div className='date-filter-modal-body'>
              <div className='date-range-inputs-horizontal'>
                <div className='date-input-group'>
                  <label>From:</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    dateFormat="MM/dd/yyyy"
                    placeholderText="Start Date"
                    className='range-date-picker'
                    inline
                  />
                </div>
                <div className='date-input-group'>
                  <label>To:</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    dateFormat="MM/dd/yyyy"
                    placeholderText="End Date"
                    className='range-date-picker'
                    inline
                  />
                </div>
              </div>
              <div className='modal-filter-actions'>
                <button type='button' className='btn-primary' onClick={() => setShowDatePickerModal(false)}>
                  Apply Filter
                </button>
                {(startDate || endDate) && (
                  <button type='button' className='btn-secondary' onClick={() => { clearDateFilter(); }}>
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Income Form */}
      {showIncomeForm && (
        <div className='form-modal'>
          <div className='form-modal-content'>
            <h3>Add Income</h3>
            <form onSubmit={handleAddIncome} className='add-form'>
              <input
                type='number'
                placeholder='Amount'
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                step='0.01'
                required
              />
              <input
                type='text'
                placeholder='Description'
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
                required
              />
              <div className='date-picker-wrapper'>
                <label>Date:</label>
                <DatePicker
                  selected={incomeDate}
                  onChange={(date) => setIncomeDate(date)}
                  dateFormat="MM/dd/yyyy"
                  className='form-date-picker'
                />
              </div>
              <div className='form-actions'>
                <button type='submit'>Add Income</button>
                <button type='button' onClick={() => setShowIncomeForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Spending Form */}
      {showSpendingForm && (
        <div className='form-modal'>
          <div className='form-modal-content'>
            <h3>Add Spending</h3>
            <form onSubmit={handleAddSpending} className='add-form'>
              <input
                type='number'
                placeholder='Amount'
                value={spendingAmount}
                onChange={(e) => setSpendingAmount(e.target.value)}
                step='0.01'
                required
              />
              <input
                type='text'
                placeholder='Description'
                value={spendingDescription}
                onChange={(e) => setSpendingDescription(e.target.value)}
                required
              />
              <select
                value={spendingCategory}
                onChange={(e) => setSpendingCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className='date-picker-wrapper'>
                <label>Date:</label>
                <DatePicker
                  selected={spendingDate}
                  onChange={(date) => setSpendingDate(date)}
                  dateFormat="MM/dd/yyyy"
                  className='form-date-picker'
                />
              </div>
              <div className='recurring-option'>
                <label className='checkbox-label'>
                  <input
                    type='checkbox'
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  Recurring Spending
                </label>
                {isRecurring && (
                  <select
                    value={recurringType}
                    onChange={(e) => setRecurringType(e.target.value)}
                    className='recurring-type-select'
                  >
                    <option value='weekly'>Weekly</option>
                    <option value='monthly'>Monthly</option>
                    <option value='yearly'>Yearly</option>
                  </select>
                )}
              </div>
              <div className='form-actions'>
                <button type='submit'>Add Spending</button>
                <button type='button' onClick={() => setShowSpendingForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Section with Financial Overview label */}
      <div className='financial-summary-redesign'>
        <div className='financial-overview-header'>
          <h3 className='financial-overview-heading'>Financial Overview</h3>
          <div className='time-filter-buttons'>
            <button
              className={`time-filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setTimeFilter('all'); setStartDate(null); setEndDate(null); }}
            >
              All
            </button>
            <button
              className={`time-filter-btn ${timeFilter === 'today' ? 'active' : ''}`}
              onClick={() => { setTimeFilter('today'); setStartDate(null); setEndDate(null); }}
            >
              Today
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '7d' ? 'active' : ''}`}
              onClick={() => { setTimeFilter('7d'); setStartDate(null); setEndDate(null); }}
            >
              7d
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '30d' ? 'active' : ''}`}
              onClick={() => { setTimeFilter('30d'); setStartDate(null); setEndDate(null); }}
            >
              30d
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '90d' ? 'active' : ''}`}
              onClick={() => { setTimeFilter('90d'); setStartDate(null); setEndDate(null); }}
            >
              90d
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '1y' ? 'active' : ''}`}
              onClick={() => { setTimeFilter('1y'); setStartDate(null); setEndDate(null); }}
            >
              1y
            </button>
          </div>
        </div>
        <div className='summary-stats-row'>
          <div className='summary-stat-box'>
            <span className='stat-label-financial'>Income</span>
            <span className='stat-amount income-text'>${getTotalIncome().toFixed(2)}</span>
          </div>
          <div className='summary-stat-box'>
            <span className='stat-label-financial'>Spending</span>
            <span className='stat-amount spending-text'>${getTotalSpendings().toFixed(2)}</span>
          </div>
          <div className='summary-stat-box'>
            <span className='stat-label-financial'>Balance</span>
            <span className={`stat-amount ${getBalance() >= 0 ? 'income-text' : 'spending-text'}`}>
              ${getBalance().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Graph View with DELTA Header */}
      {!showLogView && (
        <div className='metrics-dashboard-container'>
          {/* DELTA Header */}
          <div className='delta-header'>
            <div className='delta-main'>
              <div className='delta-label-section'>
                <span className='delta-label'>DELTA</span>
                <IoInformationCircleOutline size={16} className='info-icon' title='Shows the change in your balance' />
              </div>
              <div className='delta-value-section'>
                <span className='delta-primary-value'>${Math.abs(delta.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <div className={`delta-change-badge ${delta.isPositive ? 'positive' : 'negative'}`}>
                  {delta.isPositive ? <IoTrendingUp size={14} /> : <IoTrendingDown size={14} />}
                  {Math.abs(delta.percent).toFixed(1)}%
                </div>
              </div>
              <div className='delta-description'>
                <IoInformationCircleOutline size={14} />
                <span>Balance change based on filtered income and spending</span>
              </div>
            </div>
            <div className='delta-actions'>
              <button className='export-btn'>
                <IoDownloadOutline size={18} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Horizontal Bar Chart */}
          <div className='horizontal-chart-container'>
            <ResponsiveContainer width='100%' height={400}>
              <BarChart
                data={chartData}
                layout='vertical'
                margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray='3 3' stroke='#374151' horizontal={false} />
                <XAxis
                  type='number'
                  stroke='#9ca3af'
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type='category'
                  dataKey='month'
                  stroke='#9ca3af'
                  tick={{ fill: '#9ca3af', fontSize: 14 }}
                  width={70}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                {/* Allocated/Budget bars (gray background) */}
                <Bar dataKey='allocated' fill='#6b7280' radius={4} barSize={20} />
                {/* Income bars (green) */}
                <Bar dataKey='income' fill='#10b981' radius={4} barSize={20} />
                {/* Spending bars (red) */}
                <Bar dataKey='spending' fill='#ef4444' radius={4} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Footer */}
          <div className='chart-footer'>
            <div className='location-selector'>
              <IoChevronDown size={16} />
              <span>Orlando, FL</span>
            </div>
            <div className='full-report-link'>
              <span>FULL REPORT →</span>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity View */}
      {showLogView && (
        <div className='log-activity-view'>
          <h3>Activity Log (Filtered: {filterType})</h3>
          <div className='transactions-list'>
            {transactions.length === 0 ? (
              <p className='empty-message'>No transactions yet</p>
            ) : (
              transactions.map(transaction => (
                <div key={`${transaction.type}-${transaction.id}`} className='transaction-item'>
                  <div className='transaction-info'>
                    <span className='transaction-description'>{transaction.description}</span>
                    {transaction.type === 'spending' && (
                      <span className='transaction-category'>{transaction.category}</span>
                    )}
                    <span className='transaction-date'>
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='transaction-amount-actions'>
                    <span className={`transaction-amount ${transaction.type === 'income' ? 'income-amount' : 'spending-amount'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </span>
                    <button
                      className='delete-btn'
                      onClick={() => deleteTransaction(transaction.id, transaction.type)}
                    >
                      <IoTrashOutline size={18} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialOverview;
