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
import PathFinder from "./PathFinder.js";

/**
 * FruitManager - Encapsulates fruit placement, removal, and stuck detection.
 * Delegates grid data access to the grid instance passed as parameter.
 */
export default class FruitManager {
  /**
   * Place fruits on the grid for the current number of alive players.
   * @param {Grid} grid - The grid to place fruits on
   * @param {number} numberPlayers - Number of alive players
   */
  static setFruits(grid, numberPlayers) {
    const tried = [1];
    const fruitCountToSpawn = Math.min(numberPlayers, GameConstants.Setting.MAX_FRUITS_PER_GRID);

    if(grid.getTotal(GameConstants.CaseType.EMPTY) > 0 && grid.fruitPositions.length < fruitCountToSpawn) {
      let errorSettingFruit = false;

      do {
        errorSettingFruit = !FruitManager.setSingleFruit(grid, tried, false);
      } while(!errorSettingFruit && grid.fruitPositions.length < fruitCountToSpawn);
    }

    const probaSetGoldFruit = grid.probGoldFruitIncrease ? 3 :
      (numberPlayers > 1 ? GameConstants.Setting.PROB_GOLD_FRUIT_MULTIPLE_PLAYERS : GameConstants.Setting.PROB_GOLD_FRUIT_1_PLAYER);
    const shouldSetGoldFruit = GameUtils.randRange(1, probaSetGoldFruit, grid.rngGame) == 1;

    if(!grid.maze && grid.fruitPosGold == null && shouldSetGoldFruit) {
      FruitManager.setSingleFruit(grid, tried, true);
    }
  }

  /**
   * Place a single fruit (normal or gold) on the grid.
   * @param {Grid} grid - The grid
   * @param {number[]} tried - Mutable attempt counter
   * @param {boolean} gold - Whether to place a gold fruit
   * @returns {boolean} True if fruit was placed successfully
   */
  static setSingleFruit(grid, tried, gold) {
    let randomPos, isCorridor;

    do {
      randomPos = grid.getRandomPosition();
      isCorridor = grid.detectCorridor(randomPos);

      if(isCorridor && grid.get(randomPos) == GameConstants.CaseType.EMPTY) {
        grid.set(GameConstants.CaseType.SURROUNDED, randomPos);
      }

      if(grid.getTotal(GameConstants.CaseType.EMPTY) <= 0) {
        return false;
      }
    } while(grid.get(randomPos) != GameConstants.CaseType.EMPTY || grid.isFruitSurrounded(randomPos, true) || (grid.maze && !PathFinder.testFruitMaze(grid, randomPos, tried)) || isCorridor);

    if(gold) {
      grid.fruitPosGold = randomPos;
      grid.set(GameConstants.CaseType.FRUIT_GOLD, randomPos);
    } else {
      grid.fruitPositions.push(randomPos);
      grid.set(GameConstants.CaseType.FRUIT, randomPos);
    }

    return true;
  }

  /**
   * Remove a fruit from the grid.
   * @param {Grid} grid - The grid
   * @param {Position} fruitPosition - Position of the fruit to remove
   */
  static removeFruit(grid, fruitPosition) {
    grid.set(GameConstants.CaseType.EMPTY, fruitPosition);
    grid.fruitPositions = grid.fruitPositions.filter(position => !fruitPosition.equals(position));
  }

  /**
   * Handle stuck fruits: relocate fruits in corridors or surrounded by snakes.
   * Called by GameEngine each tick.
   * @param {Grid} grid - The grid
   * @param {number} nbPlayerAlive - Number of alive players
   * @param {boolean} scoreMax - Whether score max has been reached
   * @param {boolean} clientSidePredictionsMode - Whether client-side predictions are on
   */
  static handleStuckFruits(grid, nbPlayerAlive, scoreMax, clientSidePredictionsMode) {
    for(const fruitPos of grid.fruitPositions) {
      if(!scoreMax && (grid.detectCorridor(fruitPos) || grid.isFruitSurrounded(fruitPos, true)) && !clientSidePredictionsMode) {
        FruitManager.removeFruit(grid, fruitPos);
        FruitManager.setFruits(grid, nbPlayerAlive);
      }
    }

    if(!scoreMax && grid.fruitPosGold != null && (grid.detectCorridor(grid.fruitPosGold) || grid.isFruitSurrounded(grid.fruitPosGold, true))) {
      grid.set(GameConstants.CaseType.EMPTY, grid.fruitPosGold);
      grid.fruitPosGold = null;
    }
  }
}
