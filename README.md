# Interview Copilot 🚀

A real-time interview assistant that helps you ace Google-level interviews. Get instant hints during coding, LLD, HLD, and behavioral rounds.

## Features

✅ **Real-time Hint Generation** - Paste question → Get answerable hints in seconds
✅ **All Interview Types** - Coding, LLD, HLD, Behavioral
✅ **Question Classification** - Auto-detects problem type
✅ **Copy-to-Clipboard** - Hints ready to speak
✅ **Stealth Mode** - Hide panel during screen share
✅ **Offline Capable** - SQLite local storage
✅ **Interview History** - Track your practice

## Tech Stack

- **Frontend:** Electron + React
- **Backend:** Node.js + Express
- **LLM:** Google Gemini API
- **Database:** SQLite
- **Real-time:** WebSocket ready

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- Gemini API Key (free from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your Gemini API key
# GEMINI_API_KEY=your_key_here
```

## Development

### Run in Dev Mode

```bash
npm start
```

This will:
1. Start React dev server on `http://localhost:3000`
2. Start backend on `http://localhost:5000`
3. Launch Electron app

### Build for Production

```bash
npm run build
```

## Usage

1. **Launch the app**
   ```bash
   npm start
   ```

2. **Paste your interview question** in the main input area

3. **Select question type** (or let it auto-detect)

4. **Click "Get Hints"** and wait 2-3 seconds for response

5. **Copy hints** to clipboard and speak during interview

6. **Enable Stealth Mode** to hide the panel if screen sharing

## Backend API

### Generate Hints
```bash
POST /api/hints
Content-Type: application/json

{
  "question": "Design a Twitter feed",
  "category": "hld" // or "auto"
}
```

Response:
```json
{
  "classification": "hld",
  "response": "Full answer...",
  "approach": "Architecture approach...",
  "keyPoints": "Key design points...",
  "edgeCases": "Edge cases...",
  "codeSnippet": "Example code..."
}
```

### Create Session
```bash
POST /api/session
{ "roundType": "coding", "title": "Google Round 1" }
```

### Get History
```bash
GET /api/session/:sessionId/history
```

## Project Structure

```
.
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Security preload script
├── src/
│   ├── App.js               # Main React component
│   ├── components/          # React components
│   ├── services/            # Gemini API integration
│   ├── utils/               # Helpers (classifier, etc)
│   └── db/                  # SQLite database
├── server.js                # Express backend
├── package.json
└── README.md
```

## Environment Variables

```
GEMINI_API_KEY=your_key_here
BACKEND_PORT=5000
NODE_ENV=development
```

## Tips for Google Success

1. **Practice with real questions** from Glassdoor, LeetCode, etc.
2. **Use hints as guidance, not answers** - think first
3. **Copy structured responses** when you're stuck
4. **Track patterns** - save common question types
5. **Rehearse delivery** - hints are templates, make them yours
6. **Multi-monitor setup** - keep hints on secondary screen

## Troubleshooting

### Backend not connecting
```bash
# Check if backend is running
curl http://localhost:5000/health

# If not, manually start it:
npm run backend
```

### Gemini API errors
- Verify API key in `.env`
- Check free tier quota limits
- Ensure internet connection

### Stealth mode not working
- Try toggling it off/on
- Use Alt+Tab to switch between windows
- Consider secondary monitor setup

## Roadmap

- [ ] Audio transcription (Whisper API)
- [ ] Real-time interview evaluation
- [ ] Question bank with difficulty ratings
- [ ] Mock interview mode (full round simulation)
- [ ] Interview performance analytics
- [ ] Multi-language support
- [ ] Cloud sync for history

## Contributing

Suggestions welcome! This is your personal interview assistant - build what you need.

## License

MIT - Use freely for interview prep

---

**Good luck cracking those interviews! 🎯**
