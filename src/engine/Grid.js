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
import seedrandom from "seedrandom";
import FruitManager from "./FruitManager.js";
import MazeGenerator from "./MazeGenerator.js";
import PathFinder from "./PathFinder.js";

export default class Grid {
  constructor(width, height, generateWalls, borderWalls, maze, customGrid, mazeForceAuto, seedGrid, seedGame, probGoldFruitIncrease) {
    this.width = width == undefined ? 20 : width;
    this.height = height == undefined ? 20 : height;
    this.generateWalls = generateWalls == undefined ? false : generateWalls;
    this.borderWalls = borderWalls == undefined ? false : borderWalls;
    this.maze = maze == undefined ? false : maze;
    this.mazeFirstPosition = new Position(1, 1, GameConstants.Direction.RIGHT);
    this.mazeForceAuto = mazeForceAuto == undefined ? false : mazeForceAuto;
    this.grid;
    this.initialGrid;
    this.fruitPositions = [];
    this.fruitPosGold;
    this.customGrid = customGrid;
    this.seedGrid = seedGrid ? "" + parseInt(seedGrid) : undefined;
    this.seedGame = seedGrid ? "" + parseInt(seedGame) : undefined;
    this.rngGrid;
    this.rngGame;
    this.probGoldFruitIncrease = probGoldFruitIncrease == undefined ? false : probGoldFruitIncrease;
    this.hasOpponents = false;
  }

  init() {
    if(this.customGrid != undefined || this.initialGrid != undefined) {
      let gridToCopy;

      if(this.initialGrid != undefined) {
        gridToCopy = this.initialGrid;
      } else {
        gridToCopy = this.customGrid;
      }

      this.height = gridToCopy.length;
      this.width = gridToCopy[0].length;

      this.initialGrid = new Array(this.height);
      this.grid = new Array(this.height);

      for(let i = 0; i < this.height; i++) {
        this.initialGrid[i] = gridToCopy[i].slice();
        this.grid[i] = gridToCopy[i].slice();
      }
    } else {
      this.grid = new Array(this.height);

      for(let i = 0; i < this.height; i++) {
        this.grid[i] = new Array(this.width);

        for(let j = 0; j < this.width; j++) {
          if((this.borderWalls && (i == 0 || i == this.height - 1 || j == 0 || j == this.width - 1)) || (this.generateWalls && this.rngGrid && this.rngGrid() > 0.65) || this.maze) {
            this.grid[i][j] = GameConstants.CaseType.WALL;
          } else {
            this.grid[i][j] = GameConstants.CaseType.EMPTY;
          }
        }
      }

      if(this.maze) {
        MazeGenerator.generate(this);
      } else if(this.generateWalls) {
        this.fixWalls(this.borderWalls);
      }
    }

    this.fruitPosGold = null;
  }

  reset() {
    this.grid = undefined;
    this.initialGrid = undefined;
    this.fruitPositions = [];
    this.fruitPosGold = undefined;
    this.rngGrid = new seedrandom(this.seedGrid);
    this.rngGame = new seedrandom(this.seedGame);
  }

  setHasOpponents(hasOpponents) {
    this.hasOpponents = hasOpponents;
  }

  fixWalls(borderWalls) {
    let startY, startX, endY, endX;

    if(borderWalls) {
      startY = 1; endY = this.height - 1;
      startX = 1; endX = this.width - 1;
    } else {
      startY = 0; endY = this.height;
      startX = 0; endX = this.width;
    }

    for(let i = startY; i < endY; i++) {
      for(let j = startX; j < endX; j++) {
        const currentPos = new Position(j, i);
        const upperCase = this.getNextPosition(currentPos, GameConstants.Direction.UP);
        const upperLeftCase = this.getNextPosition(upperCase, GameConstants.Direction.LEFT);
        const upperRightCase = this.getNextPosition(upperCase, GameConstants.Direction.RIGHT);
        const downCase = this.getNextPosition(currentPos, GameConstants.Direction.BOTTOM);
        const downLeftCase = this.getNextPosition(downCase, GameConstants.Direction.LEFT);
        const downRightCase = this.getNextPosition(downCase, GameConstants.Direction.RIGHT);

        if(this.get(upperLeftCase) == GameConstants.CaseType.WALL || this.get(upperRightCase) == GameConstants.CaseType.WALL || this.get(downLeftCase) == GameConstants.CaseType.WALL || this.get(downRightCase) == GameConstants.CaseType.WALL) {
          this.set(GameConstants.CaseType.EMPTY, currentPos);
        }
      }
    }
  }

  // --- Grid data access ---

  set(value, position) {
    this.grid[position.y][position.x] = value;
  }

