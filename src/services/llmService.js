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
      this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    }
    
    // Initialize Groq
    if (groqKey) {
      this.groqClient = new Groq({ apiKey: groqKey });
      this.groqModel = 'openai/gpt-oss-20b';
    }
  }

  async classifyQuestion(question) {
    const prompt = `Classify this interview question into one of: coding, LLD (Low Level Design), HLD (High Level Design), behavioral.
    
Question: "${question}"

Respond with ONLY the category name.`;

    try {
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(prompt);
        return result.response.text().trim().toLowerCase();
      }
    } catch (error) {
      console.warn('⚠️  Gemini classifier failed, falling back to Groq:', error.message);
    }

    // Fallback to Groq
    if (this.groqClient) {
      const message = await this.groqClient.chat.completions.create({
        model: this.groqModel,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.choices[0]?.message?.content.trim().toLowerCase();
    }

    throw new Error('No LLM provider available');
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

  async generateHints(question, category = 'auto', resume = '', jobDesc = '', conversationHistory = []) {
    if (DEBUG_HINTS) {
      console.log('[LLM] generateHints', {
        category,
        hasResume: Boolean(resume),
        hasJobDesc: Boolean(jobDesc),
        contextExchanges: conversationHistory.length,
      });
    }
    
    let classifiedCategory = category;
    if (category === 'auto') {
      classifiedCategory = await this.classifyQuestion(question);
    }

    const prompts = {
      coding: this.getCodingPrompt(question, resume, jobDesc, conversationHistory),
      lld: this.getLLDPrompt(question, resume, jobDesc, conversationHistory),
      hld: this.getHLDPrompt(question, resume, jobDesc, conversationHistory),
      behavioral: this.getBehavioralPrompt(question, resume, jobDesc, conversationHistory),
    };

    const prompt = prompts[classifiedCategory] || prompts.coding;
    if (DEBUG_HINTS) {
      console.log('----- [LLM PROMPT START] -----');
      console.log(prompt);
      console.log('----- [LLM PROMPT END] -----');
    }

    try {
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(prompt);
        const response = result.response.text();
        if (DEBUG_HINTS) {
          console.log('[LLM] Gemini success', { responseLength: response.length, classifiedCategory });
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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      const response = message.choices[0]?.message?.content || '';
      if (DEBUG_HINTS) {
        console.log('[LLM] Groq success', { responseLength: response.length, classifiedCategory });
      }
      return {
        classification: classifiedCategory,
        response: response,
      };
    }

    throw new Error('No LLM provider available');
  }

  getConversationContext(conversationHistory = []) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    let context = '\n\n=== INTERVIEW CONTEXT (Most Recent Q&A) ===\n';
    conversationHistory.forEach((exchange, index) => {
      context += `Q${index + 1}: ${exchange.question}\nA${index + 1}: ${exchange.answer.substring(0, 200)}...\n\n`;
    });
    context += '=== Current Question ===\n';
    return context;
  }

  getCodingPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Resume: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are an interview coach. The candidate will repeat your answer to the interviewer.${context}${conversationContext}
  Goal: Give a concise, high-signal coding answer that sounds natural in a real interview.

  Question: "${question}"

  Rules:
  - Keep the total answer concise and directly speakable.
  - Prefer an optimal approach; mention the brute-force baseline in one short line if useful.
  - Use clear variable names in code.
  - If the question is ambiguous, state 1-2 assumptions first.

  Format exactly:
  1. Problem Type (e.g., Graph BFS, DP, Two Pointers)
  2. Key Assumptions (only if needed)
  3. Approach (3-5 crisp bullets)
  4. Edge Cases (top 4-6)
  5. Java Code (clean, runnable, interviewer-friendly)
  6. Time and Space Complexity

  Do not add long theory. Keep it interview-repeatable.`;
  }

  getLLDPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Background: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are an interview coach. A candidate is answering a Low Level Design question.${context}${conversationContext}
  Goal: Produce a compact, implementation-oriented answer they can present in 2-3 minutes.

  Question: "${question}"

  Rules:
  - Focus on core object model and APIs, not long explanations.
  - Include only practical patterns that clearly help this design.
  - Mention extensibility and one failure/validation concern.

  Format exactly:
  1. Assumptions and Scope (2-4 bullets)
  2. Core Entities and Interfaces (responsibilities)
  3. Key Relationships and Data Flow
  4. Critical APIs/Methods interviewer will probe
  5. Design Patterns used and why (short)
  6. Trade-offs (2-3 strong ones)
  7. Minimal Java interface/class skeleton

  Keep it concise, concrete, and interview-ready.`;
  }

  getHLDPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Experience: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are a system design interview coach. A candidate is answering a High Level Design question.${context}${conversationContext}
  Goal: Give a structured answer they can whiteboard in 10-15 minutes.

  Question: "${question}"

  Rules:
  - Start from requirements, then architecture, then scaling and trade-offs.
  - Keep it practical; avoid generic cloud buzzwords.
  - Include only the most important numbers and bottlenecks.

  Format exactly:
  1. Functional and Non-Functional Requirements (short)
  2. Capacity Assumptions (traffic, storage; rough order-of-magnitude)
  3. High-Level Architecture and Core Components (max 7)
  4. Data Model and Storage Strategy (SQL/NoSQL/Cache)
  5. API and Data Flow (request path in brief)
  6. Scalability and Reliability (partitioning, cache, queue, failover)
  7. Bottlenecks and Trade-offs (top 3)
  8. Optional ASCII diagram (small)

  Keep it concise and reproducible in interview speech.`;
  }

  getBehavioralPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume) {
      context = `\n\nCANDIDATE RESUME:\n${resume}\nBuild answers from their specific achievements and background.`;
    }
    if (jobDesc) {
      context += `\n\nROLE REQUIREMENTS:\n${jobDesc}\nAlign their examples with these job requirements and competencies.`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are a behavioral interview coach. The candidate must give a confident, natural answer.${context}${conversationContext}
Goal: Build a crisp STAR response aligned with resume achievements and target role needs.

Question: "${question}"

Rules:
- Use first-person language (I did, I decided, I improved).
- Prioritize one strong example over multiple weak examples.
- Include measurable impact when possible.
- Keep the answer tight enough for 90-120 seconds.

Format exactly:
1. Best Example Choice (1 line: why this example fits the question)
2. STAR Answer
   S - Situation (brief)
   T - Task (responsibility)
   A - Actions (specific, high ownership)
   R - Results (metrics + business/team impact)
3. 30-second condensed version
4. Why this maps to role requirements (3 bullets)
5. Likely follow-up questions (3-5)

Tone: confident, specific, no fluff.`;
  }
}

module.exports = LLMService;
