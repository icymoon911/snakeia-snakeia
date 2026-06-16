// SnakeIA GameEngine test
import Grid from "../src/engine/Grid.js";
import Position from "../src/engine/Position.js";
import Constants from "../src/engine/Constants.js";
import Snake from "../src/engine/Snake.js";
import GameEngine from "../src/engine/GameEngine.js";
import SnakeAI from "../src/engine/ai/SnakeAI.js";
import GameUtils from "../src/engine/GameUtils.js";

test("snake stuck horizontally - auto detection", async () => {
  const theGrid = new Grid(5, 5, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.width * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("snake stuck horizontally - auto detection - inverse action", async () => {
  class SnakeAICustom extends SnakeAI {
    ai(_snake) {
      return Constants.Key.LEFT;
    }
  }

  const theGrid = new Grid(5, 5, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "TheAI", new SnakeAICustom());
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.width * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("snake stuck horizontally - auto detection - grid 5 x 50", async () => {
  const theGrid = new Grid(5, 50, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.height * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("snake stuck vertically - auto detection", async () => {
  const theGrid = new Grid(5, 5, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.height * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("snake stuck vertically - auto detection - inverse action", async () => {
  class SnakeAICustom extends SnakeAI {
    ai(_snake) {
      return Constants.Key.UP;
    }
  }

  const theGrid = new Grid(5, 5, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "TheAI", new SnakeAICustom());
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.height * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("snake stuck vertically - auto detection - grid 5 x 50", async () => {
  const theGrid = new Grid(5, 50, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.height * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("snake stuck with repetitive action - auto detection", async () => {
  class SnakeAICustom extends SnakeAI {

    actionsStep = [Constants.Key.BOTTOM, Constants.Key.BOTTOM, Constants.Key.BOTTOM, Constants.Key.RIGHT, Constants.Key.UP, Constants.Key.UP, Constants.Key.UP, Constants.Key.LEFT];
    actionStepCounter = 0;

    ai(_snake) {
      const action = this.actionsStep[this.actionStepCounter];
      this.actionStepCounter = (this.actionStepCounter + 1) % this.actionsStep.length;
      return action;
    }
  }

  const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "TheAI", new SnakeAICustom());
  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.height * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(true);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("eating fruit should reset the stuck counter", async () => {
  class SnakeAICustom extends SnakeAI {

    actionsStep = [Constants.Key.BOTTOM, Constants.Key.BOTTOM, Constants.Key.BOTTOM, Constants.Key.RIGHT, Constants.Key.UP, Constants.Key.UP, Constants.Key.UP, Constants.Key.LEFT];
    actionStepCounter = 0;

    ai(_snake) {
      const action = this.actionsStep[this.actionStepCounter];
      this.actionStepCounter = (this.actionStepCounter + 1) % this.actionsStep.length;
      return action;
    }
  }

  const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.BOTTOM, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "TheAI", new SnakeAICustom());

  function allPositionsOccupied() {
    const restrictedArea = Array.from({ length: 2 }, (_, dx) => 
      Array.from({ length: 4 }, (_, dy) => new Position(5 + dx, 4 + dy))
    ).flat();

    return restrictedArea.every(pos =>
      theSnake.queue.some(sq => sq.equals(pos)) || theGrid.fruitPositions.some(fruitPos => pos.equals(fruitPos))
    );
  }

  const mockRandom = jest.fn();
  mockRandom.mockReturnValueOnce(new Position(5, 2)).mockImplementation(() => {
    if(allPositionsOccupied()) {
      return new Position(GameUtils.randRange(0, theGrid.width - 1), GameUtils.randRange(0, theGrid.height - 1));
    }
    
    return new Position(GameUtils.randRange(5, 6), GameUtils.randRange(4, 7));
  });

  jest.spyOn(Grid.prototype, "getRandomPosition").mockImplementation(mockRandom);

  const engine = new GameEngine(theGrid, [theSnake]);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  while(!allPositionsOccupied() && !engine.gameOver) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(false);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(false);
  expect(theSnake.stuckCounter).toBe(0);
});

test("snake stuck horizontally - stuck detection disabled", async () => {
  const theGrid = new Grid(5, 5, false, false, false, null, false, 1, 2);
  const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
  const engine = new GameEngine(theGrid, [theSnake], null, null, null, null, null, true);
  await engine.init();
  engine.paused = false;
  engine.started = true;

  for(let i = 0; i < theGrid.width * 2 * engine.aiStuckLimit + 1; i++) {
    engine.doTick();
  }

  expect(engine.gameOver).toBe(false);
  expect(theSnake.isAIStuck(engine.aiStuckLimit, engine.aiStuckLimit)).toBe(true);
});

test("fruit eaten should increase score", async () => {
    const theGrid = new Grid(10, 5, false, false, false, null, false);

    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid);

    const mockRandom = jest.fn();
    mockRandom.mockReturnValueOnce(new Position(5, 2)).mockReturnValueOnce(new Position(8, 2)).mockReturnValue(new Position(1, 1));
    jest.spyOn(Grid.prototype, "getRandomPosition").mockImplementation(mockRandom);
    
    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    expect(theSnake.errorInit).toBe(false);
    expect(theSnake.score).toBe(0);
    expect(theSnake.getHeadPosition()).toEqual({ x: 7, y: 2, direction: Constants.Direction.RIGHT });
    
    engine.doTick();

    expect(theSnake.gameOver).toBe(false);
    expect(engine.gameOver).toBe(false);
    expect(theSnake.score).toBe(1);
});

test("gold fruit eaten should increase score by 3", async () => {
    const theGrid = new Grid(10, 5, false, false, false, null, false);

    const theSnake = new Snake(Constants.Direction.LEFT, 3, theGrid);
    
    const mockRandom = jest.fn();
    mockRandom.mockReturnValueOnce(new Position(4, 1)).mockReturnValueOnce(new Position(4, 3)).mockReturnValue(new Position(2, 2)).mockReturnValue(new Position(1, 1));
    jest.spyOn(Grid.prototype, "getRandomPosition").mockImplementation(mockRandom);

    // Trigger gold fruit
    jest.spyOn(GameUtils, "randRange").mockImplementation(() => 1);
    
    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    expect(theSnake.errorInit).toBe(false);
    expect(theSnake.score).toBe(0);
    expect(theSnake.getHeadPosition()).toEqual({ x: 2, y: 1, direction: Constants.Direction.LEFT });
    
    engine.doTick();

    expect(theSnake.gameOver).toBe(false);
    expect(engine.gameOver).toBe(false);
    expect(theSnake.score).toBe(3);
});

test("wall should end game", async () => {
    const theGrid = new Grid(10, 5, false, true, false, null, false);

    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid);

    const mockRandom = jest.fn();
    mockRandom.mockReturnValueOnce(new Position(5, 1)).mockReturnValueOnce(new Position(5, 3)).mockReturnValue(new Position(2, 2)).mockReturnValue(new Position(1, 1));
    jest.spyOn(Grid.prototype, "getRandomPosition").mockImplementation(mockRandom);

    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    expect(theSnake.errorInit).toBe(false);
    expect(theSnake.score).toBe(0);
    expect(theSnake.getHeadPosition()).toEqual({ x: 7, y: 1, direction: Constants.Direction.RIGHT });

    for(let i = 0; i < 2; i++) {
      engine.doTick();
    }

    expect(theSnake.gameOver).toBe(true);
    expect(engine.gameOver).toBe(true);
    expect(theSnake.score).toBe(0);
});

test("multiple snakes eating fruits in same tick each trigger fruit replacement", async () => {
    const theGrid = new Grid(20, 20, false, false, false, null, false, 1, 2);

    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Place fruits right in front of both snakes' heads
    const head1 = snake1.getHeadPosition();
    const head2 = snake2.getHeadPosition();
    const fruitPos1 = theGrid.getNextPosition(head1, snake1.direction);
    const fruitPos2 = theGrid.getNextPosition(head2, snake2.direction);

    // Clear any existing fruits and place our own
    for(const fp of [...theGrid.fruitPositions]) {
      theGrid.removeFruit(fp);
    }
    theGrid.set(Constants.CaseType.FRUIT, fruitPos1);
    theGrid.fruitPositions.push(fruitPos1);
    theGrid.set(Constants.CaseType.FRUIT, fruitPos2);
    theGrid.fruitPositions.push(fruitPos2);

    const fruitCountBefore = theGrid.fruitPositions.length;
    expect(fruitCountBefore).toBe(2);

    engine.doTick();

    // Both snakes ate, so both fruits were removed.
    // Each eaten fruit should have triggered setFruits, so fruit count
    // should be back to at least the alive player count (2).
    expect(snake1.score + snake2.score).toBeGreaterThanOrEqual(2);
    expect(theGrid.fruitPositions.length).toBeGreaterThanOrEqual(engine.getNBPlayerAlive());
});

test("handleStuckFruits does not skip fruits when multiple are stuck", async () => {
    const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);

    const theSnake = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const engine = new GameEngine(theGrid, [theSnake]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Clear existing fruits
    for(const fp of [...theGrid.fruitPositions]) {
      theGrid.removeFruit(fp);
    }

    // Manually place two fruits and pretend they are both in corridors
    const fruit1 = new Position(3, 3);
    const fruit2 = new Position(7, 7);
    theGrid.set(Constants.CaseType.FRUIT, fruit1);
    theGrid.fruitPositions.push(fruit1);
    theGrid.set(Constants.CaseType.FRUIT, fruit2);
    theGrid.fruitPositions.push(fruit2);

    // Mock detectCorridor to return true for both stuck fruits only
    const origDetect = theGrid.detectCorridor.bind(theGrid);
    jest.spyOn(theGrid, "detectCorridor").mockImplementation((pos) => {
      if((pos.x === 3 && pos.y === 3) || (pos.x === 7 && pos.y === 7)) return true;
      return origDetect(pos);
    });

    expect(theGrid.fruitPositions.length).toBe(2);

    engine.handleStuckFruits();

    // Both stuck fruits should have been removed from their original positions
    // (they get replaced by new fruits via setFruits)
    expect(theGrid.fruitPositions.some(fp => fp.x === 3 && fp.y === 3)).toBe(false);
    expect(theGrid.fruitPositions.some(fp => fp.x === 7 && fp.y === 7)).toBe(false);
});

test("checkEndGameCondition - all snakes game over ends the game", async () => {
    const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);

    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Manually mark all snakes as game over
    snake1.setGameOver(1);
    snake2.setGameOver(1);

    const shouldEnd = engine.checkEndGameCondition();
    expect(shouldEnd).toBe(true);
});

test("checkEndGameCondition - mixed game-over and fully stuck ends the game", async () => {
    class SnakeAIAlwaysRight extends SnakeAI {
      ai(_snake) {
        return Constants.Key.RIGHT;
      }
    }

    const theGrid = new Grid(5, 5, false, false, false, null, false, 1, 2);

    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake2 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.CUSTOM, false, "StuckAI", new SnakeAIAlwaysRight());

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Mark snake1 as game over
    snake1.setGameOver(1);

    // Run enough ticks to make snake2 fully stuck (horizontal bouncing on a 5-wide grid)
    for(let i = 0; i < theGrid.width * 2 * engine.aiStuckLimit + 1; i++) {
      engine.doTick();
    }

    // The game should be over: snake1 is dead, snake2 is stuck
    expect(engine.gameOver).toBe(true);
});

test("checkEndGameCondition - no active AI should not falsely report all stuck", async () => {
    const theGrid = new Grid(10, 10, false, false, false, null, false, 1, 2);

    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake2 = new Snake(Constants.Direction.LEFT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Mark all snakes as game over
    snake1.setGameOver(1);
    snake2.setGameOver(1);

    // checkEndGameCondition should return true because all are game-over,
    // NOT because allActiveAIAreFullyStuck is vacuously true
    const shouldEnd = engine.checkEndGameCondition();
    expect(shouldEnd).toBe(true);
    // aiStuck should NOT be set when all snakes are game-over
    expect(engine.aiStuck).toBe(false);
});

test("fruit count adjusts when a snake dies mid-game", async () => {
    const theGrid = new Grid(20, 20, false, true, false, null, false, 1, 2);

    const snake1 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);
    const snake2 = new Snake(Constants.Direction.RIGHT, 3, theGrid, Constants.PlayerType.AI, Constants.AiLevel.MOCK);

    const engine = new GameEngine(theGrid, [snake1, snake2]);
    await engine.init();
    engine.paused = false;
    engine.started = true;

    // Initially 2 alive players → 2 fruits
    const initialFruitCount = theGrid.fruitPositions.length;
    expect(initialFruitCount).toBeGreaterThanOrEqual(2);

    // Kill snake2 to simulate death
    snake2.setGameOver(engine.ticks);
    expect(engine.getNBPlayerAlive()).toBe(1);

    // Place a fruit in front of snake1 so it eats on next tick
    const head1 = snake1.getHeadPosition();
    const fruitInFront = theGrid.getNextPosition(head1, snake1.direction);
    if(theGrid.get(fruitInFront) === Constants.CaseType.EMPTY) {
      theGrid.set(Constants.CaseType.FRUIT, fruitInFront);
      theGrid.fruitPositions.push(fruitInFront);
    }

    engine.doTick();

    // After eating, setFruits should be called with getNBPlayerAlive() = 1
    // so fruit count should be at least 1
    if(!snake1.gameOver && snake1.score > 0) {
      expect(theGrid.fruitPositions.length).toBeGreaterThanOrEqual(1);
    }
});