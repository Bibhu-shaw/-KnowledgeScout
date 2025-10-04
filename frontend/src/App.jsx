import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [hasGrowled, setHasGrowled] = useState(false);

  const API_BASE_URL = 'https://knowledgescout-2-6ala.onrender.com';

  const playGrowl = () => {
    if (hasGrowled) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1);
    setHasGrowled(true);
  };

  const playScream = () => {
    new Audio('/sounds/scream.mp3').play().catch(err => console.error('Scream error:', err));
  };

  const handleUpload = async (retryCount = 3, delay = 1000) => {
    if (!file) {
      alert('Please select a file first!');
      playScream();
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000, // Increased to 15s for larger files
      });
      alert('File consumed by the beast!');
    } catch (err) {
      console.error('Upload error:', err);
      if (retryCount > 0 && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED')) {
        console.log(`Retrying upload... (${retryCount} attempts left, delay: ${delay}ms)`);
        setTimeout(() => handleUpload(retryCount - 1, delay * 2), delay);
      } else {
        alert('Upload failed: ' + (err.response?.data?.error || err.message));
        playScream();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (retryCount = 3, delay = 1000) => {
    if (!question) {
      alert('Dare to ask the monster a question!');
      playScream();
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/query`, { question }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      setAnswers(res.data.answers);
    } catch (err) {
      console.error('Query error:', err);
      if (retryCount > 0 && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED')) {
        console.log(`Retrying query... (${retryCount} attempts left, delay: ${delay}ms)`);
        setTimeout(() => handleQuery(retryCount - 1, delay * 2), delay);
      } else {
        alert('Query failed: ' + (err.response?.data?.error || err.message));
        playScream();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      alert('Health check: ' + JSON.stringify(res.data));
    } catch (err) {
      alert('Health check failed: ' + err.message);
      playScream();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const pupils = document.querySelectorAll('.pupil');
      pupils.forEach(pupil => {
        const eye = pupil.parentElement;
        const eyeRect = eye.getBoundingClientRect();
        const eyeX = eyeRect.left + eyeRect.width / 2;
        const eyeY = eyeRect.top + eyeRect.height / 2;
        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = Math.min(20, Math.hypot(e.clientX - eyeX, e.clientY - eyeY) / 10);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        pupil.style.transform = `translate(${x}px, ${y}px)`;
      });

      const mouth = document.querySelector('.mouth');
      const mouthRect = mouth.getBoundingClientRect();
      const isInMouthArea =
        e.clientX >= mouthRect.left &&
        e.clientX <= mouthRect.right &&
        e.clientY >= mouthRect.top &&
        e.clientY <= mouthRect.bottom;
      setIsSmiling(isInMouthArea);
      if (isInMouthArea && !hasGrowled) {
        playGrowl();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [hasGrowled]);

  return (
    <div className="app-container">
      <div className="blood-drip"></div>
      <div className="monster-face">
        <div className="eye left-eye">
          <div className="pupil"></div>
        </div>
        <div className="eye right-eye">
          <div className="pupil"></div>
        </div>
        <div className={`mouth ${isSmiling ? 'smiling' : ''}`}></div>
      </div>

      <div className="main-content">
        <h1>KnowledgeScout: Abyssal Oracle</h1>
        <p>Feed the monster PDFs or DOCX files and ask questions to reveal its dark wisdom! (You do not ask whole sentence as a query, just give me the word our demon will response)</p>

        <div className="upload-section">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files[0])}
            className="file-input"
            disabled={isLoading}
          />
          <button onClick={() => handleUpload()} className="upload-button" disabled={isLoading}>
            {isLoading ? (
              <span>
                <span className="spinner"></span> Consuming...
              </span>
            ) : (
              '🖤 Devour Document'
            )}
          </button>
        </div>

        <div className="query-section">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the beast a question... (e.g., 'secrets' or 'void')"
            className="question-input"
            disabled={isLoading}
          />
          <button onClick={() => handleQuery()} className="query-button" disabled={isLoading}>
            {isLoading ? (
              <span>
                <span className="spinner"></span> Divining...
              </span>
            ) : (
              'Seek Dark Truths'
            )}
          </button>
          <button onClick={testHealth} className="test-button">Test Health</button>
        </div>

        {answers.length > 0 && (
          <div className="answers-section">
            <h2>🖤 Abyssal Revelations:</h2>
            <div className="answers-list">
              {answers.map((answer, idx) => (
                <div key={idx} className="answer-item">
                  <p>{answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;