const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-pro' });
  }

  async classifyQuestion(question) {
    const prompt = `Classify this interview question into one of: coding, LLD (Low Level Design), HLD (High Level Design), behavioral.
    
Question: "${question}"

Respond with ONLY the category name.`;

    const result = await this.model.generateContent(prompt);
    return result.response.text().trim().toLowerCase();
  }

  async generateHints(question, category = 'auto') {
    let classifiedCategory = category;
    if (category === 'auto') {
      classifiedCategory = await this.classifyQuestion(question);
    }

    const prompts = {
      coding: this.getCodingPrompt(question),
      lld: this.getLLDPrompt(question),
      hld: this.getHLDPrompt(question),
      behavioral: this.getBehavioralPrompt(question),
    };

    const prompt = prompts[classifiedCategory] || prompts.coding;
    const result = await this.model.generateContent(prompt);
    return {
      classification: classifiedCategory,
      response: result.response.text(),
    };
  }

  getCodingPrompt(question) {
    return `You are a Google interview coach. A candidate is being asked this coding question during their interview. They will repeat your answer to the interviewer.

IMPORTANT: Your answer must be CONCISE, CLEAR, and directly REPEATABLE in an interview. Skip explanations - just give the approach + code.

Question: "${question}"

Format your response as:
1. Problem Type (e.g., "Graph BFS", "DP", "Two Pointers")
2. Approach (2-3 sentences max)
3. Edge Cases to mention
4. Clean, working code (${question.length < 100 ? 'Python' : 'language choice'})
5. Time & Space Complexity

Remember: Keep it SHORT. They need to say this in the interview!`;
  }

  getLLDPrompt(question) {
    return `You are a Google interview coach. A candidate is being asked this Low Level Design (LLD) question.

IMPORTANT: Your answer must be CONCISE and directly expressible in 2-3 minutes.

Question: "${question}"

Format:
1. Core Classes/Interfaces (list them)
2. Key Design Patterns (if any)
3. Essential Methods (what the interviewer will probe)
4. Trade-offs (1-2 important ones)
5. One simple Python/Java interface skeleton

Keep it SHORT and actionable!`;
  }

  getHLDPrompt(question) {
    return `You are a Google infrastructure coach. A candidate is being asked this High Level Design (HLD) question.

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

  getBehavioralPrompt(question) {
    return `You are a Google behavioral interviewer coach. A candidate needs to answer this behavioral question.

IMPORTANT: Your answer should follow STAR format and be repeatable in 2 minutes.

Question: "${question}"

Format using STAR:
S - Situation (Brief context)
T - Task (What was your responsibility)
A - Action (What YOU did specifically)
R - Result (Outcome & metrics if possible)

Then add:
- Why this shows Google values (collaboration, innovation, user focus, etc.)
- Potential follow-up questions they might ask

Keep it SHORT and confident!`;
  }
}

module.exports = GeminiService;
