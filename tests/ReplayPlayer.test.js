// SnakeIA ReplayPlayer test
import ReplayPlayer from "../src/engine/ReplayPlayer.js";
import Constants from "../src/engine/Constants.js";

function createMockReplayData(numFrames) {
  const frames = [];
  for(let i = 0; i < numFrames; i++) {
    frames.push({
      tick: i,
      numFruit: 1,
      gameOver: false,
      gameFinished: false,
      gameMazeWin: false,
      scoreMax: false,
      grid: [[0, 0], [0, 0]],
      fruitPositions: [{ x: 1, y: 1 }],
      fruitPosGold: null,
      snakes: [{
        score: i,
        direction: Constants.Direction.RIGHT,
        gameOver: false,
        scoreMax: false,
        name: "Test",
        player: Constants.PlayerType.AI,
        aiLevel: Constants.AiLevel.DEFAULT,
        color: 75,
        body: [{ x: 0, y: 0, direction: Constants.Direction.RIGHT }]
      }]
    });
  }
  return {
    metadata: {
      version: 1,
      appVersion: "3.2.0",
      startedAt: Date.now() - 10000,
      gridWidth: 2,
      gridHeight: 2,
      speed: 8,
      numSnakes: 1,
      totalFrames: numFrames
    },
    frames: frames
  };
}

test("ReplayPlayer - constructor validates data", () => {
  expect(() => new ReplayPlayer(null)).toThrow();
  expect(() => new ReplayPlayer({})).toThrow();
  expect(() => new ReplayPlayer({ metadata: {} })).toThrow();
});

test("ReplayPlayer - initial state", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  expect(player.totalFrames).toBe(10);
  expect(player.currentFrameIndex).toBe(0);
  expect(player.speed).toBe(1);
  expect(player.isPlaying).toBe(false);
  expect(player.progress).toBe(0);
});

test("ReplayPlayer - nextFrame advances", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  expect(player.currentFrameIndex).toBe(0);
  player.nextFrame();
  expect(player.currentFrameIndex).toBe(1);
  player.nextFrame();
  expect(player.currentFrameIndex).toBe(2);
});

test("ReplayPlayer - prevFrame goes back", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  player.seekTo(5);
  expect(player.currentFrameIndex).toBe(5);
  player.prevFrame();
  expect(player.currentFrameIndex).toBe(4);
});

test("ReplayPlayer - seekTo jumps to frame", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  player.seekTo(7);
  expect(player.currentFrameIndex).toBe(7);

  // Clamp to valid range
  player.seekTo(100);
  expect(player.currentFrameIndex).toBe(9);

  player.seekTo(-5);
  expect(player.currentFrameIndex).toBe(0);
});

test("ReplayPlayer - progress is correct", () => {
  const data = createMockReplayData(11); // 0..10
  const player = new ReplayPlayer(data);

  expect(player.progress).toBe(0);
  player.seekTo(5);
  expect(player.progress).toBe(0.5);
  player.seekTo(10);
  expect(player.progress).toBe(1);
});

test("ReplayPlayer - setSpeed clamps values", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  player.setSpeed(2);
  expect(player.speed).toBe(2);

  player.setSpeed(0.1);
  expect(player.speed).toBe(0.25); // clamped min

  player.setSpeed(100);
  expect(player.speed).toBe(16); // clamped max

  player.setSpeed(0.5);
  expect(player.speed).toBe(0.5);
});

test("ReplayPlayer - currentFrame returns correct data", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  const frame = player.currentFrame;
  expect(frame).not.toBeNull();
  expect(frame.tick).toBe(0);

  player.seekTo(5);
  expect(player.currentFrame.tick).toBe(5);
  expect(player.currentFrame.snakes[0].score).toBe(5);
});

test("ReplayPlayer - events fire correctly", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  const events = [];
  player.onFrame((frame) => events.push({ type: "frame", tick: frame ? frame.tick : -1 }));
  player.onSeek((info) => events.push({ type: "seek", frameIndex: info.frameIndex }));
  player.onSpeedChange((info) => events.push({ type: "speed", speed: info.speed }));

  player.seekTo(3);
  player.setSpeed(2);
  player.nextFrame();

  expect(events).toContainEqual({ type: "seek", frameIndex: 3 });
  expect(events).toContainEqual({ type: "frame", tick: 3 });
  expect(events).toContainEqual({ type: "speed", speed: 2 });
  expect(events).toContainEqual({ type: "frame", tick: 4 });
});

test("ReplayPlayer - stop resets to beginning", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  player.seekTo(5);
  player.stop();
  expect(player.currentFrameIndex).toBe(0);
  expect(player.isPlaying).toBe(false);
});

test("ReplayPlayer - play and pause state", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  player.play();
  expect(player.playing).toBe(true);
  expect(player.paused).toBe(false);

  player.pause();
  expect(player.playing).toBe(true);
  expect(player.paused).toBe(true);

  player.resume();
  expect(player.playing).toBe(true);
  expect(player.paused).toBe(false);

  player.destroy();
});

test("ReplayPlayer - nextFrame stops at end", () => {
  const data = createMockReplayData(3);
  const player = new ReplayPlayer(data);

  player.seekTo(2); // last frame
  player.nextFrame();
  expect(player.currentFrameIndex).toBe(2); // should stay at last
});

test("ReplayPlayer - prevFrame stops at beginning", () => {
  const data = createMockReplayData(10);
  const player = new ReplayPlayer(data);

  player.prevFrame();
  expect(player.currentFrameIndex).toBe(0);
});

test("ReplayPlayer - single frame progress", () => {
  const data = createMockReplayData(1);
  const player = new ReplayPlayer(data);

  expect(player.progress).toBe(1);
  expect(player.totalFrames).toBe(1);
});
