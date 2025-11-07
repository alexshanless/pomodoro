import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FinancialOverview = () => {
  const [incomes, setIncomes] = useState([]);
  const [spendings, setSpending] = useState([]);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showSpendingForm, setShowSpendingForm] = useState(false);

  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date());

  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingDescription, setSpendingDescription] = useState('');
  const [spendingCategory, setSpendingCategory] = useState('Food');
  const [spendingDate, setSpendingDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');

  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

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
  };

  const deleteIncome = (id) => {
    const updated = incomes.filter(income => income.id !== id);
    saveIncomes(updated);
  };

  const deleteSpending = (id) => {
    const updated = spendings.filter(spending => spending.id !== id);
    saveSpendings(updated);
  };

  const filterByDateRange = (items) => {
    if (!startDate || !endDate) return items;
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const getTotalIncome = () => {
    const filtered = filterByDateRange(incomes);
    return filtered.reduce((sum, income) => sum + income.amount, 0);
  };

  const getTotalSpendings = () => {
    const filtered = filterByDateRange(spendings);
    return filtered.reduce((sum, spending) => sum + spending.amount, 0);
  };

  const getBalance = () => {
    return getTotalIncome() - getTotalSpendings();
  };

  const getSpendingsByCategory = () => {
    const filtered = filterByDateRange(spendings);
    const categoryTotals = {};
    filtered.forEach(spending => {
      if (!categoryTotals[spending.category]) {
        categoryTotals[spending.category] = 0;
      }
      categoryTotals[spending.category] += spending.amount;
    });
    return categoryTotals;
  };

  const categoryTotals = getSpendingsByCategory();

  return (
    <div className='financial-overview'>
      <h2>Financial Overview</h2>

      <div className='date-range-filter'>
        <label>Filter by Date Range:</label>
        <DatePicker
          selectsRange={true}
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setDateRange(update)}
          isClearable={true}
          placeholderText="Select date range"
          className='date-range-picker'
        />
        {(startDate || endDate) && (
          <button onClick={() => setDateRange([null, null])} className='clear-filter-btn'>
            Clear Filter
          </button>
        )}
      </div>

      <div className='financial-summary'>
        <div className='summary-card income-card'>
          <h3>Total Income</h3>
          <p className='amount'>${getTotalIncome().toFixed(2)}</p>
        </div>
        <div className='summary-card spending-card'>
          <h3>Total Spendings</h3>
          <p className='amount'>${getTotalSpendings().toFixed(2)}</p>
        </div>
        <div className={`summary-card balance-card ${getBalance() >= 0 ? 'positive' : 'negative'}`}>
          <h3>Balance</h3>
          <p className='amount'>${getBalance().toFixed(2)}</p>
        </div>
      </div>

      <div className='financial-sections'>
        <div className='income-section'>
          <div className='section-header'>
            <h3>Income</h3>
            <button onClick={() => setShowIncomeForm(!showIncomeForm)}>
              {showIncomeForm ? 'Cancel' : '+ Add Income'}
            </button>
          </div>

          {showIncomeForm && (
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
              <button type='submit'>Add Income</button>
            </form>
          )}

          <div className='items-list'>
            {incomes.length === 0 ? (
              <p className='empty-message'>No income recorded yet</p>
            ) : (
              incomes.map(income => (
                <div key={income.id} className='item'>
                  <div className='item-info'>
                    <span className='item-description'>{income.description}</span>
                    <span className='item-date'>
                      {new Date(income.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='item-amount-actions'>
                    <span className='item-amount income-amount'>
                      +${income.amount.toFixed(2)}
                    </span>
                    <button
                      className='delete-btn'
                      onClick={() => deleteIncome(income.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='spending-section'>
          <div className='section-header'>
            <h3>Spendings</h3>
            <button onClick={() => setShowSpendingForm(!showSpendingForm)}>
              {showSpendingForm ? 'Cancel' : '+ Add Spending'}
            </button>
          </div>

          {showSpendingForm && (
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
              <button type='submit'>Add Spending</button>
            </form>
          )}

          <div className='items-list'>
            {spendings.length === 0 ? (
              <p className='empty-message'>No spendings recorded yet</p>
            ) : (
              spendings.map(spending => (
                <div key={spending.id} className='item'>
                  <div className='item-info'>
                    <span className='item-description'>
                      {spending.description}
                      {spending.isRecurring && (
                        <span className='recurring-badge'>{spending.recurringType}</span>
                      )}
                    </span>
                    <span className='item-category'>{spending.category}</span>
                    <span className='item-date'>
                      {new Date(spending.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='item-amount-actions'>
                    <span className='item-amount spending-amount'>
                      -${spending.amount.toFixed(2)}
                    </span>
                    <button
                      className='delete-btn'
                      onClick={() => deleteSpending(spending.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {Object.keys(categoryTotals).length > 0 && (
        <div className='category-breakdown'>
          <h3>Spending by Category</h3>
          <div className='category-list'>
            {Object.entries(categoryTotals).map(([category, total]) => (
              <div key={category} className='category-item'>
                <span className='category-name'>{category}</span>
                <span className='category-total'>${total.toFixed(2)}</span>
                <span className='category-percentage'>
                  {((total / getTotalSpendings()) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialOverview;