  get(position) {
    return this.getXY(position.x, position.y);
  }

  getXY(x, y) {
    return this.grid[y][x];
  }

  valToChar(value) {
    return GameConstants.CaseTypeText[value];
  }

  getImageCase(position) {
    return GameUtils.getImageCase(this.get(position));
  }

  getRandomPosition() {
    return new Position(GameUtils.randRange(0, this.width - 1, this.rngGame), GameUtils.randRange(0, this.height - 1, this.rngGame));
  }

  // --- Pathfinding (delegates to PathFinder) ---

  getGraph(ignoreSnakePos) {
    return PathFinder.buildGraph(this, ignoreSnakePos);
  }

  // --- Fruit management (delegates to FruitManager) ---

  setFruits(numberPlayers) {
    FruitManager.setFruits(this, numberPlayers);
  }

  setSingleFruit(tried, gold) {
    return FruitManager.setSingleFruit(this, tried, gold);
  }

  removeFruit(fruitPosition) {
    FruitManager.removeFruit(this, fruitPosition);
  }

  testFruitMaze(position, tried) {
    return PathFinder.testFruitMaze(this, position, tried);
  }

  // --- Spatial analysis ---

  isCaseSurrounded(position, fill, foundVals, forbiddenVals) {
    if(!position) return false;

    const forbidden = new Set(forbiddenVals);
    const found     = new Set(foundVals);
    const visited   = new Set();
    const checkList = [position];

    while(checkList.length > 0) {
      const currentPosition = checkList.pop();

      const nextPositions = [
        GameConstants.Direction.UP,
        GameConstants.Direction.BOTTOM,
        GameConstants.Direction.LEFT,
        GameConstants.Direction.RIGHT
      ].map(direction => this.getNextPosition(currentPosition, direction));

      for(const nextPosition of nextPositions) {
        const positionKey = nextPosition.y * this.width + nextPosition.x;

        if(visited.has(positionKey)) {
          continue;
        }

        const nextValue = this.get(nextPosition);

        if(forbidden.has(nextValue)) {
          if(found.has(nextValue)) {
            return false;
          }

          visited.add(positionKey);
          checkList.push(nextPosition);

          if(fill && nextValue == GameConstants.CaseType.EMPTY) {
            this.set(GameConstants.CaseType.SURROUNDED, nextPosition);
          }
        }
      }
    }

    const startPositionValue = this.get(position);

    if(fill && [GameConstants.CaseType.EMPTY, GameConstants.CaseType.FRUIT, GameConstants.CaseType.FRUIT_GOLD].includes(startPositionValue)) {
      this.set(GameConstants.CaseType.SURROUNDED, position);
    }

    return true;
  }

  isFruitSurrounded(position, fill) {
    const surrounded = this.isCaseSurrounded(position, false, [GameConstants.CaseType.SNAKE], [GameConstants.CaseType.EMPTY, GameConstants.CaseType.SNAKE]);

    if(surrounded && fill) {
      this.isCaseSurrounded(position, true, [GameConstants.CaseType.SNAKE], [GameConstants.CaseType.EMPTY, GameConstants.CaseType.SNAKE]);
    }

    return surrounded;
  }

  detectCorridor(position, gridCopy = this.grid ? JSON.parse(JSON.stringify(this.grid)) : null) {
    if(this.maze || !position  || !gridCopy) return false;

    const posTop = this.getNextPosition(position, GameConstants.Direction.TOP);
    const posBottom = this.getNextPosition(position, GameConstants.Direction.BOTTOM);
    const posRight = this.getNextPosition(position, GameConstants.Direction.RIGHT);
    const posLeft = this.getNextPosition(position, GameConstants.Direction.LEFT);

    const isDeadPositionTop = this.isDeadPosition(posTop, true, true);
    const isDeadPositionBottom = this.isDeadPosition(posBottom, true, true);
    const isDeadPositionRight = this.isDeadPosition(posRight, true, true);
    const isDeadPositionLeft = this.isDeadPosition(posLeft, true, true);
    const numDeadPositionArround = isDeadPositionTop + isDeadPositionBottom + isDeadPositionRight + isDeadPositionLeft;

    if(numDeadPositionArround <= 1 || this.isDeadPosition(position, true)) {
      return false;
    } else if(numDeadPositionArround >= 3) {
      return true;
    }

    gridCopy[position.y][position.x] = GameConstants.CaseType.CROSSED;

    const corridorTop = gridCopy[posTop.y][posTop.x] != GameConstants.CaseType.CROSSED ? this.detectCorridor(posTop, gridCopy) : false;
    const corridorBottom = gridCopy[posBottom.y][posBottom.x] != GameConstants.CaseType.CROSSED ? this.detectCorridor(posBottom, gridCopy) : false;
    const corridorLeft = gridCopy[posLeft.y][posLeft.x] != GameConstants.CaseType.CROSSED ? this.detectCorridor(posLeft, gridCopy) : false;
    const corridorRight = gridCopy[posRight.y][posRight.x] != GameConstants.CaseType.CROSSED ? this.detectCorridor(posRight, gridCopy) : false;

    if(corridorBottom || corridorTop || corridorLeft || corridorRight) {
      return true;
    }

    return false;
  }

