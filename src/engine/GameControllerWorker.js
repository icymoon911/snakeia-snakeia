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
import GameController from "./GameController.js";

export default class GameControllerWorker extends GameController {
  constructor(game, ui) {
    super(game, ui);
    this.worker;
    this.workerReady = false;
    this.messageQueue = [];
  }

  init() {
    if(!window.Worker) {
      if(this.gameUI != null) {
        this.update("init", { "errorOccurred": true });
      }

      return Promise.resolve();
    }

    try {
      this.worker = new Worker("dist/GameEngineWorker.js");
    } catch(e) {
      console.error(e);
      this.update("init", { "errorOccurred": true });
      return Promise.resolve();
    }

    this.update("init", { "engineLoading": true });

    if(!(this.worker instanceof Worker)) {
      if(this.gameUI != null) {
        this.update("init", { "errorOccurred": true });
      }

      return Promise.resolve();
    }

    if(this.gameEngine && this.gameEngine.grid && this.gameEngine.grid.rngGrid) this.gameEngine.grid.rngGrid = null;
    if(this.gameEngine && this.gameEngine.grid && this.gameEngine.grid.rngGame) this.gameEngine.grid.rngGame = null;

    return new Promise(resolve => {
      this.worker.onmessage = async e => {
        const message = e.data;

        if(message == "ready") {
          this.worker.postMessage(["init", this.gameEngine]);
          return;
        }

        if(Array.isArray(message) && message.length > 1) {
          const key = message[0];
          const data = message[1];

          this.deserializeGameData(data);
          this.update(key, data);

          if(key === "init") {
            this.workerReady = true;
            this.update("init", { "engineLoading": false });
            this.passQueuedMessages();
            await this.gameUI.startAfterEngineInit();
            resolve();
          } else if(key === "kill") {
            this.dispatchEngineEvent(key);
            this.worker.terminate();
          } else {
            this.dispatchEngineEvent(key);
          }
        }
      };
    });
  }

  // --- Override game control methods to send worker messages ---

  reset() { this.passMessage(["reset"]); }
  start() { this.passMessage(["start"]); }
  stop() { this.passMessage(["stop"]); }
  finish(finish) { this.passMessage([finish ? "finish" : "stop"]); }
  pause() { this.passMessage(["pause"]); }
  kill() { this.passMessage(["kill"]); }
  tick() { this.passMessage(["tick"]); }
  exit() { this.passMessage(["exit"]); }
  key(key) { this.passMessage(["key", key]); }
  forceStart() { this.passMessage(["forceStart"]); }

  updateEngine(key, data) {
    this.passMessage(["update", { "key": key, "data": data }]);
  }

  destroySnakes(exceptionIds, types) {
    this.passMessage(["destroySnakes", exceptionIds, types]);
  }

  // --- Worker communication ---

  passMessage(message) {
    if(this.workerReady && this.worker instanceof Worker) {
      this.worker.postMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  passQueuedMessages() {
    if(this.workerReady && this.worker instanceof Worker) {
      this.messageQueue.forEach(message => {
        this.worker.postMessage(message);
      });

      this.messageQueue = [];
    }
  }
}
