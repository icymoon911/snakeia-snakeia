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

/**
 * GameRecorder - records game state snapshots each tick and supports playback.
 *
 * Usage:
 *   const recorder = new GameRecorder();
 *   recorder.attachToEngine(engine);   // starts recording automatically
 *   // ... play the game ...
 *   const data = recorder.exportReplay(); // serialize
 *   // Later:
 *   const player = GameRecorder.loadReplay(data);
 *   player.play();
 *   player.pause();
 *   player.setSpeed(2); // 2x fast-forward
 *   player.seekTo(50);  // jump to tick 50
 */
export default class GameRecorder {
  constructor() {
    this.frames = [];
    this.recording = false;
    this.playing = false;
    this.paused = false;
    this.speed = 1; // playback speed multiplier
    this.currentFrameIndex = 0;
    this.playbackInterval = null;
    this.metadata = null;

    // Reactor for playback events
    this.reactor = new Reactor();
    this.reactor.registerEvent("onFrame");
    this.reactor.registerEvent("onPlay");
    this.reactor.registerEvent("onPause");
    this.reactor.registerEvent("onStop");
    this.reactor.registerEvent("onSeek");
    this.reactor.registerEvent("onSpeedChange");
  }

  /**
   * Attach to a GameEngine instance to record its state on each tick.
   * @param {GameEngine} engine
   */
  attachToEngine(engine) {
    this.engine = engine;
    this.recording = true;
    this.frames = [];

    // Record initial state when game starts
    engine.onStart(() => {
      if(this.recording) {
        this.captureFrame(engine);
      }
    });

    // Record state on each update tick
    engine.onUpdate(() => {
      if(this.recording) {
        this.captureFrame(engine);
      }
    });

    // Stop recording when game ends
    engine.onStop(() => {
      if(this.recording) {
        this.stopRecording();
      }
    });

    // Capture metadata
    this.metadata = {
      gridWidth: engine.grid ? engine.grid.width : 0,
      gridHeight: engine.grid ? engine.grid.height : 0,
      numSnakes: engine.snakes ? engine.snakes.length : 0,
      speed: engine.speed,
      recordedAt: typeof Date !== "undefined" ? Date.now() : 0
    };
  }

  /**
   * Capture a single frame snapshot from the engine.
   * @param {GameEngine} engine
   */
  captureFrame(engine) {
    const frame = {
      tick: engine.ticks,
      grid: this._serializeGrid(engine.grid),
      snakes: this._serializeSnakes(engine.snakes),
      numFruit: engine.numFruit,
      gameOver: engine.gameOver,
      gameFinished: engine.gameFinished,
      gameMazeWin: engine.gameMazeWin,
      scoreMax: engine.scoreMax,
      aiStuck: engine.aiStuck,
      paused: engine.paused
    };

    this.frames.push(frame);
  }

  /**
   * Serialize the grid state into a plain 2D array.
   */
  _serializeGrid(grid) {
    if(!grid || !grid.grid) return null;

    const data = [];
    for(let i = 0; i < grid.height; i++) {
      data[i] = [];
      for(let j = 0; j < grid.width; j++) {
        data[i][j] = grid.grid[i][j];
      }
    }

    return {
      width: grid.width,
      height: grid.height,
      data: data,
      fruitPositions: grid.fruitPositions ? grid.fruitPositions.map(p => ({ x: p.x, y: p.y })) : [],
      fruitPosGold: grid.fruitPosGold ? { x: grid.fruitPosGold.x, y: grid.fruitPosGold.y } : null
    };
  }

  /**
   * Serialize all snakes into plain objects.
   */
  _serializeSnakes(snakes) {
    if(!snakes) return [];

    return snakes.map(snake => ({
      name: snake.name,
      direction: snake.direction,
      score: snake.score,
      gameOver: snake.gameOver,
      scoreMax: snake.scoreMax,
      player: snake.player,
      aiLevel: snake.aiLevel,
      queue: snake.queue ? snake.queue.map(p => ({ x: p.x, y: p.y, direction: p.direction })) : [],
      color: snake.color
    }));
  }

  /**
   * Stop recording.
   */
  stopRecording() {
    this.recording = false;
  }

  /**
   * Get total number of recorded frames.
   */
  get totalFrames() {
    return this.frames.length;
  }

  /**
   * Get the current frame during playback.
   */
  get currentFrame() {
    if(this.frames.length === 0) return null;
    return this.frames[Math.min(this.currentFrameIndex, this.frames.length - 1)];
  }

  /**
   * Start playback of recorded frames.
   * @param {number} [baseInterval=100] - Base interval in ms between frames
   */
  play(baseInterval) {
    if(this.frames.length === 0) return;

    this.playing = true;
    this.paused = false;
    this._startPlaybackLoop(baseInterval || 100);
    this.reactor.dispatchEvent("onPlay");
  }

  /**
   * Pause playback.
   */
  pause() {
    if(this.playing) {
      this.paused = true;
      this.playing = false;
      this._stopPlaybackLoop();
      this.reactor.dispatchEvent("onPause");
    }
  }

