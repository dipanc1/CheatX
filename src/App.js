import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import QuestionInput from './components/QuestionInput';
import HintsPanel from './components/HintsPanel';
import ContextUpload from './components/ContextUpload';
import SessionHistory from './components/SessionHistory';
import InterviewOverlay from './components/InterviewOverlay';
import ManualQuestionModal from './components/ManualQuestionModal';
import CategorySelector from './components/CategorySelector';
import AudioService from './services/audioService';

function App() {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('auto');
  const [hints, setHints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stealthMode, setStealthMode] = useState(false);
  const [resume, setResume] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [interviewMode, setInterviewMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interviewQuestion, setInterviewQuestion] = useState('');
  const [interviewCategory, setInterviewCategory] = useState(null);
  const [interviewHints, setInterviewHints] = useState(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const audioServiceRef = useRef(null);
  const interviewSessionIdRef = useRef(null);

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

  // Initialize audio service for interview mode
  useEffect(() => {
    if (interviewMode && !audioServiceRef.current) {
      audioServiceRef.current = new AudioService();
      
      // Handle transcript updates
      audioServiceRef.current.onTranscriptUpdate = (data) => {
        setInterviewQuestion(data.transcript);
      };

      // Handle when speech ends (silence detected)
      audioServiceRef.current.onSpeechEnd = async (data) => {
        console.log('Speech ended:', data.transcript);
        const question = data.transcript;
        
        if (question.trim()) {
          // Start classification
          await classifyQuestionForInterview(question);
        }
      };

      // Handle errors
      audioServiceRef.current.onError = (error) => {
        console.error('Audio error:', error);
        setInterviewError(error.message);
        
        // Fallback to manual input
        if (error.error === 'not_available' || error.error === 'audio-capture') {
          setShowManualInput(true);
          setIsRecording(false);
        }
      };

      // Request microphone permission
      audioServiceRef.current.requestMicrophonePermission();

      // Auto-start listening
      audioServiceRef.current.startListening();
      setIsRecording(true);
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
      const response = await fetch('http://localhost:5000/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        setShowCategorySelector(true);
        setInterviewError('Classification failed, please select manually');
      } else {
        setInterviewCategory(data.category);
        // Auto-generate hints
        await generateHintsForInterview(question, data.category);
      }
    } catch (error) {
      console.error('Classification error:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError) {
        setInterviewError('Backend not running. Make sure npm run dev is active on port 5000');
      } else {
        setInterviewError(error.message || 'Failed to classify question');
      }
      
      // Fall back to manual category selector
      setShowCategorySelector(true);
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
      };

      const response = await window.electron.getHints(hintData);

      if (response.error) {
        setInterviewError(response.error);
      } else {
        // Store session ID
        if (response.sessionId) {
          interviewSessionIdRef.current = response.sessionId;
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
    if (isRecording && audioServiceRef.current) {
      audioServiceRef.current.stopListening();
      setIsRecording(false);
    } else if (!isRecording && audioServiceRef.current) {
      audioServiceRef.current.startListening();
      setIsRecording(true);
    }
  };

  const handleNextQuestion = () => {
    setInterviewQuestion('');
    setInterviewCategory(null);
    setInterviewHints(null);
    setInterviewError('');

    if (isRecording && audioServiceRef.current) {
      audioServiceRef.current.startListening();
    }
  };

  const handleRetryHints = async () => {
    if (interviewQuestion && interviewCategory) {
      await generateHintsForInterview(interviewQuestion, interviewCategory);
    }
  };

  const handleSkipQuestion = () => {
    handleNextQuestion();
  };

  const handleManualQuestion = (q) => {
    setShowManualInput(false);
    setInterviewQuestion(q);
    classifyQuestionForInterview(q);
  };

  const handleCategorySelect = async (cat) => {
    setShowCategorySelector(false);
    setInterviewCategory(cat);
    await generateHintsForInterview(interviewQuestion, cat);
  };

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
        sessionId: sessionId || null,
        company: company || '',
        role: role || '',
      };
      
      const response = await window.electron.getHints(hintData);

      if (response.error) {
        setError(response.error);
      } else {
        // Store session ID for subsequent questions
        if (response.sessionId) {
          setSessionId(response.sessionId);
          setHistoryCount(response.historyCount || 1);
        }
        
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

  const handleNewSession = () => {
    setSessionId(null);
    setHistoryCount(0);
    setQuestion('');
    setHints(null);
    setError('');
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
          <button
            onClick={() => setInterviewMode(!interviewMode)}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: interviewMode ? '#ff4488' : '#00d4ff',
              border: 'none',
              borderRadius: '4px',
              color: interviewMode ? 'white' : '#0f0f1e',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.8'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            {interviewMode ? '🎙️ Exit Interview' : '🎤 Start Interview Mode'}
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

      <SessionHistory
        sessionId={sessionId}
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
        sessionInfo={
          interviewSessionIdRef.current
            ? { questionCount: historyCount + 1 }
            : null
        }
        onRetry={handleRetryHints}
        onSkip={handleSkipQuestion}
        onNextQuestion={handleNextQuestion}
        onManualInput={() => setShowManualInput(true)}
        onToggleRecording={handleToggleRecording}
      />

      {/* Manual Question Input Modal */}
      <ManualQuestionModal
        isOpen={showManualInput}
        onSubmit={handleManualQuestion}
        onCancel={() => setShowManualInput(false)}
        placeholder="Enter the question the interviewer asked..."
      />

      {/* Category Selector Modal */}
      <CategorySelector
        isOpen={showCategorySelector}
        question={interviewQuestion}
        onSelect={handleCategorySelect}
        onCancel={() => setShowCategorySelector(false)}
      />
    </div>
  );
}

export default App;
