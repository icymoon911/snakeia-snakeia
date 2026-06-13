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
import i18next from "i18next";
import GameController from "./GameController.js";
import GameConstants from "./Constants.js";
import { NotificationMessage } from "jsgametools";
import GameEngine from "./GameEngine.js";

export default class GameControllerSocket extends GameController {
  constructor(socket, ui, enableClientSidePredictions) {
    super(new GameEngine(), ui);
    this.enableClientSidePredictions = enableClientSidePredictions || false;
    this.socket = socket;
    this.pingLatency = -1;
  }

  parseData(key, data, updateEngine) {
    if(data) {
      this.deserializeGameData(data);
      this.update(key, data, updateEngine);
    }
  }

  async init() {
    const socket = this.socket;

    // Helper for error notifications
    const showError = () => {
      this.gameUI.setNotification(new NotificationMessage(
        i18next.t("engine.servers.errorConnection"), null,
        GameConstants.Setting.ERROR_NOTIF_COLOR, null, null, null, null, true
      ));
    };

    socket.on("init", data => {
      this.parseData("init", data, this.enableClientSidePredictions);

      if(this.enableClientSidePredictions && this.gameEngine) {
        if(data && data["currentPlayer"])
          this.gameEngine.currentPlayer = data["currentPlayer"];
        if(data && data["countBeforePlay"] < 0)
          this.gameEngine.forceStart();
      }
    });

    socket.on("reset", data => {
      this.parseData("reset", data, this.enableClientSidePredictions);
      this.dispatchEngineEvent("reset");
    });

    socket.on("start", data => {
      this.parseData("start", data);
      this.dispatchEngineEvent("start");
    });

    socket.on("pause", data => {
      this.parseData("pause", data);
      this.dispatchEngineEvent("pause");
    });

    socket.on("continue", data => {
      this.parseData("continue", data);
      this.dispatchEngineEvent("continue");
    });

    socket.on("stop", data => {
      this.parseData("stop", data, this.enableClientSidePredictions);
      this.dispatchEngineEvent("stop");
    });

    socket.on("exit", data => {
      this.parseData("exit", data);
      this.gameEngine.exit();
      this.dispatchEngineEvent("exit");
    });

    socket.on("kill", data => {
      this.parseData("kill", data);
      this.gameEngine.kill();
      this.dispatchEngineEvent("kill");
    });

    socket.on("scoreIncreased", data => {
      this.parseData("scoreIncreased", data);
      this.dispatchEngineEvent("scoreIncreased");
    });

    socket.on("update", data => {
      this.parseData("update", data, this.enableClientSidePredictions);

      if(!this.gameEngine.clientSidePredictionsMode) {
        this.gameUI.offsetFrame = 0;
      }

      this.dispatchEngineEvent("update");
    });

    socket.on("updateCounter", data => {
      this.parseData("updateCounter", data);

      if(data && data.countBeforePlay < 0) {
        if(this.enableClientSidePredictions) {
          this.gameEngine.forceStart();
        }
      }

      this.dispatchEngineEvent("updateCounter");
    });

    socket.on("notification", (text, duration, textColor, backgroundColor, foreground) => {
      this.gameUI.setNotification(new NotificationMessage(text, textColor, backgroundColor, duration, null, null, null, foreground));
    });

    socket.once("error", showError);
    socket.once("connect_error", showError);
    socket.once("connect_timeout", showError);
    socket.once("reconnect_error", showError);

    await this.gameUI.startAfterEngineInit();
  }

  // --- Override game control methods to send socket messages ---

  reset() { this.socket.emit("reset"); }
  start() { this.socket.emit("start"); }
  stop() { this.socket.emit("stop"); }
  finish(finish) { this.socket.emit(finish ? "finish" : "stop"); }
  pause() { this.socket.emit("pause"); }
  kill() { this.socket.emit("kill"); }
  tick() { this.socket.emit("tick"); }
  exit() { this.socket.emit("exit"); }
  forceStart() { this.socket.emit("forceStart"); }

  key(key) {
    this.socket.emit("key", key);
    super.key(key);
    this.lastKey = this.gameEngine.lastKey;
  }
}
