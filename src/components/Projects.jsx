import React, { useState, useEffect } from 'react';
import { IoAdd, IoTrashOutline, IoClose, IoBriefcase, IoTime, IoWallet } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import '../App.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectRate, setProjectRate] = useState('');
  const [projectColor, setProjectColor] = useState('#e94560');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    setProjects(savedProjects);
  };

  const saveProjects = (updatedProjects) => {
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const newProject = {
      id: Date.now(),
      name: projectName,
      rate: parseFloat(projectRate) || 0,
      color: projectColor,
      timeTracked: 0, // in minutes
      pomodoros: 0,
      createdAt: new Date().toISOString(),
      financials: {
        income: 0,
        expenses: 0
      }
    };

    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);

    // Reset form
    setProjectName('');
    setProjectRate('');
    setProjectColor('#e94560');
    setShowAddForm(false);
  };

  const handleDeleteProject = (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      const updatedProjects = projects.filter(p => p.id !== id);
      saveProjects(updatedProjects);
    }
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
        <button className='add-project-btn' onClick={() => setShowAddForm(true)}>
          <IoAdd size={20} />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className='empty-state-projects'>
          <IoBriefcase size={64} />
          <p>No projects yet. Create your first project to start tracking!</p>
        </div>
      ) : (
        <div className='projects-grid'>
          {projects.map((project) => (
            <div key={project.id} className='project-card' style={{ borderLeft: `4px solid ${project.color}` }}>
              <div className='project-card-header'>
                <h3>{project.name}</h3>
                <button
                  className='delete-project-btn'
                  onClick={() => handleDeleteProject(project.id)}
                  title='Delete project'
                >
                  <IoTrashOutline size={18} />
                </button>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddForm && (
        <div className='form-modal' onClick={() => setShowAddForm(false)}>
          <div className='form-modal-content projects-modal' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header-settings'>
              <h3>New Project</h3>
              <button className='close-modal-btn' onClick={() => setShowAddForm(false)}>
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
                <button type='button' className='btn-cancel' onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type='submit' className='btn-primary'>
                  Create Project
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
