import sqlite3
import os

DB_PATH = 'sudoku.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # ユーザーテーブル
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # スコアテーブル
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        difficulty TEXT NOT NULL,
        clear_time INTEGER NOT NULL, -- 秒単位
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_or_create_user(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT OR IGNORE INTO users (username) VALUES (?)', (username,))
        conn.commit()
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        return user['id']
    finally:
        conn.close()

def save_score(username, difficulty, clear_time):
    user_id = get_or_create_user(username)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO scores (user_id, difficulty, clear_time) VALUES (?, ?, ?)',
            (user_id, difficulty, clear_time)
        )
        conn.commit()
    finally:
        conn.close()

def get_ranking(difficulty=None, limit=10):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = '''
    SELECT users.username, scores.difficulty, scores.clear_time, scores.created_at
    FROM scores
    JOIN users ON scores.user_id = users.id
    '''
    params = []
    if difficulty:
        query += ' WHERE scores.difficulty = ?'
        params.append(difficulty)
    
    query += ' ORDER BY scores.clear_time ASC LIMIT ?'
    params.append(limit)
    
    try:
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_user_stats(username):
    user_id = get_or_create_user(username)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        SELECT difficulty, COUNT(*) as count, MIN(clear_time) as best_time
        FROM scores
        WHERE user_id = ?
        GROUP BY difficulty
        ''', (user_id,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
