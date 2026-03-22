import React, { useState, useEffect } from 'react';

/**
 * InterviewOverlay - Floating window for real-time interview hints
 * Shows question + hints + fallback controls
 */

function InterviewOverlay({
  isActive,
  isRecording,
  currentQuestion,
  currentCategory,
  currentHints,
  loading,
  error,
  sessionInfo,
  onRetry,
  onSkip,
  onNextQuestion,
  onManualInput,
  onToggleRecording,
}) {
  const [minimized, setMinimized] = useState(false);

  if (!isActive) return null;

  const categoryColors = {
    coding: '#00d4ff',
    lld: '#00ff88',
    hld: '#ff9500',
    behavioral: '#ff4488',
  };

  const categoryColor = categoryColors[currentCategory] || '#00d4ff';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: minimized ? '350px' : '420px',
        height: minimized ? '45px' : 'auto',
        maxHeight: '85vh',
        backgroundColor: '#0f0f1e',
        border: `2px solid ${categoryColor}`,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 212, 255, 0.2)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderBottom: `1px solid ${categoryColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRecording && (
            <span
              style={{
                width: '10px',
                height: '10px',
                backgroundColor: '#ff4444',
                borderRadius: '50%',
                animation: 'pulse 1s infinite',
              }}
            />
          )}
          <span style={{ color: '#00d4ff', fontSize: '13px', fontWeight: 'bold' }}>
            🎙️ Interview Mode
          </span>
          {sessionInfo && (
            <span style={{ color: '#999', fontSize: '11px', marginLeft: '8px' }}>
              Q{sessionInfo.questionCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setMinimized(!minimized)}
          style={{
            background: 'none',
            border: 'none',
            color: '#00d4ff',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
          }}
        >
          {minimized ? '⬇️' : '⬆️'}
        </button>
      </div>

      {!minimized && (
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Question Section */}
          {currentQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                📝 Question
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(0, 212, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#ccc',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  maxHeight: '80px',
                  overflow: 'auto',
                }}
              >
                {currentQuestion}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    backgroundColor: categoryColor,
                    color: '#0f0f1e',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentCategory}
                </span>
              </div>
            </div>
          )}

          {/* Hints Section */}
          {currentHints && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                💡 Hints
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(0, 255, 136, 0.05)',
                  border: '1px solid rgba(0, 255, 136, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#ccc',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  maxHeight: '120px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
              >
                {typeof currentHints === 'string' ? currentHints : JSON.stringify(currentHints, null, 2)}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div
              style={{
                backgroundColor: 'rgba(255, 149, 0, 0.1)',
                border: '1px solid rgba(255, 149, 0, 0.3)',
                borderRadius: '6px',
                padding: '10px 12px',
                color: '#ffb000',
                fontSize: '12px',
                textAlign: 'center',
              }}
            >
              ⏳ Generating hints...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '10px 12px',
                color: '#ff6666',
                fontSize: '12px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            {error && (
              <button
                onClick={onRetry}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ffb000',
                  color: '#0f0f1e',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#ffc000')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#ffb000')}
              >
                🔄 Retry
              </button>
            )}

            <button
              onClick={onSkip}
              style={{
                padding: '8px 12px',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#ff6666')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#ff4444')}
            >
              ⊘ Skip
            </button>

            <button
              onClick={onToggleRecording}
              style={{
                padding: '8px 12px',
                backgroundColor: isRecording ? '#ff4444' : '#00d4ff',
                color: isRecording ? 'white' : '#0f0f1e',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gridColumn: isRecording ? '1 / -1' : 'auto',
              }}
              onMouseOver={(e) => (
                e.target.style.opacity = '0.8'
              )}
              onMouseOut={(e) => (
                e.target.style.opacity = '1'
              )}
            >
              {isRecording ? '⊘ Stop Recording' : '🎤 Start Recording'}
            </button>

            <button
              onClick={onNextQuestion}
              style={{
                padding: '8px 12px',
                backgroundColor: '#00ff88',
                color: '#0f0f1e',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#00ffaa')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#00ff88')}
            >
              ▶ Next Q
            </button>

            <button
              onClick={onManualInput}
              style={{
                padding: '8px 12px',
                backgroundColor: '#9966ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#aa77ff')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#9966ff')}
            >
              ✏️ Manual Input
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default InterviewOverlay;
