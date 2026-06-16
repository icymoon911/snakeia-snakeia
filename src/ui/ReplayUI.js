/*
 * ReplayUI - Manages the game replay viewing experience.
 *
 * Provides:
 *   - Mock Snake/Grid classes to render replay frames via existing GridUI
 *   - Replay state save/restore for clean transitions
 *   - Replay control panel rendering (buttons, progress bar, info overlay)
 *   - Export/import replay data
 */
import GameConstants from "../engine/Constants.js";
import GameUtils from "../engine/GameUtils.js";
import Position from "../engine/Position.js";
import ReplayPlayer from "../engine/ReplayPlayer.js";
import ReplayRecorder from "../engine/ReplayRecorder.js";

// ---------------------------------------------------------------------------
// Mock classes - lightweight stand-ins that expose just enough API for GridUI
// ---------------------------------------------------------------------------

/**
 * Mock snake reconstructed from a replay frame snapshot.
 * Implements every method that GridUI calls during rendering so that the
 * existing differential snake renderer works without modification.
 */
export class MockReplaySnake {
  constructor(data) {
    this.score = data.score || 0;
    this.direction = data.direction != null ? data.direction : GameConstants.Direction.RIGHT;
    this.gameOver = !!data.gameOver;
    this.scoreMax = !!data.scoreMax;
    this.name = data.name || "Snake";
    this.player = data.player || GameConstants.PlayerType.AI;
    this.aiLevel = data.aiLevel || GameConstants.AiLevel.DEFAULT;
    this.color = data.color != null ? data.color : 0;
    this.ticksDead = data.ticksDead || 0;
    this.lastTailMoved = true;

    // Build the position queue that GridUI iterates over
    this.queue = (data.body || []).map(
      p => new Position(p.x, p.y, p.direction != null ? p.direction : this.direction)
    );

    // Cache for the differential renderer (GridUI.saveCurrentState)
    this.lastTail = this.getTailPosition();
    this.lastHead = this.getHeadPosition();
  }

  // --- Queue accessors -----------------------------------------------------

  length() {
    return this.queue.length;
  }

  get(index) {
    if (this.queue && this.queue[index] != null) {
      return this.queue[index].copy();
    }
    return null;
  }

  getHeadPosition() {
    return this.get(0);
  }

  getTailPosition() {
    return this.get(this.length() - 1);
  }

  // --- Direction helpers (used by GridUI for body-angle sprites) -----------

  getGraphicDirection(index) {
    return this.getGraphicDirectionFor(this.get(index), this.get(index - 1), this.get(index + 1));
  }

  getGraphicDirectionFor(current, next, prec) {
    if (!current) return GameConstants.Direction.RIGHT;
    if (next == null || prec == null) return current.direction;

    const dirToPrec = this._dirTo(current, prec);
    const dirToNext = this._dirTo(current, next);

    if (
      (dirToPrec === GameConstants.Direction.LEFT && dirToNext === GameConstants.Direction.BOTTOM) ||
      (dirToPrec === GameConstants.Direction.BOTTOM && dirToNext === GameConstants.Direction.LEFT)
    ) return GameConstants.Direction.ANGLE_1;

    if (
      (dirToPrec === GameConstants.Direction.RIGHT && dirToNext === GameConstants.Direction.BOTTOM) ||
      (dirToPrec === GameConstants.Direction.BOTTOM && dirToNext === GameConstants.Direction.RIGHT)
    ) return GameConstants.Direction.ANGLE_2;

    if (
      (dirToPrec === GameConstants.Direction.UP && dirToNext === GameConstants.Direction.RIGHT) ||
      (dirToPrec === GameConstants.Direction.RIGHT && dirToNext === GameConstants.Direction.UP)
    ) return GameConstants.Direction.ANGLE_3;

    if (
      (dirToPrec === GameConstants.Direction.UP && dirToNext === GameConstants.Direction.LEFT) ||
      (dirToPrec === GameConstants.Direction.LEFT && dirToNext === GameConstants.Direction.UP)
    ) return GameConstants.Direction.ANGLE_4;

    return current.direction;
  }

  _dirTo(from, to) {
    if (!from || !to) return GameConstants.Direction.RIGHT;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? GameConstants.Direction.RIGHT : GameConstants.Direction.LEFT;
    }
    return dy > 0 ? GameConstants.Direction.BOTTOM : GameConstants.Direction.UP;
  }

  // --- Stubs expected by GridUI but not meaningful for static frames -------

  getAILevelText() {
    return "normal";
  }
}

