/*
 * Copyright (C) 2019-2020 Eliastik (eliastiksofts.com)
 *
 * This file is part of "SnakeIA".
 *
 * "SnakeIA" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "SnakeIA" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "SnakeIA".  If not, see <http://www.gnu.org/licenses/>.
 */
import GameConstants from "./Constants.js";
import Position from "./Position.js";
import Grid from "./Grid.js";

/**
 * GridEditor - programmatic map editor for creating custom grids.
 *
 * Provides an API to place walls, fruits, and empty cells on a grid,
 * then export the result as a customGrid 2D array compatible with the Grid class.
 *
 * Usage:
 *   const editor = new GridEditor(20, 15);
 *   editor.setCell(5, 5, GameConstants.CaseType.WALL);
 *   editor.placeBorderWalls();
 *   const customGrid = editor.export();
 *   const grid = new Grid(20, 15, false, false, false, customGrid, false);
 */
export default class GridEditor {
  /**
   * @param {number} width - Grid width in cells
   * @param {number} height - Grid height in cells
   */
  constructor(width, height) {
    this.width = Math.max(3, width || 20);
    this.height = Math.max(3, height || 20);
    this.undoStack = [];
    this.redoStack = [];

    // Initialize empty grid
    this.grid = [];
    for(let i = 0; i < this.height; i++) {
      this.grid[i] = [];
      for(let j = 0; j < this.width; j++) {
        this.grid[i][j] = GameConstants.CaseType.EMPTY;
      }
    }
  }

  /**
   * Get the value at a given cell.
   * @param {number} x
   * @param {number} y
   * @returns {number} CaseType value
   */
  getCell(x, y) {
    if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.grid[y][x];
  }

  /**
   * Set a cell to a given CaseType value with undo support.
   * @param {number} x
   * @param {number} y
   * @param {number} value - GameConstants.CaseType value
   * @returns {boolean} true if successful
   */
  setCell(x, y, value) {
    if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }

    // Only allow valid CaseType values for the editor
    const validTypes = [
      GameConstants.CaseType.EMPTY,
      GameConstants.CaseType.WALL,
      GameConstants.CaseType.FRUIT,
      GameConstants.CaseType.FRUIT_GOLD
    ];

    if(!validTypes.includes(value)) {
      return false;
    }

    // Save for undo
    const previousValue = this.grid[y][x];
    this.undoStack.push({ x, y, previousValue });
    this.redoStack = []; // Clear redo on new action

