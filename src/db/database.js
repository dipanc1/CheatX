const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor(dbPath = path.join(process.cwd(), 'interview_history.db')) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.log('📊 Database connected');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    // Sessions table - stores interview sessions with context
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        company TEXT,
        role TEXT,
        resume TEXT,
        job_desc TEXT,
        total_questions INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversations table - stores each Q&A pair
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question_num INTEGER,
        question TEXT,
        category TEXT,
        answer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Legacy table for backward compatibility
    this.db.run(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_type TEXT,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        question TEXT,
        category TEXT,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
      )
    `);
  }

  // Create a new session with resume and job description
  createSession(company = '', role = '', resume = '', jobDesc = '') {
    return new Promise((resolve, reject) => {
      const sessionId = crypto.randomBytes(8).toString('hex');
      this.db.run(
        `INSERT INTO sessions (id, company, role, resume, job_desc) 
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, company, role, resume, jobDesc],
        (err) => {
          if (err) reject(err);
          else resolve(sessionId);
        }
      );
    });
  }

  // Save a Q&A pair to the session
  saveConversation(sessionId, question, category, answer) {
    return new Promise((resolve, reject) => {
      // Get current question count
      this.db.get(
        `SELECT total_questions FROM sessions WHERE id = ?`,
        [sessionId],
        (err, row) => {
          if (err) return reject(err);
          const questionNum = (row?.total_questions || 0) + 1;
          
          // Insert conversation
          this.db.run(
            `INSERT INTO conversations (session_id, question_num, question, category, answer) 
             VALUES (?, ?, ?, ?, ?)`,
            [sessionId, questionNum, question, category, answer],
            (err) => {
              if (err) return reject(err);
              
              // Update session total_questions and updated_at
              this.db.run(
                `UPDATE sessions SET total_questions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [questionNum, sessionId],
                (err) => {
                  if (err) reject(err);
                  else resolve(questionNum);
                }
              );
            }
          );
        }
      );
    });
  }

  // Get all conversations for a session
  getSessionConversations(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM conversations WHERE session_id = ? ORDER BY question_num ASC`,
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Get session details with resume and JD
  getSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM sessions WHERE id = ?`,
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Get all sessions
  getAllSessions(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, company, role, total_questions, created_at, updated_at 
         FROM sessions ORDER BY updated_at DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Get sessions filtered by category
  getSessionsByCategory(category) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT DISTINCT s.id, s.company, s.role, COUNT(c.id) as total_questions
         FROM sessions s
         LEFT JOIN conversations c ON s.id = c.session_id AND c.category = ?
         GROUP BY s.id
         ORDER BY s.updated_at DESC`,
        [category],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Get analytics
  getAnalytics() {
    return new Promise((resolve, reject) => {
      const stats = {};

      // Total sessions
      this.db.get(`SELECT COUNT(*) as total FROM sessions`, (err, row) => {
        if (err) return reject(err);
        stats.totalSessions = row.total;

        // Total questions
        this.db.get(`SELECT COUNT(*) as total FROM conversations`, (err, row) => {
          if (err) return reject(err);
          stats.totalQuestions = row.total;

          // Questions by category
          this.db.all(
            `SELECT category, COUNT(*) as count FROM conversations GROUP BY category`,
            (err, rows) => {
              if (err) return reject(err);
              stats.questionsByCategory = {};
              rows.forEach(row => {
                stats.questionsByCategory[row.category] = row.count;
              });

              // Most recent sessions
              this.db.all(
                `SELECT id, company, role, total_questions, created_at FROM sessions 
                 ORDER BY updated_at DESC LIMIT 5`,
                (err, rows) => {
                  if (err) return reject(err);
                  stats.recentSessions = rows;
                  resolve(stats);
                }
              );
            }
          );
        });
      });
    });
  }

  // Delete a session and its conversations
  deleteSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM conversations WHERE session_id = ?`,
        [sessionId],
        (err) => {
          if (err) return reject(err);
          this.db.run(
            `DELETE FROM sessions WHERE id = ?`,
            [sessionId],
            (err) => {
              if (err) reject(err);
              else resolve(true);
            }
          );
        }
      );
    });
  }

  // Legacy methods for backward compatibility
  saveQuestion(sessionId, question, category, response) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO questions (session_id, question, category, response) 
         VALUES (?, ?, ?, ?)`,
        [sessionId, question, category, response],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  createLegacySession(roundType, title) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO interview_sessions (round_type, title) VALUES (?, ?)`,
        [roundType, title],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getSessionHistory(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM questions WHERE session_id = ? ORDER BY created_at DESC`,
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Database;
