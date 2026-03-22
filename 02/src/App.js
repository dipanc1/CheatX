import './App.css';
import { useEffect, useRef, useState } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');

  const recognition = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error("Speech recognition not supported in this browser.");
      return;
    }

    recognition.current = new window.webkitSpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'en-US';
    recognition.current.maxAlternatives = 1;

    recognition.current.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          setFinalTranscript(prev => prev + ' ' + event.results[i][0].transcript);
        } else {
          setInterimTranscript(event.results[i][0].transcript);
        }
      }
    };

    recognition.current.onerror = (event) => {
      console.error("Speech recognition error detected: " + event.error);
    };

    recognition.current.onend = () => {
      console.log("Speech recognition service disconnected");
    };
  }, []);

  const startRecording = () => {
    if (recognition.current) {
      setIsRecording(true);
      setInterimTranscript('');
      setFinalTranscript('');
      recognition.current.start();
    }
  };

  const stopRecording = () => {
    if (recognition.current) {
      setIsRecording(false);
      recognition.current.stop();

      navigator.clipboard.writeText(finalTranscript).then(function () {
      }, function (err) {
        console.error('Async: Could not copy text: ', err);
      });
      
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        Sooraj 2.0 Monga
      </header>
      <div id="results">
        <p>{interimTranscript}</p>
        <p>{finalTranscript}</p>
      </div>
      <div>
        <button id="start_button" onClick={startRecording} disabled={isRecording}>Start</button>
        <button id="stop_button" onClick={stopRecording} disabled={!isRecording}>Stop</button>
      </div>
    </div>
  );
}

export default App;