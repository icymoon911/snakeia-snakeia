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
import GameConstants from "../Constants.js";

/**
 * Abstract base class for all Snake AI strategies.
 *
 * Contract (Strategy pattern):
 *   - Subclasses MUST override `ai(snake)` and return a direction key
 *     (one of GameConstants.Key values) or null when no move is possible.
 *   - The base implementation of `ai()` throws to catch missing overrides early.
 *
 * Helpers provided by the base class:
 *   - `computeFruitGoals(snake)` – sorts visible fruits by distance / priority
 *     and stores the result in `this.aiFruitGoalsSorted`.
 *     Subclasses that need fruit targeting should call this at the start of their
 *     `ai()` implementation (equivalent to the old `super.ai(snake)` call).
 */
export default class SnakeAI {
  constructor() {
    /** @type {Array<{type: number, position: object, dist: number, goldPriority?: number}>} */
    this.aiFruitGoalsSorted = [];

    /** Human-readable level tag (overridden by each concrete subclass). */
    this.aiLevelText = "custom";
  }

  // ---------------------------------------------------------------------------
  // Abstract method – subclasses MUST override
  // ---------------------------------------------------------------------------

  /**
   * Compute the next move direction for the given snake.
   *
   * @param {import("../Snake.js").default} snake – the snake instance to move
   * @returns {number|null} a GameConstants.Key value, or null if no move is available
   * @abstract
   */
  ai(snake) { // eslint-disable-line no-unused-vars
    throw new Error(
      `SnakeAI subclass "${this.constructor.name}" must implement ai(snake). `
      + "Returning null silently is no longer allowed."
    );
  }

  // ---------------------------------------------------------------------------
  // Protected helpers
  // ---------------------------------------------------------------------------

  /**
   * Build and cache the sorted list of fruit goals for the current tick.
   * Call this at the beginning of every `ai()` override that needs fruit targeting.
   *
   * @param {import("../Snake.js").default} snake
   * @returns {Array} the sorted goals array (also stored on `this.aiFruitGoalsSorted`)
   */
  computeFruitGoals(snake) {
    const currentPosition = snake.getHeadPosition();
    const fruitPositions = snake.grid.fruitPositions || [];
    const fruitPosGold = snake.grid.fruitPosGold;

    const goals = [];

    for (const fruitPos of fruitPositions) {
      if (snake.grid.get(fruitPos) === GameConstants.CaseType.FRUIT) {
        const dist =
          Math.abs(fruitPos.x - currentPosition.x) +
          Math.abs(fruitPos.y - currentPosition.y);
        goals.push({ type: GameConstants.CaseType.FRUIT, position: fruitPos, dist });
      }
    }

    if (fruitPosGold && snake.grid.get(fruitPosGold) === GameConstants.CaseType.FRUIT_GOLD) {
      const dist =
        Math.abs(fruitPosGold.x - currentPosition.x) +
        Math.abs(fruitPosGold.y - currentPosition.y);
      const closestNormalDist =
        goals.length > 0 ? Math.min(...goals.map((g) => g.dist)) : Infinity;
      const goldPriority = closestNormalDist <= dist * 0.8 ? 1 : 0;

      goals.push({
        type: GameConstants.CaseType.FRUIT_GOLD,
        position: fruitPosGold,
        dist,
        goldPriority,
      });
    }

    goals.sort((a, b) => {
      const pa = a.goldPriority ?? 1;
      const pb = b.goldPriority ?? 1;

      if (pa !== pb) return pa - pb;
      return a.dist - b.dist;
    });

    this.aiFruitGoalsSorted = goals;
    return goals;
  }
}
