// Timer Web Worker - runs in background thread, unaffected by tab throttling
let timerId = null;
let targetEndTime = null;

self.onmessage = function(e) {
  const { type, endTime } = e.data;

  switch(type) {
    case 'START':
      // Store the target end time
      targetEndTime = endTime;

      // Clear any existing timer
      if (timerId) {
        clearInterval(timerId);
      }

      // Start a timer that checks every second
      timerId = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));

        // Send update to main thread
        self.postMessage({
          type: 'TICK',
          timeRemaining: remaining
        });

        // If time is up, notify and stop
        if (remaining === 0) {
          clearInterval(timerId);
          timerId = null;
          targetEndTime = null;
          self.postMessage({
            type: 'COMPLETE'
          });
        }
      }, 1000);

      // Send immediate update
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
      self.postMessage({
        type: 'TICK',
        timeRemaining: remaining
      });
      break;

    case 'STOP':
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      targetEndTime = null;
      break;

    case 'CHECK':
      // Return current time remaining based on stored end time
      if (targetEndTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
        self.postMessage({
          type: 'TICK',
          timeRemaining: remaining
        });

        // If time ran out while we were away, notify
        if (remaining === 0) {
          clearInterval(timerId);
          timerId = null;
          targetEndTime = null;
          self.postMessage({
            type: 'COMPLETE'
          });
        }
      }
      break;
  }
};
