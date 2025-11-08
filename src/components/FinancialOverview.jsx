import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { IoTrashOutline } from 'react-icons/io5';

const FinancialOverview = () => {
  const [incomes, setIncomes] = useState([]);
  const [spendings, setSpending] = useState([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showSpendingForm, setShowSpendingForm] = useState(false);
  const [showLogView, setShowLogView] = useState(false);
  const [filterType, setFilterType] = useState('date');

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

  // Prepare data for chart
  const getChartData = () => {
    const dataMap = {};

    incomes.forEach(income => {
      const date = new Date(income.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dataMap[date]) {
        dataMap[date] = { date, income: 0, spending: 0 };
      }
      dataMap[date].income += income.amount;
    });

    spendings.forEach(spending => {
      const date = new Date(spending.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dataMap[date]) {
        dataMap[date] = { date, income: 0, spending: 0 };
      }
      dataMap[date].spending += spending.amount;
    });

    return Object.values(dataMap).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
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

  const chartData = getChartData();
  const transactions = getAllTransactions();

  const getTotalIncome = () => incomes.reduce((sum, income) => sum + income.amount, 0);
  const getTotalSpendings = () => spendings.reduce((sum, spending) => sum + spending.amount, 0);
  const getBalance = () => getTotalIncome() - getTotalSpendings();

  return (
    <div className='financial-overview'>
      <h2>Financial Overview</h2>

      {/* Subnav */}
      <div className='financial-subnav'>
        <div className='subnav-left'>
          <div className='filter-dropdown-container'>
            <button
              className='filter-btn'
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              Filter
            </button>
            {showFilterDropdown && (
              <div className='dropdown-menu'>
                <button onClick={() => { setFilterType('date'); setShowFilterDropdown(false); }}>
                  By Date
                </button>
                <button onClick={() => { setFilterType('spending'); setShowFilterDropdown(false); }}>
                  By Spending
                </button>
                <button onClick={() => { setFilterType('income'); setShowFilterDropdown(false); }}>
                  By Income
                </button>
              </div>
            )}
          </div>
        </div>
        <div className='subnav-right'>
          <button
            className='log-activity-btn'
            onClick={() => setShowLogView(!showLogView)}
          >
            {showLogView ? 'Hide Log' : 'Log Activity'}
          </button>
          <div className='add-dropdown-container'>
            <button
              className='add-btn'
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

      {/* Summary Section */}
      <div className='financial-summary-compact'>
        <div className='summary-item'>
          <span className='summary-label'>Income:</span>
          <span className='summary-amount income-text'>${getTotalIncome().toFixed(2)}</span>
        </div>
        <div className='summary-item'>
          <span className='summary-label'>Spending:</span>
          <span className='summary-amount spending-text'>${getTotalSpendings().toFixed(2)}</span>
        </div>
        <div className='summary-item'>
          <span className='summary-label'>Balance:</span>
          <span className={`summary-amount ${getBalance() >= 0 ? 'income-text' : 'spending-text'}`}>
            ${getBalance().toFixed(2)}
          </span>
        </div>
      </div>

      {/* Graph View */}
      {!showLogView && (
        <div className='graph-container'>
          <h3>Income vs Spending Over Time</h3>
          <ResponsiveContainer width='100%' height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#1a5490' />
              <XAxis dataKey='date' stroke='#b0b0b0' />
              <YAxis stroke='#b0b0b0' />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f3460', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey='income' fill='#4caf50' style={{ cursor: 'default' }} />
              <Bar dataKey='spending' fill='#f44336' style={{ cursor: 'default' }} />
            </BarChart>
          </ResponsiveContainer>
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
