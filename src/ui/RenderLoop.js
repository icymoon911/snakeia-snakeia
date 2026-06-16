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
 * RenderLoop – owns the requestAnimationFrame cycle, FPS/TPS counters,
 * DPR adaptation, canvas auto-resize, and the 2D/3D grid UI construction.
 *
 * GameUI calls `renderLoop.start(drawFn)` and the loop invokes `drawFn`
 * once per frame with the correct timing information. GameUI no longer
 * manages frame timing, FPS counting, or canvas DPI scaling directly.
 *
 * Public interface:
 *   new RenderLoop(canvas, options)
 *   .start(drawCallback)
 *   .stop()
 *   .getDevicePixelRatio()
 *   .autoDPI()
 *   .autoResizeCanvas()
 *   .enableAutoResizeCanvas()
 *   .constructGridUI(settings, state)
 *   .getFPS() / .getTPS() / .getFrame() / .getCurrentFrameTime()
 *   .isMobileDevice()
 *   .toggleFullscreen()
 *   .setKill() – cleanup listeners
 */
export default class RenderLoop {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.highRes = options.highRes || false;
    this.maxFPS = options.maxFPS || -1;
    this.canvasWidth = options.canvasWidth || GameConstants.Setting.CANVAS_WIDTH;
    this.canvasHeight = options.canvasHeight || GameConstants.Setting.CANVAS_HEIGHT;
    this.is3DRendering = options.is3DRendering || false;
    this.graphicSkin = options.graphicSkin || "flat";
    this.disableAnimation = options.disableAnimation || false;
    this.debugMode = options.debugMode || false;
    this.autoFullscreenMobile = options.autoFullscreenMobile || false;

    // Frame state
    this.frame = 0;
    this.lastFrame = 0;
    this.lastTicks = 0;
    this.offsetFrame = 0;
    this.lastFrameTime = 0;
    this.currentFPS = 0;
    this.currentTPS = 0;
    this.currentFrameTime = 0;
    this.launchedInitialAutoDPI = false;
    this.fullscreen = false;

    // Intervals
    this.intervalCountFPS = null;
    this.intervalCountTPS = null;

    // Listeners (for cleanup)
    this._listenerCanvasResize = null;
    this._listenerOnFullScreenChangeEvent = null;
    this._drawCallback = null;
    this._killed = false;
    this._rafId = null;

