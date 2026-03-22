import React, { useState } from 'react';

/**
 * CategorySelector - Fallback UI when auto-classification fails
 */

function CategorySelector({ isOpen, onSelect, onCancel, question = '' }) {
  const [selected, setSelected] = useState(null);

  const categories = [
    { id: 'coding', label: 'Coding', color: '#00d4ff', icon: '💻' },
    { id: 'lld', label: 'Low-Level Design', color: '#00ff88', icon: '🏗️' },
    { id: 'hld', label: 'High-Level Design', color: '#ff9500', icon: '🌐' },
    { id: 'behavioral', label: 'Behavioral', color: '#ff4488', icon: '🤝' },
  ];

  const handleSelect = () => {
    if (selected) {
      onSelect(selected);
      setSelected(null);
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
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ color: '#00d4ff', margin: '0 0 8px 0', fontSize: '16px' }}>
            🏷️ Select Question Type
          </h3>
          <p style={{ color: '#999', margin: '0', fontSize: '12px' }}>
            Auto-classification failed. Please select the question type manually.
          </p>
        </div>

        {question && (
          <div
            style={{
              backgroundColor: 'rgba(0, 212, 255, 0.05)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '16px',
              color: '#ccc',
              fontSize: '12px',
              maxHeight: '60px',
              overflow: 'auto',
            }}
          >
            <strong>Question:</strong> {question}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              style={{
                padding: '16px 12px',
                backgroundColor: selected === cat.id ? cat.color : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${cat.color}`,
                borderRadius: '6px',
                color: selected === cat.id ? '#0f0f1e' : cat.color,
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = `${cat.color}20`;
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor =
                  selected === cat.id ? cat.color : 'rgba(255, 255, 255, 0.05)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: '20px' }}>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSelect}
            disabled={!selected}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: selected ? '#00d4ff' : '#333',
              color: selected ? '#0f0f1e' : '#666',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) =>
              selected && (e.target.style.backgroundColor = '#00ffee')
            }
            onMouseOut={(e) =>
              selected && (e.target.style.backgroundColor = '#00d4ff')
            }
          >
            ✅ Confirm
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

export default CategorySelector;
