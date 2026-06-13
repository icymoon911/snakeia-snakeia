/*
 * ReplayRecorder - Records game engine state snapshots for later playback.
 *
 * Usage:
 *   const recorder = new ReplayRecorder(engine);
 *   recorder.start();
 *   // ... game plays ...
 *   recorder.stop();
 *   const data = recorder.export();  // JSON-serializable object
 */
import GameConstants from "./Constants.js";

export default class ReplayRecorder {
  constructor(engine) {
    this.engine = engine;
    this.recording = false;
    this.frames = [];
    this.metadata = null;
    this._onUpdate = null;
    this._onStop = null;
    this._onStart = null;
  }

  start() {
    if (this.recording) return;
    this.recording = true;
    this.frames = [];
    this.metadata = {
      version: 1,
      appVersion: GameConstants.Setting.APP_VERSION,
      startedAt: Date.now(),
      gridWidth: this.engine.grid ? this.engine.grid.width : 0,
      gridHeight: this.engine.grid ? this.engine.grid.height : 0,
      speed: this.engine.speed,
      numSnakes: this.engine.snakes ? this.engine.snakes.length : 0,
      seedGrid: this.engine.grid ? this.engine.grid.seedGrid : null,
      seedGame: this.engine.grid ? this.engine.grid.seedGame : null
    };

    // Capture initial frame
    this._captureFrame();

    this._onUpdate = () => this._captureFrame();
    this._onStop = () => this.stop();
    this._onStart = () => this._captureFrame();

    this.engine.reactor.addEventListener("onUpdate", this._onUpdate);
    this.engine.reactor.addEventListener("onStop", this._onStop);
    this.engine.reactor.addEventListener("onStart", this._onStart);
  }

  stop() {
    if (!this.recording) return;
    this.recording = false;
    if (this.metadata) {
      this.metadata.endedAt = Date.now();
      this.metadata.totalFrames = this.frames.length;
    }
  }

  _captureFrame() {
    if (!this.recording || !this.engine) return;

    const grid = this.engine.grid;
    if (!grid || !grid.grid) return;

    // Snapshot the grid state
    const gridData = [];
    for (let y = 0; y < grid.height; y++) {
      gridData.push(grid.grid[y].slice());
    }

    // Snapshot each snake
    const snakeData = [];
    if (this.engine.snakes) {
      for (const snake of this.engine.snakes) {
        const bodyParts = [];
        if (snake.queue) {
          for (const pos of snake.queue) {
            bodyParts.push({ x: pos.x, y: pos.y, direction: pos.direction });
          }
        }
        snakeData.push({
          score: snake.score,
          direction: snake.direction,
          gameOver: snake.gameOver,
          scoreMax: snake.scoreMax,
          name: snake.name,
          player: snake.player,
          aiLevel: snake.aiLevel,
          color: snake.color,
          body: bodyParts
        });
      }
    }

    this.frames.push({
      tick: this.engine.ticks,
      numFruit: this.engine.numFruit,
      gameOver: this.engine.gameOver,
      gameFinished: this.engine.gameFinished,
      gameMazeWin: this.engine.gameMazeWin,
      scoreMax: this.engine.scoreMax,
      grid: gridData,
      fruitPositions: grid.fruitPositions ? grid.fruitPositions.map(p => ({ x: p.x, y: p.y })) : [],
      fruitPosGold: grid.fruitPosGold ? { x: grid.fruitPosGold.x, y: grid.fruitPosGold.y } : null,
      snakes: snakeData
    });
  }

  export() {
    return {
      metadata: this.metadata,
      frames: this.frames
    };
  }

  exportJSON() {
    return JSON.stringify(this.export());
  }

  static import(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data || !data.metadata || !Array.isArray(data.frames)) {
      throw new Error("Invalid replay data format");
    }
    return data;
  }

  get frameCount() {
    return this.frames.length;
  }

  get isRecording() {
    return this.recording;
  }
}
