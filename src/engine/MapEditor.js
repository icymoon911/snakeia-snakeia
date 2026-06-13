/*
 * MapEditor - Visual map editor that produces customGrid arrays.
 *
 * Usage:
 *   const editor = new MapEditor(20, 20);
 *   editor.setWall(5, 5);
 *   editor.setFruit(10, 10);
 *   const customGrid = editor.exportGrid();
 *   // customGrid can be passed directly to Grid constructor
 */
import GameConstants from "./Constants.js";
import Position from "./Position.js";

export default class MapEditor {
  constructor(width, height) {
    this.width = width || 20;
    this.height = height || 20;
    this.grid = [];
    this.snakeStartPositions = [];
    this._initEmpty();
  }

  _initEmpty() {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(GameConstants.CaseType.EMPTY);
      }
      this.grid.push(row);
    }
  }

  resize(newWidth, newHeight) {
    const oldGrid = this.grid;
    const oldHeight = this.height;
    const oldWidth = this.width;
    this.width = Math.max(3, newWidth);
    this.height = Math.max(3, newHeight);
    this.grid = [];

    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        if (y < oldHeight && x < oldWidth) {
          row.push(oldGrid[y][x]);
        } else {
          row.push(GameConstants.CaseType.EMPTY);
        }
      }
      this.grid.push(row);
    }

    // Remove snake start positions outside the new bounds
    this.snakeStartPositions = this.snakeStartPositions.filter(
      p => p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height
    );
  }

  set(x, y, value) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = value;
    }
  }

  get(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.grid[y][x];
    }
    return null;
  }

  setWall(x, y) {
    this.set(x, y, GameConstants.CaseType.WALL);
  }

  removeWall(x, y) {
    if (this.get(x, y) === GameConstants.CaseType.WALL) {
      this.set(x, y, GameConstants.CaseType.EMPTY);
    }
  }

  setFruit(x, y) {
    // Remove fruit from other positions first (single fruit mode)
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        if (this.grid[row][col] === GameConstants.CaseType.FRUIT) {
          this.grid[row][col] = GameConstants.CaseType.EMPTY;
        }
      }
    }
    this.set(x, y, GameConstants.CaseType.FRUIT);
  }

  setGoldFruit(x, y) {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        if (this.grid[row][col] === GameConstants.CaseType.FRUIT_GOLD) {
          this.grid[row][col] = GameConstants.CaseType.EMPTY;
        }
      }
    }
    this.set(x, y, GameConstants.CaseType.FRUIT_GOLD);
  }

  clear(x, y) {
    this.set(x, y, GameConstants.CaseType.EMPTY);
  }

  setSnakeStart(x, y, direction) {
    direction = direction != null ? direction : GameConstants.Direction.RIGHT;
    // Remove existing start if any
    this.snakeStartPositions = this.snakeStartPositions.filter(p => !(p.x === x && p.y === y));
    this.snakeStartPositions.push(new Position(x, y, direction));
    this.set(x, y, GameConstants.CaseType.SNAKE);
  }

  removeSnakeStart(x, y) {
    this.snakeStartPositions = this.snakeStartPositions.filter(p => !(p.x === x && p.y === y));
    if (this.get(x, y) === GameConstants.CaseType.SNAKE) {
      this.set(x, y, GameConstants.CaseType.EMPTY);
    }
  }

  clearAll() {
    this._initEmpty();
    this.snakeStartPositions = [];
  }

  addBorderWalls() {
    for (let x = 0; x < this.width; x++) {
      this.setWall(x, 0);
      this.setWall(x, this.height - 1);
    }
    for (let y = 0; y < this.height; y++) {
      this.setWall(0, y);
      this.setWall(this.width - 1, y);
    }
  }

  exportGrid() {
    // Return a clean copy with only wall/empty/fruit/snake values for customGrid usage
    const result = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        const val = this.grid[y][x];
        // Only export valid customGrid values: EMPTY(0), SNAKE(1), FRUIT(2), WALL(3), FRUIT_GOLD(6)
        if (val === GameConstants.CaseType.EMPTY ||
            val === GameConstants.CaseType.SNAKE ||
            val === GameConstants.CaseType.FRUIT ||
            val === GameConstants.CaseType.WALL ||
            val === GameConstants.CaseType.FRUIT_GOLD) {
          row.push(val);
        } else {
          row.push(GameConstants.CaseType.EMPTY);
        }
      }
      result.push(row);
    }
    return result;
  }

  exportJSON() {
    return JSON.stringify({
      width: this.width,
      height: this.height,
      grid: this.exportGrid(),
      snakeStartPositions: this.snakeStartPositions.map(p => ({
        x: p.x, y: p.y, direction: p.direction
      }))
    });
  }

  static importJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.grid)) {
      throw new Error("Invalid map editor data format");
    }
    const editor = new MapEditor(data.width, data.height);
    editor.grid = data.grid.map(row => row.slice());
    if (Array.isArray(data.snakeStartPositions)) {
      editor.snakeStartPositions = data.snakeStartPositions.map(
        p => new Position(p.x, p.y, p.direction)
      );
    }
    return editor;
  }

  static fromCustomGrid(customGrid) {
    if (!Array.isArray(customGrid) || customGrid.length === 0) {
      throw new Error("Invalid customGrid");
    }
    const height = customGrid.length;
    const width = customGrid[0].length;
    const editor = new MapEditor(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        editor.grid[y][x] = customGrid[y][x];
      }
    }
    return editor;
  }

  validate() {
    const errors = [];
    let hasEmptyCells = false;
    let fruitCount = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const val = this.grid[y][x];
        if (val === GameConstants.CaseType.EMPTY) hasEmptyCells = true;
        if (val === GameConstants.CaseType.FRUIT || val === GameConstants.CaseType.FRUIT_GOLD) fruitCount++;
      }
    }

    if (!hasEmptyCells) {
      errors.push("Grid has no empty cells");
    }

    if (this.width < 3 || this.height < 3) {
      errors.push("Grid must be at least 3x3");
    }

    return { valid: errors.length === 0, errors };
  }

  fillRect(x1, y1, x2, y2, value) {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(this.width - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(this.height - 1, Math.max(y1, y2));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.set(x, y, value);
      }
    }
  }
}
