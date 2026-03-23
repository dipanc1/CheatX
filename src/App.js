import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ContextUpload from './components/ContextUpload';
import SessionHistory from './components/SessionHistory';
import InterviewOverlay from './components/InterviewOverlay';
import AudioService from './services/audioService';
import { API_BASE_URL } from './config';

function App() {
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState('');
  const [interviewCategory, setInterviewCategory] = useState(null);
  const [interviewHints, setInterviewHints] = useState(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  const [historyCount, setHistoryCount] = useState(0);
  const [interviewQuestionCount, setInterviewQuestionCount] = useState(0); // Track questions answered in current interview
  const [useContextHistory, setUseContextHistory] = useState(true); // Toggle for including previous Q&A context
  const audioServiceRef = useRef(null);
  const interviewSessionIdRef = useRef(null);

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+Q to quit interview mode
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyQ') {
        e.preventDefault();
        setInterviewMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize audio service for interview mode
  useEffect(() => {
    if (interviewMode && !audioServiceRef.current) {
      setInterviewQuestionCount(0); // Reset counter when entering interview mode
      audioServiceRef.current = new AudioService();
      
      // Handle transcript updates
      audioServiceRef.current.onTranscriptUpdate = (data) => {
        setInterviewQuestion(data.transcript);
      };

      // Handle when speech ends (silence detected)
      audioServiceRef.current.onSpeechEnd = async (data) => {
        const question = data.transcript;
        
        if (question.trim()) {
          // Start classification
          await classifyQuestionForInterview(question);
        }
      };

      // Handle errors
      audioServiceRef.current.onError = (error) => {
        console.error('Audio error:', error);
        setInterviewError('Audio Error: ' + (error.message || error.error));
      };

      // Request microphone permission and auto-start
      audioServiceRef.current.requestMicrophonePermission().then((granted) => {
        if (granted) {
          audioServiceRef.current.startListening();
          setIsRecording(true);
        }
      });
    }

    return () => {
      if (interviewMode === false && audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
    };
  }, [interviewMode]);

  // Classify question for interview
  const classifyQuestionForInterview = async (question) => {
    try {
      setInterviewLoading(true);
      setInterviewError('');
      
      const response = await fetch(`${API_BASE_URL}/api/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      
      if (data.error || !data.category) {
        throw new Error(data.error || 'Classification failed');
      }
      
      setInterviewCategory(data.category);
      // Increment question counter when classified
      setInterviewQuestionCount(prev => prev + 1);
      // Auto-generate hints immediately after classification
      await generateHintsForInterview(question, data.category);
    } catch (error) {
      console.error('Classification error:', error);
      setInterviewError('Failed: ' + error.message);
    } finally {
      setInterviewLoading(false);
    }
  };

  // Generate hints for interview
  const generateHintsForInterview = async (question, cat) => {
    try {
      setInterviewLoading(true);
      setInterviewError('');

      const hintData = {
        question,
        category: cat,
        resume: resume || '',
        jobDesc: jobDesc || '',
        sessionId: interviewSessionIdRef.current || null,
        company: company || '',
        role: role || '',
        includeContext: useContextHistory,
      };

      const response = await window.electron.getHints(hintData);

      if (response.error) {
        setInterviewError(response.error);
      } else {
        // Store session ID
        if (response.sessionId) {
          interviewSessionIdRef.current = response.sessionId;
        }
        if (typeof response.historyCount === 'number') {
          setHistoryCount(response.historyCount);
        }

        // Clean response
        let cleanResponse = response.response;
        if (cleanResponse) {
          cleanResponse = cleanResponse
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/###\s+/g, '')
            .replace(/##\s+/g, '')
            .replace(/#\s+/g, '');
        }

        setInterviewHints(cleanResponse);
      }
    } catch (error) {
      console.error('Hint generation error:', error);
      setInterviewError('Failed to generate hints');
    } finally {
      setInterviewLoading(false);
    }
  };

  // Handle interview mode actions
  const handleToggleRecording = () => {
    if (!audioServiceRef.current) return;

    if (isRecording) {
      audioServiceRef.current.stopListening();
      setIsRecording(false);
    } else {
      audioServiceRef.current.startListening();
      setIsRecording(true);
    }
  };

  const handleNextQuestion = () => {
    setInterviewQuestion('');
    setInterviewCategory(null);
    setInterviewHints(null);
    setInterviewError('');

    // Always start listening immediately for the next question
    if (audioServiceRef.current) {
      audioServiceRef.current.startListening();
      setIsRecording(true);
    }
  };

  const handleRetryHints = async () => {
    if (interviewQuestion && interviewCategory) {
      await generateHintsForInterview(interviewQuestion, interviewCategory);
    }
  };

  const handleEndInterview = () => {
    if (audioServiceRef.current) {
      audioServiceRef.current.stopListening();
      audioServiceRef.current.cleanup();
      audioServiceRef.current = null;
    }
    // Reset entire app
    setInterviewMode(false);
    setIsRecording(false);
    setInterviewQuestion('');
    setInterviewCategory(null);
    setInterviewHints(null);
    setInterviewError('');
    setInterviewQuestionCount(0);
    setResume('');
    setJobDesc('');
    setCompany('');
    setRole('');
    setShowHistory(false);
    interviewSessionIdRef.current = null;
  };

  // Check if all interview requirements are met
  const isReadyForInterview = () => {
    return company.trim() && role.trim() && resume.trim() && jobDesc.trim();
  };

  const handleNewSession = () => {
    interviewSessionIdRef.current = null;
    setHistoryCount(0);
    setInterviewQuestion('');
    setInterviewCategory(null);
    setInterviewHints(null);
    setInterviewError('');
    setInterviewQuestionCount(0);
  };

  return (
    <div className="app-container">
      <div className="main-panel">
        <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <h1 style={{ margin: 0 }}>CheatX</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: '#1e90ff',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1e40ff'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#1e90ff'}
          >
            📋 {showHistory ? 'Hide' : 'Show'} History
          </button>
          {historyCount > 0 && (
            <button
              onClick={handleNewSession}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                backgroundColor: '#ff9500',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#ffb000'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#ff9500'}
              title={`${historyCount} ${historyCount === 1 ? 'question' : 'questions'} in session`}
            >
              ✓ End Session
            </button>
          )}
        </div>

        {/* Company & Role Info */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '12px',
          backgroundColor: 'rgba(0, 212, 255, 0.05)',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          <input
            type="text"
            placeholder="Company (e.g., Google)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#1a1a2e',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              color: '#ccc',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '13px'
            }}
          />
          <input
            type="text"
            placeholder="Role (e.g., SDE)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#1a1a2e',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              color: '#ccc',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '13px'
            }}
          />
        </div>

        <ContextUpload
          resume={resume}
          setResume={setResume}
          jobDesc={jobDesc}
          setJobDesc={setJobDesc}
        />

        {/* Auto-enter interview mode when ready */}
        {isReadyForInterview() && !interviewMode && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            border: '2px solid #00d4ff',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#00d4ff'
          }}>
            <p style={{ marginTop: 0, fontSize: '14px' }}>
              ✅ All set! Ready to start your interview.
            </p>
            <button
              onClick={() => setInterviewMode(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#00d4ff',
                color: '#0f0f1e',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.85'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              🎤 Start Interview
            </button>
          </div>
        )}
      </div>

      <SessionHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* Interview Mode Overlay */}
      <InterviewOverlay
        isActive={interviewMode}
        isRecording={isRecording}
        currentQuestion={interviewQuestion}
        currentCategory={interviewCategory}
        currentHints={interviewHints}
        loading={interviewLoading}
        error={interviewError}
        sessionInfo={{
          questionCount: interviewQuestionCount,
          sessionId: interviewSessionIdRef.current
        }}
        onNextQuestion={handleNextQuestion}
        onToggleRecording={handleToggleRecording}
        onEndInterview={handleEndInterview}
        useContextHistory={useContextHistory}
        onToggleContextHistory={() => setUseContextHistory(!useContextHistory)}
      />

    </div>
  );
}

export default App;
