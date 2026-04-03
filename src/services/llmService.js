const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const DEBUG_HINTS = process.env.DEBUG_HINTS === 'true';

class LLMService {
  constructor(geminiKey, groqKey) {
    this.geminiKey = geminiKey;
    this.groqKey = groqKey;

    // Initialize Gemini
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      this.geminiModel = this.geminiClient.getGenerativeModel({
        model: 'gemini-3.1-pro-preview',
        generationConfig: { temperature: 0.4 },
      });
    }

    // Initialize Groq
    if (groqKey) {
      this.groqClient = new Groq({ apiKey: groqKey });
      this.groqModel = 'llama-3.3-70b-versatile';
    }
  }

  async classifyQuestion(question) {
    const systemMsg = 'You are a strict interview question classifier. Respond with exactly one word: coding, lld, hld, or behavioral. Nothing else.';
    const prompt = `Classify this interview question into exactly one category.

Categories:
- coding: algorithm, data structure, write code, optimize, implement
- lld: class design, OOP, design patterns, object modeling
- hld: system design, scalability, distributed systems, architecture at scale
- behavioral: past experience, teamwork, conflict, leadership, STAR

Examples:
- "Implement a LRU cache" → coding
- "Design a parking lot system with classes" → lld
- "Design Twitter for 100M users" → hld
- "Tell me about a time you disagreed with your manager" → behavioral

Question: "${question}"

Category:`;

    try {
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(prompt);
        const raw = result.response.text().trim().toLowerCase();
        return this.normalizeCategory(raw);
      }
    } catch (error) {
      console.warn('⚠️  Gemini classifier failed, falling back to Groq:', error.message);
    }

    // Fallback to Groq
    if (this.groqClient) {
      const message = await this.groqClient.chat.completions.create({
        model: this.groqModel,
        max_tokens: 10,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
      });
      const raw = message.choices[0]?.message?.content.trim().toLowerCase();
      return this.normalizeCategory(raw);
    }

    throw new Error('No LLM provider available');
  }

  normalizeCategory(raw) {
    if (raw.includes('coding')) return 'coding';
    if (raw.includes('lld') || raw.includes('low level')) return 'lld';
    if (raw.includes('hld') || raw.includes('high level')) return 'hld';
    if (raw.includes('behavioral')) return 'behavioral';
    return 'coding'; // safe default
  }

  // Uses Groq Whisper for Speech-to-Text
  async transcribeAudio(filePath) {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
    }
    
    const fs = require('fs');
    try {
      const transcription = await this.groqClient.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-large-v3',
        response_format: 'json',
        language: 'en', // Force English-only transcription (strict)
      });
      return transcription.text;
    } catch (error) {
      console.error('Groq Whisper error:', error);
      throw error;
    }
  }

  async generateHints(question, category = 'auto', resume = '', jobDesc = '', conversationHistory = [], company = '', role = '') {
    if (DEBUG_HINTS) {
      console.log('[LLM] generateHints', {
        category, company, role,
        hasResume: Boolean(resume),
        hasJobDesc: Boolean(jobDesc),
        contextExchanges: conversationHistory.length,
      });
    }

    let classifiedCategory = category;
    if (category === 'auto') {
      classifiedCategory = await this.classifyQuestion(question);
    }

    const systemMsg = this.getSystemMessage(classifiedCategory);
    const prompts = {
      coding: this.getCodingPrompt(question, resume, jobDesc, conversationHistory, company, role),
      lld: this.getLLDPrompt(question, resume, jobDesc, conversationHistory, company, role),
      hld: this.getHLDPrompt(question, resume, jobDesc, conversationHistory, company, role),
      behavioral: this.getBehavioralPrompt(question, resume, jobDesc, conversationHistory, company, role),
    };

    const prompt = prompts[classifiedCategory] || prompts.coding;
    if (DEBUG_HINTS) {
      console.log('----- [LLM PROMPT START] -----');
      console.log('SYSTEM:', systemMsg);
      console.log('USER:', prompt);
      console.log('----- [LLM PROMPT END] -----');
    }

    try {
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(prompt);
        const response = result.response.text();
        if (DEBUG_HINTS) {
          console.log('[LLM] Gemini success', { responseLength: response.length, classifiedCategory });
        }
        if (!response || response.trim().length < 20) {
          throw new Error('Gemini returned an empty or too-short response');
        }
        return {
          classification: classifiedCategory,
          response: response,
        };
      }
    } catch (error) {
      console.warn('Gemini generation failed, falling back to Groq:', error.message);
    }

    // Fallback to Groq
    if (this.groqClient) {
      const message = await this.groqClient.chat.completions.create({
        model: this.groqModel,
        max_tokens: 4000,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
      });
      const response = message.choices[0]?.message?.content || '';
      if (DEBUG_HINTS) {
        console.log('[LLM] Groq success', { responseLength: response.length, classifiedCategory });
      }
      if (!response || response.trim().length < 20) {
        throw new Error('Groq returned an empty or too-short response');
      }
      return {
        classification: classifiedCategory,
        response: response,
      };
    }

    throw new Error('No LLM provider available');
  }

  getSystemMessage(category) {
    const base = 'You are an expert interview coach. The candidate will speak your answer directly to the interviewer, so write in a natural, speakable tone. Be concise and high-signal. Never fabricate achievements — only reference what is in the resume.';
    const categorySpecific = {
      coding: ' You specialize in coding interviews — algorithms, data structures, and problem solving.',
      lld: ' You specialize in Low Level Design interviews — OOP, design patterns, and clean architecture.',
      hld: ' You specialize in High Level System Design interviews — distributed systems, scalability, and infrastructure.',
      behavioral: ' You specialize in behavioral interviews — STAR format, leadership, and impact stories.',
    };
    return base + (categorySpecific[category] || '');
  }

  getConversationContext(conversationHistory = []) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    let context = '\n\n=== INTERVIEW CONTEXT (Previous Q&A) ===\n';
    conversationHistory.forEach((exchange, index) => {
      context += `Q${index + 1}: ${exchange.question}\nA${index + 1}: ${exchange.answer.substring(0, 600)}\n\n`;
    });
    context += '=== Current Question (answer this one) ===\n';
    return context;
  }

  getCompanyRoleContext(company, role) {
    let ctx = '';
    if (company) ctx += `Target Company: ${company}\n`;
    if (role) ctx += `Target Role: ${role}\n`;
    return ctx ? `\n${ctx}` : '';
  }

  getCodingPrompt(question, resume = '', jobDesc = '', conversationHistory = [], company = '', role = '') {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Resume: ${resume}\n`;
      if (jobDesc) context += `Job Description: ${jobDesc}\n`;
    }
    context += this.getCompanyRoleContext(company, role);
    const conversationContext = this.getConversationContext(conversationHistory);

    return `${context}${conversationContext}
Question: "${question}"

Think step-by-step about the optimal approach before writing code.

Rules:
- Keep the answer concise and directly speakable in an interview.
- Start with brute-force in one line, then present the optimal approach.
- Use clear variable names. Code must correctly handle the edge cases you list.
- If the question is ambiguous, state 1-2 assumptions first.

Format:
1. Pattern (e.g., Sliding Window, Graph BFS, DP — one line)
2. Key Assumptions (only if needed, skip if obvious)
3. Approach (3-5 crisp bullets explaining the logic)
4. Edge Cases (top 4-6, each in one line)
5. Java Code (clean, runnable, well-commented for interviewer)
6. Complexity: Time O(...) because ..., Space O(...) because ...

No long theory. Interview-ready.`;
  }

  getLLDPrompt(question, resume = '', jobDesc = '', conversationHistory = [], company = '', role = '') {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Background: ${resume}\n`;
      if (jobDesc) context += `Job Description: ${jobDesc}\n`;
    }
    context += this.getCompanyRoleContext(company, role);
    const conversationContext = this.getConversationContext(conversationHistory);

    return `${context}${conversationContext}
Question: "${question}"

Rules:
- Focus on core object model, APIs, and interactions — not lengthy explanations.
- Apply SOLID principles and explain which ones matter most here.
- Include practical design patterns that clearly help this design.
- Address concurrency/thread-safety if relevant to the problem.
- Mention extensibility points and key validation/failure concerns.

Format:
1. Requirements Clarification (2-4 bullets: what's in scope, what's not)
2. Core Entities & Responsibilities (class/interface list with one-line purpose)
3. Relationships & Interaction Flow (how objects collaborate — describe the key sequence)
4. Critical APIs/Methods the interviewer will probe
5. Design Patterns Used (name + one line on why it fits)
6. Concurrency & Edge Cases (thread-safety, race conditions if applicable)
7. Trade-offs (2-3 strong ones with reasoning)
8. Java Class/Interface Skeleton (minimal but complete enough to compile)

Keep it concrete and interview-ready.`;
  }

  getHLDPrompt(question, resume = '', jobDesc = '', conversationHistory = [], company = '', role = '') {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Experience: ${resume}\n`;
      if (jobDesc) context += `Job Description: ${jobDesc}\n`;
    }
    context += this.getCompanyRoleContext(company, role);
    const conversationContext = this.getConversationContext(conversationHistory);

    return `${context}${conversationContext}
Question: "${question}"

Rules:
- Start from requirements → capacity estimates → architecture → deep-dive → scaling → trade-offs.
- Name specific technologies where appropriate (e.g., Kafka, Redis, PostgreSQL, S3) — don't be vague.
- Show your math for back-of-envelope estimates (QPS, storage, bandwidth).
- Deep-dive into 1-2 critical components that are the hardest part of this design.
- Include monitoring and observability considerations.

Format:
1. Functional & Non-Functional Requirements (bullet each)
2. Back-of-Envelope Estimates (show math: DAU → QPS → storage → bandwidth)
3. High-Level Architecture (core components, max 7, with ASCII diagram)
4. Data Model & Storage (SQL/NoSQL/Cache choices with reasoning)
5. API Design & Request Flow (key endpoints, request path end-to-end)
6. Deep-Dive (pick 1-2 hard components — explain in detail)
7. Scalability & Reliability (partitioning, replication, caching, queues, failover)
8. Monitoring & Alerting (key metrics to track, SLOs)
9. Bottlenecks & Trade-offs (top 3, with what you'd choose and why)

Keep it structured and whiteboard-friendly.`;
  }

  getBehavioralPrompt(question, resume = '', jobDesc = '', conversationHistory = [], company = '', role = '') {
    let context = '';
    if (resume) {
      context = `\n\nCANDIDATE RESUME:\n${resume}\nIMPORTANT: Only use achievements and experiences actually listed in this resume. Do NOT fabricate or invent examples.`;
    }
    if (jobDesc) {
      context += `\n\nROLE REQUIREMENTS:\n${jobDesc}\nAlign the answer with these job requirements and competencies.`;
    }
    if (company) {
      context += `\n\nTARGET COMPANY: ${company}\nTailor the answer to reflect this company's known culture and values (e.g., Amazon → Leadership Principles, Google → Googleyness, Meta → Move Fast).`;
    }
    if (role) {
      context += `\nTARGET ROLE: ${role}`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);

    return `${context}${conversationContext}
Question: "${question}"

Rules:
- Use first-person language throughout (I led, I decided, I improved).
- Pick ONE strong, specific example from the resume — depth over breadth.
- Include measurable impact: numbers, percentages, timelines.
- Keep the answer deliverable in 2-3 minutes when spoken aloud.
- Never invent stories or metrics not supported by the resume.

Format:
1. Why This Example (1 line: why this specific experience best answers the question)
2. STAR Answer
   S - Situation (2-3 sentences of context)
   T - Task (your specific responsibility and what was at stake)
   A - Actions (3-4 specific steps YOU took, showing ownership and decision-making)
   R - Results (quantified impact: metrics, business outcomes, team outcomes)

Tone: confident, specific, conversational — as if speaking to the interviewer.`;
  }
}

module.exports = LLMService;
