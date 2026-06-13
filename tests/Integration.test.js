// SnakeIA Integration tests - Two player mode and Replay end-to-end
import Grid from "../src/engine/Grid.js";
import Position from "../src/engine/Position.js";
import Constants from "../src/engine/Constants.js";
import Snake from "../src/engine/Snake.js";
import GameEngine from "../src/engine/GameEngine.js";
import ReplayRecorder from "../src/engine/ReplayRecorder.js";
import ReplayPlayer from "../src/engine/ReplayPlayer.js";
import MapEditor from "../src/engine/MapEditor.js";
import LocalMultiplayer from "../src/engine/LocalMultiplayer.js";
import GameController from "../src/engine/GameController.js";
import SnakeAI from "../src/engine/ai/SnakeAI.js";

class SnakeAIRight extends SnakeAI {
  ai(_snake) {
    return Constants.Key.RIGHT;
  }
}

class SnakeAIDown extends SnakeAI {
  ai(_snake) {
    return Constants.Key.BOTTOM;
  }
}

// === Two Player Mode Integration ===

test("Two player - two human snakes can coexist in engine", async () => {
  const grid = new Grid(15, 15, false, false, false, null, false, "10", "20");
  const snake1 = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "Player 1");
  const snake2 = new Snake(Constants.Direction.LEFT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "Player 2");
  const engine = new GameEngine(grid, [snake1, snake2], 8);
  await engine.init();

  expect(engine.snakes.length).toBe(2);
  expect(engine.snakes[0].player).toBe(Constants.PlayerType.HUMAN);
  expect(engine.snakes[1].player).toBe(Constants.PlayerType.HUMAN);
  expect(engine.snakes[0].name).toBe("Player 1");
  expect(engine.snakes[1].name).toBe("Player 2");
  expect(engine.errorOccurred).toBe(false);
});

test("Two player - each snake can receive independent key input", async () => {
  const grid = new Grid(15, 15, false, false, false, null, false, "10", "20");
  const snake1 = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P1");
  const snake2 = new Snake(Constants.Direction.LEFT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P2");
  const engine = new GameEngine(grid, [snake1, snake2], 8);
  await engine.init();

  // Simulate WASD for player 1 and arrows for player 2
  snake1.lastKey = Constants.Key.UP; // W
  snake2.lastKey = Constants.Key.BOTTOM; // Down arrow

  expect(snake1.lastKey).toBe(Constants.Key.UP);
  expect(snake2.lastKey).toBe(Constants.Key.BOTTOM);
});

test("Two player - GameController keyForPlayer dispatches correctly", async () => {
  const grid = new Grid(15, 15, false, false, false, null, false, "10", "20");
  const snake1 = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P1");
  const snake2 = new Snake(Constants.Direction.LEFT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P2");
  const engine = new GameEngine(grid, [snake1, snake2], 8);
  const controller = new GameController(engine);
  await engine.init();

  controller.snakes = engine.snakes;
  snake1.lastKey = -1;
  snake2.lastKey = -1;

  controller.keyForPlayer(Constants.Key.UP, 0);
  expect(snake1.lastKey).toBe(Constants.Key.UP);
  expect(snake2.lastKey).toBe(-1);

  controller.keyForPlayer(Constants.Key.LEFT, 1);
  expect(snake1.lastKey).toBe(Constants.Key.UP);
  expect(snake2.lastKey).toBe(Constants.Key.LEFT);
});

test("Two player - one snake dying doesn't end game for other", async () => {
  const customGrid = [
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
  ];

  const grid = new Grid(10, 6, false, false, false, customGrid, false, "100", "200");
  const snake1 = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P1");
  const snake2 = new Snake(Constants.Direction.LEFT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P2");
  const engine = new GameEngine(grid, [snake1, snake2], 8);
  await engine.init();

  // Kill snake1 manually
  snake1.setGameOver(1);
  expect(snake1.gameOver).toBe(true);
  expect(snake2.gameOver).toBe(false);
});

// === Replay Integration ===

test("Replay integration - record and playback a game", async () => {
  const grid = new Grid(10, 10, false, false, false, null, false, "42", "43");
  const snake = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "AI Snake", new SnakeAIRight());
  const engine = new GameEngine(grid, [snake], 8);
  await engine.init();

  const recorder = new ReplayRecorder(engine);
  recorder.start();

  engine.paused = false;
  engine.countBeforePlay = -1;

  for(let i = 0; i < 10; i++) {
    engine.doTick();
  }

  recorder.stop();

  const replayData = recorder.export();
  expect(replayData.frames.length).toBeGreaterThan(1);

  // Create a replay player
  const player = new ReplayPlayer(replayData);
  expect(player.totalFrames).toBe(replayData.frames.length);
  expect(player.currentFrame.tick).toBe(0);

  player.seekTo(player.totalFrames - 1);
  expect(player.currentFrame.tick).toBe(replayData.frames[replayData.frames.length - 1].tick);

  player.destroy();
});

test("Replay integration - JSON roundtrip preserves data", async () => {
  const grid = new Grid(8, 8, false, false, false, null, false, "5", "6");
  const snake = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "Test", new SnakeAIRight());
  const engine = new GameEngine(grid, [snake], 8);
  await engine.init();

  const recorder = new ReplayRecorder(engine);
  recorder.start();

  engine.paused = false;
  engine.countBeforePlay = -1;

  for(let i = 0; i < 5; i++) {
    engine.doTick();
  }

  recorder.stop();

  const json = recorder.exportJSON();
  const imported = ReplayRecorder.import(json);

  expect(imported.metadata.gridWidth).toBe(8);
  expect(imported.metadata.gridHeight).toBe(8);
  expect(imported.frames.length).toBe(recorder.frameCount);

  // Verify frame data integrity
  for(let i = 0; i < imported.frames.length; i++) {
    expect(imported.frames[i].tick).toBe(recorder.frames[i].tick);
    expect(imported.frames[i].snakes.length).toBe(recorder.frames[i].snakes.length);
  }
});

// === MapEditor with GameEngine Integration ===

test("MapEditor integration - exported grid works with GameEngine", async () => {
  const editor = new MapEditor(10, 10);
  editor.addBorderWalls();
  editor.setFruit(5, 5);

  const customGrid = editor.exportGrid();
  const grid = new Grid(10, 10, false, false, false, customGrid, false, "1", "2");
  const snake = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "Test", new SnakeAIRight());
  const engine = new GameEngine(grid, [snake], 8);
  await engine.init();

  expect(engine.errorOccurred).toBe(false);
  expect(engine.grid.width).toBe(10);
  expect(engine.grid.height).toBe(10);

  // Verify border walls exist
  expect(engine.grid.get(new Position(0, 0))).toBe(Constants.CaseType.WALL);
  expect(engine.grid.get(new Position(9, 0))).toBe(Constants.CaseType.WALL);
});

