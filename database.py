import sqlite3
import os

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None

DB_PATH = 'sudoku.db'

def get_db_url():
    return os.environ.get('POSTGRES_URL')

class DBConnection:
    def __init__(self):
        self.db_url = get_db_url()
        self.conn = None
        self.is_postgres = bool(self.db_url)

    def __enter__(self):
        if self.is_postgres:
            try:
                self.conn = psycopg2.connect(self.db_url)
            except Exception as e:
                print(f"Failed to connect to Postgres: {e}")
                # Fallback to SQLite if connection fails (optional, but safer to error out in prod)
                raise e 
        else:
            self.conn = sqlite3.connect(DB_PATH)
            self.conn.row_factory = sqlite3.Row
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()

    def cursor(self):
        if self.is_postgres:
            return self.conn.cursor(cursor_factory=RealDictCursor)
        else:
            return self.conn.cursor()

    def commit(self):
        self.conn.commit()

def query_wrapper(query, params=(), cursor=None):
    """
    Unified query executor.
    Converts SQLite '?' placeholders to Postgres '%s' if necessary.
    """
    is_postgres = bool(get_db_url())
    if is_postgres:
        query = query.replace('?', '%s')
    
    cursor.execute(query, params)
    return cursor

def init_db():
    # Detect DB type
    is_postgres = bool(get_db_url())
    
    if is_postgres:
        try:
            conn = psycopg2.connect(get_db_url())
            cursor = conn.cursor()
            
            # Users Table (Postgres)
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ''')
            
            # Scores Table (Postgres)
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                difficulty TEXT NOT NULL,
                clear_time INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ''')
            
            conn.commit()
            conn.close()
            print("Database initialized (PostgreSQL).")
        except Exception as e:
            print(f"Postgres Initialization Failed: {e}")
    else:
        # SQLite Initialization
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # User Table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Score Table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            difficulty TEXT NOT NULL,
            clear_time INTEGER NOT NULL, -- Seconds
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized (SQLite).")

def get_or_create_user(username):
    with DBConnection() as db:
        cursor = db.cursor()
        
        # Try to insert (UPSERT-like behavior manually implemented for broad compatibility)
        try:
            # Check if exists first
            query_wrapper('SELECT id FROM users WHERE username = ?', (username,), cursor)
            user = cursor.fetchone()
            
            if user:
                return user['id'] if not db.is_postgres else user['id']
            
            # Insert if not exists
            query_wrapper('INSERT INTO users (username) VALUES (?)', (username,), cursor)
            db.commit()
            
            # Fetch ID
            query_wrapper('SELECT id FROM users WHERE username = ?', (username,), cursor)
            user = cursor.fetchone()
            return user['id'] if not db.is_postgres else user['id']
            
        except psycopg2.IntegrityError:
            db.conn.rollback()
            # Race condition handling: select again
            query_wrapper('SELECT id FROM users WHERE username = ?', (username,), cursor)
            user = cursor.fetchone()
            return user['id'] if not db.is_postgres else user['id']
        except sqlite3.IntegrityError:
            # Similar handling for SQLite
            query_wrapper('SELECT id FROM users WHERE username = ?', (username,), cursor)
            user = cursor.fetchone()
            return user['id']

def save_score(username, difficulty, clear_time):
    user_id = get_or_create_user(username)
    
    with DBConnection() as db:
        cursor = db.cursor()
        query_wrapper(
            'INSERT INTO scores (user_id, difficulty, clear_time) VALUES (?, ?, ?)',
            (user_id, difficulty, clear_time),
            cursor
        )
        db.commit()

def get_ranking(difficulty=None, limit=10):
    with DBConnection() as db:
        cursor = db.cursor()
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
        
        query_wrapper(query, tuple(params), cursor)
        
        # Convert to list of dicts (RealDictCursor does this for PG, Row for SQLite needs help)
        if db.is_postgres:
             # RealDictCursor returns dict-like objects already, but casting to dict is safe (handles datetime etc?)
             # psycopg2 returns datetime objects for timestamps, sqlite returns strings by default (mostly).
             # For JSON serialization, we likely don't need to change much as jsonify handles standard types.
             return [dict(row) for row in cursor.fetchall()]
        else:
             return [dict(row) for row in cursor.fetchall()]

def get_user_stats(username):
    # This might need user_id, let's get it first (or join)
    user_id = get_or_create_user(username)
    
    with DBConnection() as db:
        cursor = db.cursor()
        query_wrapper('''
        SELECT difficulty, COUNT(*) as count, MIN(clear_time) as best_time
        FROM scores
        WHERE user_id = ?
        GROUP BY difficulty
        ''', (user_id,), cursor)
        
        return [dict(row) for row in cursor.fetchall()]

def check_db_config():
    is_postgres = bool(get_db_url())
    status = {
        "type": "PostgreSQL" if is_postgres else "SQLite",
        "url_configured": is_postgres,
        "tables": []
    }
    
    try:
        with DBConnection() as db:
            cursor = db.cursor()
            if db.is_postgres:
                # Check tables in public schema
                query_wrapper("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", (), cursor)
            else:
                query_wrapper("SELECT name FROM sqlite_master WHERE type='table'", (), cursor)
                
            tables = cursor.fetchall()
            status["tables"] = [dict(t) for t in tables]
            status["connection"] = "OK"
    except Exception as e:
        status["connection"] = "Error"
        status["error"] = str(e)
        
    return status

if __name__ == "__main__":
    init_db()
