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
import GraphicsUtils from "./GraphicsUtils";
import GameConstants from "../engine/Constants";
import GameRanking from "./GameRanking";
import ModelLoader from "./ModelLoader";
import { ImageLoader, ButtonImage, NotificationMessage, Utils, Label, ProgressBar, Constants, EasingFunctions, Component } from "jsgametools";
import GridUI from "./GridUI";
import GridUI3D from "./GridUI3D";
import Header from "./Header";

// ── Refactored sub-modules ──────────────────────────────────────────────────────
import GameState from "./GameState";
import InputManager from "./InputManager";
import PauseMenu from "./PauseMenu";
import RenderLoop from "./RenderLoop";
import OnlineModeUI from "./OnlineModeUI";

Constants.Setting.FONT_FAMILY = "DELIUS";

export default class GameUI {
  constructor(controller, appendTo, canvasWidth, canvasHeight, debugMode, outputType, settings) {
    // ── Core dependencies ─────────────────────────────────────────────────────
    this.controller = controller;
    this.appendTo = appendTo;
    this.debugMode = debugMode == undefined ? false : debugMode;
    this.outputType = outputType == undefined ? GameConstants.OutputType.GRAPHICAL : outputType;
    this.outputType = settings && settings.textOutput ? GameConstants.OutputType.TEXT : this.outputType;
    this.disableAnimation = settings && !settings.enableAnimations;
    this.renderBlur = settings && settings.renderBlur;
    this.graphicSkin = (settings && settings.graphicSkin) || "flat";
    this.maxFPS = (settings && settings.maxFPS) || -1;
    this.settings = settings || {};
    this.highRes = settings && settings.highRes;
    this.autoFullscreenMobile = settings && settings.autoFullscreenMobile;
    this.is3DRendering = settings.graphicType && settings.graphicType !== "2d";
    this.goalMessage = null;
    this.isFilterHueAvailable = Utils.isFilterHueAvailable();

    // ── Typed game state (replaces ad-hoc property copying) ───────────────────
    this.gameState = new GameState();

    // ── Sub-modules ───────────────────────────────────────────────────────────
    this.inputManager = new InputManager();
    this.pauseMenu = new PauseMenu(this.renderBlur);
    this.onlineModeUI = new OnlineModeUI();
    this.renderLoop = null;  // created in init() when canvas is ready

    // ── Assets ────────────────────────────────────────────────────────────────
    this.imageLoader = null;
    this.modelLoader = null;
    this.assetsLoaded = false;
    this.engineLoading = false;
    this.loadingResourcesErrorOccurred = false;
    this.errorOccurred = false;

    // ── Components ────────────────────────────────────────────────────────────
    this.gameRanking = new GameRanking(null, null, null, null, GameConstants.Setting.HEADER_HEIGHT_DEFAULT, null, null, this.disableAnimation, null, null, this.getDevicePixelRatio());
    this.header = new Header(GameConstants.Setting.HEADER_HEIGHT_DEFAULT, null, null, false, null, null, null, this.gameRanking, null, 0, null);
    this.gridUI = null;
    this.progressBarLoading = null;
    this.notificationMessage = null;
    this.labelAdvice = null;

    // ── DOM elements ──────────────────────────────────────────────────────────
    this.textarea = null;
    this.canvas = null;
    this.canvasCtx = null;
    this.canvasWidth = canvasWidth == undefined ? GameConstants.Setting.CANVAS_WIDTH : canvasWidth;
    this.canvasHeight = canvasHeight == undefined ? GameConstants.Setting.CANVAS_HEIGHT : canvasHeight;
    this.fontSize = GameConstants.Setting.FONT_SIZE;

    // ── Display helpers ───────────────────────────────────────────────────────
    this.timerToDisplay = null;
    this.bestScoreToDisplay = null;

    // ── Header buttons (still owned by GameUI since they're in the header, not the menu) ──
    this.btnFullScreen = null;
    this.btnPause = null;
    this.btnRank = null;
    this.btnTopArrow = null;
    this.btnRightArrow = null;
    this.btnLeftArrow = null;
    this.btnBottomArrow = null;

    // Patch to fix mouse position on high DPI screens, need to be removed if upgrading JSGameTools
    Component.prototype.getMousePos = (canvas, event) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = this.getDevicePixelRatio ? this.getDevicePixelRatio() : 1;
      return {
        x: (event.clientX - rect.left) * dpr,
        y: (event.clientY - rect.top) * dpr
      };
    };
  }

  // ── State accessors (delegated to gameState + onlineModeUI) ───────────────────

  get grid()           { return this.gameState.grid; }
  set grid(v)          { this.gameState.grid = v; }
  get snakes()         { return this.gameState.snakes; }
  set snakes(v)        { this.gameState.snakes = v; }
  get speed()          { return this.gameState.speed; }
  set speed(v)         { this.gameState.speed = v; }
  get initialSpeed()   { return this.gameState.initialSpeed; }
  set initialSpeed(v)  { this.gameState.initialSpeed = v; }
  get ticks()          { return this.gameState.ticks; }
  set ticks(v)         { this.gameState.ticks = v; }
  get countBeforePlay(){ return this.gameState.countBeforePlay; }
  set countBeforePlay(v){ this.gameState.countBeforePlay = v; }
  get numFruit()       { return this.gameState.numFruit; }
  set numFruit(v)      { this.gameState.numFruit = v; }
  get paused()         { return this.gameState.paused; }
  set paused(v)        { this.gameState.paused = v; }
  get exited()         { return this.gameState.exited; }
  set exited(v)        { this.gameState.exited = v; }
  get killed()         { return this.gameState.killed; }
  set killed(v)        { this.gameState.killed = v; }
  get isReseted()      { return this.gameState.isReseted; }
  set isReseted(v)     { this.gameState.isReseted = v; }
  get gameOver()       { return this.gameState.gameOver; }
  set gameOver(v)      { this.gameState.gameOver = v; }
  get gameFinished()   { return this.gameState.gameFinished; }
  set gameFinished(v)  { this.gameState.gameFinished = v; }
  get gameMazeWin()    { return this.gameState.gameMazeWin; }
  set gameMazeWin(v)   { this.gameState.gameMazeWin = v; }
  get scoreMax()       { return this.gameState.scoreMax; }
  set scoreMax(v)      { this.gameState.scoreMax = v; }
  get enablePause()    { return this.gameState.enablePause; }
  set enablePause(v)   { this.gameState.enablePause = v; }
  get enableRetry()    { return this.gameState.enableRetry; }
  set enableRetry(v)   { this.gameState.enableRetry = v; }
  get progressiveSpeed() { return this.gameState.progressiveSpeed; }
  set progressiveSpeed(v) { this.gameState.progressiveSpeed = v; }
  get aiStuck()        { return this.gameState.aiStuck; }
  set aiStuck(v)       { this.gameState.aiStuck = v; }
  get precAiStuck()    { return this.gameState.precAiStuck; }
  set precAiStuck(v)   { this.gameState.precAiStuck = v; }
  get starting()       { return this.gameState.starting; }
  set starting(v)      { this.gameState.starting = v; }
  get offsetFrame()    { return this.gameState.offsetFrame; }
  set offsetFrame(v)   { this.gameState.offsetFrame = v; }
  get engineLoading()  { return this.gameState.engineLoading; }
  set engineLoading(v) { this.gameState.engineLoading = v; }
  get errorOccurred()  { return this.gameState.errorOccurred; }
  set errorOccurred(v) { this.gameState.errorOccurred = v; }

  // Online state accessors (delegated to onlineModeUI)
  get onlineMode()       { return this.onlineModeUI.onlineMode; }
  set onlineMode(v)      { this.onlineModeUI.onlineMode = v; this.gameState.onlineMode = v; }
  get spectatorMode()    { return this.onlineModeUI.spectatorMode; }
  set spectatorMode(v)   { this.onlineModeUI.spectatorMode = v; this.gameState.spectatorMode = v; }
  get pingLatency()      { return this.onlineModeUI.pingLatency; }
  set pingLatency(v)     { this.onlineModeUI.pingLatency = v; this.gameState.pingLatency = v; }
  get playerNumber()     { return this.onlineModeUI.playerNumber; }
  set playerNumber(v)    { this.onlineModeUI.playerNumber = v; this.gameState.playerNumber = v; }
  get maxPlayers()       { return this.onlineModeUI.maxPlayers; }
  set maxPlayers(v)      { this.onlineModeUI.maxPlayers = v; this.gameState.maxPlayers = v; }
  get timeStart()        { return this.onlineModeUI.timeStart; }
  set timeStart(v)       { this.onlineModeUI.timeStart = v; this.gameState.timeStart = v; }
  get lastTime()         { return this.onlineModeUI.lastTime; }
  set lastTime(v)        { this.onlineModeUI.lastTime = v; }
  get currentPlayer()    { return this.onlineModeUI.currentPlayer; }
  set currentPlayer(v)   { this.onlineModeUI.currentPlayer = v; this.gameState.currentPlayer = v; }
  get onlineMaster()     { return this.onlineModeUI.onlineMaster; }
  set onlineMaster(v)    { this.onlineModeUI.onlineMaster = v; this.gameState.onlineMaster = v; }
  get searchingPlayers() { return this.onlineModeUI.searchingPlayers; }
  set searchingPlayers(v){ this.onlineModeUI.searchingPlayers = v; this.gameState.searchingPlayers = v; }
  get enableRetryPauseMenu() { return this.onlineModeUI.enableRetryPauseMenu; }
  set enableRetryPauseMenu(v){ this.onlineModeUI.enableRetryPauseMenu = v; this.gameState.enableRetryPauseMenu = v; }

  // Menu state accessors (delegated to pauseMenu)
  get confirmReset()       { return this.pauseMenu.confirmReset; }
  set confirmReset(v)      { this.pauseMenu.confirmReset = v; }
  get confirmExit()        { return this.pauseMenu.confirmExit; }
  set confirmExit(v)       { this.pauseMenu.confirmExit = v; }
  get getInfos()           { return this.pauseMenu.getInfos; }
  set getInfos(v)          { this.pauseMenu.getInfos = v; }
  get getInfosGame()       { return this.pauseMenu.getInfosGame; }
  set getInfosGame(v)      { this.pauseMenu.getInfosGame = v; }
  get getInfosControls()   { return this.pauseMenu.getInfosControls; }
  set getInfosControls(v)  { this.pauseMenu.getInfosControls = v; }
  get getInfosGoal()       { return this.pauseMenu.getInfosGoal; }
  set getInfosGoal(v)      { this.pauseMenu.getInfosGoal = v; }
  get getAdvancedInfosGame() { return this.pauseMenu.getAdvancedInfosGame; }
  set getAdvancedInfosGame(v) { this.pauseMenu.getAdvancedInfosGame = v; }

  // Frame/timing accessors (delegated to renderLoop)
  get frame()              { return this.renderLoop ? this.renderLoop.getFrame() : 0; }
  get currentFPS()         { return this.renderLoop ? this.renderLoop.getFPS() : 0; }
  get currentTPS()         { return this.renderLoop ? this.renderLoop.getTPS() : 0; }
  get currentFrameTime()   { return this.renderLoop ? this.renderLoop.getCurrentFrameTime() : 0; }
  get fullscreen()         { return this.renderLoop ? this.renderLoop.fullscreen : false; }
  set fullscreen(v)        { if (this.renderLoop) this.renderLoop.fullscreen = v; }

  /**
   * Apply a state patch from the controller. This is the single entry point for
   * the controller to push engine state updates to the UI. Replaces the old
   * Object.keys(data) brute-force copy.
   *
   * @param {Object} data – plain object of key/value pairs
   * @param {string} [source] – label for debug warnings
   */
  applyState(data, source) {
    if (!data) return;

    // Apply to the typed GameState (validates keys, warns on unknown)
    this.gameState.applyPatch(data, source);

    // Sync online-specific keys to OnlineModeUI
    this.onlineModeUI.setState(data);

    // Sync menu-state keys (confirmReset, etc.) to PauseMenu
    const menuKeys = ["confirmReset", "confirmExit", "getInfos", "getInfosGame", "getInfosControls", "getInfosGoal", "getAdvancedInfosGame"];
    for (const key of menuKeys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        this.pauseMenu[key] = data[key];
      }
    }

    // Handle kill signal
    if (data.killed) {
      this.setKill();
    }
  }

  // ── Grid UI construction ─────────────────────────────────────────────────────

  constructGridUI(settings) {
    if (this.renderLoop) {
      return this.renderLoop.constructGridUI(settings, this.gameState, {
        GridUI, GridUI3D, NotificationMessage,
        imageLoader: this.imageLoader,
        modelLoader: this.modelLoader,
        header: this.header,
        currentPlayer: this.currentPlayer,
        isFilterHueAvailable: this.isFilterHueAvailable
      });
    }

    // Fallback if renderLoop not ready
    if (this.is3DRendering) {
      const gridUI3D = new GridUI3D(this.snakes, this.grid, this.speed, this.disableAnimation, this.graphicSkin, this.isFilterHueAvailable, this.header.height, this.imageLoader, this.modelLoader, this.currentPlayer, settings.graphicType, settings.graphicCustomPreset, this.debugMode);
      try {
        gridUI3D.init3DEngine();
        return gridUI3D;
      } catch (e) {
        console.error("Error while initializing 3D rendering, switching to 2D rendering.", e);
        this.setNotification(new NotificationMessage(i18next.t("engine.errorInit3D"), null, GameConstants.Setting.ERROR_NOTIF_COLOR, 10, null, null, null, true));
      }
    }

    this.is3DRendering = false;
    return new GridUI(this.snakes, this.grid, this.speed, this.disableAnimation, this.graphicSkin, this.isFilterHueAvailable, this.header.height, this.imageLoader, this.modelLoader, this.currentPlayer, this.debugMode);
  }

  // ── Initialization ───────────────────────────────────────────────────────────

  async init() {
    this.imageLoader = new ImageLoader();
    this.modelLoader = new ModelLoader();

    if (this.outputType === GameConstants.OutputType.TEXT) {
      this.textarea = document.createElement("textarea");
      this.appendTo.appendChild(this.textarea);
      this.assetsLoaded = true;
    } else if (this.outputType === GameConstants.OutputType.GRAPHICAL) {
      const dpr = this.getDevicePixelRatio();

      this.canvas = document.createElement("canvas");
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
      this.canvasCtx = this.canvas.getContext("2d");
      this.appendTo.appendChild(this.canvas);

      // Create header buttons
      this.btnFullScreen = new ButtonImage("assets/images/fullscreen.png", null, 5, "right", null, 64 * dpr, 64 * dpr);
      this.btnPause = new ButtonImage("assets/images/pause.png", null, 5, null, null, 64 * dpr, 64 * dpr);
      this.btnRank = new ButtonImage("assets/images/ranking.png", null, 5, null, null, 64 * dpr, 64 * dpr);

      // Create menu buttons (delegated to PauseMenu)
      this.pauseMenu.createButtons(dpr);

      // Directional buttons
      this.btnTopArrow = new ButtonImage("assets/images/up.png", 64 * dpr, 92 * dpr, "right", "bottom", 64 * dpr, 64 * dpr, "rgba(255, 255, 255, 0.25)", "rgba(149, 165, 166, 0.25)");
      this.btnRightArrow = new ButtonImage("assets/images/right.png", 0, 46 * dpr, "right", "bottom", 64 * dpr, 64 * dpr, "rgba(255, 255, 255, 0.25)", "rgba(149, 165, 166, 0.25)");
      this.btnLeftArrow = new ButtonImage("assets/images/left.png", 128 * dpr, 46 * dpr, "right", "bottom", 64 * dpr, 64 * dpr, "rgba(255, 255, 255, 0.25)", "rgba(149, 165, 166, 0.25)");
      this.btnBottomArrow = new ButtonImage("assets/images/bottom.png", 64 * dpr, 0 * dpr, "right", "bottom", 64 * dpr, 64 * dpr, "rgba(255, 255, 255, 0.25)", "rgba(149, 165, 166, 0.25)");

      this.labelAdvice = null; // set up below
      this.progressBarLoading = new ProgressBar(null, null, (this.canvasWidth / 4) * dpr, 25 * dpr, null, null, null, 0.5, this.disableAnimation, "center");

      this.setupAdviceLabel(dpr);

      this.gridUI = this.constructGridUI(this.settings);

      this.header.setButtons(this.btnFullScreen, this.btnPause, this.btnRank);

      this.btnFullScreen.setClickAction(() => {
        this.toggleFullscreen();
        this.pause();
      });

      this.btnPause.setClickAction(() => {
        this.pause();
      });

      this.btnRank.setClickAction(() => {
        if (this.gameRanking.closing || this.gameRanking.closed) {
          this.gameRanking.open();
        } else {
          this.gameRanking.close();
        }
      });

      this.btnTopArrow.setClickAction(() => {
        this.controller.key(GameConstants.Key.UP);
      });

      this.btnBottomArrow.setClickAction(() => {
        this.controller.key(GameConstants.Key.BOTTOM);
      });

      this.btnLeftArrow.setClickAction(() => {
        this.controller.key(GameConstants.Key.LEFT);
      });

      this.btnRightArrow.setClickAction(() => {
        this.controller.key(GameConstants.Key.RIGHT);
      });

      // ── Input manager (replaces inline keyboard/touch handlers) ──────────────
      this.inputManager.attach(this.canvas, this.controller, {
        getState: () => ({
          paused: this.paused,
          killed: this.killed,
          countBeforePlay: this.countBeforePlay
        }),
        gameRanking: this.gameRanking,
        onPause: () => this.pause()
      });
    }

    // ── Render loop (replaces inline rAF + FPS/TPS counters) ────────────────
    if (this.outputType === GameConstants.OutputType.GRAPHICAL) {
      this.renderLoop = new RenderLoop(this.canvas, {
        highRes: this.highRes,
        maxFPS: this.maxFPS,
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        is3DRendering: this.is3DRendering,
        graphicSkin: this.graphicSkin,
        disableAnimation: this.disableAnimation,
        debugMode: this.debugMode,
        autoFullscreenMobile: this.autoFullscreenMobile,
        getState: () => ({
          paused: this.paused,
          onlineMode: this.onlineMode,
          gameOver: this.gameOver,
          gameFinished: this.gameFinished,
          speed: this.speed,
          outputType: this.outputType,
          onPause: () => this.controller.pause(),
          onTick: () => { this.ticks++; }
        })
      });

      this.renderLoop.start(() => this.draw());
      this.renderLoop.enableAutoResizeCanvas();
    } else {
      // TEXT mode: still need a simple rAF loop for text output
      this.renderLoop = new RenderLoop(null, {
        maxFPS: this.maxFPS,
        getState: () => ({
          paused: this.paused,
          onlineMode: this.onlineMode,
          gameOver: this.gameOver,
          gameFinished: this.gameFinished,
          speed: this.speed,
          outputType: this.outputType,
          onPause: () => this.controller.pause(),
          onTick: () => { this.ticks++; }
        })
      });
      this.renderLoop.start(() => this.draw());
    }

    if (this.renderLoop && this.renderLoop.isMobileDevice() && this.autoFullscreenMobile) {
      this.toggleFullscreen();
    }
  }

  async startAfterEngineInit() {
    await this.loadAssets();

    if (this.is3DRendering) {
      await this.preload3DRendering();
    }

    this.start();
  }

  async nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  async preload3DRendering() {
    const engineWasPrecLoading = this.engineLoading;
    this.engineLoading = true;

    this.draw();

    for (let i = 0; i < 3; i++) {
      await this.nextFrame();
    }

    for (let i = 0; i < 3; i++) {
      this.drawGridUI(this.canvasCtx, true);
      await this.nextFrame();
    }

    this.engineLoading = engineWasPrecLoading;
  }

  setupAdviceLabel(dpr) {
    const hasTouch = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0;
    const hasKeyboard = !hasTouch || window.matchMedia("(pointer: fine)").matches;

    this.labelAdvice = new Label("", null, null, (GameConstants.Setting.FONT_SIZE * dpr) / 1.5, GameConstants.Setting.FONT_FAMILY, "white", "center");

    if (hasTouch && hasKeyboard) {
      this.labelAdvice.text = "\n\n" + i18next.t("engine.adviceTouchAndKeyboard");
    } else if (hasTouch) {
      this.labelAdvice.text = "\n\n" + i18next.t("engine.adviceTouch");
    } else {
      this.labelAdvice.text = "\n\n" + i18next.t("engine.adviceKeyboard");
    }
  }

  getDevicePixelRatio() {
    if (this.renderLoop) return this.renderLoop.getDevicePixelRatio();
    if (!this.highRes) return 1;
    return window.devicePixelRatio || 1;
  }

  toggleFullscreen() {
    if (this.outputType === GameConstants.OutputType.GRAPHICAL && !this.killed) {
      if (this.renderLoop) {
        this.renderLoop.toggleFullscreen();
      }
    }
  }

  // ── Asset loading ─────────────────────────────────────────────────────────────

  async loadAssets() {
    if (this.errorOccurred || this.loadingResourcesErrorOccurred) return;

    if (this.outputType === GameConstants.OutputType.TEXT) {
      this.assetsLoaded = true;
      return;
    }

    const imageToLoad = [
      `assets/images/skin/${this.graphicSkin}/wall.png`,
      "assets/images/pause.png",
      "assets/images/fullscreen.png",
      "assets/images/up.png",
      "assets/images/left.png",
      "assets/images/right.png",
      "assets/images/bottom.png",
      "assets/images/trophy.png",
      "assets/images/trophy_silver.png",
      "assets/images/trophy_bronze.png",
      "assets/images/clock.png",
      "assets/images/ranking.png",
      "assets/images/skin/flat/fruit.png"
    ];

    if (this.is3DRendering) {
      imageToLoad.push(
        `assets/images/skin/${this.graphicSkin}/wall_normal.png`,
        `assets/images/skin/${this.graphicSkin}/wall_ao.png`,
        `assets/images/skin/${this.graphicSkin}/wall_height.png`
      );
    } else {
      imageToLoad.push(
        `assets/images/skin/${this.graphicSkin}/snake_4.png`,
        `assets/images/skin/${this.graphicSkin}/snake_3.png`,
        `assets/images/skin/${this.graphicSkin}/snake_2.png`,
        `assets/images/skin/${this.graphicSkin}/snake.png`,
        `assets/images/skin/${this.graphicSkin}/body_4_end.png`,
        `assets/images/skin/${this.graphicSkin}/body_3_end.png`,
        `assets/images/skin/${this.graphicSkin}/body_2_end.png`,
        `assets/images/skin/${this.graphicSkin}/body_end.png`,
        `assets/images/skin/${this.graphicSkin}/body_2.png`,
        `assets/images/skin/${this.graphicSkin}/body.png`,
        `assets/images/skin/${this.graphicSkin}/body_angle_1.png`,
        `assets/images/skin/${this.graphicSkin}/body_angle_2.png`,
        `assets/images/skin/${this.graphicSkin}/body_angle_3.png`,
        `assets/images/skin/${this.graphicSkin}/body_angle_4.png`,
        `assets/images/skin/${this.graphicSkin}/snake_dead_4.png`,
        `assets/images/skin/${this.graphicSkin}/snake_dead_3.png`,
        `assets/images/skin/${this.graphicSkin}/snake_dead_2.png`,
        `assets/images/skin/${this.graphicSkin}/snake_dead.png`,
        `assets/images/skin/${this.graphicSkin}/unknown.png`,
        `assets/images/skin/${this.graphicSkin}/fruit.png`,
        `assets/images/skin/${this.graphicSkin}/fruit_gold.png`
      );
    }

    try {
      await Promise.all([
        this.promisifiedImageLoad(imageToLoad),
        this.is3DRendering
          ? this.modelLoader.preloadAll({
            fruit: "assets/models/fruit.glb",
            head: "assets/models/head.glb",
            tail: "assets/models/tail.glb",
            unknown: "assets/models/unknown.glb",
          })
          : Promise.resolve()
      ]);

      if (this.imageLoader.hasError || this.modelLoader.hasError) {
        this.loadingResourcesErrorOccurred = true;
        return;
      }

      this.assetsLoaded = true;
      this.btnFullScreen.loadImage(this.imageLoader);
      this.btnPause.loadImage(this.imageLoader);
      this.btnRank.loadImage(this.imageLoader);
      this.btnTopArrow.loadImage(this.imageLoader);
      this.btnBottomArrow.loadImage(this.imageLoader);
      this.btnLeftArrow.loadImage(this.imageLoader);
      this.btnRightArrow.loadImage(this.imageLoader);
    } catch (err) {
      console.error("Error while loading assets:", err);
      this.loadingResourcesErrorOccurred = true;
    }
  }

  promisifiedImageLoad(images) {
    return new Promise((resolve) => {
      this.imageLoader.load(images, () => resolve(), this);
    });
  }

  // ── Game control (delegated to controller) ────────────────────────────────────

  getNBPlayer(type) { return this.controller.getNBPlayer(type); }
  getPlayer(num, type) { return this.controller.getPlayer(num, type); }
  reset() { this.controller && this.controller.reset(); }
  start() { this.controller && this.controller.start(); }
  forceStart() { this.controller && this.controller.forceStart(); }
  stop() { this.controller && this.controller.stop(); }
  pause() { this.controller && this.controller.pause(); }
  kill() { this.controller && this.controller.kill(); }
  exit() { this.controller && this.controller.exit(); }
  tick() { this.controller && this.controller.tick(); }

  // ── Draw ──────────────────────────────────────────────────────────────────────

  draw() {
    if (this.outputType === GameConstants.OutputType.TEXT && !this.killed) {
      if (this.grid != null) {
        this.textarea.style.width = this.grid.width * 16.5 + "px";
        this.textarea.style.height = this.grid.height * 16 + 100 + "px";
      }
      this.textarea.innerHTML = this.toString();
      return;
    }

    if (this.outputType !== GameConstants.OutputType.GRAPHICAL || this.killed) return;

    const ctx = this.canvasCtx;
    const dpr = this.getDevicePixelRatio();

    this.currentPlayer = this.controller.getCurrentPlayer();

    this.fontSize = GameConstants.Setting.FONT_SIZE;
    this.header.height = GameConstants.Setting.HEADER_HEIGHT_DEFAULT;

    const dprMultiplier = Math.max(1, dpr / 1.25);

    if (this.canvas.width <= GameConstants.Setting.CANVAS_WIDTH / 1.25) {
      this.fontSize /= (1.25 * dprMultiplier);
      this.header.height = GameConstants.Setting.HEADER_HEIGHT_DEFAULT / 1.25 * dprMultiplier;
    } else if (this.canvas.width >= GameConstants.Setting.CANVAS_WIDTH * 1.5) {
      this.fontSize *= (1.2 * dprMultiplier);
      this.header.height = GameConstants.Setting.HEADER_HEIGHT_DEFAULT * 1.25 * dprMultiplier;
    }

    if (this.gridUI) {
      this.gridUI.fontSize = this.fontSize;
    }

    Constants.Setting.FONT_SIZE = this.fontSize;
    this.pauseMenu.setFontSize(this.fontSize);

    if (this.notificationMessage) {
      this.notificationMessage.fontSize = this.fontSize;
      this.notificationMessage.fontSizeInitial = this.fontSize;
      this.notificationMessage.easingFunction = EasingFunctions.easeInOutCubic;
    }

    if (this.gameRanking) {
      this.gameRanking.fontSize = this.fontSize;
    }

    Utils.clear(ctx);
    ctx.fillStyle = "rgba(204, 207, 211, 1)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = this.fontSize + "px " + GameConstants.Setting.FONT_FAMILY;

    if (this.engineLoading) {
      this.pauseMenu.labelMenus.text = i18next.t("engine.loadingWorker");
      this.pauseMenu.labelMenus.color = "white";
      this.pauseMenu.menu.set(this.pauseMenu.labelMenus);
    } else if (this.assetsLoaded && !this.errorOccurred && !this.loadingResourcesErrorOccurred) {
      this.header.set(this.snakes, this.imageLoader, this.bestScoreToDisplay, this.header.height, this.numFruit, this.enablePause);
      this.header.draw(ctx);

      if (this.grid != null && (!this.grid.maze || (this.grid.maze && (!this.paused || this.gameOver || this.gameFinished)))) {
        this.drawGridUI(ctx);
      }

      if (this.timerToDisplay != undefined && this.timerToDisplay != null && !isNaN(this.timerToDisplay) && this.timerToDisplay >= 0) {
        const sizesTimer = Utils.drawText(ctx, "" + GameUtils.secondsFormat(this.timerToDisplay), "rgba(0, 0, 0, 0.5)", Math.round(this.fontSize), GameConstants.Setting.FONT_FAMILY, "right", "default", null, Math.round(this.header.height + 15 + this.header.height * 0.475));
        Utils.drawImage(ctx, this.imageLoader.get("assets/images/clock.png", Math.round(this.header.height * 0.64), Math.round(this.header.height * 0.64)), Math.round(sizesTimer["x"] - this.header.height * 0.64 - 10), Math.round(this.header.height + 15), Math.round(this.header.height * 0.64), Math.round(this.header.height * 0.64));
      }
    } else if (!this.assetsLoaded) {
      const percentLoaded = Math.floor((100 * (Object.keys(this.imageLoader.images).length + this.modelLoader.cache.size)) / (this.imageLoader.nbImagesToLoad + this.modelLoader.nbModelsToLoad));
      this.pauseMenu.labelMenus.text = i18next.t("engine.loading") + "\n" + percentLoaded + "%";
      this.pauseMenu.labelMenus.color = "white";
      this.progressBarLoading.percent = percentLoaded / 100;
      this.progressBarLoading.width = this.canvas.width / 4;
      this.pauseMenu.menu.set(this.pauseMenu.labelMenus, this.progressBarLoading);
    }

    if (this.aiStuck && !this.precAiStuck) {
      this.precAiStuck = true;
      this.setNotification(new NotificationMessage(i18next.t("engine.aiStuck"), null, GameConstants.Setting.ERROR_NOTIF_COLOR, 10));
    }

    if (this.notificationMessage != undefined && this.notificationMessage != null && this.notificationMessage instanceof NotificationMessage && !this.notificationMessage.foreGround) {
      this.notificationMessage.draw(this);
    }

    if (this.snakes != null && (this.getNBPlayer(GameConstants.PlayerType.HUMAN) > 0 || this.getNBPlayer(GameConstants.PlayerType.HYBRID_HUMAN_AI) > 0) && (this.getNBPlayer(GameConstants.PlayerType.HUMAN) <= 1 || this.getNBPlayer(GameConstants.PlayerType.HYBRID_HUMAN_AI) <= 1 || this.currentPlayer != null) && !this.spectatorMode) {
      this.btnTopArrow.draw(this.canvasCtx);
      this.btnBottomArrow.draw(this.canvasCtx);
      this.btnRightArrow.draw(this.canvasCtx);
      this.btnLeftArrow.draw(this.canvasCtx);
    }

    if (this.snakes != null && this.snakes.length <= 1) {
      this.gameRanking.forceClose();
    }

    if (!this.gameFinished && !this.gameOver && this.assetsLoaded && !this.engineLoading && !this.errorOccurred && !this.loadingResourcesErrorOccurred) {
      this.gameRanking.set(this.snakes, this.fontSize, this.header.height, this.currentPlayer, this.imageLoader, this.spectatorMode);
      this.gameRanking.draw(this.canvasCtx, this, this.currentPlayer);
    }

    // Disable all buttons (menu + header) at start of menu phase
    this.disableAllButtons();

    // Update online countdown
    this.onlineModeUI.update(this.gameState);

    // Build the correct menu overlay
    const nextGameText = this.onlineModeUI.getNextGameText();

    this.pauseMenu.update(
      {
        ...this.gameState.toObject(),
        assetsLoaded: this.assetsLoaded,
        engineLoading: this.engineLoading,
        fullscreen: this.fullscreen,
        loadingResourcesErrorOccurred: this.loadingResourcesErrorOccurred
      },
      {
        onStart: () => this.start(),
        onReset: () => this.reset(),
        onExit: () => this.exit(),
        onForceStart: () => this.forceStart(),
        onToggleFullscreen: () => this.toggleFullscreen()
      },
      {
        goalMessage: this.goalMessage,
        grid: this.grid,
        snakes: this.snakes,
        spectatorMode: this.spectatorMode,
        fullscreen: this.fullscreen,
        currentPlayer: this.currentPlayer,
        getNBPlayer: (type) => this.getNBPlayer(type),
        getPlayer: (num, type) => this.getPlayer(num, type),
        isFilterHueAvailable: this.isFilterHueAvailable,
        graphicSkin: this.graphicSkin,
        pingLatency: this.pingLatency,
        initialSpeed: this.initialSpeed,
        progressiveSpeed: this.progressiveSpeed,
        onlineMode: this.onlineMode,
        enableRetryPauseMenu: this.enableRetryPauseMenu,
        nextGameText: nextGameText,
        labelAdvice: this.labelAdvice,
        getCurrentPlayerInfos: () => this.getCurrentPlayerInfos(),
        onToggleFullscreen: () => this.toggleFullscreen()
      }
    );

    // Re-enable header buttons based on current state (only when game is running)
    if (this.assetsLoaded && !this.engineLoading && !this.paused && !this.gameOver && !this.gameFinished && !this.exited && !this.errorOccurred && !this.loadingResourcesErrorOccurred && !this.searchingPlayers && this.countBeforePlay < 0) {
      this.btnFullScreen.enable();
      this.gameRanking.enable();

      if (this.snakes != null) {
        for (let i = 0; i < this.snakes.length; i++) {
          if (this.snakes[i].player === GameConstants.PlayerType.HUMAN || this.snakes[i].player === GameConstants.PlayerType.HYBRID_HUMAN_AI) {
            this.btnTopArrow.enable();
            this.btnBottomArrow.enable();
            this.btnLeftArrow.enable();
            this.btnRightArrow.enable();
            break;
          }
        }
      }

      if (this.enablePause) {
        this.btnPause.enable();
      }

      if (this.snakes != null && this.snakes.length > 1) {
        this.btnRank.enable();
      }

      if (this.notificationMessage != undefined && this.notificationMessage != null && this.notificationMessage instanceof NotificationMessage && !this.notificationMessage.foreGround) {
        this.notificationMessage.enableCloseButton();
      }

      this.pauseMenu.timeoutAutoRetry = null;
    }

    this.pauseMenu.draw(this.canvasCtx);

    if ((this.gameFinished || this.gameOver) && this.snakes != null && this.snakes.length > 1 && !this.errorOccurred && !this.loadingResourcesErrorOccurred) {
      this.gameRanking.open();
      this.gameRanking.enable();
      this.gameRanking.draw(this.canvasCtx, this, this.currentPlayer);
    }

    if (this.notificationMessage != undefined && this.notificationMessage != null && this.notificationMessage instanceof NotificationMessage && this.notificationMessage.foreGround) {
      this.notificationMessage.enableCloseButton();
      this.notificationMessage.draw(this.canvasCtx);
    }

    if (this.debugMode) {
      Utils.drawText(ctx, this.getDebugText(), "rgba(255, 255, 255, 0.85)", Math.round(this.fontSize / 1.5), GameConstants.Setting.FONT_FAMILY, "right", "bottom", null, null, true);
    }

    // Draw online overlays (spectator mode label)
    this.onlineModeUI.draw(ctx, { fontSize: this.fontSize });

    if (this.gridUI) {
      this.gridUI.debugMode = this.debugMode;
    }
  }

  drawGridUI(ctx, dryRun) {
    this.gridUI?.set(this.snakes, this.grid, this.speed, this.offsetFrame, this.header.height, this.imageLoader, this.modelLoader, this.currentPlayer, this.gameFinished, this.countBeforePlay, this.spectatorMode, this.ticks, this.gameOver, this.onlineMode, this.paused);
    this.gridUI?.draw(ctx, dryRun);
  }

  getCurrentPlayerInfos() {
    let playerHuman, colorName, colorRgb;

    if (!this.spectatorMode) {
      if (this.currentPlayer != null && this.currentPlayer > -1) {
        playerHuman = this.getPlayer(this.currentPlayer + 1, GameConstants.PlayerType.HUMAN) || this.getPlayer(this.currentPlayer + 1, GameConstants.PlayerType.HYBRID_HUMAN_AI);
      } else if (this.getPlayer(1, GameConstants.PlayerType.HUMAN) != null) {
        playerHuman = this.getPlayer(1, GameConstants.PlayerType.HUMAN);
      } else {
        playerHuman = this.getPlayer(1, GameConstants.PlayerType.HYBRID_HUMAN_AI);
      }
    }

    if (playerHuman != null) {
      colorName = GraphicsUtils.hslToName(GameUtils.addHue(GameConstants.Setting.IMAGE_SNAKE_HUE, playerHuman.color), GameConstants.Setting.IMAGE_SNAKE_SATURATION, GameConstants.Setting.IMAGE_SNAKE_VALUE);
      colorRgb = GraphicsUtils.hsvToRgb(GameUtils.addHue(GameConstants.Setting.IMAGE_SNAKE_HUE, playerHuman.color) / 360, GameConstants.Setting.IMAGE_SNAKE_SATURATION / 100, GameConstants.Setting.IMAGE_SNAKE_VALUE / 100);
    }
    return { playerHuman, colorName, colorRgb };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  setKill() {
    this.killed = true;

    this.grid = null;
    this.snakes = null;

    if (this.appendTo != null) {
      if (this.outputType === GameConstants.OutputType.TEXT && this.textarea != null) {
        this.appendTo.removeChild(this.textarea);
        this.textarea = null;
      } else if (this.outputType === GameConstants.OutputType.GRAPHICAL && this.canvas != null) {
        this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.appendTo.removeChild(this.canvas);
        this.canvas = null;
        this.canvasCtx = null;
        if (this.imageLoader) this.imageLoader.clear();
      }
    }

    this.gridUI?.cleanAfterGameExit();
    this.inputManager.detach();

    if (this.renderLoop) {
      this.renderLoop.setKill();
    }
  }

  // ── Misc ──────────────────────────────────────────────────────────────────────

  resetState() {
    if (this.gridUI) {
      this.gridUI.resetState();
    }
    this.pauseMenu.resetMenuState();
  }

  setDisplayFPS(display) {
    console.warn("setDisplayFPS is deprecated. Please use setDebugMode with true to display FPS");
    this.setDebugMode(display);
  }

  setDebugMode(display) {
    this.debugMode = display;
    if (this.renderLoop) this.renderLoop.debugMode = display;
  }

  disableAllButtons() {
    if (this.outputType === GameConstants.OutputType.GRAPHICAL) {
      // Menu buttons
      this.pauseMenu.disableAll();

      // Header buttons
      if (this.btnFullScreen) this.btnFullScreen.disable();
      if (this.btnPause) this.btnPause.disable();
      if (this.btnRank) this.btnRank.disable();

      // Directional buttons
      if (this.btnTopArrow) this.btnTopArrow.disable();
      if (this.btnBottomArrow) this.btnBottomArrow.disable();
      if (this.btnRightArrow) this.btnRightArrow.disable();
      if (this.btnLeftArrow) this.btnLeftArrow.disable();

      // Ranking + notification
      this.gameRanking.disable();
      if (this.notificationMessage != undefined && this.notificationMessage != null && this.notificationMessage instanceof NotificationMessage) {
        this.notificationMessage.disableCloseButton();
      }
    }
  }

  setNotification(notification) {
    if (this.notificationMessage != undefined && this.notificationMessage != null && this.notificationMessage instanceof NotificationMessage) {
      this.notificationMessage.close();
    }

    this.notificationMessage = notification;

    if (this.notificationMessage instanceof NotificationMessage && this.disableAnimation) {
      this.notificationMessage.disableAnimation = true;
    }

    if (this.notificationMessage) {
      this.notificationMessage.closeButton.width = 32 * this.getDevicePixelRatio();
      this.notificationMessage.closeButton.height = 32 * this.getDevicePixelRatio();
      this.notificationMessage.open();
    }
  }

  setGoal(goal) {
    this.goalMessage = goal;
  }

  setTimeToDisplay(time) {
    this.timerToDisplay = time;
  }

  setBestScore(score) {
    if (score != undefined && score != null && score.trim() !== "") {
      this.bestScoreToDisplay = score;
    }
  }

  getDebugText() {
    return i18next.t("engine.debug.fps") + " " + this.currentFPS
      + " / " + i18next.t("engine.debug.frames") + " " + this.frame
      + " / " + i18next.t("engine.debug.ticks") + " " + this.ticks
      + " / " + i18next.t("engine.debug.tps") + " " + this.currentTPS
      + " / " + i18next.t("engine.debug.speed") + " " + this.speed
      + (this.pingLatency > -1 ? " / " + i18next.t("engine.ping") + " " + this.pingLatency + " ms" : "");
  }

  toString() {
    return (this.grid != null ? this.grid.toString() : "")
      + "\n" + (this.snakes != null && this.snakes.length <= 1 ? i18next.t("engine.score") + " : " + (this.snakes != null ? this.snakes[0].score : "") : "")
      + (this.debugMode ? "\n" + this.getDebugText() : "")
      + (this.gameOver && !this.scoreMax ? "\n" + i18next.t("engine.gameOver") : "")
      + (this.scoreMax ? "\n" + i18next.t("engine.scoreMax") : "")
      + (!this.gameOver && this.paused ? "\n" + i18next.t("engine.debug.paused") : "")
      + (this.countBeforePlay > 0 ? "\n" + this.countBeforePlay : "");
  }
}
