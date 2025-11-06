import React, { useState, useEffect } from 'react';

const FinancialOverview = () => {
  const [incomes, setIncomes] = useState([]);
  const [spendings, setSpending] = useState([]);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showSpendingForm, setShowSpendingForm] = useState(false);

  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeWeek, setIncomeWeek] = useState('');

  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingDescription, setSpendingDescription] = useState('');
  const [spendingCategory, setSpendingCategory] = useState('Food');

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
    if (!incomeAmount || !incomeDescription || !incomeWeek) return;

    const newIncome = {
      id: Date.now(),
      amount: parseFloat(incomeAmount),
      description: incomeDescription,
      week: incomeWeek,
      date: new Date().toISOString()
    };

    const updatedIncomes = [...incomes, newIncome];
    saveIncomes(updatedIncomes);

    setIncomeAmount('');
    setIncomeDescription('');
    setIncomeWeek('');
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
      date: new Date().toISOString()
    };

    const updatedSpendings = [...spendings, newSpending];
    saveSpendings(updatedSpendings);

    setSpendingAmount('');
    setSpendingDescription('');
    setSpendingCategory('Food');
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

  const getTotalIncome = () => {
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  };

  const getTotalSpendings = () => {
    return spendings.reduce((sum, spending) => sum + spending.amount, 0);
  };

  const getBalance = () => {
    return getTotalIncome() - getTotalSpendings();
  };

  const getSpendingsByCategory = () => {
    const categoryTotals = {};
    spendings.forEach(spending => {
      if (!categoryTotals[spending.category]) {
        categoryTotals[spending.category] = 0;
      }
      categoryTotals[spending.category] += spending.amount;
    });
    return categoryTotals;
  };

  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  };

  const categoryTotals = getSpendingsByCategory();

  return (
    <div className='financial-overview'>
      <h2>Financial Overview</h2>

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
              <input
                type='text'
                placeholder={`Week (e.g., Week ${getCurrentWeek()})`}
                value={incomeWeek}
                onChange={(e) => setIncomeWeek(e.target.value)}
                required
              />
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
                    <span className='item-week'>{income.week}</span>
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
                    <span className='item-description'>{spending.description}</span>
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
