class SudokuGame {
    constructor() {
        this.gridElement = document.getElementById('grid');
        this.timerElement = document.getElementById('timer');
        this.errorElement = document.getElementById('error-count');
        this.difficultyDisplay = document.getElementById('difficulty-display');

        this.puzzle = [];
        this.solution = [];
        this.selectedCell = null;
        this.errors = 0;
        this.time = 0;
        this.timerInterval = null;
        this.username = '';
        this.isLightningMode = false;
        this.isFastPencil = false;
        this.selectedNumber = null;
        this.hintsUsed = 0;
        this.currentDifficulty = 'medium';
        this.currentTheme = 'dark';

        this.tutorialStep = 0;
        this.tutorialData = [
            {
                target: 'title',
                msg: '「おしゃべりクッキーのSUDOKU」へようこそ！<br>まずは「新しく始める」から修行を開始するッキー！'
            },
            {
                target: 'game',
                msg: 'これが盤面だッキー！<br>マウスホイールやキーボードを使って、超高速で数字を埋めていくのがコツだッキー。'
            },
            {
                target: 'game',
                msg: '間違った数字を入れるとミスになるッキー。<b>3回ミスすると修行失敗（終了）</b>だから気をつけるッキー！'
            },
            {
                target: 'game',
                msg: '「爆速連打 (LIGHTNING)」をONにすれば、選んだ数字を連続で叩き込めるッキー。最強だッキー！'
            },
            {
                target: 'game',
                msg: 'わからないときは「ヒント」も使えるけど、<b>1回の修行で3回まで</b>しか使えないから、よく考えて使うッキー！'
            }
        ];

        this.init();
    }

    init() {
        this.loadUsername();
        this.loadOptions();
        this.setupEventListeners();
        this.createGrid();
        this.showScreen('title');

        if (!localStorage.getItem('sudoku_tutorial_seen')) {
            this.startTutorial();
        }
    }

    loadOptions() {
        // Theme
        const storedTheme = localStorage.getItem('sudoku_theme') || 'dark';
        this.setTheme(storedTheme);

        // Default Modes
        const defaultFastPencil = localStorage.getItem('sudoku_def_fast_pencil') === 'true';
        const defaultLightning = localStorage.getItem('sudoku_def_lightning') === 'true';

        document.getElementById('default-fast-pencil').checked = defaultFastPencil;
        document.getElementById('default-lightning').checked = defaultLightning;

        // Apply instantly to game toggles (though game isn't started)
        this.isFastPencil = defaultFastPencil;
        this.isLightningMode = defaultLightning;
        document.getElementById('fast-pencil-toggle').checked = defaultFastPencil;
        document.getElementById('lightning-toggle').checked = defaultLightning;
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('sudoku_theme', theme);

        // Update theme buttons in options
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    loadUsername() {
        const storedName = localStorage.getItem('sudoku_username');
        const welcomeMsg = document.getElementById('menu-user-welcome');

        if (storedName) {
            this.username = storedName;
            if (welcomeMsg) welcomeMsg.textContent = `WELCOME BACK, ${this.username.toUpperCase()}`;
            const gameUserName = document.getElementById('game-user-name');
            if (gameUserName) gameUserName.textContent = `PLAYER: ${this.username.toUpperCase()}`;
        } else {
            if (welcomeMsg) welcomeMsg.textContent = "WELCOME, NEW PLAYER!";
        }
    }

    showScreen(screenName) {
        if (screenName === 'title') {
            document.getElementById('title-screen').classList.remove('hidden');
            document.getElementById('game-screen').classList.add('hidden');
        } else if (screenName === 'game') {
            document.getElementById('title-screen').classList.add('hidden');
            document.getElementById('game-screen').classList.remove('hidden');
        }

        // If tutorial is active, check if we need to show a message based on the screen
        if (!localStorage.getItem('sudoku_tutorial_seen')) {
            this.showTutorialIfNeeded();
        }
    }

    setupEventListeners() {
        const safeAddListener = (id, event, callback) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, callback);
        };

