import React, { useState } from 'react';
import './App.css';
import QuestionInput from './components/QuestionInput';
import HintsPanel from './components/HintsPanel';

function App() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('auto');
  const [hints, setHints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stealthMode, setStealthMode] = useState(false);

  const categories = ['auto', 'coding', 'lld', 'hld', 'behavioral'];

  const handleGenerateHints = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');
    setHints(null);

    try {
      const response = await window.electron.getHints({
        question,
        category,
      });

      if (response.error) {
        setError(response.error);
      } else {
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
          <h1>Interview Copilot</h1>
        </div>

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
    </div>
  );
}

export default App;
