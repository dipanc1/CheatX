/**
 * Audio Service - Handles microphone capture and speech-to-text
 * Features: VAD (Voice Activity Detection), Web Speech API, fallback modes
 */

class AudioService {
  constructor() {
    this.recognition = null;
    this.mediaStream = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.silenceTimer = null;
    this.silenceThreshold = 3000; // 3 seconds of silence = end of question
    this.currentTranscript = '';
    this.finalTranscript = '';
    
    // Callbacks
    this.onTranscriptUpdate = null; // Real-time transcription
    this.onSpeechEnd = null; // When speech ends (silence detected)
    this.onError = null; // Error handler
    this.onListeningStart = null; // Listening started
    this.onListeningEnd = null; // Listening ended

    this.initSpeechRecognition();
  }

  /**
   * Initialize Web Speech API with fallback support
   */
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('⚠️ Web Speech API not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognition();
    
    // Configuration
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.language = 'en-US';

    // Handle results
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onListeningStart) this.onListeningStart();
    };

    this.recognition.onresult = (event) => {
      this.currentTranscript = '';
      
      // Collect interim results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
        } else {
          this.currentTranscript += transcript;
        }
      }

      // Combine final + interim for display
      const fullTranscript = (this.finalTranscript + this.currentTranscript).trim();
      
      if (fullTranscript) {
        this.isSpeaking = true;
        // Reset silence timer when speech detected
        this.resetSilenceTimer();
        
        // Callback with real-time transcript
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate({
            transcript: fullTranscript,
            isFinal: false,
            confidence: event.results[event.results.length - 1][0].confidence,
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      if (this.onError) {
        this.onError({
          error: event.error,
          message: this.getErrorMessage(event.error),
        });
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onListeningEnd) this.onListeningEnd();
    };

    return true;
  }

  /**
   * Start listening for speech
   */
  startListening() {
    if (!this.recognition) {
      if (this.onError) {
        this.onError({
          error: 'not_available',
          message: 'Speech recognition not available in your browser',
          fallback: 'manual_input',
        });
      }
      return false;
    }

    try {
      this.finalTranscript = '';
      this.currentTranscript = '';
      this.isSpeaking = false;
      
      // Reset silence timer
      this.resetSilenceTimer();
      
      // Start recognition
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      if (this.onError) {
        this.onError({
          error: 'start_failed',
          message: 'Failed to start listening',
        });
      }
      return false;
    }
  }

  /**
   * Stop listening for speech
   */
  stopListening() {
    if (!this.recognition) return false;
    
    try {
      this.recognition.stop();
      this.isListening = false;
      this.clearSilenceTimer();
      return true;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return false;
    }
  }

  /**
   * Get current transcript (with optional force-complete)
   */
  getTranscript(finalize = false) {
    const transcript = (this.finalTranscript + this.currentTranscript).trim();
    
    if (finalize) {
      this.finalTranscript = '';
      this.currentTranscript = '';
    }
    
    return transcript;
  }

  /**
   * Reset silence timer (detects when user stops speaking)
   */
  resetSilenceTimer() {
    this.clearSilenceTimer();
    
    if (!this.recognition) return;
    
    this.silenceTimer = setTimeout(() => {
      if (this.isSpeaking && this.finalTranscript.trim()) {
        console.log('🔇 Silence detected - speech ended');
        this.isSpeaking = false;
        
        const finalText = (this.finalTranscript + this.currentTranscript).trim();
        
        if (this.onSpeechEnd) {
          this.onSpeechEnd({
            transcript: finalText,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }, this.silenceThreshold);
  }

  /**
   * Clear silence timer
   */
  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'Microphone access denied. Using manual entry.',
      'network': 'Network error. Please check your connection.',
      'aborted': 'Speech recognition was aborted.',
      'service-not-allowed': 'Speech recognition service not allowed.',
      'bad-grammar': 'Grammar error in speech recognition.',
      'not-allowed': 'Microphone permission required.',
    };
    
    return errorMessages[error] || `Speech recognition error: ${error}`;
  }

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      return true;
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      if (this.onError) {
        this.onError({
          error: 'audio-capture',
          message: 'Microphone access denied. Please enable in browser settings.',
        });
      }
      return false;
    }
  }

  /**
   * Check browser support
   */
  static isSupported() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  }

  /**
   * Release audio resources
   */
  cleanup() {
    this.stopListening();
    this.clearSilenceTimer();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
  }
}

export default AudioService;
