// Additional tests for bug fixes in GameEngine
import Grid from "../src/engine/Grid.js";
import Position from "../src/engine/Position.js";
import Constants from "../src/engine/Constants.js";
import Snake from "../src/engine/Snake.js";
import GameEngine from "../src/engine/GameEngine.js";
import SnakeAI from "../src/engine/ai/SnakeAI.js";

describe("doTick - deferred setFruits (bug fix #1 and #4)", () => {
  test("multiple snakes eating fruits in same tick should all get fruits replaced", async () => {
    // Two snakes, both heading right, both will eat a fruit this tick.
    class SnakeAIMoveRight extends SnakeAI {
      ai(_snake) {
        return Constants.Key.RIGHT;
      }
    }

    const theGrid = new Grid(20, 10, false, false, false, null, false, 1, 2);

    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "Snake1", new SnakeAIMoveRight());
    const snake2 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "Snake2", new SnakeAIMoveRight());

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Clear existing fruits, then place them right in front of each snake's head.
    for(const fruitPos of [...theGrid.fruitPositions]) {
      theGrid.removeFruit(fruitPos);
    }

    const head1 = snake1.getHeadPosition();
    const head2 = snake2.getHeadPosition();
    const fruitPos1 = theGrid.getNextPosition(head1, snake1.direction);
    const fruitPos2 = theGrid.getNextPosition(head2, snake2.direction);

    theGrid.set(Constants.CaseType.FRUIT, fruitPos1);
    theGrid.fruitPositions.push(fruitPos1);
    theGrid.set(Constants.CaseType.FRUIT, fruitPos2);
    theGrid.fruitPositions.push(fruitPos2);

    expect(theGrid.fruitPositions.length).toBe(2);
    expect(snake1.score).toBe(0);
    expect(snake2.score).toBe(0);

    // Run one tick - both snakes should eat their fruits
    engine.doTick();

    // Both snakes should have increased score
    expect(snake1.score).toBe(1);
    expect(snake2.score).toBe(1);

    // After the tick, fruits should be replaced (2 fruits for 2 alive snakes)
    expect(theGrid.fruitPositions.length).toBe(2);
  });

  test("fruit count should reflect alive count after snake death mid-tick", async () => {
    // Verify getNBPlayerAlive returns correct count after a snake dies.
    const theGrid = new Grid(15, 10, false, false, false, null, false, 1, 2);
    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake3 = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [snake1, snake2, snake3]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    expect(engine.getNBPlayerAlive()).toBe(3);

    // Simulate snake1 dying
    snake1.setGameOver(engine.ticks);
    expect(engine.getNBPlayerAlive()).toBe(2);

    // Simulate snake2 dying
    snake2.setGameOver(engine.ticks);
    expect(engine.getNBPlayerAlive()).toBe(1);
  });
});

describe("handleStuckFruits - collect-then-remove (bug fix #2)", () => {
  test("multiple stuck fruits should all be removed", async () => {
    const theGrid = new Grid(20, 20, false, false, false, null, false, 1, 2);
    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Clear existing fruits
    for(const fruitPos of [...theGrid.fruitPositions]) {
      theGrid.removeFruit(fruitPos);
    }

    // Place 3 test fruits
    const pos1 = new Position(3, 3);
    const pos2 = new Position(7, 7);
    const pos3 = new Position(12, 12);

    theGrid.set(Constants.CaseType.FRUIT, pos1);
    theGrid.fruitPositions.push(pos1);
    theGrid.set(Constants.CaseType.FRUIT, pos2);
    theGrid.fruitPositions.push(pos2);
    theGrid.set(Constants.CaseType.FRUIT, pos3);
    theGrid.fruitPositions.push(pos3);

    expect(theGrid.fruitPositions.length).toBe(3);

    // Mock isFruitSurrounded to return true only for our 3 test positions
    const origIsFruitSurrounded = theGrid.isFruitSurrounded.bind(theGrid);
    jest.spyOn(theGrid, "isFruitSurrounded").mockImplementation((pos) => {
      if(pos.equals(pos1) || pos.equals(pos2) || pos.equals(pos3)) {
        return true;
      }
      return origIsFruitSurrounded(pos);
    });

    // Call handleStuckFruits
    engine.handleStuckFruits();

    // All 3 stuck fruits should have been removed from fruitPositions
    expect(theGrid.fruitPositions.some(p => p.equals(pos1))).toBe(false);
    expect(theGrid.fruitPositions.some(p => p.equals(pos2))).toBe(false);
    expect(theGrid.fruitPositions.some(p => p.equals(pos3))).toBe(false);
  });

  test("handleStuckFruits calls removeFruit for every stuck fruit (no skips)", async () => {
    const theGrid = new Grid(20, 20, false, false, false, null, false, 1, 2);
    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Clear existing fruits
    for(const fruitPos of [...theGrid.fruitPositions]) {
      theGrid.removeFruit(fruitPos);
    }

    // Place 4 fruits
    const positions = [
      new Position(2, 2),
      new Position(5, 5),
      new Position(8, 8),
      new Position(11, 11),
    ];

    for(const pos of positions) {
      theGrid.set(Constants.CaseType.FRUIT, pos);
      theGrid.fruitPositions.push(pos);
    }

    // Mock isFruitSurrounded to return true for all our positions
    jest.spyOn(theGrid, "isFruitSurrounded").mockImplementation((pos) => {
      return positions.some(p => p.equals(pos));
    });

    const removeFruitSpy = jest.spyOn(theGrid, "removeFruit");

    engine.handleStuckFruits();

    // removeFruit should have been called exactly 4 times (once per stuck fruit)
    expect(removeFruitSpy).toHaveBeenCalledTimes(4);
  });
});

