import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoAdd, IoTrashOutline, IoGrid, IoList, IoPencil, IoArrowForward } from 'react-icons/io5';
import ModalCloseButton from './ModalCloseButton';
import ActionsMenu from './ActionsMenu';
import { useProjects } from '../hooks/useProjects';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useDialog } from '../contexts/DialogContext';
import { validateProjectName, validateHourlyRate } from '../utils/validation';
import { formatMinutes, formatDate, formatCurrency } from '../utils/format';
import { calcProjectBalance } from '../utils/financialUtils';
import '../styles/ProjectsRedesign.css';

const COLORS = ['#e94560', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#00bcd4', '#ffc107', '#795548'];

const Projects = () => {
  const navigate = useNavigate();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { incomes, spendings } = useFinancialTransactions();
  const { confirm } = useDialog();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectRate, setProjectRate] = useState('');
  const [projectColor, setProjectColor] = useState(COLORS[0]);
  const [validationErrors, setValidationErrors] = useState({});
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('projectsViewMode') || 'list');

  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode);
  }, [viewMode]);

  const rows = useMemo(() => {
    const maxTime = Math.max(1, ...projects.map((p) => p.timeTracked || 0));
    return projects.map((p) => {
      const time = p.timeTracked || 0;
      return {
        ...p,
        balance: calcProjectBalance(p.id, incomes, spendings),
        timePct: time > 0 ? Math.max(4, Math.round((time / maxTime) * 100)) : 0,
      };
    });
  }, [projects, incomes, spendings]);

  const totals = useMemo(() => ({
    active: rows.length,
    tracked: rows.reduce((sum, p) => sum + (p.timeTracked || 0), 0),
    balance: rows.reduce((sum, p) => sum + p.balance, 0),
  }), [rows]);

  const resetForm = () => {
    setProjectName('');
    setProjectRate('');
    setProjectColor(COLORS[0]);
    setValidationErrors({});
    setShowAddForm(false);
    setEditingProject(null);
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const nameValidation = validateProjectName(projectName);
    const rateValidation = validateHourlyRate(projectRate);

    const errors = {};
    if (!nameValidation.isValid) errors.name = nameValidation.errors;
    if (!rateValidation.isValid) errors.rate = rateValidation.errors;
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const sanitizedName = nameValidation.sanitized;
    const sanitizedRate = rateValidation.sanitized || 0;

    const result = editingProject
      ? await updateProject(editingProject.id, { name: sanitizedName, rate: sanitizedRate, color: projectColor })
      : await addProject({ name: sanitizedName, rate: sanitizedRate, color: projectColor, description: '' });

    if (!result.error) resetForm();
  };

  const handleEditProject = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setProjectName(project.name);
    setProjectRate(project.rate.toString());
    setProjectColor(project.color);
    setShowAddForm(true);
  };

  const handleDeleteProject = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm('Are you sure you want to delete this project? This cannot be undone.', {
      title: 'Delete project',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (ok) await deleteProject(id);
  };

  const handleProjectClick = (projectId) => navigate(`/projects/${projectId}`);

  const rowActions = (project) => [
    { label: 'Edit', icon: <IoPencil size={18} />, onClick: (e) => handleEditProject(e, project) },
    { label: 'Delete', icon: <IoTrashOutline size={18} />, onClick: (e) => handleDeleteProject(e, project.id), danger: true },
  ];

  const moneyClass = (balance) => (balance > 0 ? 'pos' : balance < 0 ? 'neg' : 'zero');

  return (
    <div className='pompay-projects'>
      <div className='pp-wrap'>

        <div className='pp-head'>
          <div className='pp-htext'>
            <h1>Projects</h1>
            <div className='pp-sub'>
              {totals.active} active · {formatMinutes(totals.tracked)} tracked · {formatCurrency(totals.balance)} balance
            </div>
          </div>
          <div className='pp-seg' role='group' aria-label='View mode'>
            <button
              className={viewMode === 'card' ? 'on' : ''}
              onClick={() => setViewMode('card')}
              aria-label='Grid view'
              aria-pressed={viewMode === 'card'}
            >
              <IoGrid />
            </button>
            <button
              className={viewMode === 'list' ? 'on' : ''}
              onClick={() => setViewMode('list')}
              aria-label='List view'
              aria-pressed={viewMode === 'list'}
            >
              <IoList />
            </button>
          </div>
          <button className='pp-btn pp-btn-primary' onClick={() => setShowAddForm(true)}>
            <IoAdd /> New Project
          </button>
        </div>

        {viewMode === 'card' ? (
          <div className='pp-grid'>
            {rows.map((project) => (
              <div key={project.id} className='pp-card' onClick={() => handleProjectClick(project.id)}>
                <span className='pp-accent' style={{ background: project.color }} />
                <div className='pp-ctop'>
                  <span className='pp-cdot' style={{ background: project.color }} />
                  <span className='pp-cname'>{project.name}</span>
                  <span className='pp-cid'>{String(project.projectNumber || project.id).padStart(2, '0')}</span>
                  <div className='pp-cmenu'>
                    <ActionsMenu actions={rowActions(project)} menuPosition='right' />
                  </div>
                </div>
                <div className='pp-cmeta'>
                  <div className='pp-mrow'>
                    <span className='pp-mlab'>Time tracked</span>
                    <span className='pp-mval'>{formatMinutes(project.timeTracked || 0)}</span>
                  </div>
                  <div className='pp-cbar'><i style={{ width: `${project.timePct}%` }} /></div>
                  <div className='pp-mrow'>
                    <span className='pp-mlab'>Balance</span>
                    <span className={`pp-mval ${moneyClass(project.balance)}`}>{formatCurrency(project.balance)}</span>
                  </div>
                </div>
                <div className='pp-cfoot'>
                  <span className='pp-cdate'>Created {formatDate(project.createdDate || project.createdAt)}</span>
                  <span className='pp-copen'>Open <IoArrowForward /></span>
                </div>
              </div>
            ))}

            <div className='pp-card add' onClick={() => setShowAddForm(true)}>
              <span className='pp-plus'><IoAdd /></span>
              <span>New Project</span>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className='pp-grid pp-empty-grid'>
            <div className='pp-card add' onClick={() => setShowAddForm(true)}>
              <span className='pp-plus'><IoAdd /></span>
              <span>New Project</span>
            </div>
          </div>
        ) : (
          <div className='pp-panel'>
            <div className='pp-table-scroll'>
              <table className='pp-ptable'>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Project Name</th>
                    <th>Created Date</th>
                    <th>Time Tracked</th>
                    <th className='r'>Balance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((project) => (
                    <tr key={project.id} onClick={() => handleProjectClick(project.id)}>
                      <td className='pp-cell-id' data-label='ID'><span className='pp-pid'>{project.projectNumber || project.id}</span></td>
                      <td className='pp-cell-name'>
                        <span className='pp-pname'>
                          <span className='pp-pdot' style={{ background: project.color }} />
                          {project.name}
                        </span>
                      </td>
                      <td data-label='Created'><span className='pp-pdate'>{formatDate(project.createdDate || project.createdAt)}</span></td>
                      <td data-label='Time tracked'>
                        <span className='pp-ttime'>
                          <span className='pp-bar'><i style={{ width: `${project.timePct}%` }} /></span>
                          {formatMinutes(project.timeTracked || 0)}
                        </span>
                      </td>
                      <td className='r' data-label='Balance'><span className={`pp-money ${moneyClass(project.balance)}`}>{formatCurrency(project.balance)}</span></td>
                      <td className='r pp-cell-action'>
                        <span className='pp-row-actions'>
                          <button
                            className='pp-view-btn'
                            onClick={(e) => { e.stopPropagation(); handleProjectClick(project.id); }}
                          >
                            View
                          </button>
                          <ActionsMenu actions={rowActions(project)} menuPosition='right' />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className='pp-modal' onClick={resetForm}>
          <div
            className='pp-modal-card'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='pp-modal-title'
          >
            <div className='pp-modal-head'>
              <h3 id='pp-modal-title'>{editingProject ? 'Edit Project' : 'New Project'}</h3>
              <ModalCloseButton onClick={resetForm} />
            </div>
            <form onSubmit={handleAddProject} className='pp-form'>
              <div className='pp-field'>
                <label htmlFor='pp-name'>Project Name *</label>
                <input
                  id='pp-name'
                  type='text'
                  placeholder='e.g., Website Redesign'
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: null }));
                  }}
                  className={`pp-input ${validationErrors.name ? 'error' : ''}`}
                />
                {validationErrors.name && <div className='pp-error'>{validationErrors.name[0]}</div>}
              </div>

              <div className='pp-field'>
                <label htmlFor='pp-rate'>Hourly Rate ($)</label>
                <input
                  id='pp-rate'
                  type='number'
                  placeholder='0.00'
                  value={projectRate}
                  onChange={(e) => {
                    setProjectRate(e.target.value);
                    if (validationErrors.rate) setValidationErrors((prev) => ({ ...prev, rate: null }));
                  }}
                  step='0.01'
                  min='0'
                  className={`pp-input ${validationErrors.rate ? 'error' : ''}`}
                />
                {validationErrors.rate && <div className='pp-error'>{validationErrors.rate[0]}</div>}
              </div>

              <div className='pp-field'>
                <label>Project Color</label>
                <div className='pp-colors'>
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type='button'
                      className={`pp-swatch ${projectColor === color ? 'on' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setProjectColor(color)}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className='pp-modal-actions'>
                <button type='button' className='pp-btn-cancel' onClick={resetForm}>Cancel</button>
                <button type='submit' className='pp-btn pp-btn-primary'>
                  {editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
