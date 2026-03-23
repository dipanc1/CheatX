/**
 * Audio Service - Handles microphone capture and speech-to-text
 * Modes: 
 * 1. Web Speech API (Browser native)
 * 2. MediaRecorder + Backend Whisper API (Electron/Fallback)
 */

class AudioService {
  constructor() {
    this.recognition = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    
    // Audio Context (VAD for MediaRecorder mode)
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.vadLoopId = null;
    
    this.isListening = false;
    this.isSpeaking = false;
    this.silenceTimer = null;
    this.silenceThreshold = 2500; // 2.5 seconds of silence = end of speech
    
    this.currentTranscript = '';
    this.finalTranscript = '';
    this.useFallbackStt = false; // true = use MediaRecorder to our backend
    
    // Callbacks
    this.onTranscriptUpdate = null;
    this.onSpeechEnd = null;
    this.onError = null;
    this.onListeningStart = null;
    this.onListeningEnd = null;

    this.checkEnvironment();
  }

  checkEnvironment() {
    const isElectron = !!window.electron;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isElectron || !SpeechRecognition) {
      console.warn('⚠️ Web Speech API unavailable or in Electron. Using MediaRecorder + Groq Whisper Fallback.');
      this.useFallbackStt = true;
    } else {
      this.initSpeechRecognition(SpeechRecognition);
    }
  }

  /**
   * Initialize Web Speech API (Native browser support)
   */
  initSpeechRecognition(SpeechRecognition) {
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.language = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onListeningStart) this.onListeningStart();
    };

    this.recognition.onresult = (event) => {
      this.currentTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
        } else {
          this.currentTranscript += transcript;
        }
      }

      const fullTranscript = (this.finalTranscript + this.currentTranscript).trim();
      
      if (fullTranscript) {
        this.isSpeaking = true;
        this.resetSilenceTimer();
        
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate({ transcript: fullTranscript, isFinal: false });
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      
      // If native fails with network/audio auth, try to fallback automatically
      if (event.error === 'network' || event.error === 'audio-capture') {
        console.log('Switching to MediaRecorder fallback due to native API failure');
        this.useFallbackStt = true;
        this.startListening(); // Re-trigger with fallback
      } else if (this.onError) {
        this.onError({ error: event.error, message: this.getErrorMessage(event.error) });
      }
    };

    this.recognition.onend = () => {
      // If we didn't deliberately stop, it may have crashed.
      if (this.isListening && !this.useFallbackStt) {
        this.recognition.start(); // auto-restart
      } else {
        this.isListening = false;
        if (this.onListeningEnd) this.onListeningEnd();
      }
    };
  }

  /**
   * Start listening for speech (Handles both Native and Fallback modes)
   */
  async startListening() {
    if (this.useFallbackStt) {
      return this.startFallbackRecording();
    }

    if (!this.recognition) return false;

    try {
      this.finalTranscript = '';
      this.currentTranscript = '';
      this.isSpeaking = false;
      
      this.resetSilenceTimer();
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      if (this.onError) {
        this.onError({ error: 'start_failed', message: 'Failed to start listening' });
      }
      return false;
    }
  }

  // --- FALLBACK MODE (MEDIA RECORDER + BACKEND WHISPER) ---

  async startFallbackRecording() {
    try {
      if (!this.mediaStream) {
        await this.requestMicrophonePermission();
      }

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await this.sendAudioToBackend(audioBlob);
        }
        
        // If still listening overall, restart recorder immediately for the next question
        if (this.isListening) {
          this.audioChunks = [];
          this.mediaRecorder.start();
        }
      };

      this.setupVAD(); // Setup Voice Activity Detection
      
      this.mediaRecorder.start();
      this.isListening = true;
      if (this.onListeningStart) this.onListeningStart();
      
      return true;
    } catch (error) {
      console.error('Error starting fallback recording:', error);
      if (this.onError) this.onError({ error: 'fallback_error', message: 'Failed to access mic for recording' });
      return false;
    }
  }

  setupVAD() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Disconnect previously connected microphone
    if (this.microphone) {
      this.microphone.disconnect();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.minDecibels = -70; // Adjust sensitivity
    this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;

    this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.microphone.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let silenceStart = null;
    let speakingDetected = false;

    const checkVolume = () => {
      if (!this.isListening) return;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      let averageVolume = sum / bufferLength;

      const talkingThreshold = 10; // Volume needed to consider it "speech"

      if (averageVolume > talkingThreshold) {
        if (!speakingDetected) {
          console.log('🎤 Speech detected (Fallback VAD)');
          speakingDetected = true;
          this.isSpeaking = true;
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate({ transcript: "..." /* Whisper processes at end */, isFinal: false });
          }
        }
        silenceStart = null; // Reset silence timer
      } else {
        if (speakingDetected && !silenceStart) {
          silenceStart = Date.now();
        }

        // If silence duration > threshold, end chunk
        if (speakingDetected && silenceStart && (Date.now() - silenceStart > this.silenceThreshold)) {
          console.log('🔇 Silence detected (Fallback VAD)');
          speakingDetected = false;
          this.isSpeaking = false;
          silenceStart = null;
          
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop(); // This triggers onstop, sends data, and restarts automatically
          }
        }
      }

      this.vadLoopId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }

  async sendAudioToBackend(audioBlob) {
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate({ transcript: "Processing audio...", isFinal: false });
    }

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        
        try {
          const response = await fetch('http://localhost:5000/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64Audio }),
          });
          
          const data = await response.json();
          if (data.transcript && data.transcript.trim()) {
            console.log('📝 Transcribed via Fallback:', data.transcript);
            if (this.onSpeechEnd) {
              this.onSpeechEnd({
                transcript: data.transcript,
                timestamp: new Date().toISOString()
              });
            }
          } else {
            console.log('Discarding empty audio chunk');
            if (this.onTranscriptUpdate) {
               this.onTranscriptUpdate({ transcript: "", isFinal: false });
            }
          }
        } catch (err) {
          console.error("Transcription API error:", err);
        }
      };
    } catch (err) {
      console.error('Error sending audio to backend:', err);
    }
  }

  // --- END FALLBACK MODE ---

  stopListening() {
    this.isListening = false;
    
    if (this.useFallbackStt) {
      if (this.vadLoopId) cancelAnimationFrame(this.vadLoopId);
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      return true;
    }

    if (!this.recognition) return false;
    
    try {
      this.recognition.stop();
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
