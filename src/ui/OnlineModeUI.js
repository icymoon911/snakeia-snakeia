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
import GameUtils from "../engine/GameUtils";
import { Utils } from "jsgametools";

/**
 * OnlineModeUI – encapsulates all online-specific state and UI rendering.
 *
 * Responsible for:
 *   - Tracking online-specific state (spectatorMode, pingLatency, playerNumber,
 *     maxPlayers, timeStart, onlineMaster, searchingPlayers, currentPlayer, etc.)
 *   - Drawing the spectator-mode label overlay
 *   - Computing the "next game" countdown text used by the pause menu
 *   - Tracking the timeStart countdown for online games
 *
 * Public interface:
 *   new OnlineModeUI()
 *   .setState(patch) – update online state from a plain object
 *   .update()        – tick-internal countdown logic (called once per draw frame)
 *   .draw(ctx, state) – draw online-specific overlays
 *   .getNextGameText() – returns the formatted countdown string
 */
export default class OnlineModeUI {
  constructor() {
    this.onlineMode = false;
    this.spectatorMode = false;
    this.pingLatency = -1;
    this.playerNumber = 0;
    this.maxPlayers = 0;
    this.timeStart = 0;
    this.lastTime = 0;
    this.currentPlayer = null;
    this.onlineMaster = false;
    this.searchingPlayers = false;
    this.enableRetryPauseMenu = true;
  }

  /**
   * Update online state from a plain object. Only applies keys that exist on
   * this instance, so it's safe to call with partial patches.
   *
   * @param {Object} patch
   */
  setState(patch) {
    if (!patch || typeof patch !== "object") return;

    for (const key of Object.keys(patch)) {
      if (Object.prototype.hasOwnProperty.call(this, key) && typeof patch[key] !== "function") {
        this[key] = patch[key];
      }
    }
  }

  /**
   * Tick-internal countdown logic. Should be called once per draw frame.
   * Decrements `timeStart` based on elapsed time when searching for players.
   *
   * @param {Object} state – GameState instance (needs .searchingPlayers)
   */
  update(state) {
    if (state.searchingPlayers && this.lastTime > 0) {
      this.timeStart -= Math.max(0, Date.now() - this.lastTime);
    } else {
      this.timeStart = 0;
    }
  }

  /**
   * Return the formatted "next game starts in …" countdown string,
   * or empty string if no countdown is active.
   * @returns {string}
   */
  getNextGameText() {
    return this.timeStart > 0
      ? ("\n\n" + i18next.t("engine.servers.nextGameStart") + " " + GameUtils.millisecondsFormat(this.timeStart))
      : "";
  }

  /**
   * Draw online-specific overlays (spectator mode label).
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} renderInfo – { fontSize, fontFamily }
   */
  draw(ctx, renderInfo) {
    if (this.spectatorMode) {
      Utils.drawText(
        ctx,
        i18next.t("engine.servers.spectatorMode"),
        "rgba(255, 255, 255, 0.5)",
        Math.round(renderInfo.fontSize),
        renderInfo.fontFamily || "DELIUS",
        "left", "bottom",
        null, null,
        true
      );
    }
  }
}
