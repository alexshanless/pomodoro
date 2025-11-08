import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import CalendarView from './CalendarView';
import { IoStatsChart, IoPlayCircle, IoPauseCircle, IoStopCircle, IoRefresh, IoEye, IoEyeOff } from 'react-icons/io5';
import '../App.css'; // Import your CSS file for styling

const Timer = ({ isDrawerOpen, setIsDrawerOpen }) => {
  const [viewMode, setViewMode] = useState('recent'); // 'recent' or 'calendar'
  const POMODORO_DURATION = 25 * 60;
  const [timeRemaining, setTimeRemaining] = useState(POMODORO_DURATION);
  const [timerOn, setTimerOn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTimeWorked, setTotalTimeWorked] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [fullFocusMode, setFullFocusMode] = useState(false);
  const idCSS = 'hello';
  const completionPercentage = (timeRemaining / POMODORO_DURATION) * 100;

  const displayTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0'
    )}`;
  };

  const savePomodoroSession = () => {
    const today = new Date().toISOString().split('T')[0];
    const sessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');

    if (!sessions[today]) {
      sessions[today] = {
        completed: 0,
        totalMinutes: 0,
        sessions: []
      };
    }

    sessions[today].completed += 1;
    sessions[today].totalMinutes += 25;
    sessions[today].sessions.push({
      timestamp: new Date().toISOString(),
      duration: 25
    });

    localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
  };

  useEffect(() => {
    if (timerOn && !isPaused) {
      const interval = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            setTimerOn(false);
            setIsPaused(false);
            savePomodoroSession();
            setTotalTimeWorked(prev => prev + POMODORO_DURATION);
            setShowCompletionModal(true);
            return POMODORO_DURATION;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerOn, isPaused, POMODORO_DURATION]);

  const handleStartTimer = () => {
    setTimerOn(true);
    setIsPaused(false);
  };

  const handlePauseTimer = () => {
    setIsPaused(true);
  };

  const handleResumeTimer = () => {
    setIsPaused(false);
  };

  const handleStopTimer = () => {
    const timeWorked = POMODORO_DURATION - timeRemaining;
    if (timeWorked > 0) {
      setTotalTimeWorked(prev => prev + timeWorked);
    }
    setTimerOn(false);
    setIsPaused(false);
    setTimeRemaining(POMODORO_DURATION);
  };

  const handleResetTimer = () => {
    setTimeRemaining(POMODORO_DURATION);
    setTimerOn(false);
    setIsPaused(false);
  };

  const formatTotalTime = () => {
    const minutes = Math.floor(totalTimeWorked / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`;
  };

  return (
    <div className={`timer-container ${fullFocusMode ? 'full-focus' : ''}`}>
      {/* Completion Modal */}
      {showCompletionModal && (
        <div className='completion-modal-overlay' onClick={() => setShowCompletionModal(false)}>
          <div className='completion-modal' onClick={(e) => e.stopPropagation()}>
            <h2>Pomodoro Completed!</h2>
            <p>Great work! You've completed a 25-minute session.</p>
            <button onClick={() => setShowCompletionModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Header with tabs and controls */}
      {!fullFocusMode && (
        <div className='timer-header'>
          <div className='timer-header-left'>
            <div className='timer-mode-tabs'>
              <button
                className={`mode-tab ${viewMode === 'recent' ? 'active' : ''}`}
                onClick={() => setViewMode('recent')}
              >
                Recent
              </button>
              <button
                className={`mode-tab ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>
          <div className='timer-header-right'>
            <button className='timer-toggle-btn' onClick={() => setIsDrawerOpen(!isDrawerOpen)}>
              <IoStatsChart size={20} />
            </button>
            <button className='full-focus-toggle' onClick={() => setFullFocusMode(!fullFocusMode)}>
              {fullFocusMode ? <IoEye size={20} /> : <IoEyeOff size={20} />}
            </button>
          </div>
        </div>
      )}

      {viewMode === 'recent' ? (
        <div className='timer-view'>
          <div className='timer-main-layout'>
            {/* Left Side: Controls */}
            <div className={`timer-controls-left ${fullFocusMode ? 'visible' : ''}`}>
              {!timerOn ? (
                <button className='control-btn start-btn' onClick={handleStartTimer}>
                  <IoPlayCircle size={32} />
                  <span>Start</span>
                </button>
              ) : isPaused ? (
                <button className='control-btn resume-btn' onClick={handleResumeTimer}>
                  <IoPlayCircle size={32} />
                  <span>Resume</span>
                </button>
              ) : (
                <button className='control-btn pause-btn' onClick={handlePauseTimer}>
                  <IoPauseCircle size={32} />
                  <span>Pause</span>
                </button>
              )}

              {timerOn && (
                <button className='control-btn stop-btn' onClick={handleStopTimer}>
                  <IoStopCircle size={32} />
                  <span>Stop</span>
                </button>
              )}

              <button className='control-btn reset-btn' onClick={handleResetTimer}>
                <IoRefresh size={32} />
                <span>Reset</span>
              </button>
            </div>

            {/* Center: Timer */}
            <div className='timer-center'>
              {!fullFocusMode && <h2>Pomodoro Timer</h2>}
              <GradientSVG />
              <div className='rotated-progress-bar'>
                <CircularProgressbar
                  value={completionPercentage}
                  text={displayTimeRemaining()}
                  circleRatio={0.8}
                  styles={buildStyles({
                    pathColor: `url(#${idCSS})`,
                    textColor: '#fff',
                  })}
                />
              </div>

              {fullFocusMode && (
                <button className='exit-focus-btn' onClick={() => setFullFocusMode(false)}>
                  <IoEye size={20} />
                  <span>Exit Focus</span>
                </button>
              )}
            </div>

            {/* Right Side: Placeholder for symmetry */}
            <div className='timer-right-spacer'></div>
          </div>

          {/* Progress Stats - Below controls */}
          {!fullFocusMode && totalTimeWorked > 0 && (
            <div className='session-info-bottom'>
              <p>Today's work time: {formatTotalTime()}</p>
            </div>
          )}
        </div>
      ) : (
        <CalendarView />
      )}
    </div>
  );
};

export default Timer;