test("MapEditor integration - complex map with multiple features", async () => {
  const editor = new MapEditor(15, 15);
  editor.addBorderWalls();

  // Add some internal walls
  editor.fillRect(3, 3, 5, 5, Constants.CaseType.WALL);
  editor.fillRect(9, 9, 11, 11, Constants.CaseType.WALL);

  // Add fruit
  editor.setFruit(7, 7);
  editor.setGoldFruit(12, 2);

  const customGrid = editor.exportGrid();

  // Verify it's usable
  expect(customGrid.length).toBe(15);
  expect(customGrid[0].length).toBe(15);
  expect(customGrid[0][0]).toBe(Constants.CaseType.WALL);
  expect(customGrid[4][4]).toBe(Constants.CaseType.WALL);
  expect(customGrid[7][7]).toBe(Constants.CaseType.FRUIT);
  expect(customGrid[2][12]).toBe(Constants.CaseType.FRUIT_GOLD);
  expect(customGrid[1][1]).toBe(Constants.CaseType.EMPTY);

  const grid = new Grid(15, 15, false, false, false, customGrid, false, "10", "20");
  const snake = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "Test", new SnakeAIRight());
  const engine = new GameEngine(grid, [snake], 8);
  await engine.init();

  expect(engine.errorOccurred).toBe(false);
});

// === Replay with speed control ===

test("ReplayPlayer - fast forward works", () => {
  const data = {
    metadata: { version: 1, speed: 8, gridWidth: 5, gridHeight: 5, numSnakes: 1 },
    frames: Array.from({ length: 20 }, (_, i) => ({
      tick: i, grid: [[0]], snakes: [], numFruit: 1, gameOver: false
    }))
  };

  const player = new ReplayPlayer(data);

  player.setSpeed(4);
  expect(player.speed).toBe(4);

  player.setSpeed(0.5);
  expect(player.speed).toBe(0.5);

  player.destroy();
});

test("ReplayPlayer - seek and frame events", () => {
  const data = {
    metadata: { version: 1, speed: 8, gridWidth: 5, gridHeight: 5, numSnakes: 1 },
    frames: Array.from({ length: 10 }, (_, i) => ({
      tick: i, grid: [[0]], snakes: [], numFruit: 1, gameOver: false
    }))
  };

  const player = new ReplayPlayer(data);
  const frameEvents = [];

  player.onFrame((frame) => {
    if(frame) frameEvents.push(frame.tick);
  });

  player.seekTo(3);
  player.nextFrame();
  player.nextFrame();

  expect(frameEvents).toContain(3);
  expect(frameEvents).toContain(4);
  expect(frameEvents).toContain(5);

  player.destroy();
});

// === LocalMultiplayer with GameController ===

test("LocalMultiplayer - full flow with controller", () => {
  const grid = new Grid(20, 20, false, false, false, null, false, "1", "2");
  grid.init();

  const snake1 = new Snake(Constants.Direction.RIGHT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P1");
  const snake2 = new Snake(Constants.Direction.LEFT, 3, grid, Constants.PlayerType.HUMAN, Constants.AiLevel.DEFAULT, false, "P2");

  const mockController = {
    snakes: [snake1, snake2],
    gameEngine: { lastKey: -1 },
    lastKey: -1
  };

  snake1.lastKey = -1;
  snake2.lastKey = -1;

  const mp = new LocalMultiplayer(mockController);
  expect(mp.enabled).toBe(false);

  // Simulate WASD key dispatch
  mp._dispatchKeyToSnake(0, Constants.Key.UP); // W -> P1 goes UP
  expect(snake1.lastKey).toBe(Constants.Key.UP);
  expect(snake2.lastKey).toBe(-1);

  // Simulate Arrow key dispatch
  mp._dispatchKeyToSnake(1, Constants.Key.LEFT); // Left Arrow -> P2 goes LEFT
  expect(snake1.lastKey).toBe(Constants.Key.UP);
  expect(snake2.lastKey).toBe(Constants.Key.LEFT);
});
