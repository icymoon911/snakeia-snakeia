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

/**
 * MazeGenerator - Encapsulates maze generation logic for the grid.
 * Uses a recursive backtracking algorithm to carve passages.
 */
export default class MazeGenerator {
  /**
   * Generate a maze on the given grid using recursive backtracking.
   * @param {Grid} grid - The grid to generate the maze on
   */
  static generate(grid) {
    grid.mazeFirstPosition = new Position(1, 1, GameConstants.Direction.RIGHT);
    grid.set(GameConstants.CaseType.EMPTY, grid.mazeFirstPosition);
    MazeGenerator._recurse(grid, 1, 1);
  }

  /**
   * Recursive backtracking step for maze generation.
   * @param {Grid} grid - The grid
   * @param {number} r - Current row
   * @param {number} c - Current column
   */
  static _recurse(grid, r, c) {
    const directions = GameUtils.shuffle(
      [GameConstants.Direction.UP, GameConstants.Direction.RIGHT, GameConstants.Direction.BOTTOM, GameConstants.Direction.LEFT],
      grid.rngGrid
    );

    for(let i = 0; i < directions.length; i++) {
      switch(directions[i]) {
      case GameConstants.Direction.UP:
        if(r - 2 <= 0) continue;

        if(grid.get(new Position(c, r - 2)) != GameConstants.CaseType.EMPTY) {
          grid.set(GameConstants.CaseType.EMPTY, new Position(c, r - 2));
          grid.set(GameConstants.CaseType.EMPTY, new Position(c, r - 1));
          MazeGenerator._recurse(grid, r - 2, c);
        }

        break;
      case GameConstants.Direction.RIGHT:
        if(c + 2 >= grid.width - 1) continue;

        if(grid.get(new Position(c + 2, r)) != GameConstants.CaseType.EMPTY) {
          grid.set(GameConstants.CaseType.EMPTY, new Position(c + 2, r));
          grid.set(GameConstants.CaseType.EMPTY, new Position(c + 1, r));
          MazeGenerator._recurse(grid, r, c + 2);
        }

        break;
      case GameConstants.Direction.BOTTOM:
        if(r + 2 >= grid.height - 1) continue;

        if(grid.get(new Position(c, r + 2)) != GameConstants.CaseType.EMPTY) {
          grid.set(GameConstants.CaseType.EMPTY, new Position(c, r + 2));
          grid.set(GameConstants.CaseType.EMPTY, new Position(c, r + 1));
          MazeGenerator._recurse(grid, r + 2, c);
        }

        break;
      case GameConstants.Direction.LEFT:
        if(c - 2 <= 0) continue;

        if(grid.get(new Position(c - 2, r)) != GameConstants.CaseType.EMPTY) {
          grid.set(GameConstants.CaseType.EMPTY, new Position(c - 2, r));
          grid.set(GameConstants.CaseType.EMPTY, new Position(c - 1, r));
          MazeGenerator._recurse(grid, r, c - 2);
        }

        break;
      }
    }
  }
}
