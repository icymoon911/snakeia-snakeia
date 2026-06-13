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
import Snake from "./Snake.js";
import Grid from "./Grid.js";

/**
 * LocalMultiplayer - manages local two-player mode with split keyboard controls.
 *
 * Player 1: Arrow keys (Up/Right/Down/Left)
 * Player 2: WASD keys (W/A/S/D)
 *
 * Both players control separate snakes on the same grid, sharing the same
 * game engine instance.
 *
 * Usage:
 *   const mp = new LocalMultiplayer();
 *   mp.setup(controller); // Pass a GameController instance
 *   // or
 *   mp.setupFromEngine(engine); // Pass a GameEngine directly
 *   mp.enable();
 *   // ...play...
 *   mp.disable();
 *   mp.destroy();
 */
export default class LocalMultiplayer {
  constructor() {
    this.enabled = false;
    this.controller = null;
    this.engine = null;

    // Player assignments: index into the snakes array
    this.player1SnakeIndex = 0;
    this.player2SnakeIndex = 1;

    // Key bindings for each player
    this.player1Keys = {
      up: GameConstants.Key.UP,     // 38
      right: GameConstants.Key.RIGHT, // 39
      down: GameConstants.Key.BOTTOM, // 40
      left: GameConstants.Key.LEFT   // 37
    };

    this.player2Keys = {
      up: 87,    // W
      right: 68, // D
      down: 83,  // S
      left: 65   // A
    };

    // WASD to direction mapping
    this.wasdToDirection = {
      87: GameConstants.Key.UP,     // W -> UP
      68: GameConstants.Key.RIGHT,  // D -> RIGHT
      83: GameConstants.Key.BOTTOM, // S -> DOWN
      65: GameConstants.Key.LEFT    // A -> LEFT
    };

    // Bound event handler for cleanup
    this._keyDownHandler = this._onKeyDown.bind(this);
    this._keyUpHandler = this._onKeyUp.bind(this);

    // Track pressed keys for preventing default browser behavior
    this.pressedKeys = new Set();

    // All managed key codes
    this.managedKeys = new Set([
      ...Object.values(this.player1Keys),
      ...Object.values(this.player2Keys)
    ]);
  }

  /**
   * Setup using a GameController.
   * @param {GameController} controller
   */
  setup(controller) {
    this.controller = controller;
    this.engine = controller.gameEngine;
  }

  /**
   * Setup directly from a GameEngine.
   * @param {GameEngine} engine
   */
  setupFromEngine(engine) {
    this.engine = engine;
    this.controller = null;
  }

  /**
   * Enable keyboard listeners for two-player mode.
   */
  enable() {
    if(this.enabled) return;

    if(typeof window === "undefined" || typeof document === "undefined") {
      console.warn("LocalMultiplayer: window/document not available");
      return;
    }

    this.enabled = true;
    document.addEventListener("keydown", this._keyDownHandler);
    document.addEventListener("keyup", this._keyUpHandler);
  }

  /**
   * Disable keyboard listeners.
   */
  disable() {
    if(!this.enabled) return;

    this.enabled = false;
    this.pressedKeys.clear();

    if(typeof document !== "undefined") {
      document.removeEventListener("keydown", this._keyDownHandler);
      document.removeEventListener("keyup", this._keyUpHandler);
    }
  }

  /**
   * Handle keydown event - route to correct player.
   */
  _onKeyDown(event) {
    if(!this.enabled || !this.engine) return;

    const keyCode = event.keyCode || event.which;

    // Prevent default for managed keys to avoid page scrolling
    if(this.managedKeys.has(keyCode)) {
      event.preventDefault();
    }

    // Avoid repeated key events
    if(this.pressedKeys.has(keyCode)) return;
    this.pressedKeys.add(keyCode);

    // Check which player this key belongs to
    const directionKey = this._keyToDirectionKey(keyCode);

    if(directionKey !== null) {
      this._sendKeyToPlayer(directionKey.player, directionKey.key);
    }
  }

  /**
   * Handle keyup event.
   */
  _onKeyUp(event) {
    if(!this.enabled) return;

    const keyCode = event.keyCode || event.which;
    this.pressedKeys.delete(keyCode);
  }

