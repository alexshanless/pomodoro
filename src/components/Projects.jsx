import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoAdd, IoTrashOutline, IoClose, IoBriefcase, IoTime, IoWallet, IoGrid, IoList, IoPencil } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useProjects } from '../hooks/useProjects';
import ActionsMenu from './ActionsMenu';
import '../App.css';

const Projects = () => {
  const navigate = useNavigate();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectRate, setProjectRate] = useState('');
  const [projectColor, setProjectColor] = useState('#e94560');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('projectsViewMode') || 'list';
  }); // 'card' or 'list'

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode);
  }, [viewMode]);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    if (editingProject) {
      // Update existing project
      const result = await updateProject(editingProject.id, {
        name: projectName,
        rate: parseFloat(projectRate) || 0,
        color: projectColor
      });

      if (!result.error) {
        // Reset form
        setProjectName('');
        setProjectRate('');
        setProjectColor('#e94560');
        setShowAddForm(false);
        setEditingProject(null);
      }
    } else {
      // Add new project
      const result = await addProject({
        name: projectName,
        rate: parseFloat(projectRate) || 0,
        color: projectColor,
        description: ''
      });

      if (!result.error) {
        // Reset form
        setProjectName('');
        setProjectRate('');
        setProjectColor('#e94560');
        setShowAddForm(false);
      }
    }
  };

  const handleEditProject = (e, project) => {
    e.stopPropagation(); // Prevent card click navigation
    setEditingProject(project);
    setProjectName(project.name);
    setProjectRate(project.rate.toString());
    setProjectColor(project.color);
    setShowAddForm(true);
  };

  const handleDeleteProject = async (e, id) => {
    e.stopPropagation(); // Prevent card click navigation
    if (window.confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const calculateEarnings = (project) => {
    const hours = project.timeTracked / 60;
    return hours * project.rate;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatProjectDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeTracked = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const colors = [
    '#e94560', // red
    '#4caf50', // green
    '#2196f3', // blue
    '#ff9800', // orange
    '#9c27b0', // purple
    '#00bcd4', // cyan
    '#ffc107', // yellow
    '#795548', // brown
  ];

  return (
    <div className='projects-container'>
      <div className='projects-header'>
        <h1>Projects</h1>
        <div className='projects-header-actions'>
          <div className='view-toggle-buttons'>
            <button
              className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title='Card View'
            >
              <IoGrid size={20} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title='List View'
            >
              <IoList size={20} />
            </button>
          </div>
          <button className='add-project-btn' onClick={() => setShowAddForm(true)}>
            <IoAdd size={20} />
            New Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className='empty-state-projects'>
          <IoBriefcase size={64} />
          <p>No projects yet. Create your first project to start tracking!</p>
        </div>
      ) : viewMode === 'card' ? (
        <div className='projects-grid'>
          {projects.map((project) => (
            <div
              key={project.id}
              className='project-card'
              style={{ border: `2px solid ${project.color}` }}
              onClick={() => handleProjectClick(project.id)}
            >
              <div className='project-card-header'>
                <h3>{project.name}</h3>
                <ActionsMenu
                  actions={[
                    {
                      label: 'Edit',
                      icon: <IoPencil size={18} />,
                      onClick: (e) => handleEditProject(e, project)
                    },
                    {
                      label: 'Delete',
                      icon: <IoTrashOutline size={18} />,
                      onClick: (e) => handleDeleteProject(e, project.id),
                      danger: true
                    }
                  ]}
                  menuPosition="right"
                />
              </div>

              <div className='project-stats'>
                <div className='project-stat'>
                  <div className='project-stat-icon'>
                    <IoTime size={20} />
                  </div>
                  <div className='project-stat-details'>
                    <span className='project-stat-label'>Time Tracked</span>
                    <span className='project-stat-value'>{formatTime(project.timeTracked)}</span>
                  </div>
                </div>

                <div className='project-stat'>
                  <div className='project-stat-icon'>
                    <GiTomato size={20} />
                  </div>
                  <div className='project-stat-details'>
                    <span className='project-stat-label'>Pomodoros</span>
                    <span className='project-stat-value'>{project.pomodoros}</span>
                  </div>
                </div>

                {project.rate > 0 && (
                  <>
                    <div className='project-stat'>
                      <div className='project-stat-icon'>
                        <IoWallet size={20} />
                      </div>
                      <div className='project-stat-details'>
                        <span className='project-stat-label'>Rate</span>
                        <span className='project-stat-value'>${project.rate}/hr</span>
                      </div>
                    </div>

                    <div className='project-stat-full'>
                      <div className='project-stat-icon'>
                        <IoWallet size={20} />
                      </div>
                      <div className='project-stat-details'>
                        <span className='project-stat-label'>Estimated Earnings</span>
                        <span className='project-stat-value earnings'>${calculateEarnings(project).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='projects-table-container table-scroll-wrapper'>
          <table className='projects-table'>
            <thead>
              <tr>
                <th className='col-id'>ID</th>
                <th className='col-name'>PROJECT NAME</th>
                <th className='col-date'>CREATED DATE</th>
                <th className='col-time'>TIME TRACKED</th>
                <th className='col-balance'>BALANCE</th>
                <th className='col-action'></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const balance = project.balance || 0;
                const projectNumber = project.projectNumber || project.id;
                return (
                  <tr key={project.id} className='table-row'>
                    <td className='col-id'>{projectNumber}</td>
                    <td className='col-name'>{project.name}</td>
                    <td className='col-date'>{formatProjectDate(project.createdDate || project.createdAt)}</td>
                    <td className='col-time'>
                      <span className='time-pill time-good'>
                        {formatTimeTracked(project.timeTracked)}
                      </span>
                    </td>
                    <td className={`col-balance ${balance >= 0 ? 'balance-positive' : 'balance-negative'}`}>
                      {balance >= 0 ? `$${balance.toFixed(2)}` : `($${Math.abs(balance).toFixed(2)})`}
                    </td>
                    <td className='col-action'>
                      <button className='view-btn-table' onClick={() => handleProjectClick(project.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Project Modal */}
      {showAddForm && (
        <div className='form-modal' onClick={() => { setShowAddForm(false); setEditingProject(null); }}>
          <div className='form-modal-content projects-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>{editingProject ? 'Edit Project' : 'New Project'}</h3>
              <button className='close-modal-btn' onClick={() => { setShowAddForm(false); setEditingProject(null); }}>
                <IoClose size={24} />
              </button>
            </div>
            <form onSubmit={handleAddProject} className='add-project-form'>
              <div className='form-group'>
                <label>Project Name *</label>
                <input
                  type='text'
                  placeholder='e.g., Website Redesign'
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div className='form-group'>
                <label>Hourly Rate ($)</label>
                <input
                  type='number'
                  placeholder='0.00'
                  value={projectRate}
                  onChange={(e) => setProjectRate(e.target.value)}
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
                      className={`color-option ${projectColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setProjectColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className='form-actions'>
                <button type='button' className='btn-cancel' onClick={() => { setShowAddForm(false); setEditingProject(null); }}>
                  Cancel
                </button>
                <button type='submit' className='btn-primary'>
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
