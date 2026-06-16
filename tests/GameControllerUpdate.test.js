import GameController from "../src/engine/GameController";

// Mock GameEngine
const mockEngine = {
  snakes: [],
  grid: null,
  enablePause: true,
  enableRetry: true,
  paused: false,
  progressiveSpeed: false,
  speed: 8,
  errorOccurred: false,
  engineLoading: false,
  init: jest.fn().mockResolvedValue(undefined),
  isInit: true,
  onReset: jest.fn(),
  onStart: jest.fn(),
  onPause: jest.fn(),
  onContinue: jest.fn(),
  onStop: jest.fn(),
  onExit: jest.fn(),
  onKill: jest.fn(),
  onScoreIncreased: jest.fn(),
  onUpdate: jest.fn(),
  onUpdateCounter: jest.fn()
};

describe("GameController.update() – typed state interface", () => {
  let controller;
  let mockUI;

  beforeEach(() => {
    mockUI = {
      applyState: jest.fn(),
      setKill: jest.fn(),
      setDisplayFPS: jest.fn(),
      setDebugMode: jest.fn(),
      setNotification: jest.fn(),
      setGoal: jest.fn(),
      setTimeToDisplay: jest.fn(),
      setBestScore: jest.fn(),
      resetState: jest.fn(),
      startAfterEngineInit: jest.fn().mockResolvedValue(undefined),
      gameRanking: { forceClose: jest.fn() }
    };

    controller = new GameController({ ...mockEngine }, mockUI);
  });

  test("calls gameUI.applyState with a filtered patch", () => {
    controller.update("test", {
      speed: 10,
      paused: true,
      grid: "fakeGrid"
    });

    expect(mockUI.applyState).toHaveBeenCalledWith(
      { speed: 10, paused: true, grid: "fakeGrid" },
      "test"
    );
  });

  test("does not call applyState when gameUI is null", () => {
    controller.gameUI = null;
    expect(() => controller.update("test", { speed: 10 })).not.toThrow();
  });

  test("does not call applyState when data is null", () => {
    controller.update("test", null);
    expect(mockUI.applyState).not.toHaveBeenCalled();
  });

  test("filters out function values", () => {
    controller.update("test", {
      speed: 10,
      badFn: () => {}
    });

    const patch = mockUI.applyState.mock.calls[0][0];
    expect(patch.speed).toBe(10);
    expect(patch.badFn).toBeUndefined();
  });

  test("syncs controller's own properties from the patch", () => {
    controller.update("test", {
      grid: "newGrid",
      paused: true
    });

    expect(controller.grid).toBe("newGrid");
    expect(controller.paused).toBe(true);
  });

  test("handles killed flag through applyState", () => {
    controller.update("test", { killed: true });

    const patch = mockUI.applyState.mock.calls[0][0];
    expect(patch.killed).toBe(true);
    // applyState in the real GameUI calls setKill when killed is true
    // In this mock, applyState is just a jest.fn so we verify the data flow
  });

  test("filters keys in clientSidePredictionsMode + onlineMode", () => {
    controller.clientSidePredictionsMode = true;
    controller.onlineMode = true;

    controller.update("test", {
      snakes: "allowed",
      grid: "allowed",
      offsetFrame: 50,
      gameOver: true,
      speed: 10,        // should be filtered OUT
      paused: true       // should be filtered OUT
    });

    const patch = mockUI.applyState.mock.calls[0][0];
    expect(patch.snakes).toBe("allowed");
    expect(patch.grid).toBe("allowed");
    expect(patch.offsetFrame).toBe(50);
    expect(patch.gameOver).toBe(true);
    expect(patch.speed).toBeUndefined();
    expect(patch.paused).toBeUndefined();
  });

  test("allows all keys when not in online mode", () => {
    controller.clientSidePredictionsMode = false;
    controller.onlineMode = false;

    controller.update("test", {
      speed: 10,
      paused: true,
      grid: "newGrid"
    });

    const patch = mockUI.applyState.mock.calls[0][0];
    expect(patch.speed).toBe(10);
    expect(patch.paused).toBe(true);
    expect(patch.grid).toBe("newGrid");
  });

  test("falls back to direct property assignment when applyState is not available", () => {
    // Simulate legacy UI without applyState
    const legacyUI = {
      speed: 8,
      paused: false,
      grid: null
    };
    controller.gameUI = legacyUI;

    controller.update("test", { speed: 12, paused: true });

    expect(legacyUI.speed).toBe(12);
    expect(legacyUI.paused).toBe(true);
  });

  test("updateEngine flag passes data to engine", () => {
    controller.updateEngine = jest.fn();

    controller.update("test", { speed: 10 }, true);

    expect(controller.updateEngine).toHaveBeenCalledWith("speed", 10);
  });
});
