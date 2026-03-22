const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

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

  async generateHints(question, category = 'auto', resume = '', jobDesc = '', conversationHistory = []) {
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

    try {
      if (this.geminiModel) {
        const result = await this.geminiModel.generateContent(prompt);
        return {
          classification: classifiedCategory,
          response: result.response.text(),
        };
      }
    } catch (error) {
      console.warn('⚠️  Gemini generation failed, falling back to Groq:', error.message);
    }

    // Fallback to Groq
    if (this.groqClient) {
      const message = await this.groqClient.chat.completions.create({
        model: this.groqModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      return {
        classification: classifiedCategory,
        response: message.choices[0]?.message?.content || '',
      };
    }

    throw new Error('No LLM provider available');
  }

  getConversationContext(conversationHistory = []) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return '';
    }
    let context = '\n\n=== INTERVIEW CONTEXT (Previous Q&A) ===\n';
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
    return `You are an interview coach. A candidate is being asked this coding question during their interview. They will repeat your answer to the interviewer.${context}${conversationContext}
IMPORTANT: Your answer must be CONCISE, CLEAR, and directly REPEATABLE in an interview. Skip explanations - just give the approach + code.

Question: "${question}"

Format your response as:
1. Problem Type (e.g., "Graph BFS", "DP", "Two Pointers")
2. Approach (2-3 sentences max)
3. Edge Cases to mention
4. Clean, working code (Java)
5. Time & Space Complexity

Remember: Keep it SHORT. They need to say this in the interview!`;
  }

  getLLDPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Background: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are an interview coach. A candidate is being asked this Low Level Design (LLD) question.${context}${conversationContext}
IMPORTANT: Your answer must be CONCISE and directly expressible in 2-3 minutes.

Question: "${question}"

Format:
1. Core Classes/Interfaces (list them)
2. Key Design Patterns (if any)
3. Essential Methods (what the interviewer will probe)
4. Trade-offs (1-2 important ones)
5. One simple Java interface skeleton

Keep it SHORT and actionable!`;
  }

  getHLDPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Experience: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are a system design interview coach. A candidate is being asked this High Level Design (HLD) question.${context}${conversationContext}
IMPORTANT: Give a SHORT, reproducible answer that can be sketched in 10-15 minutes.

Question: "${question}"

Format:
1. Architecture Type (Monolithic / Microservices / Serverless)
2. Core Components (5-7 max)
3. Data Storage Strategy (SQL/NoSQL/Cache)
4. Scalability Approach (sharding, caching, load balancing)
5. Bottlenecks & Trade-offs

Draw simple ASCII diagram if helpful. Keep it SHORT!`;
  }

  getBehavioralPrompt(question, resume = '', jobDesc = '', conversationHistory = []) {
    let context = '';
    if (resume) {
      context = `\n\nCANDIDATE RESUME:\n${resume}\nBuild answers from their specific achievements and background.`;
    }
    const conversationContext = this.getConversationContext(conversationHistory);
    return `You are a behavioral interviewer coach. A candidate needs to answer this behavioral question.${context}${conversationContext}
IMPORTANT: Your answer should follow STAR format and be repeatable in 2 minutes.

Question: "${question}"

Format using STAR:
S - Situation (Brief context)
T - Task (What was your responsibility)
A - Action (What YOU did specifically)
R - Result (Outcome & metrics if possible)

Then add:
- Why this shows key professional qualities (teamwork, problem-solving, leadership, communication, etc.)
- Potential follow-up questions they might ask

Keep it SHORT and confident!`;
  }
}

module.exports = LLMService;
