import React, { useState, useEffect } from 'react';
import './App.css';
import QuestionInput from './components/QuestionInput';
import HintsPanel from './components/HintsPanel';
import ContextUpload from './components/ContextUpload';

function App() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('auto');
  const [hints, setHints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stealthMode, setStealthMode] = useState(false);
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  const categories = ['auto', 'coding', 'lld', 'hld', 'behavioral'];

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+H to toggle stealth mode
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        e.preventDefault();
        setStealthMode(!stealthMode);
      }
      // Ctrl+Shift+C to copy last hint
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyC' && hints?.response) {
        e.preventDefault();
        window.electron.copyToClipboard(hints.response);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stealthMode, hints]);

  const handleGenerateHints = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');
    setHints(null);

    try {
      const hintData = {
        question,
        category,
        resume: resume || '',
        jobDesc: jobDesc || '',
      };
      
      const response = await window.electron.getHints(hintData);

      if (response.error) {
        setError(response.error);
      } else {
        // Strip markdown formatting from response
        if (response.response) {
          response.response = response.response
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/__(.*?)__/g, '$1') // Remove bold
            .replace(/_(.*?)_/g, '$1') // Remove italic
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/###\s+/g, '') // Remove ### headers
            .replace(/##\s+/g, '') // Remove ## headers
            .replace(/#\s+/g, ''); // Remove # headers
        }
        setHints(response);
      }
    } catch (err) {
      setError('Failed to generate hints. Make sure backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHint = (text) => {
    window.electron.copyToClipboard(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="app-container">
      <div className="main-panel">
        <div className="header">
          <span style={{ fontSize: '24px' }}>⚡</span>
          <h1>CheatX</h1>
        </div>

        <ContextUpload
          resume={resume}
          setResume={setResume}
          jobDesc={jobDesc}
          setJobDesc={setJobDesc}
        />

        <QuestionInput
          question={question}
          setQuestion={setQuestion}
          category={category}
          setCategory={setCategory}
          categories={categories}
          onGenerate={handleGenerateHints}
          loading={loading}
          error={error}
        />

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            Generating hints...
          </div>
        )}

        {hints && (
          <div style={{ marginTop: '20px' }}>
            <h2 style={{ color: '#00d4ff', marginBottom: '15px' }}>Generated Response:</h2>
            <div
              className="hint-card"
              style={{
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                padding: '20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {hints.response}
            </div>
            <button
              className="copy-btn"
              onClick={() => handleCopyHint(hints.response)}
              style={{ marginTop: '10px', width: '100%' }}
            >
              📋 Copy Full Response
            </button>
          </div>
        )}
      </div>

      <HintsPanel
        hints={hints}
        loading={loading}
        stealthMode={stealthMode}
        setStealthMode={setStealthMode}
        onCopy={handleCopyHint}
      />

      {/* Floating button to show hints when in stealth mode */}
      {stealthMode && (
        <button
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 16px',
            background: '#00d4ff',
            border: 'none',
            borderRadius: '50px',
            color: '#0f0f1e',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '12px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 212, 255, 0.4)',
            transition: 'all 0.3s',
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
          onClick={() => setStealthMode(false)}
          title="Show hints panel (Ctrl+Shift+H)"
        >
          👁️ Show Hints
        </button>
      )}
    </div>
  );
}

export default App;
