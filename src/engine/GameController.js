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
import Reactor from "./Reactor.js";
import Grid from "./Grid.js";
import Snake from "./Snake.js";
import Position from "./Position.js";

// Event names shared between engine and controller
const ENGINE_EVENTS = [
  "onStart", "onPause", "onContinue", "onReset", "onStop",
  "onExit", "onKill", "onScoreIncreased", "onUpdate", "onUpdateCounter"
];

// Map from message keys to reactor event names
const KEY_TO_EVENT = {
  "init": null,
  "reset": "onReset",
  "start": "onStart",
  "pause": "onPause",
  "continue": "onContinue",
  "stop": "onStop",
  "exit": "onExit",
  "kill": "onKill",
  "scoreIncreased": "onScoreIncreased",
  "update": "onUpdate",
  "updateCounter": "onUpdateCounter"
};

export default class GameController {
  constructor(engine, ui) {
    this.gameUI = ui;
    this.gameEngine = engine;

    // Copy of game engine variables
    this.grid = null;
    this.snakes = null;
    this.lastKey = -1;
    this.paused = false;
    this.isReseted = false;
    this.exited = false;
    this.gameOver = false;
    this.starting = false;
    this.scoreMax = false;
    this.gameFinished = false;
    this.errorOccurred = false;
    this.clientSidePredictionsMode = false;
    this.currentPlayer = null;
    this.onlineMode = false;

    // Events
    this.reactor = new Reactor();
    ENGINE_EVENTS.forEach(name => this.reactor.registerEvent(name));

    this.onReset(() => {
      if(this.gameUI) {
        this.gameUI.resetState();
      }
    });
  }

  // --- Data deserialization (shared by Worker and Socket controllers) ---

  /**
   * Deserialize raw grid/snake data into proper class instances.
   * Common logic shared by GameControllerWorker and GameControllerSocket.
   * @param {object} data - The raw data object (may contain grid and snakes)
   * @returns {{grid: Grid|null, snakes: Snake[]|null}}
   */
  deserializeGameData(data) {
    if(!data) return { grid: null, snakes: null };

    let grid = this.gameUI?.grid || this.grid;

    if(Object.prototype.hasOwnProperty.call(data, "grid") && data["grid"] != null) {
      grid = Object.assign(new Grid(), data["grid"]);
      data["grid"] = grid;
    }

    if(Object.prototype.hasOwnProperty.call(data, "snakes") && data["snakes"] != null) {
      for(let i = 0; i < data["snakes"].length; i++) {
        data["snakes"][i].grid = grid;
        data["snakes"][i] = Object.assign(new Snake(), data["snakes"][i]);

        for(let j = 0; j < data["snakes"][i].queue.length; j++) {
          data["snakes"][i].queue[j] = Object.assign(new Position(), data["snakes"][i].queue[j]);
        }
      }
    }

    return { grid, snakes: data["snakes"] || null };
  }

  /**
   * Dispatch a reactor event based on a message key.
   * @param {string} key - The message key (e.g. "reset", "start")
   */
  dispatchEngineEvent(key) {
    const eventName = KEY_TO_EVENT[key];

    if(eventName) {
      this.reactor.dispatchEvent(eventName);
    }
  }

  // --- Initialization (overridden by subclasses for Worker/Socket) ---

  async init() {
    this.update("init", {
      "snakes": this.gameEngine.snakes,
      "grid": this.gameEngine.grid,
      "enablePause": this.gameEngine.enablePause,
      "enableRetry": this.gameEngine.enableRetry,
      "paused": this.gameEngine.paused,
      "progressiveSpeed": this.gameEngine.progressiveSpeed,
      "offsetFrame": this.gameEngine.speed * GameConstants.Setting.TIME_MULTIPLIER,
      "errorOccurred": this.gameEngine.errorOccurred,
      "engineLoading": this.gameEngine.engineLoading
    });

    this._registerEngineEventForwarding();

    if(!this.gameEngine.isInit) {
      await this.gameEngine.init();
      this.update("init", { "engineLoading": false });
      await this.gameUI.startAfterEngineInit();
    }
  }

