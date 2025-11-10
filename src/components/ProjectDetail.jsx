import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack, IoEllipsisVertical, IoTime, IoWallet, IoTrashOutline, IoCreate } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import '../App.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [pomodoros, setPomodoros] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProjectData = () => {
    // Load project
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const foundProject = projects.find(p => p.id === parseInt(id));

    if (!foundProject) {
      navigate('/projects');
      return;
    }

    setProject(foundProject);
    setEditName(foundProject.name);
    setEditRate(foundProject.rate.toString());
    setEditColor(foundProject.color);

    // Load pomodoros for this project
    const allSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
    const projectPomodoros = [];

    Object.entries(allSessions).forEach(([date, dayData]) => {
      if (dayData.sessions) {
        dayData.sessions.forEach(session => {
          if (session.projectId === parseInt(id)) {
            projectPomodoros.push({
              ...session,
              date
            });
          }
        });
      }
    });

    setPomodoros(projectPomodoros.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));

    // Load financial transactions for this project
    const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
    const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');

    const projectTransactions = [
      ...incomes.filter(inc => inc.projectId === parseInt(id)).map(inc => ({ ...inc, type: 'income' })),
      ...spendings.filter(spend => spend.projectId === parseInt(id)).map(spend => ({ ...spend, type: 'spending' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    setTransactions(projectTransactions);
  };

  const handleDeleteProject = () => {
    if (window.confirm(`Are you sure you want to delete "${project.name}"? This will not delete associated pomodoros or transactions.`)) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const updatedProjects = projects.filter(p => p.id !== parseInt(id));
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      navigate('/projects');
    }
  };

  const handleEditProject = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const updatedProjects = projects.map(p =>
      p.id === parseInt(id)
        ? { ...p, name: editName, rate: parseFloat(editRate) || 0, color: editColor }
        : p
    );

    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    setProject({ ...project, name: editName, rate: parseFloat(editRate) || 0, color: editColor });
    setShowEditModal(false);
    setShowActionsMenu(false);
  };

  const deletePomodoro = (pomodoroTimestamp, pomodoroDate) => {
    if (!window.confirm('Are you sure you want to delete this pomodoro?')) return;

    const allSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (allSessions[pomodoroDate] && allSessions[pomodoroDate].sessions) {
      allSessions[pomodoroDate].sessions = allSessions[pomodoroDate].sessions.filter(
        s => s.timestamp !== pomodoroTimestamp
      );

      // Update totals
      allSessions[pomodoroDate].completed = allSessions[pomodoroDate].sessions.length;
      allSessions[pomodoroDate].totalMinutes = allSessions[pomodoroDate].sessions.reduce(
        (sum, s) => sum + s.duration, 0
      );

      // Remove date entry if no sessions left
      if (allSessions[pomodoroDate].sessions.length === 0) {
        delete allSessions[pomodoroDate];
      }

      localStorage.setItem('pomodoroSessions', JSON.stringify(allSessions));
      loadProjectData();
    }
  };

  const deleteTransaction = (transactionId, type) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    if (type === 'income') {
      const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
      const updated = incomes.filter(inc => inc.id !== transactionId);
      localStorage.setItem('incomes', JSON.stringify(updated));
    } else {
      const spendings = JSON.parse(localStorage.getItem('spendings') || '[]');
      const updated = spendings.filter(spend => spend.id !== transactionId);
      localStorage.setItem('spendings', JSON.stringify(updated));
    }

    loadProjectData();
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTotalTime = () => {
    return pomodoros.reduce((sum, pomo) => sum + pomo.duration, 0);
  };

  const getTotalEarnings = () => {
    const hours = getTotalTime() / 60;
    return hours * (project?.rate || 0);
  };

  const getTotalIncome = () => {
    return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalSpending = () => {
    return transactions.filter(t => t.type === 'spending').reduce((sum, t) => sum + t.amount, 0);
  };

  const colors = [
    '#e94560', '#4caf50', '#2196f3', '#ff9800',
    '#9c27b0', '#00bcd4', '#ffc107', '#795548'
  ];

  if (!project) {
    return <div className='project-detail-loading'>Loading...</div>;
  }

  return (
    <div className='project-detail-container'>
      {/* Header */}
      <div className='project-detail-header'>
        <button className='back-btn' onClick={() => navigate('/projects')}>
          <IoArrowBack size={20} />
          Back to Projects
        </button>

        <div className='project-detail-title-section'>
          <div className='project-title-with-menu'>
            <div className='project-color-dot' style={{ backgroundColor: project.color }}></div>
            <h1>{project.name}</h1>
            <div className='project-actions-menu'>
              <button
                className='three-dot-menu-btn'
                onClick={() => setShowActionsMenu(!showActionsMenu)}
              >
                <IoEllipsisVertical size={24} />
              </button>

              {showActionsMenu && (
                <div className='actions-dropdown'>
                  <button onClick={() => { setShowEditModal(true); setShowActionsMenu(false); }}>
                    <IoCreate size={18} />
                    Edit Project
                  </button>
                  <button onClick={handleDeleteProject} className='delete-action'>
                    <IoTrashOutline size={18} />
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>
          {project.rate > 0 && (
            <p className='project-rate-display'>${project.rate}/hr</p>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className='project-summary-stats'>
        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <GiTomato size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Total Pomodoros</span>
            <span className='stat-value'>{pomodoros.length}</span>
          </div>
        </div>

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoTime size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Time Tracked</span>
            <span className='stat-value'>{formatTime(getTotalTime())}</span>
          </div>
        </div>

        {project.rate > 0 && (
          <div className='summary-stat-card'>
            <div className='stat-icon'>
              <IoWallet size={28} />
            </div>
            <div className='stat-content'>
              <span className='stat-label'>Estimated Earnings</span>
              <span className='stat-value earnings'>${getTotalEarnings().toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoWallet size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Income</span>
            <span className='stat-value income-text'>${getTotalIncome().toFixed(2)}</span>
          </div>
        </div>

        <div className='summary-stat-card'>
          <div className='stat-icon'>
            <IoWallet size={28} />
          </div>
          <div className='stat-content'>
            <span className='stat-label'>Spending</span>
            <span className='stat-value spending-text'>${getTotalSpending().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className='project-activity-section'>
        <h2>Activity Log</h2>

        {pomodoros.length === 0 && transactions.length === 0 ? (
          <div className='empty-activity'>
            <p>No activity yet for this project</p>
          </div>
        ) : (
          <div className='activity-list'>
            {/* Pomodoros Section */}
            {pomodoros.length > 0 && (
              <div className='activity-group'>
                <h3 className='activity-group-title'>
                  <GiTomato size={20} />
                  Pomodoros ({pomodoros.length})
                </h3>
                {pomodoros.map((pomo) => (
                  <div key={`${pomo.date}-${pomo.timestamp}`} className='activity-item'>
                    <div className='activity-item-content'>
                      <div className='activity-item-icon pomodoro-icon'>
                        <GiTomato size={18} />
                      </div>
                      <div className='activity-item-details'>
                        <span className='activity-item-title'>
                          Completed pomodoro - {pomo.duration} minutes
                        </span>
                        <span className='activity-item-date'>
                          {new Date(pomo.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      className='activity-delete-btn'
                      onClick={() => deletePomodoro(pomo.timestamp, pomo.date)}
                      title='Delete pomodoro'
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Transactions Section */}
            {transactions.length > 0 && (
              <div className='activity-group'>
                <h3 className='activity-group-title'>
                  <IoWallet size={20} />
                  Transactions ({transactions.length})
                </h3>
                {transactions.map((transaction) => (
                  <div key={`${transaction.type}-${transaction.id}`} className='activity-item'>
                    <div className='activity-item-content'>
                      <div className={`activity-item-icon ${transaction.type}-icon`}>
                        <IoWallet size={18} />
                      </div>
                      <div className='activity-item-details'>
                        <span className='activity-item-title'>
                          {transaction.description}
                          {transaction.type === 'spending' && transaction.category && (
                            <span className='transaction-category-badge'>{transaction.category}</span>
                          )}
                        </span>
                        <span className='activity-item-date'>
                          {new Date(transaction.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className={`transaction-amount ${transaction.type}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </div>
                    <button
                      className='activity-delete-btn'
                      onClick={() => deleteTransaction(transaction.id, transaction.type)}
                      title='Delete transaction'
                    >
                      <IoTrashOutline size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className='form-modal' onClick={() => setShowEditModal(false)}>
          <div className='form-modal-content projects-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>Edit Project</h3>
              <button className='close-modal-btn' onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditProject} className='add-project-form'>
              <div className='form-group'>
                <label>Project Name *</label>
                <input
                  type='text'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className='form-group'>
                <label>Hourly Rate ($)</label>
                <input
                  type='number'
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  step='0.01'
                  min='0'
                />
              </div>

              <div className='form-group'>
                <label>Project Color</label>
                <div className='color-picker'>
                  {colors.map((color) => (
                    <button
                      key={color}
                      type='button'
                      className={`color-option ${editColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className='form-actions'>
                <button type='button' className='btn-cancel' onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type='submit' className='btn-primary'>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