  // --- Grid queries ---

  getOnLine(type, line) {
    let tot = 0;

    for(let j = 0; j < this.width; j++) {
      if(this.get(new Position(j, line)) == type) {
        tot++;
      }
    }

    return tot;
  }

  getTotal(type) {
    let tot = 0;

    for(let i = 0; i < this.height; i++) {
      tot += this.getOnLine(type, i);
    }

    return tot;
  }

  // --- Position/direction utilities ---

  getNextPosition(oldPos, newDirection) {
    const position = new Position(oldPos.x, oldPos.y, newDirection);

    switch(newDirection) {
    case GameConstants.Direction.LEFT:
      position.x--;
      position.direction = GameConstants.Direction.LEFT;
      break;
    case GameConstants.Direction.UP:
      position.y--;
      position.direction = GameConstants.Direction.UP;
      break;
    case GameConstants.Direction.RIGHT:
      position.x++;
      position.direction = GameConstants.Direction.RIGHT;
      break;
    case GameConstants.Direction.BOTTOM:
      position.y++;
      position.direction = GameConstants.Direction.BOTTOM;
      break;
    case GameConstants.Key.LEFT:
      position.x--;
      position.direction = GameConstants.Key.LEFT;
      break;
    case GameConstants.Key.UP:
      position.y--;
      position.direction = GameConstants.Key.UP;
      break;
    case GameConstants.Key.RIGHT:
      position.x++;
      position.direction = GameConstants.Direction.RIGHT;
      break;
    case GameConstants.Key.BOTTOM:
      position.y++;
      position.direction = GameConstants.Direction.BOTTOM;
      break;
    }

    if(position.x < 0) {
      position.x = this.width - 1;
    } else if(position.x >= this.width) {
      position.x = 0;
    }

    if(position.y < 0) {
      position.y = this.height - 1;
    } else if(position.y >= this.height) {
      position.y = 0;
    }

    return position;
  }

  getDirectionTo(position, otherPosition) {
    if(this.getNextPosition(position, GameConstants.Direction.UP).equals(otherPosition)) {
      return GameConstants.Direction.UP;
    } else if(this.getNextPosition(position, GameConstants.Direction.BOTTOM).equals(otherPosition)) {
      return GameConstants.Direction.BOTTOM;
    } else if(this.getNextPosition(position, GameConstants.Direction.RIGHT).equals(otherPosition)) {
      return GameConstants.Direction.RIGHT;
    } else if(this.getNextPosition(position, GameConstants.Direction.LEFT).equals(otherPosition)) {
      return GameConstants.Direction.LEFT;
    }

    return -1;
  }

  invertDirection(direction) {
    if(direction == GameConstants.Direction.UP) {
      return GameConstants.Direction.BOTTOM;
    } else if(direction == GameConstants.Direction.BOTTOM) {
      return GameConstants.Direction.UP;
    } else if(direction == GameConstants.Direction.RIGHT) {
      return GameConstants.Direction.LEFT;
    } else if(direction == GameConstants.Direction.LEFT) {
      return GameConstants.Direction.RIGHT;
    }

    return null;
  }

  isDeadPosition(position, excludeSnake, includeSurrounded) {
    return this.isDeadPositionXY(position.x, position.y, excludeSnake, includeSurrounded);
  }

  isDeadPositionXY(x, y, excludeSnake, includeSurrounded) {
    return (!excludeSnake && this.getXY(x, y) == GameConstants.CaseType.SNAKE)
      || (this.getXY(x, y) == GameConstants.CaseType.WALL)
      || (this.getXY(x, y) == GameConstants.CaseType.SNAKE_DEAD)
      || (!!includeSurrounded && this.getXY(x, y) == GameConstants.CaseType.SURROUNDED);
  }

  toString() {
    let res = "";

    for(let i = 0; i < this.height; i++) {
      for(let j = 0; j < this.width; j++) {
        res += this.valToChar(this.get(new Position(j, i))) + " ";
      }

      res += "\n";
    }

    return res;
  }
}
