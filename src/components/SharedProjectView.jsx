import React from 'react';
import { useParams } from 'react-router-dom';
import { IoTime, IoWallet, IoBriefcase, IoCalendarOutline, IoLockClosedOutline } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useSharedProject } from '../hooks/useProjectShares';
import '../App.css';

const SharedProjectView = () => {
  const { shareToken } = useParams();
  const { project, sessions, shareInfo, loading, error } = useSharedProject(shareToken);

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateTotalTime = () => {
    return sessions.reduce((total, session) => total + (session.duration_minutes || 0), 0);
  };

  const calculateEarnings = () => {
    if (!project?.hourly_rate) return 0;
    const totalMinutes = calculateTotalTime();
    const hours = totalMinutes / 60;
    return hours * project.hourly_rate;
  };

  const groupSessionsByDate = () => {
    const grouped = {};
    sessions.forEach((session) => {
      const date = new Date(session.started_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className='shared-project-container'>
        <div className='loading-state'>
          <div className='spinner'></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='shared-project-container'>
        <div className='error-state'>
          <IoLockClosedOutline size={64} />
          <h2>Access Denied</h2>
          <p>{error}</p>
          <small>This link may have expired or been revoked.</small>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className='shared-project-container'>
        <div className='error-state'>
          <IoBriefcase size={64} />
          <h2>Project Not Found</h2>
          <p>The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const totalTime = calculateTotalTime();
  const totalEarnings = calculateEarnings();
  const sessionsByDate = groupSessionsByDate();

  return (
    <div className='shared-project-container'>
      {/* Header with branding */}
      <div className='shared-project-header'>
        <div className='shared-project-branding'>
          <GiTomato size={32} color='#e94560' />
          <h3>PomPay</h3>
        </div>
        <div className='shared-badge'>
          <IoLockClosedOutline size={14} />
          Read-Only View
        </div>
      </div>

      {/* Project Info Card */}
      <div className='shared-project-info' style={{ borderLeft: `4px solid ${project.color || '#e94560'}` }}>
        <h1>{project.name}</h1>
        {project.description && <p className='project-description'>{project.description}</p>}

        <div className='shared-project-stats'>
          <div className='shared-stat-card'>
            <div className='stat-icon'>
              <GiTomato size={24} />
            </div>
            <div className='stat-details'>
              <span className='stat-label'>Pomodoros</span>
              <span className='stat-value'>{sessions.length}</span>
            </div>
          </div>

          <div className='shared-stat-card'>
            <div className='stat-icon'>
              <IoTime size={24} />
            </div>
            <div className='stat-details'>
              <span className='stat-label'>Total Time</span>
              <span className='stat-value'>{formatTime(totalTime)}</span>
            </div>
          </div>

          {project.hourly_rate > 0 && (
            <>
              <div className='shared-stat-card'>
                <div className='stat-icon'>
                  <IoWallet size={24} />
                </div>
                <div className='stat-details'>
                  <span className='stat-label'>Hourly Rate</span>
                  <span className='stat-value'>${project.hourly_rate}/hr</span>
                </div>
              </div>

              <div className='shared-stat-card highlight'>
                <div className='stat-icon'>
                  <IoWallet size={24} />
                </div>
                <div className='stat-details'>
                  <span className='stat-label'>Total Earnings</span>
                  <span className='stat-value earnings'>${totalEarnings.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sessions Timeline */}
      <div className='shared-sessions-section'>
        <h2>
          <IoCalendarOutline size={24} />
          Work Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className='empty-state'>
            <GiTomato size={48} />
            <p>No sessions recorded yet</p>
          </div>
        ) : (
          <div className='sessions-timeline'>
            {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
              <div key={date} className='session-date-group'>
                <div className='session-date-header'>
                  <span>{date}</span>
                  <span className='session-count'>{dateSessions.length} sessions</span>
                </div>

                <div className='session-cards'>
                  {dateSessions.map((session) => (
                    <div key={session.id} className='shared-session-card'>
                      <div className='session-card-header'>
                        <div className='session-time'>
                          <IoTime size={16} />
                          <span>{formatTime(session.duration_minutes)}</span>
                        </div>
                        <div className='session-timestamp'>
                          {new Date(session.started_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {session.description && (
                        <div className='session-description'>
                          <p>{session.description}</p>
                        </div>
                      )}

                      {session.tags && session.tags.length > 0 && (
                        <div className='session-tags'>
                          {session.tags.map((tag, idx) => (
                            <span key={idx} className='session-tag'>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {project.hourly_rate > 0 && (
                        <div className='session-earnings'>
                          <IoWallet size={14} />
                          <span>${((session.duration_minutes / 60) * project.hourly_rate).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='shared-project-footer'>
        <p>
          This is a shared view of project progress. Data is read-only.
        </p>
        <small>
          Created: {formatDateShort(project.created_at)}
        </small>
      </div>
    </div>
  );
};

export default SharedProjectView;
