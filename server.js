const express = require('express');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LLMService = require('./src/services/llmService');
const Database = require('./src/db/database');
const QuestionClassifier = require('./src/utils/questionClassifier');

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;
const DEBUG_HINTS = process.env.DEBUG_HINTS === 'true';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize services
const llmService = new LLMService(process.env.GEMINI_API_KEY, process.env.GROQ_API_KEY);
const db = new Database();

// Helper function to generate mock hints for dev mode
function getMockHints(question, category) {
  const mockResponses = {
    coding: `**Problem Type:** Array/Sorting
**Approach:** Two-pointer technique - sort array and use pointer logic to find target sum.
**Edge Cases:** Empty array, single element, duplicates, negative numbers
**Code Example:**
\`\`\`java
public int[] solve(int[] arr, int target) {
  Arrays.sort(arr);
  int left = 0, right = arr.length - 1;
  while (left < right) {
    if (arr[left] + arr[right] == target) return new int[]{left, right};
    if (arr[left] + arr[right] < target) left++;
    else right--;
  }
  return new int[]{-1, -1};
}
\`\`\`
**Time Complexity:** O(n log n), **Space Complexity:** O(1)`,
    
    lld: `**Core Classes:**
- PaymentProcessor (handles transactions)
- User (represents customer)
- Transaction (models payment record)
- NotificationService (sends updates)

**Key Design Patterns:** Strategy Pattern (different payment methods), Observer Pattern (notifications)

**Essential Methods:**
- processPayment(User, amount)
- validateTransaction()
- getTransactionHistory()
- handleFailure()

**Trade-offs:**
1. Synchronous vs Async: Async better for scalability but complex error handling
2. Database consistency vs availability

**Interface Skeleton:**
\`\`\`java
public interface PaymentGateway {
  Result processPayment(Transaction t);
  Result refund(String txnId);
}
\`\`\``,
    
    hld: `**Architecture Type:** Microservices

**Core Components:**
1. API Gateway (request routing)
2. Payment Service (process transactions)
3. User Service (manage accounts)
4. Notification Service (send alerts)
5. Database Layer (persistence)
6. Cache Layer (Redis for hot data)

**Data Storage:** PostgreSQL (users, transactions), Redis (cache), Message Queue (events)

**Scalability:** Load balancing with horizontal scaling, database sharding by user_id, rate limiting

**Bottlenecks & Trade-offs:**
- Network latency between services → use service mesh
- Database throughput → implement read replicas, caching
- Data consistency vs availability → eventual consistency pattern`,
    
    behavioral: `**STAR Format Answer:**

**Situation:** While working on API integration project, discovered performance issues with 3rd party service calls.

**Task:** Was responsible for improving system reliability and reducing latency.

**Action:** 
- Implemented caching layer using Redis
- Added circuit breaker pattern for fault tolerance
- Created monitoring dashboard for better visibility
- Led code review sessions with team

**Result:** 
- Reduced API latency by 60%
- Improved system uptime from 98% to 99.9%
- Mentored 2 junior engineers on best practices

**Why This Shows:** Leadership (mentored team), Problem-solving (designed solution), Initiative (proactive monitoring)`,
  };

  return mockResponses[category] || mockResponses.coding;
}

