const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

class GeminiService {
  constructor(geminiKey, groqKey) {
    this.geminiKey = geminiKey;
    this.groqKey = groqKey;
    
    // Initialize Gemini
    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      this.geminiModel = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    
    // Initialize Groq as fallback
    if (groqKey) {
      this.groqClient = new Groq({ apiKey: groqKey });
      this.groqModel = 'mixtral-8x7b-32768';
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
      const message = await this.groqClient.messages.create({
        model: this.groqModel,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content[0].text.trim().toLowerCase();
    }

    throw new Error('No LLM provider available');
  }

  async generateHints(question, category = 'auto', resume = '', jobDesc = '') {
    let classifiedCategory = category;
    if (category === 'auto') {
      classifiedCategory = await this.classifyQuestion(question);
    }

    const prompts = {
      coding: this.getCodingPrompt(question, resume, jobDesc),
      lld: this.getLLDPrompt(question, resume, jobDesc),
      hld: this.getHLDPrompt(question, resume, jobDesc),
      behavioral: this.getBehavioralPrompt(question, resume, jobDesc),
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
      const message = await this.groqClient.messages.create({
        model: this.groqModel,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });
      return {
        classification: classifiedCategory,
        response: message.content[0].text,
      };
    }

    throw new Error('No LLM provider available');
  }

  getCodingPrompt(question, resume = '', jobDesc = '') {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Resume: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    return `You are an interview coach. A candidate is being asked this coding question during their interview. They will repeat your answer to the interviewer.${context}
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

  getLLDPrompt(question, resume = '', jobDesc = '') {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Background: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    return `You are a Google interview coach. A candidate is being asked this Low Level Design (LLD) question.${context}
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

  getHLDPrompt(question, resume = '', jobDesc = '') {
    let context = '';
    if (resume || jobDesc) {
      context = `\n\nCANDIDATE CONTEXT:\n`;
      if (resume) context += `Experience: ${resume}\n`;
      if (jobDesc) context += `Target role: ${jobDesc}\n`;
    }
    return `You are a system design interview coach. A candidate is being asked this High Level Design (HLD) question.${context}
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

  getBehavioralPrompt(question, resume = '', jobDesc = '') {
    let context = '';
    if (resume) {
      context = `\n\nCANDIDATE RESUME:\n${resume}\nBuild answers from their specific achievements and background.`;
    }
    return `You are a behavioral interviewer coach. A candidate needs to answer this behavioral question.${context}

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

module.exports = GeminiService;
