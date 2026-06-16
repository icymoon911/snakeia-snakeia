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
import GameConstants from "../engine/Constants";
import { Button, Menu, Label } from "jsgametools";

/**
 * PauseMenu – owns every button that can appear in the pause / overlay menus
 * and the menu-state booleans (confirmReset, confirmExit, getInfos, …).
 *
 * GameUI delegates to PauseMenu for:
 *   - Button creation and image loading
 *   - Menu-state transitions (show/hide which sub-menu)
 *   - Drawing the overlay menu (called from inside GameUI.draw())
 *   - Disabling all buttons between frames
 *
 * Public interface:
 *   new PauseMenu(settings)
 *   .createButtons(dpr)              – instantiate all buttons
 *   .loadImages(imageLoader)         – kick off image loading for image-buttons
 *   .setFontSize(fontSize)           – keep labelMenus in sync with DPR changes
 *   .update(state, callbacks)        – build the correct menu for the current state
 *   .draw(ctx)                       – draw the active menu
 *   .disableAll()                    – disable every button (called at frame start)
 *   .enableButton(name)              – re-enable a specific button
 *   .setMenuOverlay(menuState, …)    – switch to a specific menu state
 *   .closeMenu()                     – close any open sub-menu
 *   .resetMenuState()                – reset all menu-state booleans
 */
export default class PauseMenu {
  constructor(renderBlur) {
    // Menu overlay
    this.menu = new Menu(null, renderBlur);

    // Menu state booleans
    this.confirmReset = false;
    this.confirmExit = false;
    this.getInfos = false;
    this.getInfosGame = false;
    this.getInfosControls = false;
    this.getInfosGoal = false;
    this.getAdvancedInfosGame = false;

    // Label shared across all menus
    this.labelMenus = null;

    // Buttons – initialised by createButtons()
    this.btnContinue = null;
    this.btnRetry = null;
    this.btnQuit = null;
    this.btnYes = null;
    this.btnNo = null;
    this.btnOK = null;
    this.btnAbout = null;
    this.btnAdvanced = null;
    this.btnInfosGame = null;
    this.btnControls = null;
    this.btnGoal = null;
    this.btnExitFullScreen = null;
    this.btnEnterFullScreen = null;
    this.btnStartGame = null;

    // Timeout for auto-retry (set externally, but tracked here)
    this.timeoutAutoRetry = null;
  }

