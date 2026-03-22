const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = path.join(process.cwd(), 'interview_history.db')) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.log('Database connected');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
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

  createSession(roundType, title) {
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
