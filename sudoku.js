document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('sudoku-board');
    const checkButton = document.getElementById('check-button');
    const messageElement = document.getElementById('message');
    const newGameButton = document.createElement('button');
    newGameButton.textContent = "New Game";
    newGameButton.id = "new-game-button";
    const targetSiteInfoElement = document.getElementById('target-site-info');

    let currentPuzzle = [];
    let currentSolution = [];
    let userBoard = [];

    // --- Логіка генерації Судоку (залишається без змін з попередньої відповіді) ---
// ... (початок sudoku.js без змін: оголошення змінних, функції генерації) ...

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function isSafe(board, row, col, num) {
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num) return false;
    }
    for (let x = 0; x < 9; x++) {
        if (board[x][col] === num) return false;
    }
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

function solveSudoku(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                shuffleArray(numbers);
                for (let num of numbers) {
                    if (isSafe(board, r, c, num)) {
                        board[r][c] = num;
                        if (solveSudoku(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function generateSudoku(difficulty = 0.5) {
    let newBoard = Array(9).fill(null).map(() => Array(9).fill(0));
    solveSudoku(newBoard);
    currentSolution = JSON.parse(JSON.stringify(newBoard));
    currentPuzzle = JSON.parse(JSON.stringify(currentSolution));
    let cellsToRemove = Math.floor(81 * difficulty);
    let attempts = cellsToRemove * 3; 
    while (cellsToRemove > 0 && attempts > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (currentPuzzle[r][c] !== 0) {
            currentPuzzle[r][c] = 0; 
            cellsToRemove--;
        }
        attempts--;
    }
    userBoard = JSON.parse(JSON.stringify(currentPuzzle));
}

function createBoard() {
    boardElement.innerHTML = '';
    messageElement.textContent = '';
    messageElement.className = '';

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('sudoku-cell');
            cell.id = `cell-${r}-${c}`; 

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.dataset.row = r;
            input.dataset.col = c;

            if (currentPuzzle[r][c] !== 0) {
                input.value = currentPuzzle[r][c];
                input.disabled = true;
            } else {
                input.addEventListener('input', (event) => {
                    handleInput(event);
                    document.getElementById(`cell-${r}-${c}`).classList.remove('error-cell');
                });
                input.addEventListener('keypress', (e) => {
                    if (!/[1-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                    }
                });
            }
            cell.appendChild(input);
            boardElement.appendChild(cell);
        }
    }
}

function handleInput(event) {
    const value = event.target.value;
    const r = parseInt(event.target.dataset.row);
    const c = parseInt(event.target.dataset.col);

    if (value === '' || (value >= '1' && value <= '9')) {
        userBoard[r][c] = value === '' ? 0 : parseInt(value);
        messageElement.textContent = '';
        const cellElement = document.getElementById(`cell-${r}-${c}`);
        if(cellElement) cellElement.classList.remove('error-cell');
    } else {
        event.target.value = userBoard[r][c] === 0 ? '' : userBoard[r][c];
    }
}

function checkSolution() {
    let isFullyCorrect = true;
    const allCells = document.querySelectorAll('.sudoku-cell');
    allCells.forEach(cellDiv => cellDiv.classList.remove('error-cell'));

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cellElement = document.getElementById(`cell-${r}-${c}`);
            const inputElement = cellElement.querySelector('input');

            if (!inputElement.disabled) { 
                const userValue = userBoard[r][c]; 
                const correctValue = currentSolution[r][c];

                if (userValue !== 0 && userValue !== correctValue) {
                    cellElement.classList.add('error-cell'); 
                    isFullyCorrect = false;
                } else if (userValue === 0 && correctValue !== 0) {
                    isFullyCorrect = false; 
                }
            }
        }
    }
    return isFullyCorrect;
}

checkButton.addEventListener('click', async () => { // Зробимо функцію асинхронною
    if (checkSolution()) {
        messageElement.textContent = 'Correct! Redirecting...';
        messageElement.className = 'correct';
        const allCells = document.querySelectorAll('.sudoku-cell');
        allCells.forEach(cellDiv => cellDiv.classList.remove('error-cell'));

        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect');

        if (redirectUrl) {
            try {
                // Встановлюємо прапорець в session storage перед перенаправленням
                await chrome.storage.session.set({ sudokuSolvedFor: redirectUrl });
                window.location.href = redirectUrl;
            } catch (error) {
                console.error("Error setting session storage in sudoku.js:", error);
                messageElement.textContent = 'Error preparing redirect. Try again.';
                messageElement.className = 'incorrect';
            }
        } else {
            messageElement.textContent = 'Error: No redirect URL found.';
            messageElement.className = 'incorrect';
        }
    } else {
        messageElement.textContent = 'Incorrect or incomplete. Check highlighted cells.';
        messageElement.className = 'incorrect';
    }
});

newGameButton.addEventListener('click', () => {
    startGame();
});

function startGame() {
    generateSudoku(0.5); 
    createBoard();
}

checkButton.parentNode.insertBefore(newGameButton, checkButton.nextSibling);
newGameButton.style.marginLeft = "10px";
newGameButton.style.padding = "10px 20px";
newGameButton.style.fontSize = "1em";
newGameButton.style.cursor = "pointer";
newGameButton.style.backgroundColor = "#007bff";
newGameButton.style.color = "white";
newGameButton.style.border = "none";
newGameButton.style.borderRadius = "4px";

const params = new URLSearchParams(window.location.search);
const redirectUrlParam = params.get('redirect');
if (redirectUrlParam) {
    try {
        const targetUrl = new URL(redirectUrlParam);
        targetSiteInfoElement.textContent = `You are trying to access: ${targetUrl.hostname}`;
    } catch (e) {
        targetSiteInfoElement.textContent = `Target site info unavailable.`;
    }
}

startGame();
});