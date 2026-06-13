/*
 * LocalMultiplayer - Manages local split-keyboard multiplayer for 2 human players.
 *
 * Player 1 uses WASD keys, Player 2 uses Arrow keys.
 *
 * Usage:
 *   const mp = new LocalMultiplayer(gameController);
 *   mp.enable();
 *   // ... game runs, keys are dispatched to correct snake ...
 *   mp.disable();
 */
import GameConstants from "./Constants.js";

// WASD key codes
const WASD = {
  W: 87,  // Up
  A: 65,  // Left
  S: 83,  // Down
  D: 68   // Right
};

// Arrow key codes (same as GameConstants.Key)
const ARROWS = {
  UP: GameConstants.Key.UP,
  DOWN: GameConstants.Key.BOTTOM,
  LEFT: GameConstants.Key.LEFT,
  RIGHT: GameConstants.Key.RIGHT
};

export default class LocalMultiplayer {
  constructor(controller) {
    this.controller = controller;
    this.enabled = false;
    this._keydownHandler = null;
    // Player index mapping: player 1 = index 0 (WASD), player 2 = index 1 (Arrows)
    this.player1Index = 0;
    this.player2Index = 1;
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    this._keydownHandler = (e) => {
      if (!this.enabled || !this.controller || !this.controller.snakes) return;

      const keyCode = e.keyCode || e.which;
      let targetSnakeIndex = -1;
      let mappedKey = -1;

      // Check WASD (Player 1)
      if (keyCode === WASD.W) { mappedKey = GameConstants.Key.UP; targetSnakeIndex = this.player1Index; }
      else if (keyCode === WASD.S) { mappedKey = GameConstants.Key.BOTTOM; targetSnakeIndex = this.player1Index; }
      else if (keyCode === WASD.A) { mappedKey = GameConstants.Key.LEFT; targetSnakeIndex = this.player1Index; }
      else if (keyCode === WASD.D) { mappedKey = GameConstants.Key.RIGHT; targetSnakeIndex = this.player1Index; }
      // Check Arrows (Player 2)
      else if (keyCode === ARROWS.UP) { mappedKey = GameConstants.Key.UP; targetSnakeIndex = this.player2Index; }
      else if (keyCode === ARROWS.DOWN) { mappedKey = GameConstants.Key.BOTTOM; targetSnakeIndex = this.player2Index; }
      else if (keyCode === ARROWS.LEFT) { mappedKey = GameConstants.Key.LEFT; targetSnakeIndex = this.player2Index; }
      else if (keyCode === ARROWS.RIGHT) { mappedKey = GameConstants.Key.RIGHT; targetSnakeIndex = this.player2Index; }

      if (targetSnakeIndex >= 0 && mappedKey >= 0) {
        e.preventDefault();
        this._dispatchKeyToSnake(targetSnakeIndex, mappedKey);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("keydown", this._keydownHandler);
    }
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    if (typeof document !== "undefined" && this._keydownHandler) {
      document.removeEventListener("keydown", this._keydownHandler);
    }
    this._keydownHandler = null;
  }

  _dispatchKeyToSnake(snakeIndex, key) {
    if (!this.controller || !this.controller.snakes) return;
    const snakes = this.controller.snakes;
    if (snakeIndex >= 0 && snakeIndex < snakes.length && snakes[snakeIndex]) {
      const snake = snakes[snakeIndex];
      if (!snake.gameOver && (snake.player === GameConstants.PlayerType.HUMAN || snake.player === GameConstants.PlayerType.HYBRID_HUMAN_AI)) {
        snake.lastKey = key;
      }
    }
  }

  setPlayerIndices(p1Index, p2Index) {
    this.player1Index = p1Index;
    this.player2Index = p2Index;
  }

  static get WASD_KEYS() {
    return WASD;
  }

  static get ARROW_KEYS() {
    return ARROWS;
  }

  static isWASDKey(keyCode) {
    return keyCode === WASD.W || keyCode === WASD.A || keyCode === WASD.S || keyCode === WASD.D;
  }

  static isArrowKey(keyCode) {
    return keyCode === ARROWS.UP || keyCode === ARROWS.DOWN || keyCode === ARROWS.LEFT || keyCode === ARROWS.RIGHT;
  }

  /**
   * Create a two-human-snake game configuration.
   * Returns an array of Snake constructor parameters for two human players.
   */
  static createTwoPlayerConfig(grid, snake1Name, snake2Name) {
    // Import dynamically not needed - caller passes grid
    return {
      grid: grid,
      snakes: [
        { direction: GameConstants.Direction.RIGHT, length: 3, grid: grid, player: GameConstants.PlayerType.HUMAN, aiLevel: GameConstants.AiLevel.DEFAULT, autoRetry: false, name: snake1Name || "Player 1" },
        { direction: GameConstants.Direction.LEFT, length: 3, grid: grid, player: GameConstants.PlayerType.HUMAN, aiLevel: GameConstants.AiLevel.DEFAULT, autoRetry: false, name: snake2Name || "Player 2" }
      ]
    };
  }
}
