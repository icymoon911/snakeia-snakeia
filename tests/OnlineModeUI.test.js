import OnlineModeUI from "../src/ui/OnlineModeUI";

// Mock i18next
jest.mock("i18next", () => ({
  t: (key, opts) => {
    if (key === "engine.servers.nextGameStart") return "Next game starts in";
    if (key === "engine.servers.spectatorMode") return "Spectator mode";
    return key;
  },
  language: "en"
}));

// Mock jsgametools
jest.mock("jsgametools", () => ({
  Utils: {
    drawText: jest.fn()
  }
}));

describe("OnlineModeUI", () => {
  let ui;

  beforeEach(() => {
    ui = new OnlineModeUI();
  });

  test("initialises with correct defaults", () => {
    expect(ui.onlineMode).toBe(false);
    expect(ui.spectatorMode).toBe(false);
    expect(ui.pingLatency).toBe(-1);
    expect(ui.playerNumber).toBe(0);
    expect(ui.maxPlayers).toBe(0);
    expect(ui.timeStart).toBe(0);
    expect(ui.currentPlayer).toBeNull();
    expect(ui.onlineMaster).toBe(false);
    expect(ui.searchingPlayers).toBe(false);
  });

  test("setState applies known keys", () => {
    ui.setState({
      onlineMode: true,
      pingLatency: 42,
      playerNumber: 3,
      maxPlayers: 10,
      spectatorMode: true,
      currentPlayer: 1,
      onlineMaster: true,
      searchingPlayers: true
    });

    expect(ui.onlineMode).toBe(true);
    expect(ui.pingLatency).toBe(42);
    expect(ui.playerNumber).toBe(3);
    expect(ui.maxPlayers).toBe(10);
    expect(ui.spectatorMode).toBe(true);
    expect(ui.currentPlayer).toBe(1);
    expect(ui.onlineMaster).toBe(true);
    expect(ui.searchingPlayers).toBe(true);
  });

  test("setState ignores unknown keys silently", () => {
    ui.setState({
      onlineMode: true,
      unknownProp: "should not throw",
      anotherBadKey: 42
    });

    expect(ui.onlineMode).toBe(true);
    expect(ui.unknownProp).toBeUndefined();
    expect(ui.anotherBadKey).toBeUndefined();
  });

  test("setState handles null/undefined gracefully", () => {
    expect(() => ui.setState(null)).not.toThrow();
    expect(() => ui.setState(undefined)).not.toThrow();
  });

  test("setState ignores function values", () => {
    ui.setState({
      onlineMode: true,
      badFn: () => {}
    });

    expect(ui.onlineMode).toBe(true);
    expect(ui.badFn).toBeUndefined();
  });

  test("getNextGameText returns empty when timeStart is 0", () => {
    ui.timeStart = 0;
    expect(ui.getNextGameText()).toBe("");
  });

  test("getNextGameText returns formatted string when timeStart > 0", () => {
    ui.timeStart = 5000;
    const text = ui.getNextGameText();
    expect(text).toContain("Next game starts in");
  });

  test("update decrements timeStart when searchingPlayers", () => {
    ui.searchingPlayers = true;
    ui.timeStart = 5000;
    ui.lastTime = Date.now() - 1000; // 1 second ago

    ui.update({ searchingPlayers: true });

    expect(ui.timeStart).toBeLessThan(5000);
    expect(ui.timeStart).toBeGreaterThanOrEqual(4000);
  });

  test("update resets timeStart to 0 when not searchingPlayers", () => {
    ui.searchingPlayers = false;
    ui.timeStart = 5000;

    ui.update({ searchingPlayers: false });

    expect(ui.timeStart).toBe(0);
  });

  test("draw does not throw when spectatorMode is false", () => {
    const ctx = {};
    expect(() => ui.draw(ctx, { fontSize: 16 })).not.toThrow();
  });

  test("draw calls Utils.drawText when spectatorMode is true", () => {
    const { Utils } = require("jsgametools");
    const ctx = {};
    ui.spectatorMode = true;

    ui.draw(ctx, { fontSize: 16 });

    expect(Utils.drawText).toHaveBeenCalledWith(
      ctx,
      "Spectator mode",
      "rgba(255, 255, 255, 0.5)",
      16,
      "DELIUS",
      "left", "bottom",
      null, null,
      true
    );
  });
});