describe("checkEndGameCondition - separated logic (bug fix #3)", () => {
  test("all snakes game over should end game", async () => {
    const theGrid = new Grid(10, 10, false, true, false, null, false, 1, 2);
    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    theSnake.setGameOver(engine.ticks);

    const shouldEnd = engine.checkEndGameCondition();
    expect(shouldEnd).toBe(true);
  });

  test("all snakes game over in multiplayer should end game", async () => {
    class SnakeAIMock extends SnakeAI {
      ai(_snake) { return Constants.Key.RIGHT; }
    }

    const theGrid = new Grid(15, 10, false, true, false, null, false, 1, 2);
    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S1", new SnakeAIMock());
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S2", new SnakeAIMock());
    const snake3 = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S3", new SnakeAIMock());

    const engine = new GameEngine(theGrid, [snake1, snake2, snake3]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    snake1.setGameOver(engine.ticks);
    snake2.setGameOver(engine.ticks);
    snake3.setGameOver(engine.ticks);

    expect(engine.getNBPlayerAlive()).toBe(0);
    expect(engine.checkEndGameCondition()).toBe(true);
  });

  test("all game over should not leave aiStuck as true", async () => {
    const theGrid = new Grid(10, 10, false, true, false, null, false, 1, 2);
    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    theSnake.setGameOver(engine.ticks);
    engine.checkEndGameCondition();

    // aiStuck should be false because the game should end
    expect(engine.aiStuck).toBe(false);
  });

  test("mix of game over and fully stuck should end game", async () => {
    class SnakeAIMock extends SnakeAI {
      ai(_snake) { return Constants.Key.RIGHT; }
    }

    const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);
    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S1", new SnakeAIMock());
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S2", new SnakeAIMock());

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Kill snake1
    snake1.setGameOver(engine.ticks);

    // Make snake2 appear fully stuck
    jest.spyOn(snake2, "isAIStuck").mockReturnValue(true);

    expect(engine.checkEndGameCondition()).toBe(true);
  });

  test("some game over and some active non-stuck should NOT end game", async () => {
    class SnakeAIMock extends SnakeAI {
      ai(_snake) { return Constants.Key.RIGHT; }
    }

    const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);
    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S1", new SnakeAIMock());
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "S2", new SnakeAIMock());

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    snake1.setGameOver(engine.ticks);
    jest.spyOn(snake2, "isAIStuck").mockReturnValue(false);

    expect(engine.checkEndGameCondition()).toBe(false);
  });

  test("no active snakes and no game overs should not falsely report all stuck", async () => {
    // Edge case: empty snakes array (defensive test)
    const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);

    const engine = new GameEngine(theGrid, []);
    engine.paused = false;
    engine.started = true;
    engine.isInit = true;

    // With 0 snakes, nbOver (0) >= snakes.length (0) is true → should end
    expect(engine.checkEndGameCondition()).toBe(true);
  });
});