        // Title Menu Buttons
        safeAddListener('menu-new-game-btn', 'click', () => {
            if (!this.username) {
                document.getElementById('name-modal').style.display = 'flex';
            } else {
                document.getElementById('difficulty-modal').style.display = 'flex';
            }
        });

        safeAddListener('menu-ranking-btn', 'click', () => {
            this.showRanking(this.currentDifficulty);
        });

        safeAddListener('menu-change-name-btn', 'click', () => {
            const nameInput = document.getElementById('username-input');
            if (nameInput) nameInput.value = this.username || '';
            document.getElementById('name-modal').style.display = 'flex';
        });

        safeAddListener('menu-options-btn', 'click', () => {
            document.getElementById('options-modal').style.display = 'flex';
        });

        // Name Modal
        safeAddListener('save-name-btn', 'click', () => {
            const inputEl = document.getElementById('username-input');
            if (!inputEl) return;
            const input = inputEl.value.trim();
            if (!input) {
                alert("名前を入力してほしいッキー！");
                return;
            }
            this.username = input;
            localStorage.setItem('sudoku_username', this.username);
            this.loadUsername(); // Refresh display
            document.getElementById('name-modal').style.display = 'none';
        });

        // Difficulty Modal
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const level = btn.dataset.level;
                this.currentDifficulty = level;
                document.getElementById('difficulty-modal').style.display = 'none';
                this.startNewGame(level);
            });
        });

        safeAddListener('close-difficulty-btn', 'click', () => {
            document.getElementById('difficulty-modal').style.display = 'none';
        });

        // Game Controls
        safeAddListener('back-to-title-btn', 'click', () => {
            if (confirm("本当に修行をやめるッキー？")) {
                clearInterval(this.timerInterval);
                this.showScreen('title');
            }
        });

        safeAddListener('game-new-game-btn', 'click', () => {
            document.getElementById('difficulty-modal').style.display = 'flex';
        });

        safeAddListener('fast-pencil-toggle', 'change', (e) => {
            this.isFastPencil = e.target.checked;
            this.updateGridDisplay();
        });

        safeAddListener('lightning-toggle', 'change', (e) => {
            this.isLightningMode = e.target.checked;
            this.selectedNumber = null;
            document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
            this.updateLightningHighlights();
        });

        safeAddListener('hint-btn', 'click', () => this.giveHint());

        safeAddListener('how-to-play-btn', 'click', () => {
            document.getElementById('how-to-play-modal').style.display = 'flex';
        });

        safeAddListener('close-how-to-btn', 'click', () => {
            document.getElementById('how-to-play-modal').style.display = 'none';
        });

        // Tutorial Controls
        safeAddListener('tutorial-next-btn', 'click', () => this.nextTutorialStep());
        safeAddListener('tutorial-skip-btn', 'click', () => this.endTutorial());

        // Modal Generic Controls
        safeAddListener('close-ranking-btn', 'click', () => {
            document.getElementById('ranking-modal').style.display = 'none';
        });

        safeAddListener('close-options-btn', 'click', () => {
            // Save settings
            localStorage.setItem('sudoku_def_fast_pencil', document.getElementById('default-fast-pencil').checked);
            localStorage.setItem('sudoku_def_lightning', document.getElementById('default-lightning').checked);
            document.getElementById('options-modal').style.display = 'none';
        });

        // Options: Theme Selection
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setTheme(btn.dataset.theme));
        });

        // Ranking Tabs
        document.querySelectorAll('#ranking-modal .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#ranking-modal .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.showRanking(btn.dataset.level);
            });
        });

        // In-Game Modals (Game Over / Success)
        document.getElementById('retry-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').style.display = 'none';
            document.getElementById('difficulty-modal').style.display = 'flex';
        });

        document.getElementById('give-up-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').style.display = 'none';
            this.showScreen('title');
        });

        // Mouse Wheel for Number Selection
        window.addEventListener('wheel', (e) => {
            // Only active in game screen
            if (document.getElementById('game-screen').classList.contains('hidden')) return;

            // Prevent accidental jumps (threshold)
            if (Math.abs(e.deltaY) < 20) return;

            let current = this.selectedNumber || 1;

            if (e.deltaY > 0) {
                // Scroll down -> Increase number
                current = current >= 9 ? 1 : current + 1;
            } else {
                // Scroll up -> Decrease number
                current = current <= 1 ? 9 : current - 1;
            }

            this.selectedNumber = current;
            this.updateNumberCounts(); // Fixed method name
            this.updateLightningHighlights();
        }, { passive: true });

        // Numpad Buttons
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.dataset.num);
                if (this.isLightningMode) {
                    this.selectedNumber = num;
                    document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateLightningHighlights();
                } else if (this.selectedCell) {
                    this.handleInput(this.selectedCell, num);
                }
            });
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('game-screen').classList.contains('hidden')) return;

            if (e.key >= '1' && e.key <= '9') {
                const num = parseInt(e.key);
                // In Lightning Mode, number keys change the selected number
                if (this.isLightningMode) {
                    this.selectedNumber = num;
                    this.updateNumberCounts();
                    this.updateLightningHighlights();
                } else if (this.selectedCell) {
                    this.handleInput(this.selectedCell, num);
                }
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                if (this.selectedCell && !this.selectedCell.classList.contains('fixed')) {
                    this.clearCell(this.selectedCell);
                }
            } else if (e.key.startsWith('Arrow')) {
                if (!this.selectedCell) {
                    this.selectCell(document.querySelector('.cell'));
                    return;
                }
                const index = parseInt(this.selectedCell.dataset.index);
                let row = Math.floor(index / 9);
                let col = index % 9;

                if (e.key === 'ArrowUp') row = (row > 0) ? row - 1 : 8;
                else if (e.key === 'ArrowDown') row = (row < 8) ? row + 1 : 0;
                else if (e.key === 'ArrowLeft') col = (col > 0) ? col - 1 : 8;
                else if (e.key === 'ArrowRight') col = (col < 8) ? col + 1 : 0;

                const newIndex = row * 9 + col;
                const nextCell = document.querySelector(`.cell[data-index="${newIndex}"]`);
                if (nextCell) {
                    this.selectCell(nextCell);
                    e.preventDefault(); // Prevent scrolling
                }
            }
        });
    }

    createGrid() {
        this.gridElement.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.selectCell(cell));
            this.gridElement.appendChild(cell);
        }
    }

    async startNewGame(difficulty = null) {
        if (!difficulty) difficulty = this.currentDifficulty;
        this.currentDifficulty = difficulty;
        this.difficultyDisplay.textContent = `LEVEL: ${this.getDifficultyLabel(difficulty)}`;

        try {
            const response = await fetch(`/api/puzzle?difficulty=${difficulty}`);
            const data = await response.json();
            this.puzzle = data.puzzle.flat();
            this.solution = data.solution.flat();

            this.resetGameState();
            this.renderPuzzle();

            // Apply default modes from options
            this.isFastPencil = localStorage.getItem('sudoku_def_fast_pencil') === 'true';
            this.isLightningMode = localStorage.getItem('sudoku_def_lightning') === 'true';
            document.getElementById('fast-pencil-toggle').checked = this.isFastPencil;
            document.getElementById('lightning-toggle').checked = this.isLightningMode;

            this.updateGridDisplay();
            this.startTimer();
            this.showScreen('game');
            document.getElementById('game-over-modal').style.display = 'none';
        } catch (error) {
            console.error('Failed to fetch puzzle:', error);
            alert("Failed to start game. Please check your connection.");
        }
    }

    resetGameState() {
        this.errors = 0;
        this.time = 0;
        this.selectedCell = null;
        this.selectedNumber = null;
        this.errorElement.textContent = `0/3`;
        this.timerElement.textContent = `00:00`;
        this.hintsUsed = 0;
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) hintBtn.textContent = 'ヒント (0/3)';
        if (this.timerInterval) clearInterval(this.timerInterval);
        document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active', 'completed', 'just-completed'));
    }

    triggerNumberConfetti(btn) {
        const rect = btn.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
            particleCount: 40,
            spread: 60,
            origin: { x, y },
            colors: ['#6366f1', '#a855f7', '#ffffff'],
            ticks: 200,
            gravity: 1.2
        });
    }

    renderPuzzle() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, i) => {
            cell.classList.remove('selected', 'highlighted', 'same-number', 'error', 'fixed', 'user-input', 'pop-success');
            cell.innerHTML = '';
            if (this.puzzle[i] !== 0) {
                cell.textContent = this.puzzle[i];
                cell.classList.add('fixed');
            } else {
                cell.textContent = '';
            }
        });
    }

    selectCell(cell) {
        if (this.isLightningMode && this.selectedNumber) {
            this.handleInput(cell, this.selectedNumber, true);
            return;
        }

        document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected', 'highlighted', 'same-number'));
        this.selectedCell = cell;
        cell.classList.add('selected');

        const idx = parseInt(cell.dataset.index);
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const val = this.getCellDigit(cell);

        document.querySelectorAll('.cell').forEach(c => {
            const cIdx = parseInt(c.dataset.index);
            const cRow = Math.floor(cIdx / 9);
            const cCol = cIdx % 9;

            if (cRow === row || cCol === col ||
                (Math.floor(cRow / 3) === Math.floor(row / 3) && Math.floor(cCol / 3) === Math.floor(col / 3))) {
                c.classList.add('highlighted');
            }

            if (val && this.getCellDigit(c) === val) {
                c.classList.add('same-number');
            }
        });
    }

    handleInput(cell, num, fromSelection = false) {
        if (cell.classList.contains('fixed')) return;

        const idx = parseInt(cell.dataset.index);
        if (this.solution[idx] === num) {
            cell.innerHTML = ''; // Clear notes if any
            cell.textContent = num;
            cell.classList.remove('error');
            cell.classList.add('user-input', 'pop-success');
            setTimeout(() => cell.classList.remove('pop-success'), 500);
            this.updateNumberCounts(); // Optimized numpad update
            this.checkWin();
            this.updateGridDisplay();

            if (!fromSelection) {
                this.selectCell(cell);
            } else {
                this.updateLightningHighlights();
            }
        } else {
            this.errors++;
            this.errorElement.textContent = `${this.errors}/3`;

            // Miss Effect
            cell.textContent = num;
            cell.classList.add('error');

            setTimeout(() => {
                cell.classList.remove('error');
                if (cell.textContent == num) {
                    cell.textContent = '';
                }
                this.updateGridDisplay();
            }, 800);

            if (this.errors >= 3) {
                this.gameOver();
            }
        }
    }

    clearCell(cell) {
        cell.textContent = '';
        cell.innerHTML = '';
        cell.classList.remove('user-input', 'error', 'pop-success');
        this.updateGridDisplay();
    }

    updateGridDisplay() {
        if (this.isFastPencil) {
            this.showCandidates();
        } else {
            document.querySelectorAll('.notes').forEach(n => n.remove());
        }
        this.updateLightningHighlights();
        this.updateNumberCounts();
    }

    updateNumberCounts() {
        const counts = new Array(10).fill(0);
        document.querySelectorAll('.cell').forEach(c => {
            const val = this.getCellDigit(c);
            if (val !== null) {
                counts[val]++;
            }
        });

        document.querySelectorAll('.num-btn').forEach(btn => {
            const num = parseInt(btn.dataset.num);
            const remaining = 9 - counts[num];
            const count = remaining > 0 ? `${remaining}` : ''; // Minimalist count
            const isSelected = (this.isLightningMode || this.isFastPencil) && this.selectedNumber === num;

            const isJustCompleted = remaining === 0 && !btn.classList.contains('completed');

            btn.classList.toggle('active', isSelected);
            const countSpan = btn.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = count;
            }

            if (remaining === 0) {
                if (isJustCompleted) {
                    // Trigger "Just Completed" Flashy Effect!
                    btn.classList.add('just-completed');
                    this.triggerNumberConfetti(btn);
                }
                btn.classList.add('completed');
            } else {
                btn.classList.remove('completed', 'just-completed');
            }
            // Auto-select next number if current one is completed in lightning mode
            if (this.isLightningMode && this.selectedNumber === num && remaining === 0) {
                this.autoSelectNextNumber(num, counts);
            }
        });
    }

    autoSelectNextNumber(currentNum, counts) {
        for (let i = 1; i <= 9; i++) {
            const nextNum = ((currentNum + i - 1) % 9) + 1;
            if (counts[nextNum] < 9) {
                this.selectedNumber = nextNum;
                document.querySelectorAll('.num-btn').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.num) === nextNum);
                });
                this.updateLightningHighlights();
                break;
            }
        }
    }

    updateLightningHighlights() {
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('lightning-highlight'));
        document.querySelectorAll('.note-item').forEach(n => n.classList.remove('active-note'));

        // Highlight if in Lightning Mode OR if we have a selected number (e.g. via wheel/keyboard) 
        // especially useful in Fast Pencil mode to track numbers.
        if (this.selectedNumber && (this.isLightningMode || this.isFastPencil)) {
            document.querySelectorAll('.cell').forEach(c => {
                if (this.getCellDigit(c) === this.selectedNumber) {
                    c.classList.add('lightning-highlight');
                }
            });

            document.querySelectorAll(`.note-item.note-${this.selectedNumber}`).forEach(n => {
                if (n.textContent != '') n.classList.add('active-note');
            });
        }
    }

    showCandidates() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, i) => {
            if (this.getCellDigit(cell) === null) {
                const idx = parseInt(cell.dataset.index);
                const row = Math.floor(idx / 9);
                const col = idx % 9;

                let candidates = [];
                for (let n = 1; n <= 9; n++) {
                    if (this.isPossible(row, col, n)) candidates.push(n);
                }

                cell.innerHTML = '';
                const notes = document.createElement('div');
                notes.className = 'notes';
                for (let n = 1; n <= 9; n++) {
                    const noteItem = document.createElement('div');
                    noteItem.className = `note-item note-${n}`;
                    noteItem.textContent = candidates.includes(n) ? n : '';
                    notes.appendChild(noteItem);
                }
                cell.appendChild(notes);
            }
        });
    }

    getCellDigit(cell) {
        if (cell.querySelector('.notes')) return null;
        const val = cell.textContent.trim();
        return (val !== '' && !isNaN(val) && val.length === 1) ? parseInt(val) : null;
    }

    isPossible(row, col, num) {
        const cells = document.querySelectorAll('.cell');
        for (let i = 0; i < 9; i++) {
            if (this.getCellDigit(cells[row * 9 + i]) === num) return false;
            if (this.getCellDigit(cells[i * 9 + col]) === num) return false;
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.getCellDigit(cells[(startRow + i) * 9 + (startCol + j)]) === num) return false;
            }
        }
        return true;
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'easy': 'やわらかクッキー',
            'medium': '普通のクッキー',
            'hard': '堅めのクッキー',
            'expert': 'バリ堅クッキー',
            'extreme': '石'
        };
        return labels[difficulty] || difficulty.toUpperCase();
    }

    startTimer() {
        this.time = 0;
        this.timerInterval = setInterval(() => {
            this.time++;
            const minutes = Math.floor(this.time / 60).toString().padStart(2, '0');
            const seconds = (this.time % 60).toString().padStart(2, '0');
            this.timerElement.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    checkWin() {
        const cells = document.querySelectorAll('.cell');
        let filledCount = 0;
        const isComplete = Array.from(cells).every(c => {
            const val = this.getCellDigit(c);
            if (val !== null) filledCount++;
            return val !== null;
        });

        if (isComplete && filledCount === 81) {
            clearInterval(this.timerInterval);
            this.saveScore();

            // Screen Flash Effect
            const flash = document.createElement('div');
            flash.className = 'victory-flash';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 2000);

            // Ultimate Celebration
            this.celebrate();

            setTimeout(() => {
                document.getElementById('game-over-title').textContent = 'CONGRATULATIONS!';
                document.getElementById('game-over-msg').textContent = `You cleared the puzzle in ${this.timerElement.textContent}!`;
                document.getElementById('give-up-btn').style.display = 'block';
                document.getElementById('game-over-modal').style.display = 'flex';
            }, 500);
        }
    }

    celebrate() {
        const duration = 6 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 10001 }; // Always top
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 60 * (timeLeft / duration);

            // Random multi-bursts
            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.5) }
            }));
            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.5) }
            }));
            confetti(Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.4, 0.6), y: randomInRange(0.1, 0.4) }
            }));
        }, 200);
    }

    async saveScore() {
        try {
            await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: this.username,
                    difficulty: this.currentDifficulty,
                    clear_time: this.time
                })
            });
        } catch (error) {
            console.error('Failed to save score:', error);
        }
    }

    gameOver() {
        clearInterval(this.timerInterval);
        document.getElementById('game-over-title').textContent = 'GAME OVER';
        document.getElementById('game-over-msg').textContent = "ERROR limit reached (3/3).";
        document.getElementById('give-up-btn').style.display = 'block';
        document.getElementById('game-over-modal').style.display = 'flex';
    }

    giveHint() {
        if (this.hintsUsed >= 3) {
            alert("もうヒントは出し尽くしたッキー！自力で頑張るッキー！");
            return;
        }

        const emptyCells = Array.from(document.querySelectorAll('.cell')).filter(c => this.getCellDigit(c) === null);
        if (emptyCells.length === 0) return;

        this.hintsUsed++;
        document.getElementById('hint-btn').textContent = `ヒント (${this.hintsUsed}/3)`;

        const randomCell = emptyCells[Math.floor(emptyCells.length * Math.random())];
        const idx = parseInt(randomCell.dataset.index);
        this.handleInput(randomCell, this.solution[idx]);
    }

    async showRanking(difficulty) {
        try {
            const response = await fetch(`/api/ranking?difficulty=${difficulty}`);
            const ranking = await response.json();

            let html = `<table style="width:100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--panel-border); color: var(--text-secondary); font-size: 0.8rem;">
                        <th style="padding: 12px; text-align: left;">順位</th>
                        <th style="padding: 12px; text-align: left;">修行者名</th>
                        <th style="padding: 12px; text-align: right;">クリアタイム</th>
                    </tr>
                </thead>
                <tbody>`;

            if (ranking.length === 0) {
                html += `<tr><td colspan="3" style="padding: 2rem; text-align: center; color: var(--text-secondary);">まだ記録がないッキー</td></tr>`;
            } else {
                ranking.forEach((entry, i) => {
                    const mins = Math.floor(entry.clear_time / 60).toString().padStart(2, '0');
                    const secs = (entry.clear_time % 60).toString().padStart(2, '0');
                    html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 12px; font-weight: 700;">${i + 1}</td>
                        <td style="padding: 12px;">${entry.username}</td>
                        <td style="padding: 12px; text-align: right; font-family: 'Inter', monospace;">${mins}:${secs}</td>
                    </tr>`;
                });
            }

            html += `</tbody></table>`;
            document.getElementById('ranking-content').innerHTML = html;
            document.getElementById('ranking-modal').style.display = 'flex';
        } catch (error) {
            console.error('Failed to fetch ranking:', error);
        }
    }

    // --- Tutorial Logic ---
    startTutorial() {
        if (localStorage.getItem('sudoku_tutorial_seen')) return;
        this.tutorialStep = 0;
        this.showTutorialIfNeeded();
    }

    nextTutorialStep() {
        this.tutorialStep++;
        if (this.tutorialStep >= this.tutorialData.length) {
            this.endTutorial();
        } else {
            this.showTutorialIfNeeded();
        }
    }

    showTutorialIfNeeded() {
        const step = this.tutorialData[this.tutorialStep];
        if (!step) return;

        const isTitleHidden = document.getElementById('title-screen').classList.contains('hidden');
        const currentScreen = isTitleHidden ? 'game' : 'title';

        if (step.target === currentScreen) {
            document.getElementById('tutorial-content').innerHTML = step.msg;
            document.getElementById('tutorial-modal').style.display = 'flex';

            // If it's the last message of the current screen, maybe we want to hint what to do next
            // but for now let's just show it.
        } else {
            // Target screen doesn't match current screen, hide and wait
            document.getElementById('tutorial-modal').style.display = 'none';
        }
    }

    endTutorial() {
        document.getElementById('tutorial-modal').style.display = 'none';
        localStorage.setItem('sudoku_tutorial_seen', 'true');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new SudokuGame();
});
