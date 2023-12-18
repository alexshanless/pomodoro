import './App.css';
import Timer from './components/Timer';

function App() {
  return (
    <div className='App'>
      <header className='App-header'>
        <Timer className='timer-nums'> 25:00</Timer>
      </header>
    </div>
  );
}

export default App;
