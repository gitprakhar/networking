const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'networking.db'));
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            let tablesCreated = 0;
            const totalTables = 2;

            const checkComplete = () => {
                tablesCreated++;
                if (tablesCreated === totalTables) {
                    console.log('✅ Database initialization complete');
                    // Run migrations after tables are created
                    this.runMigrations().then(() => {
                        resolve();
                    }).catch(reject);
                }
            };

            // Create users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_id TEXT UNIQUE NOT NULL,
                    email TEXT NOT NULL,
                    name TEXT NOT NULL,
                    picture TEXT,
                    gmail_access_token TEXT,
                    gmail_refresh_token TEXT,
                    token_expires_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating users table:', err);
                    reject(err);
                } else {
                    console.log('✅ Users table created/verified');
                    checkComplete();
                }
            });

            // Create emails table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS emails (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    gmail_id TEXT NOT NULL,
                    thread_id TEXT,
                    subject TEXT,
                    sender TEXT,
                    sender_email TEXT,
                    recipient TEXT,
                    recipient_email TEXT,
                    user_email TEXT,
                    is_sent BOOLEAN DEFAULT 0,
                    date_sent DATETIME,
                    snippet TEXT,
                    body TEXT,
                    labels TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, gmail_id)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating emails table:', err);
                    reject(err);
                } else {
                    console.log('✅ Emails table created/verified');
                    checkComplete();
                }
            });

            // Create contacts table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    contact_email TEXT NOT NULL,
                    contact_name TEXT,
                    first_email_date DATETIME,
                    last_email_date DATETIME,
                    email_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, contact_email)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating contacts table:', err);
                    reject(err);
                } else {
                    console.log('✅ Contacts table created/verified');
                }
            });

            // Create follow_ups table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS follow_ups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    contact_email TEXT NOT NULL,
                    contact_name TEXT,
                    conversation_summary TEXT,
                    networking_score REAL DEFAULT 0.0,
                    needs_followup BOOLEAN DEFAULT 0,
                    followup_reason TEXT,
                    suggested_action TEXT,
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating follow_ups table:', err);
                    reject(err);
                } else {
                    console.log('✅ Follow-ups table created/verified');
                }
            });

            // Create indexes for better performance (non-blocking)
            setTimeout(() => {
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id)`, (err) => {
                    if (err) console.error('Warning: Error creating user_id index:', err);
                });
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_date_sent ON emails(date_sent)`, (err) => {
                    if (err) console.error('Warning: Error creating date_sent index:', err);
                });
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_emails_gmail_id ON emails(gmail_id)`, (err) => {
                    if (err) console.error('Warning: Error creating gmail_id index:', err);
                });
            }, 100);
        });
    }

    // User operations
    async createOrUpdateUser(userData) {
        return new Promise((resolve, reject) => {
            const { google_id, email, name, picture } = userData;
            
            // First, check if user already exists
            this.db.get(
                'SELECT id FROM users WHERE google_id = ?',
                [google_id],
                (err, existingUser) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (existingUser) {
                        // Update existing user
                        this.db.run(`
                            UPDATE users 
                            SET email = ?, name = ?, picture = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE google_id = ?
                        `, [email, name, picture, google_id], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`✅ Updated existing user: ${name} (ID: ${existingUser.id})`);
                                resolve(existingUser.id);
                            }
                        });
                    } else {
                        // Create new user
                        this.db.run(`
                            INSERT INTO users (google_id, email, name, picture, created_at, updated_at)
                            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        `, [google_id, email, name, picture], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`✅ Created new user: ${name} (ID: ${this.lastID})`);
                                resolve(this.lastID);
                            }
                        });
                    }
                }
            );
        });
    }

    async getUserByGoogleId(googleId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE google_id = ?',
                [googleId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // Get user by email
    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // Email operations
    async saveEmails(userId, emails) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO emails (
                    user_id, gmail_id, thread_id, subject, sender, sender_email,
                    recipient, recipient_email, user_email, is_sent, date_sent, snippet, body, labels, is_read
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let completed = 0;
            let errors = [];

            emails.forEach(email => {
                stmt.run([
                    userId,
                    email.gmail_id,
                    email.thread_id,
                    email.subject,
                    email.sender,
                    email.sender_email,
                    email.recipient,
                    email.recipient_email,
                    email.user_email,
                    email.is_sent ? 1 : 0,
                    email.date_sent,
                    email.snippet,
                    email.body,
                    JSON.stringify(email.labels || []),
                    email.is_read ? 1 : 0
                ], (err) => {
                    if (err) {
                        errors.push(err);
                    }
                    completed++;
                    
                    if (completed === emails.length) {
                        stmt.finalize();
                        if (errors.length > 0) {
                            reject(errors[0]);
                        } else {
                            resolve(emails.length);
                        }
                    }
                });
            });
        });
    }

    async getEmailsByUserId(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM emails 
                WHERE user_id = ? 
                ORDER BY date_sent DESC 
                LIMIT ?
            `, [userId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse labels JSON
                    const emails = rows.map(row => ({
                        ...row,
                        labels: JSON.parse(row.labels || '[]'),
                        is_read: Boolean(row.is_read)
                    }));
                    resolve(emails);
                }
            });
        });
    }

    async getEmailsByUserIdAndDateRange(userId, days = 7) {
        return new Promise((resolve, reject) => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            this.db.all(`
                SELECT * FROM emails 
                WHERE user_id = ? 
                AND date_sent >= ?
                ORDER BY date_sent DESC
            `, [userId, startDate.toISOString()], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse labels JSON
                    const emails = rows.map(row => ({
                        ...row,
                        labels: JSON.parse(row.labels || '[]'),
                        is_read: Boolean(row.is_read)
                    }));
                    resolve(emails);
                }
            });
        });
    }

    async deleteUserEmails(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM emails WHERE user_id = ?',
                [userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                }
            );
        });
    }

    // Contact operations
    async updateContactsFromEmails(userId, emails) {
        return new Promise((resolve, reject) => {
            const contactMap = new Map();
            
            // Process emails to extract contacts
            emails.forEach(email => {
                const contactEmail = email.sender_email;
                const contactName = email.sender;
                const emailDate = new Date(email.date_sent);
                
                if (contactMap.has(contactEmail)) {
                    const contact = contactMap.get(contactEmail);
                    contact.email_count++;
                    if (emailDate < new Date(contact.first_email_date)) {
                        contact.first_email_date = emailDate.toISOString();
                    }
                    if (emailDate > new Date(contact.last_email_date)) {
                        contact.last_email_date = emailDate.toISOString();
                    }
                } else {
                    contactMap.set(contactEmail, {
                        contact_email: contactEmail,
                        contact_name: contactName,
                        first_email_date: emailDate.toISOString(),
                        last_email_date: emailDate.toISOString(),
                        email_count: 1
                    });
                }
            });
            
            // Update contacts in database
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO contacts 
                (user_id, contact_email, contact_name, first_email_date, last_email_date, email_count, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            
            let completed = 0;
            let errors = [];
            
            contactMap.forEach(contact => {
                stmt.run([
                    userId,
                    contact.contact_email,
                    contact.contact_name,
                    contact.first_email_date,
                    contact.last_email_date,
                    contact.email_count
                ], (err) => {
                    if (err) {
                        errors.push(err);
                    }
                    completed++;
                    
                    if (completed === contactMap.size) {
                        stmt.finalize();
                        if (errors.length > 0) {
                            reject(errors[0]);
                        } else {
                            console.log(`✅ Updated ${contactMap.size} contacts`);
                            resolve(contactMap.size);
                        }
                    }
                });
            });
        });
    }

    async getContactsByUserId(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM contacts 
                WHERE user_id = ? 
                ORDER BY last_email_date DESC, email_count DESC
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getConversationHistory(userId, contactEmail) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM emails 
                WHERE user_id = ? 
                AND (sender_email = ? OR recipient_email = ?)
                ORDER BY date_sent DESC
            `, [userId, contactEmail, contactEmail], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse labels JSON and add is_sent flag
                    const emails = rows.map(row => ({
                        ...row,
                        labels: JSON.parse(row.labels || '[]'),
                        is_read: Boolean(row.is_read),
                        is_sent: Boolean(row.is_sent)
                    }));
                    resolve(emails);
                }
            });
        });
    }

    async getContactByEmail(userId, contactEmail) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM contacts WHERE user_id = ? AND contact_email = ?',
                [userId, contactEmail],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    // Follow-up operations
    async saveFollowUp(userId, followUpData) {
        return new Promise((resolve, reject) => {
            const { contact_email, contact_name, conversation_summary, networking_score, needs_followup, followup_reason, suggested_action, priority, status } = followUpData;
            
            this.db.run(`
                INSERT OR REPLACE INTO follow_ups 
                (user_id, contact_email, contact_name, conversation_summary, networking_score, needs_followup, followup_reason, suggested_action, priority, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [userId, contact_email, contact_name, conversation_summary, networking_score, needs_followup, followup_reason, suggested_action, priority, status], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async getFollowUpsByUserId(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM follow_ups 
                WHERE user_id = ? 
                ORDER BY networking_score DESC, created_at DESC
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async updateFollowUpStatus(followUpId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE follow_ups 
                SET status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [status, followUpId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async deleteFollowUp(followUpId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM follow_ups WHERE id = ?
            `, [followUpId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    close() {
        this.db.close();
    }

    // Run database migrations
    async runMigrations() {
        return new Promise((resolve, reject) => {
            console.log('🔄 Running database migrations...');
            
            // Check if user_email column exists in emails table
            this.db.all("PRAGMA table_info(emails)", (err, columns) => {
                if (err) {
                    console.error('❌ Error checking table info:', err);
                    reject(err);
                    return;
                }
                
                const hasUserEmail = columns.some(col => col.name === 'user_email');
                const hasIsSent = columns.some(col => col.name === 'is_sent');
                
                if (!hasUserEmail || !hasIsSent) {
                    console.log('📝 Adding missing columns to emails table...');
                    
                    // Add missing columns
                    const alterQueries = [];
                    if (!hasUserEmail) {
                        alterQueries.push("ALTER TABLE emails ADD COLUMN user_email TEXT");
                    }
                    if (!hasIsSent) {
                        alterQueries.push("ALTER TABLE emails ADD COLUMN is_sent BOOLEAN DEFAULT 0");
                    }
                    
                    // Execute alter queries
                    let completed = 0;
                    alterQueries.forEach(query => {
                        this.db.run(query, (err) => {
                            if (err) {
                                console.error('❌ Error adding column:', err);
                                reject(err);
                                return;
                            }
                            completed++;
                            if (completed === alterQueries.length) {
                                console.log('✅ Database migrations completed');
                                resolve();
                            }
                        });
                    });
                } else {
                    // Check users table for token columns
                    this.db.all("PRAGMA table_info(users)", (err, userColumns) => {
                        if (err) {
                            console.error('❌ Error checking users table info:', err);
                            reject(err);
                            return;
                        }
                        
                        const hasAccessToken = userColumns.some(col => col.name === 'gmail_access_token');
                        const hasRefreshToken = userColumns.some(col => col.name === 'gmail_refresh_token');
                        const hasTokenExpires = userColumns.some(col => col.name === 'token_expires_at');
                        
                        if (!hasAccessToken || !hasRefreshToken || !hasTokenExpires) {
                            console.log('📝 Adding missing token columns to users table...');
                            
                            const userAlterQueries = [];
                            if (!hasAccessToken) {
                                userAlterQueries.push("ALTER TABLE users ADD COLUMN gmail_access_token TEXT");
                            }
                            if (!hasRefreshToken) {
                                userAlterQueries.push("ALTER TABLE users ADD COLUMN gmail_refresh_token TEXT");
                            }
                            if (!hasTokenExpires) {
                                userAlterQueries.push("ALTER TABLE users ADD COLUMN token_expires_at DATETIME");
                            }
                            
                            // Execute user alter queries
                            let userCompleted = 0;
                            userAlterQueries.forEach(query => {
                                this.db.run(query, (err) => {
                                    if (err) {
                                        console.error('❌ Error adding user column:', err);
                                        reject(err);
                                        return;
                                    }
                                    userCompleted++;
                                    if (userCompleted === userAlterQueries.length) {
                                        console.log('✅ Database migrations completed');
                                        resolve();
                                    }
                                });
                            });
                        } else {
                            console.log('✅ Database is up to date');
                            resolve();
                        }
                    });
                }
            });
        });
    }

    // Get the latest email for a user
    async getLatestEmail(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM emails 
                WHERE user_id = ? 
                ORDER BY date_sent DESC 
                LIMIT 1
            `;
            
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    console.error('Error getting latest email:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
}

module.exports = Database;
