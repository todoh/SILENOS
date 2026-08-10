// js/sudokuEngine.js
// Motor de Sudoku 9x9 Optimizado y Autónomo

export class SudokuEngine {
    constructor() {
        this.N = 9;
        this.boxRows = 3;
        this.boxCols = 3;
        this.currentGrid = [];
        this.solutionGrid = [];
        this.initialGrid = [];
        this.selectedCell = null;
    }

    isSafe(grid, row, col, num) {
        for (let x = 0; x < this.N; x++) {
            if (grid[row][x] === num || grid[x][col] === num) return false;
        }

        let startRow = row - (row % this.boxRows);
        let startCol = col - (col % this.boxCols);

        for (let i = 0; i < this.boxRows; i++) {
            for (let j = 0; j < this.boxCols; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }
        return true;
    }

    generateValidBaseGrid() {
        let grid = Array(this.N).fill(0).map(() => Array(this.N).fill(0));
        
        for (let i = 0; i < this.N; i += this.boxRows) {
            let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
            let idx = 0;
            for (let r = 0; r < this.boxRows; r++) {
                for (let c = 0; c < this.boxCols; c++) {
                    grid[i + r][i + c] = nums[idx++];
                }
            }
        }

        this.solveSudoku(grid);
        return grid;
    }

    solveSudoku(grid) {
        for (let r = 0; r < this.N; r++) {
            for (let c = 0; c < this.N; c++) {
                if (grid[r][c] === 0) {
                    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    for (let num of nums) {
                        if (this.isSafe(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (this.solveSudoku(grid)) return true;
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    generateNewSudoku(player, emptyCellsCount = 40) {
        this.solutionGrid = this.generateValidBaseGrid();
        this.initialGrid = this.solutionGrid.map(row => [...row]);
        
        let count = emptyCellsCount;
        while (count > 0) {
            let cellIdx = Math.floor(Math.random() * (this.N * this.N));
            let r = Math.floor(cellIdx / this.N);
            let c = cellIdx % this.N;
            
            if (this.initialGrid[r][c] !== 0) {
                this.initialGrid[r][c] = 0;
                count--;
            }
        }

        this.currentGrid = this.initialGrid.map(row => [...row]);
        this.selectedCell = null;
        this.saveStateToPlayer(player);
    }

    saveStateToPlayer(player) {
        if (!player) return;
        player.sudokuState = {
            currentGrid: this.currentGrid.flat(),
            solutionGrid: this.solutionGrid.flat(),
            initialGrid: this.initialGrid.flat(),
            active: true
        };
    }

    loadStateFromPlayer(player) {
        if (!player || !player.sudokuState || !player.sudokuState.active) {
            return false;
        }

        const restoreGrid = (flatArray) => {
            if (!flatArray || !Array.isArray(flatArray)) return Array(9).fill(0).map(() => Array(9).fill(0));
            if (Array.isArray(flatArray[0])) return flatArray;
            
            let grid = [];
            for (let i = 0; i < 9; i++) {
                grid.push(flatArray.slice(i * 9, (i + 1) * 9));
            }
            return grid;
        };

        this.currentGrid = restoreGrid(player.sudokuState.currentGrid);
        this.solutionGrid = restoreGrid(player.sudokuState.solutionGrid);
        this.initialGrid = restoreGrid(player.sudokuState.initialGrid);
        return true;
    }

    setCellValue(player, row, col, val) {
        if (this.initialGrid[row][col] !== 0) return false;
        this.currentGrid[row][col] = val;
        this.saveStateToPlayer(player);
        return true;
    }

    isCompleted() {
        for (let r = 0; r < this.N; r++) {
            for (let c = 0; c < this.N; c++) {
                if (this.currentGrid[r][c] !== this.solutionGrid[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }

    completeJob(player, skipped = false) {
        let finalMoney = 150;
        let finalRep = 3;
        let penaltyCost = 0;

        if (skipped) {
            finalMoney = 0;
            finalRep = 0;
            penaltyCost = 30; // Coste/Penalización al saltar el Sudoku
            player.money = Math.max(0, (player.money || 0) - penaltyCost);
        } else {
            if (!player.statsCustom) player.statsCustom = {};
            player.statsCustom.sudokusCompleted = (player.statsCustom.sudokusCompleted || 0) + 1;
            player.money = (player.money || 0) + finalMoney;
            player.reputation = (player.reputation || 0) + finalRep;
        }

        if (player.sudokuState) {
            player.sudokuState.active = false;
            player.sudokuState.currentGrid = [];
            player.sudokuState.solutionGrid = [];
            player.sudokuState.initialGrid = [];
        }

        return { money: finalMoney, reputation: finalRep, penaltyCost, skipped };
    }

    renderUI(containerEl, player, onUpdateCallback) {
        if (!containerEl) return;
        containerEl.innerHTML = "";

        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; min-height:80px; justify-content:center;";

        const hasActiveState = player && player.sudokuState && player.sudokuState.active === true;

        if (!hasActiveState) {
            wrapper.innerHTML = `
                <div style="text-align:center; padding:10px; width:100%;">
                    <p style="font-size:0.8em; color:var(--text-dim); margin-bottom:12px;">Comienza tu turno de trabajo mental con un Sudoku 9x9.</p>
                    <button id="btn-start-sudoku" style="width:100%;">GENERAR Y COMENZAR TRABAJO</button>
                </div>
            `;
            containerEl.appendChild(wrapper);

            const btnStart = wrapper.querySelector("#btn-start-sudoku");
            if (btnStart) {
                btnStart.addEventListener("click", () => {
                    this.generateNewSudoku(player, 40);
                    if (onUpdateCallback) onUpdateCallback();
                });
            }
            return;
        }

        this.loadStateFromPlayer(player);

        const boardControls = document.createElement("div");
        boardControls.style.cssText = "display:flex; justify-content:space-between; width:100%; align-items:center; margin-bottom:8px;";
        boardControls.innerHTML = `
            <span style="font-size:0.75em; font-weight:bold;">FORMATO: 9x9 | ESTADO: EN CURSO</span>
            <button id="btn-skip-sudoku" class="btn-secondary" style="padding:4px 8px; font-size:0.65em;">SALTAR (-30 $ Penalización)</button>
        `;

        const boardContainer = document.createElement("div");
        boardContainer.style.cssText = "background:#000; padding:2px; border:2px solid var(--border-glass); border-radius:8px; overflow-x:auto; max-width:100%; margin:0 auto;";

        const gridEl = document.createElement("div");
        gridEl.style.cssText = `display:grid; gap:1px; background:#000; grid-template-columns:repeat(9, minmax(28px, 34px)); grid-template-rows:repeat(9, minmax(28px, 34px));`;

        for (let r = 0; r < this.N; r++) {
            for (let c = 0; c < this.N; c++) {
                const cell = document.createElement("div");
                cell.style.cssText = `
                    display:flex; align-items:center; justify-content:center;
                    font-weight:bold; font-size:0.85em; user-select:none; cursor:pointer;
                    background: ${this.initialGrid[r][c] !== 0 ? 'rgba(230,230,230,0.9)' : '#ffffff'};
                    color: ${this.initialGrid[r][c] !== 0 ? 'var(--accent)' : '#000000'};
                `;

                if (r % 3 === 0 && r !== 0) cell.style.borderTop = "2px solid #000";
                if (c % 3 === 0 && c !== 0) cell.style.borderLeft = "2px solid #000";

                if (this.selectedCell && this.selectedCell.row === r && this.selectedCell.col === c) {
                    cell.style.background = "#ffeaa7";
                }

                let val = this.currentGrid[r][c];
                cell.textContent = val !== 0 ? val : '';

                cell.addEventListener("click", () => {
                    if (this.initialGrid[r][c] === 0) {
                        this.selectedCell = { row: r, col: c };
                        this.renderUI(containerEl, player, onUpdateCallback);
                    }
                });

                gridEl.appendChild(cell);
            }
        }

        boardContainer.appendChild(gridEl);

        const numpad = document.createElement("div");
        numpad.style.cssText = "display:flex; gap:4px; flex-wrap:wrap; justify-content:center; max-width:320px; margin-top:8px;";

        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement("button");
            btn.style.cssText = "padding:6px 8px; font-size:0.75em; flex:1; min-width:30px;";
            btn.textContent = i;
            btn.addEventListener("click", () => {
                if (this.selectedCell) {
                    this.setCellValue(player, this.selectedCell.row, this.selectedCell.col, i);
                    if (this.isCompleted()) {
                        const res = this.completeJob(player, false);
                        alert(`¡Sudoku completado! Recompensa: +${res.money} $ | +${res.reputation} Reputación.`);
                    }
                    if (onUpdateCallback) onUpdateCallback();
                }
            });
            numpad.appendChild(btn);
        }

        const eraseBtn = document.createElement("button");
        eraseBtn.className = "btn-cancel";
        eraseBtn.style.cssText = "padding:6px 8px; font-size:0.7em; width:100%; margin-top:4px;";
        eraseBtn.textContent = "BORRAR CELDA";
        eraseBtn.addEventListener("click", () => {
            if (this.selectedCell) {
                this.setCellValue(player, this.selectedCell.row, this.selectedCell.col, 0);
                if (onUpdateCallback) onUpdateCallback();
            }
        });
        numpad.appendChild(eraseBtn);

        wrapper.appendChild(boardControls);
        wrapper.appendChild(boardContainer);
        wrapper.appendChild(numpad);
        containerEl.appendChild(wrapper);

        const btnSkip = wrapper.querySelector("#btn-skip-sudoku");
        if (btnSkip) {
            btnSkip.addEventListener("click", () => {
                const res = this.completeJob(player, true);
                alert(`Trabajo saltado. Penalización aplicada: -${res.penaltyCost} $. No recibes recompensa.`);
                if (onUpdateCallback) onUpdateCallback();
            });
        }
    }
}