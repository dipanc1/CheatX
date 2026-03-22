import React, { useState, useEffect } from 'react';

function SessionHistory({ sessionId, isOpen, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' or 'analytics'

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      loadAnalytics();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const deleteSession = async (id) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await fetch(`http://localhost:5000/api/sessions/${id}`, { method: 'DELETE' });
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '350px',
      background: '#1a1a2e',
      borderLeft: '2px solid #00d4ff',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-5px 0 20px rgba(0, 212, 255, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ color: '#00d4ff', margin: 0, fontSize: '18px' }}>📋 History & Analytics</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#00d4ff',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
        background: 'rgba(0, 212, 255, 0.05)'
      }}>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === 'sessions' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            color: '#00d4ff',
            cursor: 'pointer',
            borderBottom: activeTab === 'sessions' ? '2px solid #00d4ff' : 'none'
          }}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === 'analytics' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            color: '#00d4ff',
            cursor: 'pointer',
            borderBottom: activeTab === 'analytics' ? '2px solid #00d4ff' : 'none'
          }}
        >
          Analytics
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {loading && <p style={{ color: '#888', textAlign: 'center' }}>Loading...</p>}

        {activeTab === 'sessions' && (
          <div>
            {sessions.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center' }}>No sessions yet</p>
            ) : (
              sessions.map(session => (
                <div
                  key={session.id}
                  style={{
                    padding: '12px',
                    marginBottom: '10px',
                    background: 'rgba(0, 212, 255, 0.05)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '6px',
                    color: '#ccc'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00d4ff', marginBottom: '4px' }}>
                    {session.company || 'Unknown Company'} {session.role && `- ${session.role}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    📝 {session.total_questions} questions
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    {formatDate(session.created_at)}
                  </div>
                  <button
                    onClick={() => deleteSession(session.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      background: '#ff4444',
                      border: 'none',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#ff6666'}
                    onMouseOut={(e) => e.target.style.background = '#ff4444'}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div>
            <div style={{
              padding: '12px',
              marginBottom: '15px',
              background: 'rgba(0, 212, 255, 0.05)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '12px', color: '#888' }}>Total Sessions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff' }}>
                {analytics.totalSessions}
              </div>
            </div>

            <div style={{
              padding: '12px',
              marginBottom: '15px',
              background: 'rgba(0, 212, 255, 0.05)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '12px', color: '#888' }}>Total Questions</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00d4ff' }}>
                {analytics.totalQuestions}
              </div>
            </div>

            <div style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#00d4ff',
              marginBottom: '10px'
            }}>
              Questions by Type
            </div>
            {Object.entries(analytics.questionsByCategory || {}).map(([category, count]) => (
              <div
                key={category}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: 'rgba(0, 212, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ textTransform: 'uppercase', fontSize: '12px', color: '#ccc' }}>
                  {category}
                </span>
                <span style={{ fontWeight: 'bold', color: '#00d4ff' }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionHistory;
