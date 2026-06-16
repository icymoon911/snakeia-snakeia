import InputManager from "../src/ui/InputManager";
import GameConstants from "../src/engine/Constants";

describe("InputManager", () => {
  let inputManager;

  beforeEach(() => {
    inputManager = new InputManager();
  });

  afterEach(() => {
    inputManager.detach();
  });

  test("initialises with correct default touch state", () => {
    expect(inputManager.touchEventStartX).toBeUndefined();
    expect(inputManager.touchEventStartY).toBeUndefined();
    expect(inputManager.touchEventOffsetX).toBe(0);
    expect(inputManager.touchEventOffsetY).toBe(0);
    expect(inputManager.lastKeyMenu).toBe(-1);
  });

  test("getTouchPos returns correct relative coordinates", () => {
    const canvas = {
      getBoundingClientRect: () => ({ left: 10, top: 20 })
    };
    const event = { clientX: 50, clientY: 80 };

    const pos = inputManager.getTouchPos(canvas, event);

    expect(pos).toEqual({ x: 40, y: 60 });
  });

  test("getMousePos returns correct relative coordinates", () => {
    const canvas = {
      getBoundingClientRect: () => ({ left: 5, top: 15 })
    };
    const event = { clientX: 105, clientY: 215 };

    const pos = inputManager.getMousePos(canvas, event);

    expect(pos).toEqual({ x: 100, y: 200 });
  });

  test("attach registers keydown listener on document", () => {
    const addEventSpy = jest.spyOn(document, "addEventListener");
    const controller = { key: jest.fn() };

    inputManager.attach(null, controller, {
      getState: () => ({ paused: false, killed: false, countBeforePlay: -1 })
    });

    expect(addEventSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    addEventSpy.mockRestore();
  });

  test("attach registers touch listeners when canvas is provided", () => {
    const canvasListeners = {};
    const canvas = {
      addEventListener: (event, handler) => { canvasListeners[event] = handler; },
      removeEventListener: jest.fn(),
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    };
    const controller = { key: jest.fn() };

    inputManager.attach(canvas, controller, {
      getState: () => ({ paused: false, killed: false, countBeforePlay: -1 })
    });

    expect(canvasListeners.touchstart).toBeDefined();
    expect(canvasListeners.touchend).toBeDefined();
    expect(canvasListeners.touchmove).toBeDefined();
  });

  test("detach removes all listeners", () => {
    const removeEventSpy = jest.spyOn(document, "removeEventListener");
    const controller = { key: jest.fn() };

    inputManager.attach(null, controller, {
      getState: () => ({ paused: false, killed: false, countBeforePlay: -1 })
    });

    inputManager.detach();

    expect(removeEventSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(inputManager._listenerKeyDown).toBeNull();

    removeEventSpy.mockRestore();
  });

  test("detach is safe to call multiple times", () => {
    const controller = { key: jest.fn() };
    inputManager.attach(null, controller, {
      getState: () => ({ paused: false, killed: false, countBeforePlay: -1 })
    });

    expect(() => {
      inputManager.detach();
      inputManager.detach();
    }).not.toThrow();
  });

  test("keydown handler maps WASD/ZQSD to game directions", () => {
    const controller = { key: jest.fn() };
    let capturedListener;
    const addEventSpy = jest.spyOn(document, "addEventListener").mockImplementation((event, handler) => {
      if (event === "keydown") capturedListener = handler;
    });

    inputManager.attach(null, controller, {
      getState: () => ({ paused: false, killed: false, countBeforePlay: -1 })
    });

    // W key (87) should map to UP
    capturedListener({ keyCode: 87, preventDefault: jest.fn() });
    expect(controller.key).toHaveBeenCalledWith(GameConstants.Key.UP);

    // S key (83) should map to BOTTOM
    capturedListener({ keyCode: 83, preventDefault: jest.fn() });
    expect(controller.key).toHaveBeenCalledWith(GameConstants.Key.BOTTOM);

    // A key (65) should map to LEFT
    capturedListener({ keyCode: 65, preventDefault: jest.fn() });
    expect(controller.key).toHaveBeenCalledWith(GameConstants.Key.LEFT);

    // D key (68) should map to RIGHT
    capturedListener({ keyCode: 68, preventDefault: jest.fn() });
    expect(controller.key).toHaveBeenCalledWith(GameConstants.Key.RIGHT);

    addEventSpy.mockRestore();
  });

  test("keydown handler calls onPause when Enter is pressed during gameplay", () => {
    const controller = { key: jest.fn() };
    const onPause = jest.fn();
    let capturedListener;
    const addEventSpy = jest.spyOn(document, "addEventListener").mockImplementation((event, handler) => {
      if (event === "keydown") capturedListener = handler;
    });

    inputManager.attach(null, controller, {
      getState: () => ({ paused: false, killed: false, countBeforePlay: -1 }),
      onPause
    });

    capturedListener({ keyCode: GameConstants.Key.ENTER, preventDefault: jest.fn() });
    expect(onPause).toHaveBeenCalled();
    expect(controller.key).not.toHaveBeenCalled();

    addEventSpy.mockRestore();
  });

  test("keydown handler stores lastKeyMenu when paused", () => {
    const controller = { key: jest.fn() };
    let capturedListener;
    const addEventSpy = jest.spyOn(document, "addEventListener").mockImplementation((event, handler) => {
      if (event === "keydown") capturedListener = handler;
    });

    inputManager.attach(null, controller, {
      getState: () => ({ paused: true, killed: false, countBeforePlay: -1 })
    });

    capturedListener({ keyCode: 65, preventDefault: jest.fn() });
    // keyCode 65 (A) gets remapped to LEFT (37) before being stored
    expect(inputManager.lastKeyMenu).toBe(GameConstants.Key.LEFT);
    expect(controller.key).not.toHaveBeenCalled();

    addEventSpy.mockRestore();
  });

  test("keydown handler does nothing when killed", () => {
    const controller = { key: jest.fn() };
    const onPause = jest.fn();
    let capturedListener;
    const addEventSpy = jest.spyOn(document, "addEventListener").mockImplementation((event, handler) => {
      if (event === "keydown") capturedListener = handler;
    });

    inputManager.attach(null, controller, {
      getState: () => ({ paused: false, killed: true, countBeforePlay: -1 }),
      onPause
    });

    capturedListener({ keyCode: 65, preventDefault: jest.fn() });
    expect(controller.key).not.toHaveBeenCalled();
    expect(onPause).not.toHaveBeenCalled();

    addEventSpy.mockRestore();
  });
});
