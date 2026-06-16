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

/**
 * Explicit, typed game state container.
 *
 * Replaces the old `Object.keys(data)` brute-force copy in GameController.update().
 * Every field that the engine layer pushes to the UI must be declared here as a
 * first-class property with a well-defined default value. If a caller tries to set
 * a key that doesn't exist on this class, a warning is emitted so typos are caught
 * at development time instead of silently failing.
 *
 * The class also exposes `applyPatch(patch)` which accepts a plain object of
 * key-value pairs and applies them through validated setters.
 */
export default class GameState {
  constructor() {
    // ── Engine state (mirrored from GameEngine) ──────────────────────────────
    this.grid = null;
    this.snakes = null;
    this.speed = 8;
    this.initialSpeed = 8;
    this.ticks = 0;
    this.countBeforePlay = -1;
    this.numFruit = 0;
    this.paused = true;
    this.exited = false;
    this.killed = false;
    this.isReseted = true;
    this.gameOver = false;
    this.gameFinished = false;
    this.gameMazeWin = false;
    this.scoreMax = false;
    this.enablePause = false;
    this.enableRetry = false;
    this.progressiveSpeed = false;
    this.aiStuck = false;
    this.precAiStuck = false;
    this.starting = false;
    this.errorOccurred = false;
    this.engineLoading = false;
    this.offsetFrame = 0;

    // ── Online state ─────────────────────────────────────────────────────────
    this.onlineMode = false;
    this.spectatorMode = false;
    this.pingLatency = -1;
    this.playerNumber = 0;
    this.maxPlayers = 0;
    this.timeStart = 0;
    this.lastTime = 0;
    this.currentPlayer = null;
    this.onlineMaster = false;
    this.searchingPlayers = false;
    this.enableRetryPauseMenu = true;

    // ── Internal flag ────────────────────────────────────────────────────────
    this._knownKeys = new Set(Object.keys(this));
    this._knownKeys.delete("_knownKeys");
  }

  /**
   * Apply a patch object to this state. Only known keys are accepted.
   * Unknown keys emit a console.warn so development-time bugs are visible.
   *
   * @param {Object} patch - key/value pairs to apply
   * @param {string} [source] - optional label for the warning messages
   * @returns {string[]} list of keys that were actually applied
   */
  applyPatch(patch, source) {
    if (!patch || typeof patch !== "object") return [];

    const applied = [];

    for (const key of Object.keys(patch)) {
      const value = patch[key];

      if (typeof value === "function") {
        continue;
      }

      if (!this._knownKeys.has(key)) {
        console.warn(
          `[GameState] Unknown state key "${key}"` +
          (source ? ` from "${source}"` : "") +
          " — ignored. Add it to GameState if it should be tracked."
        );
        continue;
      }

      this[key] = value;
      applied.push(key);
    }

    return applied;
  }

  /**
   * Return a plain-object snapshot of the entire state.
   * Useful for debugging or serialisation.
   */
  toObject() {
    const obj = {};
    for (const key of this._knownKeys) {
      obj[key] = this[key];
    }
    return obj;
  }
}
