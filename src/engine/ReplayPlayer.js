/*
 * ReplayPlayer - Plays back a previously recorded game replay.
 *
 * Usage:
 *   const player = new ReplayPlayer(replayData);
 *   player.play();
 *   player.pause();
 *   player.setSpeed(2); // 2x fast-forward
 *   player.seekTo(100); // jump to frame 100
 */
import GameConstants from "./Constants.js";
import Reactor from "./Reactor.js";

export default class ReplayPlayer {
  constructor(replayData) {
    if (!replayData || !replayData.metadata || !Array.isArray(replayData.frames)) {
      throw new Error("Invalid replay data");
    }
    this.replayData = replayData;
    this.metadata = replayData.metadata;
    this.frames = replayData.frames;
    this.currentFrameIndex = 0;
    this.playing = false;
    this.speed = 1; // 1x normal, 2x fast, 4x ultra, etc.
    this.intervalId = null;
    this.paused = false;

    // Events
    this.reactor = new Reactor();
    this.reactor.registerEvent("onFrame");
    this.reactor.registerEvent("onPlay");
    this.reactor.registerEvent("onPause");
    this.reactor.registerEvent("onStop");
    this.reactor.registerEvent("onSeek");
    this.reactor.registerEvent("onSpeedChange");
  }

  get currentFrame() {
    if (this.currentFrameIndex >= 0 && this.currentFrameIndex < this.frames.length) {
      return this.frames[this.currentFrameIndex];
    }
    return null;
  }

  get totalFrames() {
    return this.frames.length;
  }

  get progress() {
    if (this.frames.length <= 1) return 1;
    return this.currentFrameIndex / (this.frames.length - 1);
  }

  get isPlaying() {
    return this.playing && !this.paused;
  }

  play() {
    if (this.playing && !this.paused) return;

    if (this.currentFrameIndex >= this.frames.length - 1) {
      this.currentFrameIndex = 0;
    }

    this.playing = true;
    this.paused = false;
    this._startInterval();
    this.reactor.dispatchEvent("onPlay");
  }

  pause() {
    if (!this.playing || this.paused) return;
    this.paused = true;
    this._clearInterval();
    this.reactor.dispatchEvent("onPause");
  }

  resume() {
    if (!this.playing || !this.paused) return;
    this.paused = false;
    this._startInterval();
    this.reactor.dispatchEvent("onPlay");
  }

  stop() {
    this.playing = false;
    this.paused = false;
    this.currentFrameIndex = 0;
    this._clearInterval();
    this.reactor.dispatchEvent("onStop");
  }

  nextFrame() {
    if (this.currentFrameIndex < this.frames.length - 1) {
      this.currentFrameIndex++;
      this.reactor.dispatchEvent("onFrame", this.currentFrame);
    } else {
      this.pause();
    }
  }

  prevFrame() {
    if (this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
      this.reactor.dispatchEvent("onFrame", this.currentFrame);
    }
  }

  seekTo(frameIndex) {
    const clamped = Math.max(0, Math.min(frameIndex, this.frames.length - 1));
    this.currentFrameIndex = clamped;
    this.reactor.dispatchEvent("onSeek", { frameIndex: clamped, frame: this.currentFrame });
    this.reactor.dispatchEvent("onFrame", this.currentFrame);
  }

  setSpeed(speed) {
    this.speed = Math.max(0.25, Math.min(speed, 16));
    if (this.playing && !this.paused) {
      this._clearInterval();
      this._startInterval();
    }
    this.reactor.dispatchEvent("onSpeedChange", { speed: this.speed });
  }

  _startInterval() {
    this._clearInterval();
    const baseDelay = this.metadata && this.metadata.speed
      ? this.metadata.speed * GameConstants.Setting.TIME_MULTIPLIER
      : 120;
    const delay = Math.max(10, Math.round(baseDelay / this.speed));

    this.intervalId = setInterval(() => {
      this._tick();
    }, delay);
  }

  _clearInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  _tick() {
    if (!this.playing || this.paused) return;

    if (this.currentFrameIndex < this.frames.length - 1) {
      this.currentFrameIndex++;
      this.reactor.dispatchEvent("onFrame", this.currentFrame);
    } else {
      this.pause();
      this.reactor.dispatchEvent("onStop");
    }
  }

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

  destroy() {
    this._clearInterval();
    this.playing = false;
    this.paused = false;
  }
}
