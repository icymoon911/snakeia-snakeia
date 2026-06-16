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

// Whitelist of property names that may be synchronised from the engine (or
// server) to the UI and to the controller instance.  Any key that is NOT in
// this set triggers a console.warn so that typos are caught early instead of
// silently failing.
const SYNCED_PROPERTIES = new Set([
  // Engine game-state properties
  "paused", "isReseted", "exited", "grid", "numFruit", "ticks",
  "scoreMax", "gameOver", "gameFinished", "gameMazeWin", "starting",
  "initialSpeed", "speed", "snakes", "aiStuck", "precAiStuck",
  "countBeforePlay", "offsetFrame", "enablePause", "enableRetry",
  "progressiveSpeed", "errorOccurred", "engineLoading", "killed",
  // Confirmation / menu flags (cleared on every forward)
  "confirmReset", "confirmExit",
  "getInfos", "getInfosGame", "getInfosControls", "getInfosGoal",
  // Controller-specific properties that may be pushed by server data
  "lastKey", "clientSidePredictionsMode", "currentPlayer", "onlineMode",
]);

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

    // Events — register all events and auto-generate onXxx helpers
    this.reactor = new Reactor();
    this.reactor.defineEvents(ENGINE_EVENTS, this);

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
    this.update("init", this.buildStateSnapshot({
      "enablePause": this.gameEngine.enablePause,
      "enableRetry": this.gameEngine.enableRetry,
      "progressiveSpeed": this.gameEngine.progressiveSpeed,
      "offsetFrame": this.gameEngine.speed * GameConstants.Setting.TIME_MULTIPLIER,
    }));

    this._registerEngineEventForwarding();

    if(!this.gameEngine.isInit) {
      await this.gameEngine.init();
      this.update("init", { "engineLoading": false });
      await this.gameUI.startAfterEngineInit();
    }
  }

  // --- State snapshot builder ---

  /**
   * Build a full state snapshot from the engine, with optional overrides.
   *
   * The returned object contains every engine property the UI layer normally
   * needs.  Callers only have to supply the few event-specific fields (if any)
   * via `overrides`, which are merged on top of the common base.
   *
   * @param {object} [overrides={}] - Event-specific properties that replace or
   *   supplement the common snapshot.
   * @returns {object} A plain object safe to pass to `update()`.
   */
  buildStateSnapshot(overrides = {}) {
    const e = this.gameEngine;
    return {
      "paused": e.paused,
      "isReseted": e.isReseted,
      "exited": e.exited,
      "grid": e.grid,
      "numFruit": e.numFruit,
      "ticks": e.ticks,
      "scoreMax": e.scoreMax,
      "gameOver": e.gameOver,
      "gameFinished": e.gameFinished,
      "gameMazeWin": e.gameMazeWin,
      "starting": e.starting,
      "initialSpeed": e.initialSpeed,
      "speed": e.speed,
      "snakes": e.snakes,
      "countBeforePlay": e.countBeforePlay,
      "aiStuck": e.aiStuck,
      "errorOccurred": e.errorOccurred,
      "engineLoading": e.engineLoading,
      "offsetFrame": e.speed * GameConstants.Setting.TIME_MULTIPLIER,
      ...overrides,
    };
  }

  /**
   * Register event forwarding from engine reactor to controller reactor.
   * Used by the direct (non-Worker, non-Socket) controller.
   * @private
   */
  _registerEngineEventForwarding() {
    const engine = this.gameEngine;

    // Common base forwarded with every event — menu/info flags are always
    // cleared so that a stale flag cannot persist across events.
    const COMMON_FORWARD = {
      "confirmReset": false, "confirmExit": false,
      "getInfos": false, "getInfosGame": false,
      "getInfosControls": false, "getInfosGoal": false,
    };

    /**
     * Sync state and dispatch a reactor event.
     * @param {string}  key          - Message key (e.g. "reset", "start")
     * @param {object}  [overrides]  - Event-specific property overrides
     * @param {boolean} [syncToUI=true] - Whether to call update() (false = event-only)
     */
    const forward = (key, overrides, syncToUI = true) => {
      if(syncToUI) {
        this.update(key, { ...COMMON_FORWARD, ...this.buildStateSnapshot(overrides) });
      }
      this.reactor.dispatchEvent(KEY_TO_EVENT[key]);
    };

    engine.onReset(() => forward("reset", {
      "precAiStuck": false,
      "offsetFrame": engine.speed * GameConstants.Setting.TIME_MULTIPLIER,
    }));

    engine.onStart(() => forward("start", {
      "starting": engine.starting,
      "countBeforePlay": engine.countBeforePlay,
    }));

    engine.onPause(() => forward("pause"));
    engine.onContinue(() => forward("continue"));

    engine.onStop(() => forward("stop", {
      "scoreMax": engine.scoreMax,
      "gameOver": engine.gameOver,
      "gameFinished": engine.gameFinished,
    }));

    engine.onExit(() => forward("exit", {
      "gameOver": engine.gameOver,
      "gameFinished": engine.gameFinished,
      "exited": engine.exited,
    }));

    engine.onKill(() => forward("kill", {
      "gameOver": engine.gameOver,
      "killed": engine.killed,
      "gameFinished": engine.gameFinished,
    }));

    // ScoreIncreased only fires the reactor event — no state to sync.
    engine.onScoreIncreased(() => {
      this.reactor.dispatchEvent("onScoreIncreased");
    });

    engine.onUpdate(() => forward("update", {
      "offsetFrame": 0,
    }));

    engine.onUpdateCounter(() => forward("updateCounter"));
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

  /**
   * Synchronize a data payload to the UI layer and/or the controller itself.
   *
   * Every key in `data` is checked against the `SYNCED_PROPERTIES` whitelist.
   * Unknown keys are still applied (backward compatibility) but a
   * `console.warn` is emitted so that typos surface during development.
   *
   * @param {string}  message       - Event/message key (currently informational)
   * @param {object}  data          - Key/value pairs to sync
   * @param {boolean} [updateEngine=false] - Also push values into the engine
   */
  update(message, data, updateEngine) {
    if(this.gameUI == null || data == null) return;

    const dataKeys = Object.keys(data);

    for(let i = 0; i < dataKeys.length; i++) {
      const key = dataKeys[i];
      const value = data[key];

      // Validate against whitelist — warn on unknown keys so typos are caught.
      if(!SYNCED_PROPERTIES.has(key)) {
        console.warn(`[GameController.update] Unknown property "${key}" in message "${message}" — not in SYNCED_PROPERTIES whitelist`);
      }

      // Skip functions.
      if(typeof value === "function") continue;

      const shouldSync =
        (!this.clientSidePredictionsMode && !this.onlineMode) ||
        (this.clientSidePredictionsMode &&
          (key === "snakes" || key === "grid" || key === "offsetFrame" || key === "gameOver") &&
          this.onlineMode) ||
        (!this.clientSidePredictionsMode && this.onlineMode);

      if(!shouldSync) continue;

      // Sync to UI.
      if(Object.prototype.hasOwnProperty.call(this.gameUI, key) &&
         typeof this.gameUI[key] !== "function") {
        this.gameUI[key] = value;
      }

      // Optionally push into the engine.
      if(updateEngine) {
        if(data.snakes && data.snakes[this.getCurrentPlayer()]) {
          data.snakes[this.getCurrentPlayer()].lastKey = this.lastKey;
          this.lastKey = -1;
        }

        if(data.grid) {
          data.grid.rngGame = null;
          data.grid.rngGrid = null;
        }

        this.updateEngine(key, value);
      }

      // Sync to controller instance.
      if(Object.prototype.hasOwnProperty.call(this, key) &&
         typeof this[key] !== "function") {
        this[key] = value;
      }
    }

    if(Object.prototype.hasOwnProperty.call(data, "killed") && data.killed && this.gameUI && this.gameUI.setKill) {
      this.gameUI.setKill();
    }
  }
}