  /**
   * Register event forwarding from engine reactor to controller reactor.
   * Used by the direct (non-Worker, non-Socket) controller.
   * @private
   */
  _registerEngineEventForwarding() {
    const engine = this.gameEngine;

    const forwardUpdate = (key, dataObj) => {
      this.update(key, {
        ...dataObj,
        "confirmReset": false, "confirmExit": false,
        "getInfos": false, "getInfosGame": false,
        "getInfosControls": false, "getInfosGoal": false,
        "errorOccurred": engine.errorOccurred,
        "engineLoading": engine.engineLoading
      });
    };

    engine.onReset(() => {
      forwardUpdate("reset", {
        "paused": engine.paused, "isReseted": engine.isReseted, "exited": engine.exited,
        "grid": engine.grid, "numFruit": engine.numFruit, "ticks": engine.ticks,
        "scoreMax": engine.scoreMax, "gameOver": engine.gameOver, "gameFinished": engine.gameFinished,
        "gameMazeWin": engine.gameMazeWin, "starting": engine.starting,
        "initialSpeed": engine.initialSpeed, "speed": engine.speed,
        "snakes": engine.snakes, "aiStuck": engine.aiStuck, "precAiStuck": false,
        "offsetFrame": engine.speed * GameConstants.Setting.TIME_MULTIPLIER
      });
      this.reactor.dispatchEvent("onReset");
    });

    engine.onStart(() => {
      forwardUpdate("start", {
        "snakes": engine.snakes, "grid": engine.grid,
        "starting": engine.starting, "countBeforePlay": engine.countBeforePlay,
        "paused": engine.paused, "isReseted": engine.isReseted
      });
      this.reactor.dispatchEvent("onStart");
    });

    engine.onPause(() => {
      forwardUpdate("pause", { "paused": engine.paused });
      this.reactor.dispatchEvent("onPause");
    });

    engine.onContinue(() => {
      forwardUpdate("continue", {});
      this.reactor.dispatchEvent("onContinue");
    });

    engine.onStop(() => {
      forwardUpdate("stop", {
        "paused": engine.paused, "scoreMax": engine.scoreMax,
        "gameOver": engine.gameOver, "gameFinished": engine.gameFinished
      });
      this.reactor.dispatchEvent("onStop");
    });

    engine.onExit(() => {
      forwardUpdate("exit", {
        "paused": engine.paused, "gameOver": engine.gameOver,
        "gameFinished": engine.gameFinished, "exited": engine.exited
      });
      this.reactor.dispatchEvent("onExit");
    });

    engine.onKill(() => {
      forwardUpdate("kill", {
        "paused": engine.paused, "gameOver": engine.gameOver,
        "killed": engine.killed, "snakes": engine.snakes,
        "gameFinished": engine.gameFinished, "grid": engine.grid
      });
      this.reactor.dispatchEvent("onKill");
    });

    engine.onScoreIncreased(() => {
      this.reactor.dispatchEvent("onScoreIncreased");
    });

    engine.onUpdate(() => {
      forwardUpdate("update", {
        "paused": engine.paused, "isReseted": engine.isReseted, "exited": engine.exited,
        "grid": engine.grid, "numFruit": engine.numFruit, "ticks": engine.ticks,
        "scoreMax": engine.scoreMax, "gameOver": engine.gameOver, "gameFinished": engine.gameFinished,
        "gameMazeWin": engine.gameMazeWin, "starting": engine.starting,
        "initialSpeed": engine.initialSpeed, "speed": engine.speed,
        "snakes": engine.snakes, "countBeforePlay": engine.countBeforePlay,
        "offsetFrame": 0, "aiStuck": engine.aiStuck
      });
      this.reactor.dispatchEvent("onUpdate");
    });

    engine.onUpdateCounter(() => {
      forwardUpdate("updateCounter", {
        "paused": engine.paused, "isReseted": engine.isReseted, "exited": engine.exited,
        "grid": engine.grid, "numFruit": engine.numFruit, "ticks": engine.ticks,
        "scoreMax": engine.scoreMax, "gameOver": engine.gameOver, "gameFinished": engine.gameFinished,
        "gameMazeWin": engine.gameMazeWin, "starting": engine.starting,
        "initialSpeed": engine.initialSpeed, "speed": engine.speed,
        "snakes": engine.snakes, "countBeforePlay": engine.countBeforePlay
      });
      this.reactor.dispatchEvent("onUpdateCounter");
    });
  }

  // --- Game control methods ---

  reset() { this.gameEngine.reset(); }
  async start() { this.gameEngine.start(); }
  stop() { this.gameEngine.stop(); }
  finish(finish) { this.gameEngine.stop(finish); }
  pause() { this.gameEngine.pause(); }
  kill() { this.gameEngine.kill(); }
  exit() { this.gameEngine.exit(); }
  forceStart() { this.gameEngine.forceStart(); }

  tick() {
    this.gameEngine.paused = false;
    this.gameEngine.countBeforePlay = -1;
    this.gameEngine.tick();
  }

  updateEngine(key, data) {
    this.gameEngine[key] = data;
  }

  // --- UI delegation ---

