// SnakeIA LocalMultiplayer test
import LocalMultiplayer from "../src/engine/LocalMultiplayer.js";
import Constants from "../src/engine/Constants.js";
import Snake from "../src/engine/Snake.js";
import Grid from "../src/engine/Grid.js";

function createMockController(numSnakes) {
  const grid = new Grid(20, 20, false, false, false, null, false, "1", "2");
  grid.init();

  const snakes = [];
  for(let i = 0; i < numSnakes; i++) {
    const snake = new Snake(
      Constants.Direction.RIGHT,
      3,
      grid,
      Constants.PlayerType.HUMAN,
      Constants.AiLevel.DEFAULT,
      false,
      `Player ${i + 1}`
    );
    snakes.push(snake);
  }

  return {
    snakes: snakes,
    gameEngine: { lastKey: -1 },
    lastKey: -1
  };
}

test("LocalMultiplayer - constructor defaults", () => {
  const controller = createMockController(2);
  const mp = new LocalMultiplayer(controller);

  expect(mp.enabled).toBe(false);
  expect(mp.player1Index).toBe(0);
  expect(mp.player2Index).toBe(1);
});

test("LocalMultiplayer - enable and disable", () => {
  const controller = createMockController(2);
  const mp = new LocalMultiplayer(controller);

  mp.enable();
  expect(mp.enabled).toBe(true);

  mp.disable();
  expect(mp.enabled).toBe(false);
});

test("LocalMultiplayer - double enable is safe", () => {
  const controller = createMockController(2);
  const mp = new LocalMultiplayer(controller);

  mp.enable();
  mp.enable(); // should not throw
  expect(mp.enabled).toBe(true);

  mp.disable();
});

test("LocalMultiplayer - double disable is safe", () => {
  const controller = createMockController(2);
  const mp = new LocalMultiplayer(controller);

  mp.disable(); // not enabled
  expect(mp.enabled).toBe(false);
});

test("LocalMultiplayer - setPlayerIndices", () => {
  const controller = createMockController(2);
  const mp = new LocalMultiplayer(controller);

  mp.setPlayerIndices(2, 3);
  expect(mp.player1Index).toBe(2);
  expect(mp.player2Index).toBe(3);
});

test("LocalMultiplayer - isWASDKey", () => {
  expect(LocalMultiplayer.isWASDKey(87)).toBe(true); // W
  expect(LocalMultiplayer.isWASDKey(65)).toBe(true); // A
  expect(LocalMultiplayer.isWASDKey(83)).toBe(true); // S
  expect(LocalMultiplayer.isWASDKey(68)).toBe(true); // D
  expect(LocalMultiplayer.isWASDKey(38)).toBe(false); // Arrow Up
  expect(LocalMultiplayer.isWASDKey(32)).toBe(false); // Space
});

test("LocalMultiplayer - isArrowKey", () => {
  expect(LocalMultiplayer.isArrowKey(38)).toBe(true); // Up
  expect(LocalMultiplayer.isArrowKey(37)).toBe(true); // Left
  expect(LocalMultiplayer.isArrowKey(40)).toBe(true); // Down
  expect(LocalMultiplayer.isArrowKey(39)).toBe(true); // Right
  expect(LocalMultiplayer.isArrowKey(87)).toBe(false); // W
  expect(LocalMultiplayer.isArrowKey(32)).toBe(false); // Space
});

test("LocalMultiplayer - WASD_KEYS constant", () => {
  const keys = LocalMultiplayer.WASD_KEYS;
  expect(keys.W).toBe(87);
  expect(keys.A).toBe(65);
  expect(keys.S).toBe(83);
  expect(keys.D).toBe(68);
});

test("LocalMultiplayer - ARROW_KEYS constant", () => {
  const keys = LocalMultiplayer.ARROW_KEYS;
  expect(keys.UP).toBe(Constants.Key.UP);
  expect(keys.DOWN).toBe(Constants.Key.BOTTOM);
  expect(keys.LEFT).toBe(Constants.Key.LEFT);
  expect(keys.RIGHT).toBe(Constants.Key.RIGHT);
});

test("LocalMultiplayer - createTwoPlayerConfig", () => {
  const grid = new Grid(20, 20);
  const config = LocalMultiplayer.createTwoPlayerConfig(grid, "Alice", "Bob");

  expect(config.grid).toBe(grid);
  expect(config.snakes.length).toBe(2);
  expect(config.snakes[0].name).toBe("Alice");
  expect(config.snakes[1].name).toBe("Bob");
  expect(config.snakes[0].player).toBe(Constants.PlayerType.HUMAN);
  expect(config.snakes[1].player).toBe(Constants.PlayerType.HUMAN);
  expect(config.snakes[0].direction).toBe(Constants.Direction.RIGHT);
  expect(config.snakes[1].direction).toBe(Constants.Direction.LEFT);
});

test("LocalMultiplayer - createTwoPlayerConfig default names", () => {
  const grid = new Grid(20, 20);
  const config = LocalMultiplayer.createTwoPlayerConfig(grid);

  expect(config.snakes[0].name).toBe("Player 1");
  expect(config.snakes[1].name).toBe("Player 2");
});

test("LocalMultiplayer - dispatchKeyToSnake sets lastKey", () => {
  const controller = createMockController(2);
  // Initialize lastKey for each snake
  controller.snakes[0].lastKey = -1;
  controller.snakes[1].lastKey = -1;

  const mp = new LocalMultiplayer(controller);

  mp._dispatchKeyToSnake(0, Constants.Key.UP);
  expect(controller.snakes[0].lastKey).toBe(Constants.Key.UP);
  expect(controller.snakes[1].lastKey).toBe(-1);

  mp._dispatchKeyToSnake(1, Constants.Key.LEFT);
  expect(controller.snakes[0].lastKey).toBe(Constants.Key.UP);
  expect(controller.snakes[1].lastKey).toBe(Constants.Key.LEFT);
});

test("LocalMultiplayer - dispatchKeyToSnake ignores dead snake", () => {
  const controller = createMockController(2);
  controller.snakes[0].lastKey = -1;
  controller.snakes[0].gameOver = true;

  const mp = new LocalMultiplayer(controller);

  mp._dispatchKeyToSnake(0, Constants.Key.UP);
  expect(controller.snakes[0].lastKey).toBe(-1); // should not change
});

test("LocalMultiplayer - dispatchKeyToSnake ignores invalid index", () => {
  const controller = createMockController(2);
  const mp = new LocalMultiplayer(controller);

  mp._dispatchKeyToSnake(-1, Constants.Key.UP); // should not throw
  mp._dispatchKeyToSnake(10, Constants.Key.UP); // should not throw
});

test("LocalMultiplayer - dispatchKeyToSnake ignores AI snake", () => {
  const controller = createMockController(2);
  controller.snakes[0].player = Constants.PlayerType.AI;
  controller.snakes[0].lastKey = -1;

  const mp = new LocalMultiplayer(controller);
  mp._dispatchKeyToSnake(0, Constants.Key.UP);
  expect(controller.snakes[0].lastKey).toBe(-1); // AI snakes don't accept human input
});

test("LocalMultiplayer - dispatchKeyToSnake handles null controller", () => {
  const mp = new LocalMultiplayer(null);
  mp._dispatchKeyToSnake(0, Constants.Key.UP); // should not throw
});
