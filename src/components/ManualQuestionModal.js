import React, { useState } from 'react';

/**
 * ManualQuestionModal - Fallback UI when speech-to-text fails
 */

function ManualQuestionModal({ isOpen, onSubmit, onCancel, placeholder = 'Enter the question...' }) {
  const [question, setQuestion] = useState('');

  const handleSubmit = () => {
    if (question.trim()) {
      onSubmit(question.trim());
      setQuestion('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#0f0f1e',
          border: '2px solid #00d4ff',
          borderRadius: '8px',
          padding: '20px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#00d4ff', margin: '0 0 8px 0', fontSize: '16px' }}>
            ✏️ Enter Question
          </h3>
          <p style={{ color: '#999', margin: '0', fontSize: '12px' }}>
            Speech-to-text failed. Please type the question manually.
          </p>
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            backgroundColor: '#1a1a2e',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '4px',
            color: '#ccc',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
            fontSize: '13px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          autoFocus
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={handleSubmit}
            disabled={!question.trim()}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: question.trim() ? '#00d4ff' : '#333',
              color: question.trim() ? '#0f0f1e' : '#666',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: question.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) =>
              question.trim() && (e.target.style.backgroundColor = '#00ffee')
            }
            onMouseOut={(e) =>
              question.trim() && (e.target.style.backgroundColor = '#00d4ff')
            }
          >
            ✅ Submit
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#333',
              color: '#999',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#444')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#333')}
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualQuestionModal;