    this.grid[y][x] = value;
    return true;
  }

  /**
   * Set a cell without recording to undo stack (for bulk operations).
   */
  setCellDirect(x, y, value) {
    if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    this.grid[y][x] = value;
    return true;
  }

  /**
   * Undo the last cell change.
   * @returns {boolean} true if undo was performed
   */
  undo() {
    if(this.undoStack.length === 0) return false;

    const action = this.undoStack.pop();
    this.redoStack.push({ x: action.x, y: action.y, previousValue: this.grid[action.y][action.x] });
    this.grid[action.y][action.x] = action.previousValue;
    return true;
  }

  /**
   * Redo the last undone change.
   * @returns {boolean} true if redo was performed
   */
  redo() {
    if(this.redoStack.length === 0) return false;

    const action = this.redoStack.pop();
    this.undoStack.push({ x: action.x, y: action.y, previousValue: this.grid[action.y][action.x] });
    this.grid[action.y][action.x] = action.previousValue;
    return true;
  }

  /**
   * Place walls along all border cells.
   */
  placeBorderWalls() {
    for(let i = 0; i < this.height; i++) {
      this.setCellDirect(0, i, GameConstants.CaseType.WALL);
      this.setCellDirect(this.width - 1, i, GameConstants.CaseType.WALL);
    }
    for(let j = 0; j < this.width; j++) {
      this.setCellDirect(j, 0, GameConstants.CaseType.WALL);
      this.setCellDirect(j, this.height - 1, GameConstants.CaseType.WALL);
    }
  }

  /**
   * Place a wall rectangle.
   */
  placeWallRect(x, y, w, h) {
    for(let dy = 0; dy < h; dy++) {
      for(let dx = 0; dx < w; dx++) {
        this.setCellDirect(x + dx, y + dy, GameConstants.CaseType.WALL);
      }
    }
  }

  /**
   * Fill an area with walls.
   */
  fillWalls() {
    for(let i = 0; i < this.height; i++) {
      for(let j = 0; j < this.width; j++) {
        this.grid[i][j] = GameConstants.CaseType.WALL;
      }
    }
  }

  /**
   * Clear the entire grid to empty.
   */
  clear() {
    for(let i = 0; i < this.height; i++) {
      for(let j = 0; j < this.width; j++) {
        this.grid[i][j] = GameConstants.CaseType.EMPTY;
      }
    }
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Place a fruit at the given position.
   */
  placeFruit(x, y, gold) {
    return this.setCell(x, y, gold ? GameConstants.CaseType.FRUIT_GOLD : GameConstants.CaseType.FRUIT);
  }

  /**
   * Place a wall at the given position.
   */
  placeWall(x, y) {
    return this.setCell(x, y, GameConstants.CaseType.WALL);
  }

  /**
   * Erase (set to empty) the given position.
   */
  erase(x, y) {
    return this.setCell(x, y, GameConstants.CaseType.EMPTY);
  }

  /**
   * Count cells of a given type.
   */
  countCells(type) {
    let count = 0;
    for(let i = 0; i < this.height; i++) {
      for(let j = 0; j < this.width; j++) {
        if(this.grid[i][j] === type) count++;
      }
    }
    return count;
  }

  /**
   * Validate the grid for playability.
   * Returns an object with { valid: boolean, errors: string[], warnings: string[] }.
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check minimum size
    if(this.width < 3 || this.height < 3) {
      errors.push("Grid must be at least 3x3");
    }

    // Count empty cells
    const emptyCount = this.countCells(GameConstants.CaseType.EMPTY);
    if(emptyCount < 3) {
      errors.push("Grid must have at least 3 empty cells for the snake to spawn");
    }

    // Check connectivity: all empty cells should be reachable from any empty cell
    const connectivityResult = this._checkConnectivity();
    if(!connectivityResult.connected && emptyCount > 0) {
      warnings.push(`Grid has ${connectivityResult.components} disconnected empty regions. Snakes may not be able to reach all fruits.`);
    }

    // Check for a minimum open area for snake movement
    const maxOpenArea = connectivityResult.maxComponentSize || 0;
    if(maxOpenArea < 6) {
      warnings.push("Largest open area is very small (< 6 cells). Gameplay may be limited.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if all empty cells are connected (flood fill).
   */
  _checkConnectivity() {
    const visited = [];
    for(let i = 0; i < this.height; i++) {
      visited[i] = [];
      for(let j = 0; j < this.width; j++) {
        visited[i][j] = false;
      }
    }

    let components = 0;
    let maxComponentSize = 0;

    for(let i = 0; i < this.height; i++) {
      for(let j = 0; j < this.width; j++) {
        if(this.grid[i][j] === GameConstants.CaseType.EMPTY && !visited[i][j]) {
          const size = this._floodFill(j, i, visited);
          components++;
          maxComponentSize = Math.max(maxComponentSize, size);
        }
      }
    }

    return {
      connected: components <= 1,
      components,
      maxComponentSize
    };
  }

  /**
   * BFS flood fill from a starting cell. Returns the number of cells filled.
   */
  _floodFill(startX, startY, visited) {
    const queue = [{ x: startX, y: startY }];
    visited[startY][startX] = true;
    let count = 0;

    while(queue.length > 0) {
      const { x, y } = queue.shift();
      count++;

      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
      ];

      for(const n of neighbors) {
        if(n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height
          && !visited[n.y][n.x] && this.grid[n.y][n.x] === GameConstants.CaseType.EMPTY) {
          visited[n.y][n.x] = true;
          queue.push(n);
        }
      }
    }

    return count;
  }

  /**
   * Export the grid as a 2D array compatible with Grid customGrid parameter.
   * @returns {number[][]}
   */
  export() {
    const result = [];
    for(let i = 0; i < this.height; i++) {
      result[i] = this.grid[i].slice();
    }
    return result;
  }

  /**
   * Export as a formatted string for display or copy-paste.
   * @returns {string}
   */
  exportAsString() {
    let str = "[\n";
    for(let i = 0; i < this.height; i++) {
      str += "  [" + this.grid[i].join(", ") + "]";
      if(i < this.height - 1) str += ",";
      str += "\n";
    }
    str += "]";
    return str;
  }

  /**
   * Create a Grid instance from this editor's current state.
   * @param {object} [options] - Additional Grid options
   * @returns {Grid}
   */
  createGrid(options) {
    const customGrid = this.export();
    const opts = options || {};
    return new Grid(
      this.width,
      this.height,
      opts.generateWalls || false,
      opts.borderWalls || false,
      opts.maze || false,
      customGrid,
      opts.mazeForceAuto || false,
      opts.seedGrid,
      opts.seedGame
    );
  }

  /**
   * Import a customGrid 2D array into this editor.
   * @param {number[][]} customGrid
   * @returns {boolean} true if import was successful
   */
  import(customGrid) {
    if(!Array.isArray(customGrid) || customGrid.length === 0) {
      return false;
    }

    const newHeight = customGrid.length;
    const newWidth = customGrid[0].length;

    // Validate all rows have same width
    for(let i = 0; i < newHeight; i++) {
      if(!Array.isArray(customGrid[i]) || customGrid[i].length !== newWidth) {
        return false;
      }
    }

    this.width = newWidth;
    this.height = newHeight;
    this.grid = [];
    this.undoStack = [];
    this.redoStack = [];

    for(let i = 0; i < newHeight; i++) {
      this.grid[i] = customGrid[i].slice();
    }

    return true;
  }

  /**
   * Resize the grid. Existing content outside new bounds is clipped.
   * @param {number} newWidth
   * @param {number} newHeight
   */
  resize(newWidth, newHeight) {
    newWidth = Math.max(3, newWidth);
    newHeight = Math.max(3, newHeight);

    const newGrid = [];
    for(let i = 0; i < newHeight; i++) {
      newGrid[i] = [];
      for(let j = 0; j < newWidth; j++) {
        if(i < this.height && j < this.width) {
          newGrid[i][j] = this.grid[i][j];
        } else {
          newGrid[i][j] = GameConstants.CaseType.EMPTY;
        }
      }
    }

    this.width = newWidth;
    this.height = newHeight;
    this.grid = newGrid;
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Mirror the grid horizontally.
   */
  mirrorHorizontal() {
    for(let i = 0; i < this.height; i++) {
      this.grid[i].reverse();
    }
  }

  /**
   * Mirror the grid vertically.
   */
  mirrorVertical() {
    this.grid.reverse();
  }

  /**
   * Rotate the grid 90 degrees clockwise.
   */
  rotate90() {
    const newGrid = [];
    const newWidth = this.height;
    const newHeight = this.width;

    for(let i = 0; i < newHeight; i++) {
      newGrid[i] = [];
      for(let j = 0; j < newWidth; j++) {
        newGrid[i][j] = this.grid[this.height - 1 - j][i];
      }
    }

    this.width = newWidth;
    this.height = newHeight;
    this.grid = newGrid;
  }
}
