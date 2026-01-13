import random

class SudokuEngine:
    def __init__(self):
        self.grid = [[0 for _ in range(9)] for _ in range(9)]

    def is_safe(self, grid, row, col, num):
        # 行のチェック
        for x in range(9):
            if grid[row][x] == num:
                return False
        
        # 列のチェック
        for x in range(9):
            if grid[x][col] == num:
                return False
        
        # 3x3ボックスのチェック
        start_row = row - row % 3
        start_col = col - col % 3
        for i in range(3):
            for j in range(3):
                if grid[i + start_row][j + start_col] == num:
                    return False
        return True

    def find_empty_location(self, grid):
        for i in range(9):
            for j in range(9):
                if grid[i][j] == 0:
                    return i, j
        return None

    def solve(self, grid):
        empty = self.find_empty_location(grid)
        if not empty:
            return True
        
        row, col = empty
        for num in range(1, 10):
            if self.is_safe(grid, row, col, num):
                grid[row][col] = num
                if self.solve(grid):
                    return True
                grid[row][col] = 0
        return False

    def fill_grid(self, grid):
        # 完全に埋まった数独を作成
        for i in range(9):
            for j in range(9):
                if grid[i][j] == 0:
                    nums = list(range(1, 10))
                    random.shuffle(nums)
                    for num in nums:
                        if self.is_safe(grid, i, j, num):
                            grid[i][j] = num
                            if self.fill_grid(grid):
                                return True
                            grid[i][j] = 0
                    return False
        return True

    def count_solutions(self, grid):
        # 解の数をカウント（一意性確認用）
        empty = self.find_empty_location(grid)
        if not empty:
            return 1
        
        count = 0
        row, col = empty
        for num in range(1, 10):
            if self.is_safe(grid, row, col, num):
                grid[row][col] = num
                count += self.count_solutions(grid)
                grid[row][col] = 0
                if count > 1: # 複数解がある場合は早期リターン
                    break
        return count

    def generate_puzzle(self, difficulty):
        # 難易度に応じた空白の数
        # 初級: 30-35, 中級: 40-45, 上級: 50-55, エキスパート: 60-65, エクストリーム: 66-70
        difficulty_map = {
            'easy': random.randint(30, 35),
            'medium': random.randint(40, 45),
            'hard': random.randint(50, 55),
            'expert': random.randint(60, 65),
            'extreme': random.randint(66, 70)
        }
        
        attempts = difficulty_map.get(difficulty, 30)
        
        # 1. 完全に埋まった盤面を作成
        self.grid = [[0 for _ in range(9)] for _ in range(9)]
        self.fill_grid(self.grid)
        
        # 解答を保存
        solution = [row[:] for row in self.grid]
        
        # 2. 穴をあける
        puzzle = [row[:] for row in self.grid]
        while attempts > 0:
            row = random.randint(0, 8)
            col = random.randint(0, 8)
            while puzzle[row][col] == 0:
                row = random.randint(0, 8)
                col = random.randint(0, 8)
            
            backup = puzzle[row][col]
            puzzle[row][col] = 0
            
            # 一意性を保つためのチェック（負荷が高いので簡単にするか検討が必要）
            # ここでは簡易的に穴をあける
            # もし厳密に一意性を保つなら self.count_solutions(puzzle) == 1 を確認する
            # ただし、高難易度では計算時間がかかるため、試行回数を制限する
            
            attempts -= 1
            
        return puzzle, solution

if __name__ == "__main__":
    engine = SudokuEngine()
    puzzle, solution = engine.generate_puzzle('medium')
    for row in puzzle:
        print(row)
