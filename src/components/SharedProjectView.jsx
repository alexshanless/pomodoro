import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { IoTime, IoWallet, IoCalendarOutline, IoLockClosedOutline, IoEyeOutline } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useSharedProject } from '../hooks/useProjectShares';
import { formatMinutes, formatDate, formatCurrency } from '../utils/format';
import '../styles/ShareViewRedesign.css';

const SharedProjectView = () => {
  const { shareToken } = useParams();
  const { project, sessions, loading, error, errorCode } = useSharedProject(shareToken);

  const totalMinutes = sessions.reduce((total, s) => total + (s.duration_minutes || 0), 0);
  const hasRate = project?.hourly_rate > 0;
  const totalEarnings = hasRate ? (totalMinutes / 60) * project.hourly_rate : 0;

  const groupSessionsByDate = () => {
    const grouped = {};
    sessions.forEach((session) => {
      const date = formatDate(session.started_at);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(session);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className='pompay-share'>
        <div className='sv-center'>
          <div className='sv-spinner' />
          <p>Loading project…</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthRequired = errorCode === 'AUTH_REQUIRED';
    const isEmailMismatch = errorCode === 'EMAIL_MISMATCH';
    return (
      <div className='pompay-share'>
        <div className='sv-state-card'>
          <div className={`sv-state-ic${isAuthRequired ? '' : ' warn'}`}>
            <IoLockClosedOutline />
          </div>
          <h2>{isAuthRequired ? 'Sign in required' : isEmailMismatch ? 'Access restricted' : 'Link unavailable'}</h2>
          <p>{error}</p>
          {isAuthRequired ? (
            <Link to='/signin' className='sv-btn'>Sign in</Link>
          ) : (
            <p className='sv-state-hint'>This link may have expired or been revoked.</p>
          )}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className='pompay-share'>
        <div className='sv-state-card'>
          <div className='sv-state-ic warn'>
            <IoLockClosedOutline />
          </div>
          <h2>Project not found</h2>
          <p>The shared project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const accent = project.color || '#38c6ff';
  const sessionsByDate = groupSessionsByDate();

  return (
    <div className='pompay-share'>
      <div className='sv-wrap'>
        <div className='sv-topbar'>
          <div className='sv-brand'>
            <GiTomato />
            <span>PomPay</span>
          </div>
          <div className='sv-pill'>
            <IoEyeOutline />
            Read-only view
          </div>
        </div>

        <div className='sv-idhead'>
          <span className='sv-swatch' style={{ background: accent }} />
          <div className='sv-idmain'>
            <h1>{project.name}</h1>
            {project.description && <p className='sv-desc'>{project.description}</p>}
            {project.created_at && <p className='sv-created'>Shared by PomPay · Created {formatDate(project.created_at)}</p>}
          </div>
        </div>

        <div className='sv-stats'>
          <div className='sv-stat'>
            <div className='sv-top'>
              <div className='sv-badge'>
                <IoTime />
              </div>
              <span className='sv-lab'>Total time</span>
            </div>
            <div className='sv-num'>{formatMinutes(totalMinutes)}</div>
          </div>

          <div className='sv-stat'>
            <div className='sv-top'>
              <div className='sv-badge violet'>
                <GiTomato />
              </div>
              <span className='sv-lab'>Pomodoros</span>
            </div>
            <div className='sv-num'>{sessions.length}</div>
          </div>

          {hasRate && (
            <div className='sv-stat'>
              <div className='sv-top'>
                <div className='sv-badge earn'>
                  <IoWallet />
                </div>
                <span className='sv-lab'>Total earnings</span>
              </div>
              <div className='sv-num earn'>{formatCurrency(totalEarnings)}</div>
            </div>
          )}
        </div>

        <div className='sv-panel'>
          <div className='sv-phead'>
            <div className='sv-ic'>
              <IoCalendarOutline />
            </div>
            <h2>Work sessions</h2>
            <span className='sv-pcount'>{sessions.length} total</span>
          </div>

          {sessions.length === 0 ? (
            <div className='sv-empty'>
              <GiTomato />
              <p>No sessions recorded yet.</p>
            </div>
          ) : (
            Object.entries(sessionsByDate).map(([date, dateSessions]) => (
              <div key={date} className='sv-daygroup'>
                <div className='sv-dayhead'>
                  <span className='sv-daylabel'>{date}</span>
                  <span className='sv-daycount'>
                    {dateSessions.length} {dateSessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div className='sv-rlist'>
                  {dateSessions.map((session) => (
                    <div key={session.id} className='sv-ritem'>
                      <div className='sv-rring'>
                        <IoTime />
                      </div>
                      <div className='sv-rmain'>
                        <span className={`sv-rtask${session.description ? '' : ' muted'}`}>
                          {session.description || 'Focus session'}
                        </span>
                        <span className='sv-rmeta'>
                          {new Date(session.started_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {session.tags && session.tags.length > 0 && (
                            <span className='sv-tags'>
                              {session.tags.map((tag, idx) => (
                                <span key={idx} className='sv-tag'>{tag}</span>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className='sv-rright'>
                        {hasRate && (
                          <span className='sv-rearn'>
                            {formatCurrency((session.duration_minutes / 60) * project.hourly_rate)}
                          </span>
                        )}
                        <span className='sv-rdur'>{formatMinutes(session.duration_minutes || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className='sv-footer'>
          <p>This is a read-only view of project progress shared via PomPay.</p>
        </div>
      </div>
    </div>
  );
};

export default SharedProjectView;