    // External state accessors
    this._getState = options.getState || (() => ({}));
  }

  /**
   * Start the rendering loop.
   * @param {Function} drawCallback – called once per frame with (time) argument
   */
  start(drawCallback) {
    this._drawCallback = drawCallback;
    this._killed = false;
    this._scheduleNextFrame();
    this._startFPSCounter();
    this._startTPSCounter();
  }

  /**
   * Stop the rendering loop and clean up intervals.
   */
  stop() {
    this._killed = true;
    this._drawCallback = null;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._clearFPSCounter();
    this._clearTPSCounter();
  }

  getFPS() { return this.currentFPS; }
  getTPS() { return this.currentTPS; }
  getFrame() { return this.frame; }
  getCurrentFrameTime() { return this.currentFrameTime; }
  getLastTime() { return this.lastTime || 0; }

  /**
   * Increment tick counter (called by GameUI when engine ticks).
   */
  tickFrame() {
    this.lastTicks++;
  }

  /**
   * Get current device pixel ratio.
   * @returns {number}
   */
  getDevicePixelRatio() {
    if (!this.highRes) return 1;
    return window.devicePixelRatio || 1;
  }

  /**
   * Auto-DPI: scale the canvas backing store to match DPR.
   */
  autoDPI() {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.getDevicePixelRatio();

    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
  }

  /**
   * Auto-resize canvas to fit viewport.
   */
  autoResizeCanvas() {
    if (!this.canvas) return;

    if (!document.fullscreenElement) {
      if (this.canvasWidth >= document.documentElement.clientWidth * 0.85) {
        const ratio = this.canvasWidth / this.canvasHeight;
        this.canvas.width = document.documentElement.clientWidth * 0.85;
        this.canvas.height = this.canvas.width / ratio;
        if (this.canvas.style) {
          this.canvas.style.width = this.canvas.width + "px";
          this.canvas.style.height = this.canvas.height + "px";
        }
      } else {
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        if (this.canvas.style) {
          this.canvas.style.width = this.canvasWidth + "px";
          this.canvas.style.height = this.canvasHeight + "px";
        }
      }
    } else if (document.fullscreenElement === this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.canvas.style) {
        this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerHeight + "px";
      }
    } else {
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
      if (this.canvas.style) {
        this.canvas.style.width = this.canvasWidth + "px";
        this.canvas.style.height = this.canvasHeight + "px";
      }
    }

    this.autoDPI();
  }

  /**
   * Attach window resize listener for auto-resize.
   */
  enableAutoResizeCanvas() {
    if (this.canvas && this.canvas.getAttribute("autoresize-canvas-event") !== "true") {
      this.canvas.setAttribute("autoresize-canvas-event", "true");
      this.autoResizeCanvas();

      this._listenerCanvasResize = () => {
        if (this.canvas) this.autoResizeCanvas();
      };
      window.addEventListener("resize", this._listenerCanvasResize);
    }
  }

  /**
   * Toggle fullscreen mode on the canvas.
   */
  toggleFullscreen() {
    if (!this.canvas || this._killed) return;

    if (!document.fullscreenElement) {
      if (this.canvas.requestFullscreen) {
        this.canvas.requestFullscreen();
      } else if (this.canvas.mozRequestFullScreen) {
        this.canvas.mozRequestFullScreen();
      } else if (this.canvas.webkitRequestFullscreen) {
        this.canvas.webkitRequestFullscreen();
      } else if (this.canvas.msRequestFullscreen) {
        this.canvas.msRequestFullscreen();
      } else if (this.canvas.oRequestFullscreen) {
        this.canvas.oRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }

    if (this.canvas.getAttribute("fullscreenchange-canvas-event") !== "true") {
      this.canvas.setAttribute("fullscreenchange-canvas-event", "true");

      this._listenerOnFullScreenChangeEvent = () => {
        if (this._killed) return;

        if (document.fullscreenElement === this.canvas) {
          this.fullscreen = true;
        } else {
          this.fullscreen = false;
          this.canvas.width = this.canvasWidth;
          this.canvas.height = this.canvasHeight;
        }

        if (document.fullscreenElement === this.canvas
          && typeof screen.orientation !== "undefined"
          && typeof screen.orientation.lock !== "undefined") {
          screen.orientation.lock("landscape").catch(() => {});
        }

        this.autoResizeCanvas();
      };

      document.addEventListener("fullscreenchange", this._listenerOnFullScreenChangeEvent);
      this._listenerOnFullScreenChangeEvent();
    }
  }

  /**
   * Construct the GridUI or GridUI3D instance.
   *
   * @param {Object} settings – graphics settings (graphicType, graphicCustomPreset)
   * @param {Object} state – current game state (snakes, grid, speed, etc.)
   * @param {Object} deps – { imageLoader, modelLoader, header, currentPlayer }
   * @returns {GridUI|GridUI3D}
   */
  constructGridUI(settings, state, deps) {
    const { GridUI, GridUI3D } = deps;
    const { imageLoader, modelLoader, header, currentPlayer, isFilterHueAvailable } = deps;

    if (this.is3DRendering) {
      const gridUI3D = new GridUI3D(
        state.snakes, state.grid, state.speed,
        this.disableAnimation, this.graphicSkin, isFilterHueAvailable,
        header.height, imageLoader, modelLoader, currentPlayer,
        settings.graphicType, settings.graphicCustomPreset, this.debugMode
      );

      try {
        gridUI3D.init3DEngine();
        return gridUI3D;
      } catch (e) {
        console.error("Error while initializing 3D rendering, switching to 2D rendering.", e);
        this.is3DRendering = false;
      }
    }

    this.is3DRendering = false;

    return new GridUI(
      state.snakes, state.grid, state.speed,
      this.disableAnimation, this.graphicSkin, isFilterHueAvailable,
      header.height, imageLoader, modelLoader, currentPlayer,
      this.debugMode
    );
  }

  /**
   * Detect mobile device.
   * @returns {boolean}
   */
  isMobileDevice() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/android|iphone|ipad|ipod|windows phone/i.test(ua.toLowerCase())) return true;
    return false;
  }

  /**
   * Clean up all event listeners (called on game exit).
   */
  setKill() {
    this.stop();

    if (this._listenerCanvasResize) {
      window.removeEventListener("resize", this._listenerCanvasResize);
      this._listenerCanvasResize = null;
    }

    if (this._listenerOnFullScreenChangeEvent) {
      document.removeEventListener("fullscreenchange", this._listenerOnFullScreenChangeEvent);
      this._listenerOnFullScreenChangeEvent = null;
    }

    this._killed = true;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _scheduleNextFrame() {
    this._rafId = requestAnimationFrame((time) => this._beforeDraw(time));
  }

  _beforeDraw(time) {
    if (this._killed) return;

    const state = this._getState();

    // Pause when window loses focus
    if (!document.hasFocus() && !state.paused && state.outputType !== GameConstants.OutputType.TEXT) {
      if (state.onPause) state.onPause();
    }

    const offsetFrame = time - this.lastFrameTime;

    if (this.maxFPS < 1 || offsetFrame > 1000 / this.maxFPS) {
      this.lastFrameTime = time;
      this.frame++;

      if ((!state.paused && !state.onlineMode) || state.onlineMode || state.gameOver || state.gameFinished) {
        this.offsetFrame += offsetFrame;
        const offset = this.offsetFrame / (state.speed * GameConstants.Setting.TIME_MULTIPLIER);

        if ((state.gameOver || state.gameFinished) && offset >= 0.95) {
          this.offsetFrame = 0;
          state.onTick && state.onTick();
        }
      }

      const startTime = performance.now();
      if (this._drawCallback) this._drawCallback();
      this.currentFrameTime = performance.now() - startTime;
      this.lastTime = Date.now();

      if (!this.launchedInitialAutoDPI) {
        this.autoDPI();
        this.launchedInitialAutoDPI = true;
      }
    }

    this._scheduleNextFrame();
  }

  _startFPSCounter() {
    this._clearFPSCounter();
    this.intervalCountFPS = window.setInterval(() => {
      if (this.lastFrame > 0) this.currentFPS = this.frame - this.lastFrame;
      this.lastFrame = this.frame;
    }, 1000);
  }

  _startTPSCounter() {
    this._clearTPSCounter();
    this.intervalCountTPS = window.setInterval(() => {
      if (this._lastTicksSnapshot > 0) this.currentTPS = this.lastTicks - this._lastTicksSnapshot;
      this._lastTicksSnapshot = this.lastTicks;
    }, 1000);
    this._lastTicksSnapshot = 0;
  }

  _clearFPSCounter() {
    clearInterval(this.intervalCountFPS);
  }

  _clearTPSCounter() {
    clearInterval(this.intervalCountTPS);
  }

  /**
   * Record a tick increment (called when the engine processes a game tick).
   */
  recordTick() {
    this.lastTicks++;
  }
}
