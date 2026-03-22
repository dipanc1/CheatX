const express = require('express');
const cors = require('cors');
require('dotenv').config();

const GeminiService = require('./src/services/geminiService');
const Database = require('./src/db/database');
const QuestionClassifier = require('./src/utils/questionClassifier');

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const geminiService = new GeminiService(process.env.GEMINI_API_KEY);
const db = new Database();

// Routes
app.post('/api/hints', async (req, res) => {
  try {
    const { question, category } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Classify question if needed
    let classifiedCategory = category;
    if (!category || category === 'auto') {
      classifiedCategory = QuestionClassifier.classify(question);
    }

    // Generate hints using Gemini
    const hints = await geminiService.generateHints(question, classifiedCategory);

    // Parse hints into structured format
    const parsedHints = parseHints(hints.response, classifiedCategory);

    return res.json({
      classification: classifiedCategory,
      response: hints.response,
      ...parsedHints,
    });
  } catch (error) {
    console.error('Error generating hints:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/session', async (req, res) => {
  try {
    const { roundType, title } = req.body;
    const sessionId = await db.createSession(roundType, title);
    return res.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await db.getSessionHistory(sessionId);
    return res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Helper function to parse hints
function parseHints(response, category) {
  const lines = response.split('\n');
  const result = {
    approach: '',
    keyPoints: '',
    edgeCases: '',
    codeSnippet: '',
  };

  let currentSection = '';
  let buffer = '';

  for (const line of lines) {
    if (
      line.includes('Approach') ||
      line.includes('approach') ||
      line.includes('Strategy')
    ) {
      currentSection = 'approach';
    } else if (
      line.includes('Key Point') ||
      line.includes('key point') ||
      line.includes('Important')
    ) {
      currentSection = 'keyPoints';
    } else if (
      line.includes('Edge Case') ||
      line.includes('edge case') ||
      line.includes('Corner')
    ) {
      currentSection = 'edgeCases';
    } else if (line.includes('Code') || line.includes('code')) {
      currentSection = 'codeSnippet';
    } else if (currentSection && line.trim()) {
      if (currentSection === 'codeSnippet' && line.includes('```')) {
        buffer += line + '\n';
      } else if (currentSection === 'codeSnippet') {
        buffer += line + '\n';
      } else {
        buffer += line + ' ';
      }
    } else if (!line.trim() && buffer) {
      result[currentSection] = buffer.trim();
      buffer = '';
      currentSection = '';
    }
  }

  if (buffer) {
    result[currentSection] = buffer.trim();
  }

  return result;
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.close();
  process.exit(0);
});
