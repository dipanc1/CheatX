import React from 'react';

function HintsPanel({ hints, loading, stealthMode, setStealthMode, onCopy }) {
  return (
    <div className="hints-panel" style={{ display: stealthMode ? 'none' : 'flex' }}>
      <div className="stealth-toggle">
        <input
          type="checkbox"
          id="stealth"
          checked={stealthMode}
          onChange={(e) => setStealthMode(e.target.checked)}
        />
        <label htmlFor="stealth">Hide Panel (Stealth Mode)</label>
      </div>

      {!hints && !loading && (
        <div style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>
          Enter a question to get started
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#00d4ff' }}>
          <div className="spinner"></div>
          Thinking...
        </div>
      )}

      {hints && (
        <>
          {hints.classification && (
            <div className="hints-section">
              <h2>📌 Classification</h2>
              <div className="hint-card">{hints.classification}</div>
            </div>
          )}

          {hints.approach && (
            <div className="hints-section">
              <h2>🎯 Approach</h2>
              <div className="hint-card">{hints.approach}</div>
            </div>
          )}

          {hints.keyPoints && (
            <div className="hints-section">
              <h2>⭐ Key Points</h2>
              <div className="hint-card">{hints.keyPoints}</div>
            </div>
          )}

          {hints.edgeCases && (
            <div className="hints-section">
              <h2>⚠️ Edge Cases</h2>
              <div className="hint-card">{hints.edgeCases}</div>
            </div>
          )}

          {hints.codeSnippet && (
            <div className="hints-section">
              <h2>💻 Code Snippet</h2>
              <pre
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'auto',
                  color: '#00ff88',
                }}
              >
                {hints.codeSnippet}
              </pre>
              <button
                className="copy-btn"
                onClick={() => onCopy(hints.codeSnippet)}
              >
                Copy Code
              </button>
            </div>
          )}

          {hints.response && (
            <div className="hints-section">
              <h2>✅ Full Answer</h2>
              <button
                className="copy-btn"
                onClick={() => onCopy(hints.response)}
              >
                📋 Copy Answer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HintsPanel;
