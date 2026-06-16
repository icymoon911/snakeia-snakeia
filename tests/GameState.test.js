import GameState from "../src/ui/GameState";

describe("GameState", () => {
  let state;

  beforeEach(() => {
    state = new GameState();
  });

  test("initialises all known keys with sensible defaults", () => {
    expect(state.grid).toBeNull();
    expect(state.snakes).toBeNull();
    expect(state.speed).toBe(8);
    expect(state.paused).toBe(true);
    expect(state.gameOver).toBe(false);
    expect(state.onlineMode).toBe(false);
    expect(state.pingLatency).toBe(-1);
    expect(state.killed).toBe(false);
    expect(state.countBeforePlay).toBe(-1);
  });

  test("applyPatch updates known keys and returns applied keys", () => {
    const applied = state.applyPatch({
      grid: "fakeGrid",
      speed: 12,
      paused: false,
      gameOver: true
    });

    expect(state.grid).toBe("fakeGrid");
    expect(state.speed).toBe(12);
    expect(state.paused).toBe(false);
    expect(state.gameOver).toBe(true);
    expect(applied).toEqual(["grid", "speed", "paused", "gameOver"]);
  });

  test("applyPatch warns on unknown keys and ignores them", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const applied = state.applyPatch({
      speed: 10,
      unknownKey: "should be ignored",
      anotherBadKey: 42
    }, "test-source");

    expect(state.speed).toBe(10);
    expect(state.unknownKey).toBeUndefined();
    expect(applied).toEqual(["speed"]);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain("unknownKey");
    expect(warn.mock.calls[0][0]).toContain("test-source");
    expect(warn.mock.calls[1][0]).toContain("anotherBadKey");

    warn.mockRestore();
  });

  test("applyPatch skips function values", () => {
    const applied = state.applyPatch({
      speed: 10,
      badFn: () => {}
    });

    expect(state.speed).toBe(10);
    expect(state.badFn).toBeUndefined();
    expect(applied).toEqual(["speed"]);
  });

  test("applyPatch handles null/undefined gracefully", () => {
    expect(state.applyPatch(null)).toEqual([]);
    expect(state.applyPatch(undefined)).toEqual([]);
    expect(state.applyPatch("not an object")).toEqual([]);
  });

  test("toObject returns a snapshot of all known keys", () => {
    state.speed = 15;
    state.paused = false;
    state.onlineMode = true;

    const obj = state.toObject();

    expect(obj.speed).toBe(15);
    expect(obj.paused).toBe(false);
    expect(obj.onlineMode).toBe(true);
    expect(obj.grid).toBeNull();
    // _knownKeys should not leak into the snapshot
    expect(obj._knownKeys).toBeUndefined();
  });

  test("applyPatch covers all online state keys", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    state.applyPatch({
      onlineMode: true,
      spectatorMode: true,
      pingLatency: 42,
      playerNumber: 3,
      maxPlayers: 10,
      timeStart: 5000,
      currentPlayer: 2,
      onlineMaster: true,
      searchingPlayers: true,
      enableRetryPauseMenu: false
    });

    expect(state.onlineMode).toBe(true);
    expect(state.spectatorMode).toBe(true);
    expect(state.pingLatency).toBe(42);
    expect(state.playerNumber).toBe(3);
    expect(state.maxPlayers).toBe(10);
    expect(state.timeStart).toBe(5000);
    expect(state.currentPlayer).toBe(2);
    expect(state.onlineMaster).toBe(true);
    expect(state.searchingPlayers).toBe(true);
    expect(state.enableRetryPauseMenu).toBe(false);

    // No warnings should have been emitted for any of these
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  test("applyPatch covers all engine state keys", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    state.applyPatch({
      ticks: 100,
      countBeforePlay: 3,
      numFruit: 5,
      exited: true,
      killed: true,
      isReseted: false,
      gameFinished: true,
      gameMazeWin: true,
      scoreMax: true,
      enablePause: true,
      enableRetry: true,
      progressiveSpeed: true,
      aiStuck: true,
      precAiStuck: true,
      starting: true,
      errorOccurred: true,
      engineLoading: true,
      offsetFrame: 50,
      initialSpeed: 10
    });

    expect(state.ticks).toBe(100);
    expect(state.countBeforePlay).toBe(3);
    expect(state.numFruit).toBe(5);
    expect(state.exited).toBe(true);
    expect(state.killed).toBe(true);
    expect(state.isReseted).toBe(false);
    expect(state.gameFinished).toBe(true);
    expect(state.gameMazeWin).toBe(true);
    expect(state.scoreMax).toBe(true);
    expect(state.enablePause).toBe(true);
    expect(state.enableRetry).toBe(true);
    expect(state.progressiveSpeed).toBe(true);
    expect(state.aiStuck).toBe(true);
    expect(state.precAiStuck).toBe(true);
    expect(state.starting).toBe(true);
    expect(state.errorOccurred).toBe(true);
    expect(state.engineLoading).toBe(true);
    expect(state.offsetFrame).toBe(50);
    expect(state.initialSpeed).toBe(10);

    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });
});
