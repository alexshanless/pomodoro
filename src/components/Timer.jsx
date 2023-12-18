import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import GradientSVG from './gradientSVG';
import '../App.css'; // Import your CSS file for styling

const Timer = () => {
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [timerOn, setTimerOn] = useState(false);
  const idCSS = 'hello';
  const completionPercentage = (timeRemaining / (25 * 60)) * 100;

  const displayTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0'
    )}`;
  };

  useEffect(() => {
    if (timerOn) {
      const interval = setInterval(() => {
        setTimeRemaining(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerOn]);

  const handleStartTimer = () => {
    setTimerOn(true);
  };

  const handleStopTimer = () => {
    setTimerOn(false);
  };

  const handleClearTimer = () => {
    setTimeRemaining(25 * 60);
  };

  return (
    <div>
      <h1>Timer</h1>
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

      {!timerOn ? (
        <button onClick={handleStartTimer}>Go</button>
      ) : (
        <button onClick={handleStopTimer}>Stop</button>
      )}

      <button onClick={handleClearTimer}>Clear</button>
    </div>
  );
};

export default Timer;