  setDisplayFPS(display) { this.gameUI.setDisplayFPS(display); }
  setDebugMode(display) { this.gameUI.setDebugMode(display); }
  setNotification(notification) { this.gameUI.setNotification(notification); }
  setGoal(goal) { this.gameUI.setGoal(goal); }
  closeRanking() { this.gameUI.gameRanking && this.gameUI.gameRanking.forceClose(); }
  setTimeToDisplay(time) { this.gameUI.setTimeToDisplay(time); }
  setBestScore(score) { this.gameUI.setBestScore(score); }
  destroySnakes(exceptionIds, types) { this.gameEngine.destroySnakes(exceptionIds, types); }

  // --- Player queries ---

  key(key) {
    this.gameEngine.lastKey = key;
    this.lastKey = key;

    const playerSnake = this.snakes[this.getCurrentPlayer()];

    if(playerSnake != null && playerSnake.lastKey != null) {
      playerSnake.lastKey = key;
    }
  }

  getCurrentPlayer() {
    if(this.snakes != null) {
      const nbPlayers = this.getNBPlayer(GameConstants.PlayerType.HUMAN);
      const nbPlayersHybrid = this.getNBPlayer(GameConstants.PlayerType.HYBRID_HUMAN_AI);

      for(let i = 0; i < this.snakes.length; i++) {
        if((this.currentPlayer == null && nbPlayers <= 1 && nbPlayersHybrid <= 1 && (this.snakes[i] && (this.snakes[i].player == GameConstants.PlayerType.HUMAN || this.snakes[i].player == GameConstants.PlayerType.HYBRID_HUMAN_AI)) || this.currentPlayer == (i + 1))) {
          return i;
        }
      }
    }

    return -1;
  }

  getNBPlayer(type) {
    let numPlayer = 0;

    if(this.snakes != null) {
      for(let i = 0; i < this.snakes.length; i++) {
        if(this.snakes[i] && this.snakes[i].player == type) {
          numPlayer++;
        }
      }
    }

    return numPlayer;
  }

  getPlayer(num, type) {
    let numPlayer = 0;

    if(this.snakes != null) {
      for(let i = 0; i < this.snakes.length; i++) {
        if(this.snakes[i] && this.snakes[i].player == type) {
          numPlayer++;
        }

        if(numPlayer == num) {
          return this.snakes[i];
        }
      }
    }

    return null;
  }

  // --- State synchronization ---

  update(message, data, updateEngine) {
    if(this.gameUI != null && data != null) {
      const dataKeys = Object.keys(data);

      for(let i = 0; i < dataKeys.length; i++) {
        if((!this.clientSidePredictionsMode && !this.onlineMode) || (this.clientSidePredictionsMode && (dataKeys[i] == "snakes" || dataKeys[i] == "grid" || dataKeys[i] == "offsetFrame" || dataKeys[i] == "gameOver") && this.onlineMode) || (!this.clientSidePredictionsMode && this.onlineMode)) {
          if(Object.prototype.hasOwnProperty.call(this.gameUI, dataKeys[i]) && typeof(data[dataKeys[i]]) !== "function" && typeof(this.gameUI[dataKeys[i]]) !== "function") {
            this.gameUI[dataKeys[i]] = data[dataKeys[i]];
          }

          if(updateEngine) {
            if(data.snakes && data.snakes[this.getCurrentPlayer()]) {
              data.snakes[this.getCurrentPlayer()].lastKey = this.lastKey;
              this.lastKey = -1;
            }

            if(data.grid) {
              data.grid.rngGame = null;
              data.grid.rngGrid = null;
            }

            this.updateEngine(dataKeys[i], data[dataKeys[i]]);
          }

          if(Object.prototype.hasOwnProperty.call(this, dataKeys[i]) && typeof(data[dataKeys[i]]) !== "function" && typeof(this[dataKeys[i]]) !== "function") {
            this[dataKeys[i]] = data[dataKeys[i]];
          }
        }
      }

      if(Object.prototype.hasOwnProperty.call(data, "killed") && data.killed && this.gameUI && this.gameUI.setKill) {
        this.gameUI.setKill();
      }
    }
  }

  // --- Event convenience methods (backward compatible) ---

  onReset(callback) { this.reactor.addEventListener("onReset", callback); }
  onStart(callback) { this.reactor.addEventListener("onStart", callback); }
  onContinue(callback) { this.reactor.addEventListener("onContinue", callback); }
  onStop(callback) { this.reactor.addEventListener("onStop", callback); }
  onPause(callback) { this.reactor.addEventListener("onPause", callback); }
  onExit(callback) { this.reactor.addEventListener("onExit", callback); }
  onKill(callback) { this.reactor.addEventListener("onKill", callback); }
  onScoreIncreased(callback) { this.reactor.addEventListener("onScoreIncreased", callback); }
}