/**
 * Mock grid reconstructed from a replay frame snapshot.
 * Exposes the same read API that GridUI uses for tile rendering.
 */
export class MockReplayGrid {
  constructor(gridData, width, height, fruitPositions, fruitPosGold) {
    this.grid = gridData;
    this.width = width;
    this.height = height;
    this.maze = false;
    this.fruitPositions = (fruitPositions || []).map(p => new Position(p.x, p.y));
    this.fruitPosGold = fruitPosGold ? new Position(fruitPosGold.x, fruitPosGold.y) : null;
    this.rngGame = null;
    this.rngGrid = null;
    this.seedGrid = undefined;
    this.seedGame = undefined;
  }

  get(position) {
    if (
      position.y >= 0 && position.y < this.height &&
      position.x >= 0 && position.x < this.width
    ) {
      return this.grid[position.y][position.x];
    }
    return GameConstants.CaseType.WALL;
  }

  getXY(x, y) {
    return this.get(new Position(x, y));
  }

  getImageCase(position) {
    return GameUtils.getImageCase(this.get(position));
  }

  getTotal(type) {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === type) count++;
      }
    }
    return count;
  }

  toString() {
    let s = "";
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        s += GameConstants.CaseTypeText[this.grid[y][x]] || "-";
      }
      s += "\n";
    }
    return s;
  }
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function buildMockSnakes(frameData) {
  return (frameData.snakes || []).map(d => new MockReplaySnake(d));
}

export function buildMockGrid(frameData, metadata) {
  return new MockReplayGrid(
    frameData.grid,
    metadata.gridWidth,
    metadata.gridHeight,
    frameData.fruitPositions,
    frameData.fruitPosGold
  );
}

// ---------------------------------------------------------------------------
// ReplayController - orchestrates replay lifecycle for GameUI
// ---------------------------------------------------------------------------

export default class ReplayController {
  constructor(gameUI) {
    this.gameUI = gameUI;
    this.replayPlayer = null;

    // Saved original game state (restored on exit)
    this._saved = null;

    // Cached layout for the progress bar (set by drawReplayControls)
    this.progressBarRect = null;
  }

  // --- Public API ----------------------------------------------------------

  /**
   * Enter replay mode with the given replay data object
   * (the output of ReplayRecorder.export() or ReplayRecorder.import()).
   */
  startReplay(replayData) {
    if (this.replayPlayer) {
      this.stopReplay();
    }

    this.replayPlayer = new ReplayPlayer(replayData);
    this._saveState();
    this._applyFrame(this.replayPlayer.currentFrame);

    this.replayPlayer.onFrame(() => {
      if (this.replayPlayer) {
        this._applyFrame(this.replayPlayer.currentFrame);
      }
    });

    this.replayPlayer.play();
  }

  /** Leave replay mode and restore the original game state. */
  stopReplay() {
    if (this.replayPlayer) {
      this.replayPlayer.destroy();
      this.replayPlayer = null;
    }
    this._restoreState();
  }

  /** True while a replay is active. */
  get isActive() {
    return !!this.replayPlayer;
  }

  // Playback controls (safe to call even when no replay is active)
  togglePlayPause() {
    if (!this.replayPlayer) return;
    if (this.replayPlayer.isPlaying) {
      this.replayPlayer.pause();
    } else if (this.replayPlayer.paused) {
      this.replayPlayer.resume();
    } else {
      this.replayPlayer.play();
    }
  }

  nextFrame() { this.replayPlayer && this.replayPlayer.nextFrame(); }
  prevFrame() { this.replayPlayer && this.replayPlayer.prevFrame(); }

  cycleSpeed() {
    if (!this.replayPlayer) return;
    const speeds = [0.5, 1, 2, 4];
    const idx = speeds.indexOf(this.replayPlayer.speed);
    this.replayPlayer.setSpeed(speeds[(idx + 1) % speeds.length]);
  }

  seekToFrame(frameIndex) {
    this.replayPlayer && this.replayPlayer.seekTo(frameIndex);
  }

  // --- Export / Import -----------------------------------------------------

