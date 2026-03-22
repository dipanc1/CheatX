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
app.use(express.json({ limit: '50mb' }));

// Initialize services
const geminiService = new GeminiService(process.env.GROQ_API_KEY);
const db = new Database();

// Routes
app.post('/api/hints', async (req, res) => {
  try {
    const { question, category, resume = '', jobDesc = '' } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question must be a non-empty string' });
    }

    const questionStr = question.trim();
    if (!questionStr) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    // Classify question if needed
    let classifiedCategory = category;
    if (!category || category === 'auto') {
      classifiedCategory = QuestionClassifier.classify(questionStr);
    }

    // Generate hints using Gemini with context
    const hints = await geminiService.generateHints(questionStr, classifiedCategory, resume, jobDesc);

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
  const result = {
    approach: '',
    keyPoints: '',
    edgeCases: '',
    codeSnippet: '',
  };

  // Extract code snippet (between ``` markers or after "Code" section)
  const codeMatch = response.match(/```[a-z]*\n([\s\S]*?)```/g);
  if (codeMatch && codeMatch[0]) {
    // Clean up: remove ``` markers and language tag
    result.codeSnippet = codeMatch[0]
      .replace(/```[a-z]*\n?/g, '') // Remove opening ```java or similar
      .replace(/```/g, '') // Remove closing ```
      .trim();
  }

  // Extract approach
  const approachMatch = response.match(/(?:Approach|approach|Strategy)[:\s]+([^\n]+(?:\n(?![0-9.])[^\n]+)*)/i);
  if (approachMatch) {
    result.approach = approachMatch[1].trim().substring(0, 300);
  }

  // Extract edge cases
  const edgeCaseMatch = response.match(/(?:Edge Case|edge case|Corner)[:\s]+([^\n]+(?:\n(?![0-9.])[^\n]+)*)/i);
  if (edgeCaseMatch) {
    result.edgeCases = edgeCaseMatch[1].trim().substring(0, 300);
  }

  return result;
}

app.listen(PORT, () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('❌ WARNING: GEMINI_API_KEY not set in .env file');
    console.warn('   Get one from: https://makersuite.google.com/app/apikey');
  } else {
    console.log('✅ Gemini API key configured');
  }
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.close();
  process.exit(0);
});
