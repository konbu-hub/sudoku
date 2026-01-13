from flask import Flask, render_template, jsonify, request, make_response
from sudoku_engine import SudokuEngine
import database
import json

app = Flask(__name__)
engine = SudokuEngine()

# 起動時にDB初期化
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/puzzle', methods=['GET'])
def get_puzzle():
    difficulty = request.args.get('difficulty', 'medium')
    puzzle, solution = engine.generate_puzzle(difficulty)
    return jsonify({
        'puzzle': puzzle,
        'solution': solution
    })

@app.route('/api/score', methods=['POST'])
def save_score():
    data = request.json
    username = data.get('username')
    difficulty = data.get('difficulty')
    clear_time = data.get('clear_time')
    
    if not username or not difficulty or clear_time is None:
        return jsonify({'error': 'Missing data'}), 400
    
    database.save_score(username, difficulty, clear_time)
    return jsonify({'status': 'success'})

@app.route('/api/ranking', methods=['GET'])
def get_ranking():
    difficulty = request.args.get('difficulty')
    ranking = database.get_ranking(difficulty)
    return jsonify(ranking)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username required'}), 400
    stats = database.get_user_stats(username)
    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