  exportReplay() {
    if (!this.replayPlayer) return;
    const json = JSON.stringify(this.replayPlayer.replayData);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "snakeia-replay-" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importReplayFromFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        const file = input.files[0];
        if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = ReplayRecorder.import(reader.result);
            this.startReplay(data);
            resolve(true);
          } catch (e) {
            console.error("Invalid replay file:", e);
            reject(e);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // --- Rendering -----------------------------------------------------------

  /**
   * Draw the replay control bar at the bottom of the canvas.
   * Called from GameUI.draw() when replayMode is true.
   */
  drawReplayControls(ctx, canvas, buttons, fontSize) {
    const controlBarHeight = Math.round(fontSize * 2.8);
    const barY = canvas.height - controlBarHeight;

    // Semi-transparent background
    ctx.fillStyle = "rgba(44, 62, 80, 0.88)";
    ctx.fillRect(0, barY, canvas.width, controlBarHeight);

    // --- Buttons row -------------------------------------------------------
    const btnSize = Math.round(fontSize * 1.4);
    const padding = Math.round(fontSize * 0.35);
    let curX = padding;
    const btnY = barY + Math.round((controlBarHeight - btnSize) / 2);

    const buttonList = [
      buttons.btnReplayPrev,
      buttons.btnReplayPlayPause,
      buttons.btnReplayNext,
      buttons.btnReplaySpeed,
    ];

    for (const btn of buttonList) {
      if (!btn) continue;
      btn.width = btnSize;
      btn.height = btnSize;
      btn.x = curX;
      btn.y = btnY;
      btn.fontSize = Math.round(fontSize * 0.65);
      btn.draw(ctx);
      curX += btnSize + padding;
    }

    // --- Progress bar ------------------------------------------------------
    const progressWidth = canvas.width - curX - padding * 5 - btnSize * 3;
    const progressHeight = Math.round(fontSize * 0.45);
    const progressY = barY + Math.round((controlBarHeight - progressHeight) / 2);

    if (progressWidth > 20) {
      this._drawProgressBar(ctx, buttons.replayProgressBar, curX, progressY, progressWidth, progressHeight);
      curX += progressWidth + padding;
    }

    // --- Frame counter text ------------------------------------------------
    if (this.replayPlayer) {
      const frameText = (this.replayPlayer.currentFrameIndex + 1) + " / " + this.replayPlayer.totalFrames;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = Math.round(fontSize * 0.55) + "px " + GameConstants.Setting.FONT_FAMILY;
      ctx.textBaseline = "middle";
      ctx.fillText(frameText, curX, barY + controlBarHeight / 2);
      curX += Math.round(fontSize * 3) + padding;
    }

    // --- Export / Import / Exit buttons ------------------------------------
    const smallBtnH = btnSize;
    const smallBtnW = Math.round(fontSize * 2.8);
    const rightButtons = [
      buttons.btnReplayExport,
      buttons.btnReplayImport,
      buttons.btnReplayExit,
    ];

    let rightX = canvas.width - padding;
    for (let i = rightButtons.length - 1; i >= 0; i--) {
      const btn = rightButtons[i];
      if (!btn) continue;
      rightX -= smallBtnW;
      btn.width = smallBtnW;
      btn.height = smallBtnH;
      btn.x = rightX;
      btn.y = btnY;
      btn.fontSize = Math.round(fontSize * 0.55);
      btn.draw(ctx);
      rightX -= padding;
    }
  }

  /**
   * Draw an information overlay at the top of the canvas showing the current
   * replay frame state: tick number, each snake's name and score, game status.
   */
  drawReplayOverlay(ctx, canvas, snakes, ticks, gameOver, gameFinished, aiStuck, fontSize) {
    if (!snakes || !this.replayPlayer) return;

    const overlayHeight = Math.round(fontSize * (1.2 + snakes.length * 0.7));
    ctx.fillStyle = "rgba(44, 62, 80, 0.72)";
    ctx.fillRect(0, 0, canvas.width, overlayHeight);

    const fontPx = Math.round(fontSize * 0.5);
    ctx.font = fontPx + "px " + GameConstants.Setting.FONT_FAMILY;
    ctx.textBaseline = "top";

    // Status line
    let status = "Playing";
    if (gameOver) status = "Game Over";
    else if (gameFinished) status = "Finished";
    if (aiStuck) status += " (AI stuck)";

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Tick: " + ticks + "  |  Status: " + status, Math.round(fontSize * 0.4), Math.round(fontSize * 0.25));

    // Snake lines
    let lineY = Math.round(fontSize * 0.9);
    for (let i = 0; i < snakes.length; i++) {
      const snake = snakes[i];
      const label = (snake.player === GameConstants.PlayerType.HUMAN ||
                     snake.player === GameConstants.PlayerType.HYBRID_HUMAN_AI)
        ? "Player " + (i + 1)
        : "AI " + (i + 1);
      const alive = snake.gameOver ? " (dead)" : "";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText(
        label + " (" + (snake.name || "Snake") + "): " + snake.score + alive,
        Math.round(fontSize * 0.4),
        lineY
      );
      lineY += Math.round(fontSize * 0.65);
    }
  }

  /**
   * Handle a canvas click during replay mode.
   * Checks if the click landed on the progress bar and seeks accordingly.
   * @returns {boolean} true if the click was consumed.
   */
  handleCanvasClick(clientX, clientY, canvas) {
    if (!this.replayPlayer || !this.progressBarRect) return false;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const pb = this.progressBarRect;
    if (x >= pb.x && x <= pb.x + pb.width && y >= pb.y && y <= pb.y + pb.height) {
      const percent = Math.max(0, Math.min(1, (x - pb.x) / pb.width));
      const frameIndex = Math.round(percent * (this.replayPlayer.totalFrames - 1));
      this.seekToFrame(frameIndex);
      return true;
    }
    return false;
  }

  // --- Private helpers -----------------------------------------------------

  _drawProgressBar(ctx, progressBar, x, y, w, h) {
    const percent = this.replayPlayer ? this.replayPlayer.progress : 0;

    // Cache the rect for click detection
    this.progressBarRect = { x, y, width: w, height: h };

    if (progressBar) {
      progressBar.x = x;
      progressBar.y = y;
      progressBar.width = w;
      progressBar.height = h;
      progressBar.percent = percent;
      progressBar.draw(ctx);
    } else {
      // Fallback: manual rendering
      ctx.fillStyle = "#bdc3c7";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(x, y, Math.round(w * percent), h);
    }
  }

  _saveState() {
    const ui = this.gameUI;
    this._saved = {
      snakes: ui.snakes,
      grid: ui.grid,
      gameOver: ui.gameOver,
      gameFinished: ui.gameFinished,
      gameMazeWin: ui.gameMazeWin,
      scoreMax: ui.scoreMax,
      paused: ui.paused,
      ticks: ui.ticks,
      numFruit: ui.numFruit,
      aiStuck: ui.aiStuck,
      offsetFrame: ui.offsetFrame,
      countBeforePlay: ui.countBeforePlay,
    };

    ui.replayMode = true;
  }

  _restoreState() {
    const ui = this.gameUI;
    ui.replayMode = false;

    if (!this._saved) return;

    ui.snakes = this._saved.snakes;
    ui.grid = this._saved.grid;
    ui.gameOver = this._saved.gameOver;
    ui.gameFinished = this._saved.gameFinished;
    ui.gameMazeWin = this._saved.gameMazeWin;
    ui.scoreMax = this._saved.scoreMax;
    ui.paused = this._saved.paused;
    ui.ticks = this._saved.ticks;
    ui.numFruit = this._saved.numFruit;
    ui.aiStuck = this._saved.aiStuck;
    ui.offsetFrame = this._saved.offsetFrame;
    ui.countBeforePlay = this._saved.countBeforePlay;

    // Force a full redraw so GridUI picks up the restored state
    if (ui.gridUI) ui.gridUI.forceRedraw = true;

    this._saved = null;
  }

  _applyFrame(frame) {
    if (!frame || !this.replayPlayer) return;

    const ui = this.gameUI;
    const metadata = this.replayPlayer.metadata;

    ui.snakes = buildMockSnakes(frame);
    ui.grid = buildMockGrid(frame, metadata);
    ui.ticks = frame.tick;
    ui.numFruit = frame.numFruit;
    ui.gameOver = frame.gameOver;
    ui.gameFinished = frame.gameFinished;
    ui.gameMazeWin = frame.gameMazeWin || false;
    ui.scoreMax = frame.scoreMax;
    ui.paused = true; // static frames - no game loop animation
    ui.offsetFrame = 0;
    ui.countBeforePlay = -1;

    // Force full redraw every frame since the entire grid may change
    if (ui.gridUI) ui.gridUI.forceRedraw = true;
  }
}