// Routes
app.post('/api/hints', async (req, res) => {
  try {
    let { question, category, resume = '', jobDesc = '', sessionId, company = '', role = '', includeContext = true } = req.body;
    const includePrevContext = includeContext !== false && includeContext !== 'false';

    if (DEBUG_HINTS) {
      console.log('[API] /api/hints', {
        category,
        includePrevContext,
        hasResume: Boolean(resume),
        hasJobDesc: Boolean(jobDesc),
        hasSessionId: Boolean(sessionId),
      });
    }
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question must be a non-empty string' });
    }

    const questionStr = question.trim();
    if (!questionStr) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    // Create or get session
    if (!sessionId) {
      sessionId = await db.createSession(company, role, resume, jobDesc);
    }

    // Load conversation history from database
    const dbConversations = await db.getSessionConversations(sessionId);
    const conversationHistory = dbConversations.map(conv => ({
      question: conv.question,
      answer: conv.answer
    }));

    // Use only the previous question/answer (not full history)
    const lastExchange = conversationHistory.length > 0 
      ? [conversationHistory[conversationHistory.length - 1]] 
      : [];
    const historyToUse = includePrevContext ? lastExchange : [];

    if (DEBUG_HINTS) {
      console.log('[API] Context used:', historyToUse.length > 0 ? 'previous Q&A' : 'none');
    }

    // Classify question if needed
    let classifiedCategory = category;
    if (!category || category === 'auto') {
      classifiedCategory = QuestionClassifier.classify(questionStr);
    }

    // Use mock response in dev mode, real LLM otherwise
    let hints;
    if (process.env.NODE_ENV === 'development') {
      hints = {
        classification: classifiedCategory,
        response: getMockHints(questionStr, classifiedCategory),
      };
    } else {
      // Generate hints using LLM with conversation context
      hints = await llmService.generateHints(questionStr, classifiedCategory, resume, jobDesc, historyToUse, company, role);
    }

    // Save to database
    await db.saveConversation(sessionId, questionStr, classifiedCategory, hints.response);

    // Parse hints into structured format
    const parsedHints = parseHints(hints.response, classifiedCategory);

    return res.json({
      sessionId,
      classification: classifiedCategory,
      response: hints.response,
      historyCount: conversationHistory.length + 1,
      ...parsedHints,
    });
  } catch (error) {
    console.error('Error generating hints:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Fast question classification endpoint (for real-time interview mode)
app.post('/api/classify', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question must be a non-empty string' });
    }

    const questionStr = question.trim();
    if (!questionStr) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    // Instant classification (no LLM needed - keyword based)
    const category = QuestionClassifier.classify(questionStr);

    return res.json({
      question: questionStr,
      category,
      timestamps: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error classifying question:', error);
    return res.status(500).json({ error: 'Classification failed', details: error.message });
  }
});

// Endpoint to transcribe audio using Groq Whisper
app.post('/api/transcribe', async (req, res) => {
  let filePath = null;
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Convert Base64 back to binary
    const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save to temp file
    // Groq requires an actual file stream for Whisper
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    filePath = path.join(tempDir, `audio_${Date.now()}.webm`);
    fs.writeFileSync(filePath, buffer);

    const transcript = await llmService.transcribeAudio(filePath);

    return res.json({ transcript: transcript.trim() });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({ error: 'Transcription failed', details: error.message });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Error cleaning temp audio file:', cleanupError.message);
      }
    }
  }
});

// NEW SESSION ENDPOINTS FOR DATABASE

// Create a new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { company = '', role = '', resume = '', jobDesc = '' } = req.body;
    const sessionId = await db.createSession(company, role, resume, jobDesc);
    return res.json({ sessionId, message: 'Session created' });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.getAllSessions(50);
    return res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get specific session with all conversations
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const conversations = await db.getSessionConversations(sessionId);
    return res.json({ session, conversations });
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get sessions by category
app.get('/api/sessions/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const sessions = await db.getSessionsByCategory(category);
    return res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions by category:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const analytics = await db.getAnalytics();
    return res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete a session
app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await db.deleteSession(sessionId);
    return res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Clear all sessions
app.delete('/api/sessions', async (req, res) => {
  try {
    await db.clearAllSessions();
    return res.json({ message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing all sessions:', error);
    return res.status(500).json({ error: error.message });
  }
});

// LEGACY ENDPOINTS

app.post('/api/session', async (req, res) => {
  try {
    const { roundType, title } = req.body;
    const sessionId = await db.createLegacySession(roundType, title);
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
  console.log('\n🚀 CheatX Backend Starting...\n');
  
  const geminiKey = process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing';
  const groqKey = process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing';
  
  console.log(`📌 LLM Configuration:`);
  console.log(`   Gemini (Primary):  ${geminiKey}`);
  console.log(`   Groq (Fallback):   ${groqKey}`);
  
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
    console.warn('\n⚠️  WARNING: No LLM keys configured!');
    console.warn('   Get Gemini key from: https://makersuite.google.com/app/apikey');
    console.warn('   Get Groq key from: https://console.groq.com\n');
  }
  
  console.log(`✨ Backend running on http://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.close();
  process.exit(0);
});
