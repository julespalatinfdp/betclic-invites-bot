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
        // Table pour tracker les invitations (existante, inchangée)
        this.db.run(
          `CREATE TABLE IF NOT EXISTS invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inviter_id TEXT NOT NULL,
            invited_member_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          (err) => { if (err) return reject(err); }
        );
        // NOUVEAU : mapping code d'invitation -> membre propriétaire
        this.db.run(
          `CREATE TABLE IF NOT EXISTS invite_codes (
            user_id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
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

  // NOUVEAU : rang d'un utilisateur dans le classement (1 = premier)
  // Retourne null si l'utilisateur n'a aucune invitation.
  getRank(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) + 1 AS rank FROM (
           SELECT inviter_id, COUNT(*) AS c
           FROM invites
           GROUP BY inviter_id
         ) t
         WHERE t.c > (SELECT COUNT(*) FROM invites WHERE inviter_id = ?)`,
        [userId],
        async (err, row) => {
          if (err) return reject(err);
          try {
            const count = await this.getInviteCount(userId);
            resolve(count > 0 ? row.rank : null);
          } catch (e) { reject(e); }
        }
      );
    });
  }

  // NOUVEAU : nombre total de participants au classement
  getParticipantCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(DISTINCT inviter_id) AS n FROM invites',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.n || 0);
        }
      );
    });
  }

  // NOUVEAU : enregistrer le lien perso d'un membre
  setUserCode(userId, code) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO invite_codes (user_id, code) VALUES (?, ?)',
        [userId, code],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // NOUVEAU : récupérer le code d'un membre (null si aucun)
  getUserCode(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT code FROM invite_codes WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.code : null);
        }
      );
    });
  }

  // NOUVEAU : retrouver le propriétaire d'un code (null si non tracké)
  getUserByCode(code) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT user_id FROM invite_codes WHERE code = ?',
        [code],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.user_id : null);
        }
      );
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