  /**
   * Instantiate all menu buttons. Called once during GameUI.init().
   * @param {number} dpr – device pixel ratio
   */
  createButtons(dpr) {
    this.btnContinue = new Button(i18next.t("engine.continue"), null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnRetry    = new Button(i18next.t("engine.reset"),    null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnQuit     = new Button(i18next.t("engine.exit"),     null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnYes      = new Button(i18next.t("engine.yes"),      null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnNo       = new Button(i18next.t("engine.no"),       null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnOK       = new Button(i18next.t("engine.ok"),       null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnAbout    = new Button(i18next.t("engine.about"),    null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnInfosGame = new Button(i18next.t("engine.infosGame"), null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnAdvanced = new Button(i18next.t("engine.infosGameAdvanced"), null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnControls = new Button(i18next.t("engine.infosControls"), null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnGoal     = new Button(i18next.t("engine.infosGoal"), null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnExitFullScreen  = new Button(i18next.t("engine.exitFullScreen"),  null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnEnterFullScreen = new Button(i18next.t("engine.enterFullScreen"), null, null, "center", "#3498db", "#246A99", "#184766");
    this.btnStartGame = new Button(i18next.t("engine.servers.startGame"), null, null, "center", "#3498db", "#246A99", "#184766");

    this.labelMenus = new Label("", null, null, GameConstants.Setting.FONT_SIZE * dpr, GameConstants.Setting.FONT_FAMILY, "white", "center");
  }

  /**
   * Set the font size for the shared label.
   * @param {number} fontSize
   */
  setFontSize(fontSize) {
    if (this.labelMenus) {
      this.labelMenus.size = fontSize;
      this.labelMenus.fontSize = fontSize;
    }
  }

  /**
   * Disable every button. Called at the start of each draw() frame so only the
   * buttons that the current state actually needs are re-enabled later.
   */
  disableAll() {
    const btns = [
      this.btnContinue, this.btnRetry, this.btnQuit, this.btnYes, this.btnNo,
      this.btnOK, this.btnAbout, this.btnInfosGame, this.btnAdvanced,
      this.btnExitFullScreen, this.btnEnterFullScreen, this.btnStartGame,
      this.btnControls, this.btnGoal
    ];

    for (const btn of btns) {
      if (btn) btn.disable();
    }
  }

  /**
   * Enable a specific button by property name.
   * @param {string} name
   */
  enableButton(name) {
    if (this[name]) this[name].enable();
  }

  /**
   * Build the correct menu overlay based on current game state and menu flags.
   *
   * @param {Object} state – GameState instance
   * @param {Object} callbacks – actions the UI layer provides:
   *   { onStart, onReset, onExit, onForceStart, onToggleFullscreen }
   * @param {Object} extra – additional context needed for label text:
   *   { goalMessage, grid, snakes, spectatorMode, fullscreen, currentPlayer,
   *     getNBPlayer, getPlayer, isFilterHueAvailable, graphicSkin, pingLatency,
   *     initialSpeed, progressiveSpeed, onlineMode, enableRetryPauseMenu,
   *     nextGameText, labelAdvice }
   */
  update(state, callbacks, extra) {
    this.menu.disable();

    const { onStart, onReset, onExit, onForceStart, onToggleFullscreen } = callbacks;

    // ── Exited ────────────────────────────────────────────────────────────────
    if (state.exited) {
      this.labelMenus.text = i18next.t("engine.exited");
      this.labelMenus.color = "white";
      state.fullscreen
        ? this.menu.set(this.labelMenus, this.btnExitFullScreen)
        : this.menu.set(this.labelMenus);
      this.btnExitFullScreen.setClickAction(() => onToggleFullscreen());
      return;
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (state.errorOccurred || state.loadingResourcesErrorOccurred) {
      this.labelMenus.text = state.loadingResourcesErrorOccurred
        ? i18next.t("engine.errorLoading")
        : i18next.t("engine.error");
      this.labelMenus.color = "#E74C3C";
      this.menu.set(this.labelMenus, this.btnQuit);
      this.btnQuit.setClickAction(() => {
        this.confirmExit = false;
        onExit();
      });
      return;
    }

    // ── Info sub-menus ────────────────────────────────────────────────────────
    if (this.getInfosControls) {
      this.menu.set(this.labelMenus, this.btnOK);
      this.labelMenus.text = extra.labelAdvice ? extra.labelAdvice.text : "";
      this.btnOK.setClickAction(() => { this.getInfosControls = false; });
      return;
    }

    if (this.getInfosGoal) {
      this.menu.set(this.labelMenus, this.btnOK);
      this.labelMenus.text = extra.goalMessage;
      this.btnOK.setClickAction(() => { this.getInfosGoal = false; });
      return;
    }

    if (this.getInfosGame) {
      this._buildInfosGameMenu(state, extra);
      return;
    }

    if (this.getInfos) {
      this.labelMenus.text = i18next.t("engine.aboutScreen.title") + "\nwww.eliastiksofts.com\n\n"
        + i18next.t("engine.aboutScreen.versionAndDate", {
          version: GameConstants.Setting.APP_VERSION,
          date: new Intl.DateTimeFormat(i18next.language).format(new Date(GameConstants.Setting.DATE_VERSION)),
          interpolation: { escapeValue: false }
        });
      this.labelMenus.color = "white";
      this.menu.set(this.labelMenus, this.btnControls, this.btnOK);
      this.btnControls.setClickAction(() => { this.getInfosControls = true; });
      this.btnOK.setClickAction(() => { this.getInfos = false; });
      return;
    }

    // ── Confirm exit ──────────────────────────────────────────────────────────
    if (this.confirmExit) {
      this.labelMenus.text = i18next.t("engine.exitConfirm");
      this.labelMenus.color = "#E74C3C";
      this.menu.set(this.labelMenus, this.btnNo, this.btnYes);
      this.btnYes.setClickAction(() => { this.confirmExit = false; onExit(); });
      this.btnNo.setClickAction(() => { this.confirmExit = false; });
      return;
    }

    // ── Countdown / ready screen ──────────────────────────────────────────────
    if (state.assetsLoaded && !state.engineLoading && state.countBeforePlay >= 0) {
      this._buildCountdownMenu(state, extra);
      return;
    }

    // ── Confirm reset ─────────────────────────────────────────────────────────
    if (this.confirmReset && !state.gameOver) {
      this.labelMenus.text = i18next.t("engine.resetConfirm");
      this.labelMenus.color = "#E74C3C";
      this.menu.set(this.labelMenus, this.btnNo, this.btnYes);
      this.btnYes.setClickAction(() => { this.confirmReset = false; onReset(); });
      this.btnNo.setClickAction(() => { this.confirmReset = false; });
      return;
    }

    // ── Game finished ─────────────────────────────────────────────────────────
    if (state.gameFinished) {
      const isMazeWin = state.grid && state.grid.maze && state.gameMazeWin;
      this.labelMenus.text = isMazeWin
        ? i18next.t("engine.mazeWin")
        : i18next.t("engine.gameFinished") + extra.nextGameText;
      this.labelMenus.color = isMazeWin ? "#2ecc71" : "white";
      state.enableRetry
        ? this.menu.set(this.labelMenus, this.btnRetry, this.btnQuit)
        : this.menu.set(this.labelMenus, this.btnQuit);
      this.btnRetry.setClickAction(() => onReset());
      this.btnQuit.setClickAction(() => { this.confirmExit = true; });
      return;
    }

    // ── Score max ─────────────────────────────────────────────────────────────
    if (state.scoreMax && state.snakes && state.snakes.length <= 1) {
      this.labelMenus.text = i18next.t("engine.scoreMax") + extra.nextGameText;
      this.labelMenus.color = "#2ecc71";
      if (state.enableRetry) {
        this.menu.set(this.labelMenus, this.btnRetry, this.btnQuit);
      } else {
        state.fullscreen
          ? this.menu.set(this.labelMenus, this.btnExitFullScreen)
          : this.menu.set(this.labelMenus, this.btnQuit);
      }
      this.btnRetry.setClickAction(() => onReset());
      this.btnQuit.setClickAction(() => { this.confirmExit = true; });
      this.btnExitFullScreen.setClickAction(() => onToggleFullscreen());
      return;
    }

    // ── Game over ─────────────────────────────────────────────────────────────
    if (state.gameOver && state.snakes && state.snakes.length <= 1) {
      this.labelMenus.text = i18next.t("engine.gameOver") + extra.nextGameText;
      this.labelMenus.color = "#E74C3C";
      const snake0 = state.snakes[0];
      if (state.enableRetry && snake0 && !snake0.autoRetry) {
        this.menu.set(this.labelMenus, this.btnRetry, this.btnQuit);
      } else {
        state.fullscreen
          ? this.menu.set(this.labelMenus, this.btnExitFullScreen)
          : this.menu.set(this.labelMenus, this.btnQuit);
      }
      if (snake0 && snake0.autoRetry && this.timeoutAutoRetry == null) {
        this.timeoutAutoRetry = setTimeout(() => onReset(), 500);
      } else {
        this.btnRetry.setClickAction(() => onReset());
        this.btnQuit.setClickAction(() => { this.confirmExit = true; });
        this.btnExitFullScreen.setClickAction(() => onToggleFullscreen());
      }
      return;
    }

    // ── Searching players (online) ────────────────────────────────────────────
    if (state.assetsLoaded && !state.engineLoading && state.searchingPlayers) {
      this.labelMenus.text = i18next.t("engine.servers.waitingPlayers")
        + "\n" + state.playerNumber + "/" + state.maxPlayers
        + (state.timeStart > 0
          ? ("\n\n" + i18next.t("engine.servers.gameStart") + " " + GameUtils.millisecondsFormat(state.timeStart))
          : "");
      this.labelMenus.color = "white";
      state.onlineMaster
        ? this.menu.set(this.labelMenus, this.btnStartGame, this.btnQuit)
        : this.menu.set(this.labelMenus, this.btnQuit);
      this.btnQuit.setClickAction(() => { this.confirmExit = true; });
      this.btnStartGame.setClickAction(() => onForceStart());
      return;
    }

    // ── Paused menu ───────────────────────────────────────────────────────────
    if (state.paused && !state.gameOver && state.assetsLoaded && !state.engineLoading) {
      this.labelMenus.text = i18next.t("engine.pause");
      this.labelMenus.color = "white";

      if (state.enablePause) {
        if (state.enableRetry && state.enableRetryPauseMenu) {
          this.menu.set(this.labelMenus, this.btnContinue, this.btnRetry, this.btnAbout, this.btnInfosGame, this.btnQuit);
        } else {
          this.menu.set(this.labelMenus, this.btnContinue, this.btnAbout, this.btnInfosGame, this.btnQuit);
        }
      } else {
        this.menu.set(this.labelMenus, this.btnContinue, this.btnInfosGame, this.btnAbout);
      }

      this.btnContinue.setClickAction(() => onStart());
      this.btnRetry.setClickAction(() => { this.confirmReset = true; });
      this.btnInfosGame.setClickAction(() => { this.getInfosGame = true; });
      this.btnQuit.setClickAction(() => { this.confirmExit = true; });
      this.btnAbout.setClickAction(() => { this.getInfos = true; });
      return;
    }
  }

  /**
   * Draw the active menu overlay.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.menu.draw(ctx);
  }

  /**
   * Reset all menu-state booleans to their default values.
   */
  resetMenuState() {
    this.confirmReset = false;
    this.confirmExit = false;
    this.getInfos = false;
    this.getInfosGame = false;
    this.getInfosControls = false;
    this.getInfosGoal = false;
    this.getAdvancedInfosGame = false;
    this.timeoutAutoRetry = null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  _buildInfosGameMenu(state, extra) {
    if (this.getAdvancedInfosGame && (extra.grid && (extra.grid.seedGrid || extra.grid.seedGame))) {
      this.labelMenus.text =
        (extra.grid.seedGrid  ? i18next.t("engine.seedGrid")  + "\n" + extra.grid.seedGrid  : "") +
        (extra.grid.seedGame  ? "\n" + i18next.t("engine.seedGame") + "\n" + extra.grid.seedGame : "");
      this.menu.set(this.labelMenus, this.btnOK);
      this.btnOK.setClickAction(() => { this.getAdvancedInfosGame = false; });
    } else {
      const snake0 = extra.snakes && extra.snakes[0];
      const isHuman = snake0 && (snake0.player === GameConstants.PlayerType.HUMAN && !extra.spectatorMode)
                   || (snake0 && snake0.player === GameConstants.PlayerType.HYBRID_HUMAN_AI);

      let text = "";
      if (extra.snakes && extra.snakes.length <= 1 && !extra.spectatorMode) {
        text = i18next.t("engine.player") + " " + (isHuman ? i18next.t("engine.playerHuman") : i18next.t("engine.playerAI"));
      }

      if (extra.getNBPlayer(GameConstants.PlayerType.AI) > 0) {
        const aiPlayer = extra.getPlayer(1, GameConstants.PlayerType.AI);
        text += "\n" + i18next.t("engine.aiLevel") + " " + i18next.t("engine.aiLevelList." + aiPlayer.getAILevelText());
      }

      text += "\n" + i18next.t("engine.sizeGrid") + " "
        + (extra.grid ? extra.grid.width : "???") + "×"
        + (extra.grid ? extra.grid.height : "???");

      text += "\n" + i18next.t("engine.currentSpeed") + " "
        + (extra.initialSpeed != null ? extra.initialSpeed : "???");

      if (extra.snakes && extra.snakes.length <= 1 && extra.progressiveSpeed) {
        text += "\n" + i18next.t("engine.progressiveSpeed");
      }
      if (extra.grid && !extra.grid.maze && snake0 && snake0.player === GameConstants.PlayerType.HYBRID_HUMAN_AI) {
        text += "\n" + i18next.t("engine.assistAI");
      }
      if (extra.grid && extra.grid.maze) {
        text += "\n" + i18next.t("engine.mazeModeMin");
      }
      if (extra.onlineMode) {
        text += "\n" + i18next.t("engine.onlineMode");
      }
      if (extra.pingLatency > -1) {
        text += "\n" + i18next.t("engine.ping") + " " + extra.pingLatency + " ms";
      }

      this.labelMenus.text = text;

      const hasSeed = extra.grid && (extra.grid.seedGrid || extra.grid.seedGame);
      const hasGoal = !!extra.goalMessage;

      if (hasSeed && hasGoal) {
        this.menu.set(this.labelMenus, this.btnGoal, this.btnAdvanced, this.btnOK);
      } else if (hasSeed) {
        this.menu.set(this.labelMenus, this.btnAdvanced, this.btnOK);
      } else if (hasGoal) {
        this.menu.set(this.labelMenus, this.btnGoal, this.btnOK);
      } else {
        this.menu.set(this.labelMenus, this.btnOK);
      }

      this.btnOK.setClickAction(() => { this.getInfosGame = false; });
      this.btnGoal.setClickAction(() => { this.getInfosGoal = true; });
      this.btnAdvanced.setClickAction(() => { this.getAdvancedInfosGame = true; });
    }

    this.labelMenus.color = "white";
  }

  _buildCountdownMenu(state, extra) {
    const { playerHuman, colorName, colorRgb } = extra.getCurrentPlayerInfos();

    const isMultiHuman = state.snakes
      && ((state.snakes.length > 1 && extra.getNBPlayer(GameConstants.PlayerType.HUMAN) <= 1 && extra.getPlayer(1, GameConstants.PlayerType.HUMAN) != null)
       || (state.snakes.length > 1 && extra.getNBPlayer(GameConstants.PlayerType.HYBRID_HUMAN_AI) <= 1 && extra.getPlayer(1, GameConstants.PlayerType.HYBRID_HUMAN_AI) != null)
       || (state.currentPlayer != null && state.snakes.length > 1));

    if (isMultiHuman) {
      if (state.countBeforePlay > 0) {
        this.labelMenus.text = "" + state.countBeforePlay;
      } else {
        this.labelMenus.text = i18next.t("engine.ready");
      }

      if (playerHuman != null) {
        this.labelMenus.text += "\n" + (extra.isFilterHueAvailable && colorName !== "???" && (extra.graphicSkin === "flat" || extra.graphicSkin === "pixel")
          ? i18next.t("engine.colorPlayer", { color: colorName })
          : i18next.t("engine.arrowPlayer"));
      }

      if (colorRgb && colorRgb.length >= 3) {
        this.labelMenus.color = (extra.isFilterHueAvailable && colorName !== "???" && (extra.graphicSkin === "flat" || extra.graphicSkin === "pixel"))
          ? ["white", "rgb(" + colorRgb[0] + ", " + colorRgb[1] + ", " + colorRgb[2] + ")"]
          : ["white", "#3498db"];
      } else {
        this.labelMenus.color = "white";
      }
    } else {
      this.labelMenus.text = state.countBeforePlay > 0 ? "" + state.countBeforePlay : i18next.t("engine.ready");
      this.labelMenus.color = "white";
    }

    if (state.fullscreen && playerHuman && !state.spectatorMode) {
      this.menu.set(this.labelMenus, this.btnExitFullScreen, extra.labelAdvice);
    } else if (!state.fullscreen && playerHuman && !state.spectatorMode) {
      this.menu.set(this.labelMenus, this.btnEnterFullScreen, extra.labelAdvice);
    } else if (state.fullscreen && !(playerHuman && !state.spectatorMode)) {
      this.menu.set(this.labelMenus, this.btnExitFullScreen);
    } else if (!state.fullscreen && !(playerHuman && !state.spectatorMode)) {
      this.menu.set(this.labelMenus, this.btnEnterFullScreen);
    }

    this.btnEnterFullScreen.setClickAction(() => extra.onToggleFullscreen());
    this.btnExitFullScreen.setClickAction(() => extra.onToggleFullscreen());
  }
}