  /**
   * Resume playback after pause.
   * @param {number} [baseInterval=100]
   */
  resume(baseInterval) {
    if(this.paused) {
      this.paused = false;
      this.playing = true;
      this._startPlaybackLoop(baseInterval || 100);
      this.reactor.dispatchEvent("onPlay");
    }
  }

  /**
   * Stop playback and reset to beginning.
   */
  stop() {
    this.playing = false;
    this.paused = false;
    this.currentFrameIndex = 0;
    this._stopPlaybackLoop();
    this.reactor.dispatchEvent("onStop");
  }

  /**
   * Seek to a specific frame index.
   * @param {number} frameIndex
   */
  seekTo(frameIndex) {
    this.currentFrameIndex = Math.max(0, Math.min(frameIndex, this.frames.length - 1));
    this.reactor.dispatchEvent("onSeek", { frameIndex: this.currentFrameIndex });
    this.reactor.dispatchEvent("onFrame", this.currentFrame);
  }

  /**
   * Seek to a specific tick number.
   * @param {number} tick
   */
  seekToTick(tick) {
    const index = this.frames.findIndex(f => f.tick >= tick);
    if(index >= 0) {
      this.seekTo(index);
    } else if(this.frames.length > 0) {
      this.seekTo(this.frames.length - 1);
    }
  }

  /**
   * Set the playback speed multiplier.
   * @param {number} multiplier - e.g. 1 = normal, 2 = 2x, 0.5 = half speed
   */
  setSpeed(multiplier) {
    this.speed = Math.max(0.1, Math.min(multiplier, 10));
    this.reactor.dispatchEvent("onSpeedChange", { speed: this.speed });

    // Restart loop with new speed if currently playing
    if(this.playing) {
      this._stopPlaybackLoop();
      this._startPlaybackLoop(100);
    }
  }

  /**
   * Advance one frame forward (step).
   */
  stepForward() {
    if(this.currentFrameIndex < this.frames.length - 1) {
      this.currentFrameIndex++;
      this.reactor.dispatchEvent("onFrame", this.currentFrame);
    }
  }

  /**
   * Go back one frame (step).
   */
  stepBackward() {
    if(this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
      this.reactor.dispatchEvent("onFrame", this.currentFrame);
    }
  }

  /**
   * Internal: start the playback interval loop.
   */
  _startPlaybackLoop(baseInterval) {
    this._stopPlaybackLoop();
    const interval = Math.max(10, Math.round(baseInterval / this.speed));

    this.playbackInterval = setInterval(() => {
      if(this.currentFrameIndex < this.frames.length - 1) {
        this.currentFrameIndex++;
        this.reactor.dispatchEvent("onFrame", this.currentFrame);
      } else {
        // Reached end
        this.stop();
      }
    }, interval);
  }

  /**
   * Internal: stop the playback interval loop.
   */
  _stopPlaybackLoop() {
    if(this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  /**
   * Export the replay data as a JSON-serializable object.
   * @returns {object}
   */
  exportReplay() {
    return {
      version: 1,
      metadata: this.metadata,
      frames: this.frames
    };
  }

  /**
   * Serialize the replay to a JSON string.
   * @returns {string}
   */
  toJSON() {
    return JSON.stringify(this.exportReplay());
  }

  /**
   * Load a replay from a previously exported data object.
   * @param {object} data - The replay data from exportReplay()
   * @returns {GameRecorder} A new GameRecorder instance ready for playback
   */
  static loadReplay(data) {
    const recorder = new GameRecorder();

    if(data && data.version === 1 && Array.isArray(data.frames)) {
      recorder.frames = data.frames;
      recorder.metadata = data.metadata || null;
    }

    return recorder;
  }

  /**
   * Load a replay from a JSON string.
   * @param {string} json
   * @returns {GameRecorder}
   */
  static fromJSON(json) {
    try {
      const data = JSON.parse(json);
      return GameRecorder.loadReplay(data);
    } catch(e) {
      console.error("GameRecorder: Failed to parse replay JSON", e);
      return new GameRecorder();
    }
  }

  // Event listener registration methods
  onFrame(callback) {
    this.reactor.addEventListener("onFrame", callback);
  }

  onPlay(callback) {
    this.reactor.addEventListener("onPlay", callback);
  }

  onPause(callback) {
    this.reactor.addEventListener("onPause", callback);
  }

  onStop(callback) {
    this.reactor.addEventListener("onStop", callback);
  }

  onSeek(callback) {
    this.reactor.addEventListener("onSeek", callback);
  }

  onSpeedChange(callback) {
    this.reactor.addEventListener("onSpeedChange", callback);
  }

  /**
   * Clean up resources.
   */
  destroy() {
    this._stopPlaybackLoop();
    this.frames = [];
    this.recording = false;
    this.playing = false;
    this.paused = false;
    this.engine = null;
  }
}
