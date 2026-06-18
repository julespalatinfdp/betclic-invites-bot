const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor(filename) {
    this.db = new sqlite3.Database(filename, (err) => {
      if (err) console.error('❌ Erreur SQLite:', err);
      else console.log('✅ Connecté à SQLite');
    });
  }

  initialize() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Table pour tracker les invitations
        this.db.run(
          `CREATE TABLE IF NOT EXISTS invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inviter_id TEXT NOT NULL,
            invited_member_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }

  // Ajouter une invitation
  addInvite(inviterId, memberId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO invites (inviter_id, invited_member_id) VALUES (?, ?)',
        [inviterId, memberId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Obtenir le nombre d'invitations d'un utilisateur
  getInviteCount(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM invites WHERE inviter_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count || 0);
        }
      );
    });
  }

  // Obtenir le classement complet
  getLeaderboard(limit = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT inviter_id, COUNT(*) as count
        FROM invites
        GROUP BY inviter_id
        ORDER BY count DESC
      `;
      
      if (limit) query += ` LIMIT ${limit}`;

      this.db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Obtenir tous les invites pour l'export CSV
  getAllInvites() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT inviter_id, invited_member_id, created_at
         FROM invites
         ORDER BY created_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
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