  /**
   * Map a raw key code to a player index and direction key.
   * @param {number} keyCode
   * @returns {{ player: number, key: number } | null}
   */
  _keyToDirectionKey(keyCode) {
    // Player 1: Arrow keys
    const p1Values = Object.values(this.player1Keys);
    if(p1Values.includes(keyCode)) {
      return { player: 1, key: keyCode };
    }

    // Player 2: WASD -> convert to arrow key equivalents
    if(keyCode in this.wasdToDirection) {
      return { player: 2, key: this.wasdToDirection[keyCode] };
    }

    return null;
  }

  /**
   * Send a direction key to a specific player's snake.
   * @param {number} playerNum - 1 or 2
   * @param {number} key - Direction key code (arrow key codes)
   */
  _sendKeyToPlayer(playerNum, key) {
    if(!this.engine || !this.engine.snakes) return;

    const snakeIndex = playerNum === 1 ? this.player1SnakeIndex : this.player2SnakeIndex;
    const snake = this.engine.snakes[snakeIndex];

    if(snake && !snake.gameOver && !snake.scoreMax) {
      snake.lastKey = key;
    }
  }

  /**
   * Create the two human snakes for a two-player game.
   * @param {Grid} grid - The game grid
   * @param {string} [name1="Player 1"] - Name for player 1
   * @param {string} [name2="Player 2"] - Name for player 2
   * @returns {Snake[]} Array of two Snake instances
   */
  static createTwoPlayerSnakes(grid, name1, name2) {
    const snake1 = new Snake(
      GameConstants.Direction.RIGHT,
      3,
      grid,
      GameConstants.PlayerType.HUMAN,
      null,
      false,
      name1 || "Player 1"
    );

    const snake2 = new Snake(
      GameConstants.Direction.LEFT,
      3,
      grid,
      GameConstants.PlayerType.HUMAN,
      null,
      false,
      name2 || "Player 2"
    );

    return [snake1, snake2];
  }

  /**
   * Get key binding labels for display purposes.
   * @returns {object}
   */
  static getKeyLabels() {
    return {
      player1: {
        up: "Arrow Up",
        right: "Arrow Right",
        down: "Arrow Down",
        left: "Arrow Left"
      },
      player2: {
        up: "W",
        right: "D",
        down: "S",
        left: "A"
      }
    };
  }

  /**
   * Remap keys for a player.
   * @param {number} playerNum - 1 or 2
   * @param {object} newKeys - { up, right, down, left } key codes
   */
  remapKeys(playerNum, newKeys) {
    if(playerNum === 1) {
      this.player1Keys = { ...this.player1Keys, ...newKeys };
    } else if(playerNum === 2) {
      this.player2Keys = { ...this.player2Keys, ...newKeys };
      // Also update WASD to direction mapping
      this.wasdToDirection = {};
      this.wasdToDirection[newKeys.up || this.player2Keys.up] = GameConstants.Key.UP;
      this.wasdToDirection[newKeys.right || this.player2Keys.right] = GameConstants.Key.RIGHT;
      this.wasdToDirection[newKeys.down || this.player2Keys.down] = GameConstants.Key.BOTTOM;
      this.wasdToDirection[newKeys.left || this.player2Keys.left] = GameConstants.Key.LEFT;
    }

    // Rebuild managed keys
    this.managedKeys = new Set([
      ...Object.values(this.player1Keys),
      ...Object.values(this.player2Keys)
    ]);
  }

  /**
   * Check if two-player mode is properly configured.
   * @returns {object} { ready: boolean, issues: string[] }
   */
  checkConfiguration() {
    const issues = [];

    if(!this.engine) {
      issues.push("No game engine attached");
    } else if(!this.engine.snakes || this.engine.snakes.length < 2) {
      issues.push("Engine must have at least 2 snakes");
    } else {
      const snake1 = this.engine.snakes[this.player1SnakeIndex];
      const snake2 = this.engine.snakes[this.player2SnakeIndex];

      if(!snake1 || snake1.player !== GameConstants.PlayerType.HUMAN) {
        issues.push("Player 1's snake must be HUMAN type");
      }
      if(!snake2 || snake2.player !== GameConstants.PlayerType.HUMAN) {
        issues.push("Player 2's snake must be HUMAN type");
      }
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }

  /**
   * Clean up all resources.
   */
  destroy() {
    this.disable();
    this.controller = null;
    this.engine = null;
  }
}
