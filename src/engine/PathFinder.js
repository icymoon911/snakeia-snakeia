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
import GameUtils from "./GameUtils.js";
import GameConstants from "./Constants.js";
import Position from "./Position.js";
import Lowlight from "../../libs/lowlight.astar.min.js";

/**
 * PathFinder - Encapsulates A* pathfinding logic for the grid.
 * Used by Grid and AI modules for path computation.
 */
export default class PathFinder {
  /**
   * Build a 2D graph representation of the grid for pathfinding.
   * @param {Grid} grid - The grid to build a graph for
   * @param {boolean} ignoreSnakePos - Whether to treat snake positions as passable
   * @returns {number[][]} 2D array where 0 = passable, 1 = blocked
   */
  static buildGraph(grid, ignoreSnakePos) {
    const res = new Array(grid.height);

    for(let i = 0; i < grid.height; i++) {
      res[i] = new Array(grid.width);

      for(let j = 0; j < grid.width; j++) {
        const currentPos = new Position(j, i);

        if(ignoreSnakePos && grid.get(currentPos) == GameConstants.CaseType.SNAKE) {
          res[i][j] = 0;
        } else if(grid.isDeadPosition(currentPos)) {
          res[i][j] = 1;
        } else {
          res[i][j] = 0;
        }
      }
    }

    return res;
  }

  /**
   * Find a path between two positions using A*.
   * @param {number[][]} graph - Graph from buildGraph
   * @param {{x: number, y: number}} from - Start position
   * @param {{x: number, y: number}} to - End position
   * @param {object} options - A* options (torus, diagonals, etc.)
   * @returns {Array} Path as array of {x, y} positions
   */
  static findPath(graph, from, to, options = {}) {
    const config = new Lowlight.Astar.Configuration(graph, {
      order: "yx",
      torus: options.torus || false,
      diagonals: options.diagonals || false,
      cutting: options.cutting || false,
      static: options.static !== undefined ? options.static : true,
      cost(a, b) { return b == 1 ? null : 1; }
    });

    return config.path(
      { x: from.x, y: from.y },
      { x: to.x, y: to.y }
    );
  }

  /**
   * Test if a fruit position is far enough from the maze start.
   * Used in maze mode to avoid placing fruit too close to the snake.
   * @param {Grid} grid - The grid
   * @param {Position} position - Fruit position to test
   * @param {number[]} tried - Mutable counter [attempts]
   * @returns {boolean} True if position is acceptable
   */
  static testFruitMaze(grid, position, tried) {
    const graphData = PathFinder.buildGraph(grid, true);
    const path = PathFinder.findPath(graphData,
      { x: grid.mazeFirstPosition.x, y: grid.mazeFirstPosition.y },
      { x: position.x, y: position.y },
      { torus: false }
    );

    tried[0]++;

    if(path.length < Math.ceil(grid.getTotal(GameConstants.CaseType.EMPTY) / (1 * Math.ceil(tried[0] / 4)))) {
      return false;
    }

    return true;
  }
}
