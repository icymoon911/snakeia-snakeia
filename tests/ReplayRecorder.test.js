// SnakeIA ReplayRecorder test
import Grid from "../src/engine/Grid.js";
import Position from "../src/engine/Position.js";
import Constants from "../src/engine/Constants.js";
import Snake from "../src/engine/Snake.js";
import GameEngine from "../src/engine/GameEngine.js";
import ReplayRecorder from "../src/engine/ReplayRecorder.js";
import SnakeAI from "../src/engine/ai/SnakeAI.js";

class SnakeAIMockRight extends SnakeAI {
  ai(_snake) {
    return Constants.Key.RIGHT;
  }
}

function createTestEngine() {
  const grid = new Grid(10, 10, false, false, false, null, false, "42", "43");
  const snake = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "TestSnake", new SnakeAIMockRight());
  const engine = new GameEngine(grid, [snake], 8);
  return engine;
}

test("ReplayRecorder - initial state", () => {
  const engine = createTestEngine();
  const recorder = new ReplayRecorder(engine);

  expect(recorder.isRecording).toBe(false);
  expect(recorder.frameCount).toBe(0);
});

test("ReplayRecorder - start and stop", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  expect(recorder.isRecording).toBe(true);

  recorder.stop();
  expect(recorder.isRecording).toBe(false);
  expect(recorder.metadata).not.toBeNull();
  expect(recorder.metadata.totalFrames).toBe(recorder.frameCount);
});

test("ReplayRecorder - records frames on engine update", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  expect(recorder.frameCount).toBeGreaterThanOrEqual(1); // initial frame

  engine.paused = false;
  engine.countBeforePlay = -1;

  for(let i = 0; i < 5; i++) {
    engine.doTick();
  }

  expect(recorder.frameCount).toBeGreaterThan(1);
  recorder.stop();
});

test("ReplayRecorder - export and import", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  engine.paused = false;
  engine.countBeforePlay = -1;

  for(let i = 0; i < 3; i++) {
    engine.doTick();
  }

  recorder.stop();

  const exported = recorder.export();
  expect(exported.metadata).toBeDefined();
  expect(exported.frames).toBeDefined();
  expect(exported.frames.length).toBeGreaterThan(0);

  const json = recorder.exportJSON();
  const imported = ReplayRecorder.import(json);
  expect(imported.metadata.version).toBe(1);
  expect(imported.frames.length).toBe(exported.frames.length);
});

test("ReplayRecorder - frames contain valid data", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  engine.paused = false;
  engine.countBeforePlay = -1;

  for(let i = 0; i < 3; i++) {
    engine.doTick();
  }

  recorder.stop();
  const exported = recorder.export();

  for(const frame of exported.frames) {
    expect(frame.tick).toBeDefined();
    expect(frame.grid).toBeDefined();
    expect(Array.isArray(frame.grid)).toBe(true);
    expect(frame.grid.length).toBe(10);
    expect(frame.grid[0].length).toBe(10);
    expect(frame.snakes).toBeDefined();
    expect(Array.isArray(frame.snakes)).toBe(true);
    expect(frame.snakes.length).toBe(1);
    expect(frame.snakes[0].name).toBe("TestSnake");
    expect(frame.snakes[0].body).toBeDefined();
    expect(Array.isArray(frame.snakes[0].body)).toBe(true);
  }
});

test("ReplayRecorder - import rejects invalid data", () => {
  expect(() => ReplayRecorder.import("{}")).toThrow();
  expect(() => ReplayRecorder.import('{"metadata": {}}')).toThrow();
  expect(() => ReplayRecorder.import('not json')).toThrow();
});

test("ReplayRecorder - metadata contains grid info", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  recorder.stop();

  expect(recorder.metadata.gridWidth).toBe(10);
  expect(recorder.metadata.gridHeight).toBe(10);
  expect(recorder.metadata.numSnakes).toBe(1);
});

test("ReplayRecorder - double start is safe", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  recorder.start(); // should not throw
  expect(recorder.isRecording).toBe(true);
  recorder.stop();
});

test("ReplayRecorder - double stop is safe", async () => {
  const engine = createTestEngine();
  await engine.init();
  const recorder = new ReplayRecorder(engine);

  recorder.start();
  recorder.stop();
  recorder.stop(); // should not throw
  expect(recorder.isRecording).toBe(false);
});
