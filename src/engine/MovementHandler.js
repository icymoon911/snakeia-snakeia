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

/**
 * MovementHandler - Encapsulates snake movement, collision handling,
 * score management, and speed control logic.
 * Extracted from GameEngine to reduce its responsibilities.
 */
export default class MovementHandler {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Move a snake according to its player type and current input/AI.
   * @param {Snake} snake - The snake to move
   * @param {number} initialDirection - The snake's direction before this move
   * @returns {Position|null} The new head position, or null if move was blocked
   */
  moveSnake(snake, initialDirection) {
    const engine = this.engine;

    if(snake.player == GameConstants.PlayerType.HUMAN || snake.player == GameConstants.PlayerType.HYBRID_HUMAN_AI) {
      snake.moveTo(snake.lastKey);
      snake.lastKey = -1;
    } else if(snake.player == GameConstants.PlayerType.AI && (!engine.clientSidePredictionsMode || (engine.clientSidePredictionsMode && snake.aiLevel != GameConstants.AiLevel.RANDOM))) {
      snake.moveTo(snake.ai());
    }

    const headSnakePos = snake.getHeadPosition();
    const nextIsDeadPosition = engine.grid.isDeadPosition(snake.getNextPosition(headSnakePos, snake.direction));

    if(snake.player == GameConstants.PlayerType.HYBRID_HUMAN_AI && nextIsDeadPosition) {
      snake.direction = initialDirection;
      snake.moveTo(snake.ai());
      snake.lastKey = -1;
    }

    // If maze and player human, ignore dead position
    if(engine.grid.maze && snake.player == GameConstants.PlayerType.HUMAN && nextIsDeadPosition) {
      snake.direction = initialDirection;
      snake.lastKey = -1;
      return null;
    }

    return snake.getNextPosition(headSnakePos, snake.direction);
  }

  /**
   * Handle the result of a snake's move (fruit eating or normal movement).
   * @param {Position} headSnakePos - The snake's new head position
   * @param {Snake} snake - The snake that moved
   * @returns {{goldFruit: boolean, scoreHasIncreased: boolean, setFruits: boolean}}
   */
  handleSnakeMoveResult(headSnakePos, snake) {
    const engine = this.engine;
    const cellType = engine.grid.get(headSnakePos);

    if(cellType == GameConstants.CaseType.FRUIT || cellType == GameConstants.CaseType.FRUIT_GOLD) {
      return this.handleScoreIncrease(snake, cellType, headSnakePos);
    } else {
      snake.insert(headSnakePos);

      if(!engine.grid.maze) {
        snake.remove();
        snake.lastTailMoved = true;
        snake.lastHeadMoved = true;
      }
    }

    return { goldFruit: false, scoreHasIncreased: false, setFruits: false };
  }

  /**
   * Handle score increase when a snake eats a fruit.
   * @param {Snake} snake - The snake that ate
   * @param {number} cellType - The type of fruit eaten
   * @param {Position} headSnakePos - Position of the eaten fruit
   * @returns {{goldFruit: boolean, scoreHasIncreased: boolean, setFruits: boolean}}
   */
  handleScoreIncrease(snake, cellType, headSnakePos) {
    const engine = this.engine;
    let setFruits = false;
    let goldFruit = false;

    if(cellType == GameConstants.CaseType.FRUIT) {
      snake.increaseScore(1);
      engine.grid.removeFruit(headSnakePos);
    } else if(cellType == GameConstants.CaseType.FRUIT_GOLD) {
      snake.increaseScore(3);

      goldFruit = true;

      engine.grid.set(GameConstants.CaseType.EMPTY, engine.grid.fruitPosGold);
      engine.grid.fruitPosGold = null;
    }

    snake.insert(headSnakePos);

    if(engine.grid.maze) {
      engine.gameMazeWin = true;
      engine.gameFinished = true;

      engine.stop();
    } else if(snake.hasMaxScore() && engine.snakes.length <= 1) {
      engine.scoreMax = true;
      snake.scoreMax = true;

      engine.stop();
    } else {
      engine.numFruit++;

      if(!goldFruit) {
        setFruits = true;
      }
    }

    this.handleSpeedIncrease(snake);

    return { goldFruit, scoreHasIncreased: true, setFruits };
  }

  /**
   * Adjust game speed based on score (progressive speed mode).
   * @param {Snake} snake - The snake whose score increased
   */
  handleSpeedIncrease(snake) {
    const engine = this.engine;

    if(engine.snakes.length <= 1 && engine.progressiveSpeed && snake.score > 0 && engine.initialSpeed > 1) {
      engine.initialSpeed = Math.ceil(((-engine.initialSpeedUntouched / 100) * snake.score) + engine.initialSpeedUntouched);
      engine.initialSpeed = engine.initialSpeed < 1 ? 1 : engine.initialSpeed;
    }
  }
}
