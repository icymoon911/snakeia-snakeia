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
import GameConstants from "../engine/Constants";

/**
 * InputManager – owns all raw DOM input handling (keyboard, touch, mouse clicks
 * on directional buttons) and translates them into high-level game commands.
 *
 * GameUI no longer attaches native DOM event listeners directly. Instead it
 * creates an InputManager instance and provides it with callbacks that the
 * InputManager invokes when input is detected.
 *
 * Public interface consumed by GameUI:
 *   .attach(canvas, controller, options)
 *   .detach()
 *   .onPause(callback)      – register a "user wants to pause" handler
 *   .onDirection(callback)  – register a "direction key" handler (receives keyCode)
 *
 * The class also exposes the touch-position helper used by the ranking overlay.
 */
export default class InputManager {
  constructor() {
    // Touch state
    this.touchEventStartX = undefined;
    this.touchEventStartY = undefined;
    this.touchEventStartTimestamp = undefined;
    this.touchEventOffsetX = 0;
    this.touchEventOffsetY = 0;

    // Last menu key (used by countdown screen)
    this.lastKeyMenu = -1;

    // DOM references (for cleanup)
    this._canvas = null;
    this._controller = null;
    this._gameRanking = null;
    this._getState = null;

    // Bound listeners (so we can remove them later)
    this._listenerKeyDown = null;
    this._listenerTouchStart = null;
    this._listenerTouchEnd = null;
    this._listenerTouchMove = null;
  }

  /**
   * Attach input listeners to the DOM.
   *
   * @param {HTMLCanvasElement|null} canvas
   * @param {Object} controller  – GameController-like object with a .key() method
   * @param {Object} options
   * @param {Function} options.getState – returns current game state (paused, killed, countBeforePlay)
   * @param {Object}   options.gameRanking – the GameRanking instance (to check .hovered)
   * @param {Function} options.onPause – called when the user presses Enter / Escape to toggle pause
   */
  attach(canvas, controller, options = {}) {
    this._canvas = canvas;
    this._controller = controller;
    this._getState = options.getState || (() => ({}));
    this._gameRanking = options.gameRanking || null;

    // ── Keyboard ─────────────────────────────────────────────────────────────
    this._listenerKeyDown = (evt) => {
      const state = this._getState();

      if (state.killed) return;

      let keyCode = evt.keyCode;

      if (keyCode === 90 || keyCode === 87) keyCode = GameConstants.Key.UP;     // W or Z
      if (keyCode === 65 || keyCode === 81) keyCode = GameConstants.Key.LEFT;   // A or Q
      if (keyCode === 83) keyCode = GameConstants.Key.BOTTOM;                   // S
      if (keyCode === 68) keyCode = GameConstants.Key.RIGHT;                    // D

      if (!state.paused) {
        if (keyCode === GameConstants.Key.ENTER) {
          if (options.onPause) options.onPause();
        } else {
          this._controller.key(keyCode);
        }
      } else if (state.countBeforePlay < 0) {
        this.lastKeyMenu = keyCode;
      }

      evt.preventDefault();
    };

    document.addEventListener("keydown", this._listenerKeyDown);

    // ── Touch (only if canvas exists) ────────────────────────────────────────
    if (canvas) {
      this._listenerTouchStart = (event) => {
        const changedTouches = event.changedTouches[0];
        const position = this.getTouchPos(canvas, changedTouches);

        if (!this._isRankingHovered()) {
          this.touchEventStartX = position.x;
          this.touchEventStartY = position.y;
          this.touchEventStartTimestamp = performance.now();
        }
      };

      this._listenerTouchEnd = () => {
        this.touchEventOffsetX = 0;
        this.touchEventOffsetY = 0;
      };

      this._listenerTouchMove = (event) => {
        const changedTouches = event.changedTouches[0];
        const position = this.getTouchPos(canvas, changedTouches);

        if (!this._isRankingHovered()) {
          this.touchEventOffsetX += (position.x - this.touchEventStartX);
          this.touchEventOffsetY += (position.y - this.touchEventStartY);

          if (performance.now() - this.touchEventStartTimestamp >= 250) {
            this.touchEventOffsetX = 0;
            this.touchEventOffsetY = 0;
          }

          if (this.touchEventOffsetX < 0 && Math.abs(this.touchEventOffsetX) > 50) {
            this._controller.key(GameConstants.Key.LEFT);
          } else if (this.touchEventOffsetX > 0 && Math.abs(this.touchEventOffsetX) > 50) {
            this._controller.key(GameConstants.Key.RIGHT);
          } else if (this.touchEventOffsetY < 0 && Math.abs(this.touchEventOffsetY) > 50) {
            this._controller.key(GameConstants.Key.UP);
          } else if (this.touchEventOffsetY > 0 && Math.abs(this.touchEventOffsetY) > 50) {
            this._controller.key(GameConstants.Key.BOTTOM);
          }

          this.touchEventStartX = position.x;
          this.touchEventStartY = position.y;
        }

        event.preventDefault();
      };

      canvas.addEventListener("touchstart", this._listenerTouchStart);
      canvas.addEventListener("touchend", this._listenerTouchEnd);
      canvas.addEventListener("touchmove", this._listenerTouchMove);
    }
  }

  /**
   * Remove all DOM event listeners.
   */
  detach() {
    if (this._listenerKeyDown) {
      document.removeEventListener("keydown", this._listenerKeyDown);
      this._listenerKeyDown = null;
    }

    if (this._canvas) {
      if (this._listenerTouchStart) {
        this._canvas.removeEventListener("touchstart", this._listenerTouchStart);
      }
      if (this._listenerTouchEnd) {
        this._canvas.removeEventListener("touchend", this._listenerTouchEnd);
      }
      if (this._listenerTouchMove) {
        this._canvas.removeEventListener("touchmove", this._listenerTouchMove);
      }
    }

    this._listenerTouchStart = null;
    this._listenerTouchEnd = null;
    this._listenerTouchMove = null;
    this._canvas = null;
  }

  /**
   * Get touch position relative to the canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {Touch} event
   * @returns {{ x: number, y: number }}
   */
  getTouchPos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  /**
   * Get mouse position relative to the canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {MouseEvent} event
   * @returns {{ x: number, y: number }}
   */
  getMousePos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  _isRankingHovered() {
    return this._gameRanking && this._gameRanking.hovered;
  }
}
