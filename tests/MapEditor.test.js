// SnakeIA MapEditor test
import MapEditor from "../src/engine/MapEditor.js";
import Constants from "../src/engine/Constants.js";
import Position from "../src/engine/Position.js";

test("MapEditor - constructor creates empty grid", () => {
  const editor = new MapEditor(10, 10);

  expect(editor.width).toBe(10);
  expect(editor.height).toBe(10);
  expect(editor.grid.length).toBe(10);
  expect(editor.grid[0].length).toBe(10);

  for(let y = 0; y < 10; y++) {
    for(let x = 0; x < 10; x++) {
      expect(editor.get(x, y)).toBe(Constants.CaseType.EMPTY);
    }
  }
});

test("MapEditor - setWall and removeWall", () => {
  const editor = new MapEditor(10, 10);

  editor.setWall(3, 3);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.WALL);

  editor.removeWall(3, 3);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - removeWall only removes walls", () => {
  const editor = new MapEditor(10, 10);

  editor.setFruit(5, 5);
  editor.removeWall(5, 5);
  expect(editor.get(5, 5)).toBe(Constants.CaseType.FRUIT);
});

test("MapEditor - setFruit replaces previous fruit", () => {
  const editor = new MapEditor(10, 10);

  editor.setFruit(2, 2);
  expect(editor.get(2, 2)).toBe(Constants.CaseType.FRUIT);

  editor.setFruit(5, 5);
  expect(editor.get(5, 5)).toBe(Constants.CaseType.FRUIT);
  expect(editor.get(2, 2)).toBe(Constants.CaseType.EMPTY); // previous fruit removed
});

test("MapEditor - setGoldFruit replaces previous gold fruit", () => {
  const editor = new MapEditor(10, 10);

  editor.setGoldFruit(3, 3);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.FRUIT_GOLD);

  editor.setGoldFruit(7, 7);
  expect(editor.get(7, 7)).toBe(Constants.CaseType.FRUIT_GOLD);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - clear resets cell to empty", () => {
  const editor = new MapEditor(10, 10);

  editor.setWall(4, 4);
  editor.clear(4, 4);
  expect(editor.get(4, 4)).toBe(Constants.CaseType.EMPTY);

  editor.setFruit(4, 4);
  editor.clear(4, 4);
  expect(editor.get(4, 4)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - addBorderWalls", () => {
  const editor = new MapEditor(5, 5);
  editor.addBorderWalls();

  // Check borders are walls
  for(let x = 0; x < 5; x++) {
    expect(editor.get(x, 0)).toBe(Constants.CaseType.WALL);
    expect(editor.get(x, 4)).toBe(Constants.CaseType.WALL);
  }
  for(let y = 0; y < 5; y++) {
    expect(editor.get(0, y)).toBe(Constants.CaseType.WALL);
    expect(editor.get(4, y)).toBe(Constants.CaseType.WALL);
  }

  // Interior should be empty
  expect(editor.get(2, 2)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - exportGrid produces valid customGrid", () => {
  const editor = new MapEditor(5, 5);
  editor.addBorderWalls();
  editor.setFruit(2, 2);

  const grid = editor.exportGrid();
  expect(grid.length).toBe(5);
  expect(grid[0].length).toBe(5);

  // Border walls
  expect(grid[0][0]).toBe(Constants.CaseType.WALL);
  expect(grid[0][4]).toBe(Constants.CaseType.WALL);

  // Fruit
  expect(grid[2][2]).toBe(Constants.CaseType.FRUIT);

  // Empty interior
  expect(grid[1][1]).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - exportGrid can be used with Grid constructor", () => {
  const editor = new MapEditor(5, 5);
  editor.addBorderWalls();
  editor.setFruit(2, 2);

  const customGrid = editor.exportGrid();

  // Verify it's a valid 2D array of numbers
  expect(Array.isArray(customGrid)).toBe(true);
  for(const row of customGrid) {
    expect(Array.isArray(row)).toBe(true);
    for(const cell of row) {
      expect(typeof cell).toBe("number");
      expect(cell).toBeGreaterThanOrEqual(0);
    }
  }
});

test("MapEditor - exportJSON and importJSON roundtrip", () => {
  const editor = new MapEditor(8, 6);
  editor.addBorderWalls();
  editor.setFruit(3, 3);
  editor.setGoldFruit(5, 3);
  editor.setSnakeStart(1, 1, Constants.Direction.RIGHT);

  const json = editor.exportJSON();
  const imported = MapEditor.importJSON(json);

  expect(imported.width).toBe(8);
  expect(imported.height).toBe(6);
  expect(imported.get(3, 3)).toBe(Constants.CaseType.FRUIT);
  expect(imported.get(5, 3)).toBe(Constants.CaseType.FRUIT_GOLD);
  expect(imported.get(0, 0)).toBe(Constants.CaseType.WALL);
  expect(imported.snakeStartPositions.length).toBe(1);
  expect(imported.snakeStartPositions[0].x).toBe(1);
  expect(imported.snakeStartPositions[0].y).toBe(1);
});

test("MapEditor - importJSON rejects invalid data", () => {
  expect(() => MapEditor.importJSON("{}")).toThrow();
  expect(() => MapEditor.importJSON('not json')).toThrow();
});

test("MapEditor - fromCustomGrid", () => {
  const customGrid = [
    [3, 3, 3, 3, 3],
    [3, 0, 0, 0, 3],
    [3, 0, 2, 0, 3],
    [3, 0, 0, 0, 3],
    [3, 3, 3, 3, 3]
  ];

  const editor = MapEditor.fromCustomGrid(customGrid);
  expect(editor.width).toBe(5);
  expect(editor.height).toBe(5);
  expect(editor.get(2, 2)).toBe(Constants.CaseType.FRUIT);
  expect(editor.get(0, 0)).toBe(Constants.CaseType.WALL);
  expect(editor.get(1, 1)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - fromCustomGrid rejects invalid", () => {
  expect(() => MapEditor.fromCustomGrid(null)).toThrow();
  expect(() => MapEditor.fromCustomGrid([])).toThrow();
});

test("MapEditor - clearAll resets everything", () => {
  const editor = new MapEditor(5, 5);
  editor.addBorderWalls();
  editor.setFruit(2, 2);
  editor.setSnakeStart(1, 1);

  editor.clearAll();

  expect(editor.snakeStartPositions.length).toBe(0);
  for(let y = 0; y < 5; y++) {
    for(let x = 0; x < 5; x++) {
      expect(editor.get(x, y)).toBe(Constants.CaseType.EMPTY);
    }
  }
});

test("MapEditor - resize preserves content", () => {
  const editor = new MapEditor(5, 5);
  editor.setWall(2, 2);
  editor.setFruit(3, 3);

  editor.resize(8, 8);
  expect(editor.width).toBe(8);
  expect(editor.height).toBe(8);
  expect(editor.get(2, 2)).toBe(Constants.CaseType.WALL);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.FRUIT);
  expect(editor.get(6, 6)).toBe(Constants.CaseType.EMPTY); // new area
});

test("MapEditor - resize shrinks and clips", () => {
  const editor = new MapEditor(10, 10);
  editor.setWall(8, 8);
  editor.setSnakeStart(9, 9);

  editor.resize(5, 5);
  expect(editor.width).toBe(5);
  expect(editor.height).toBe(5);
  expect(editor.snakeStartPositions.length).toBe(0); // was outside new bounds
});

test("MapEditor - resize minimum size", () => {
  const editor = new MapEditor(10, 10);
  editor.resize(1, 1);
  expect(editor.width).toBe(3); // minimum
  expect(editor.height).toBe(3);
});

test("MapEditor - validate detects issues", () => {
  const editor = new MapEditor(2, 2);
  // All walls, no empty cells
  for(let y = 0; y < 2; y++) {
    for(let x = 0; x < 2; x++) {
      editor.setWall(x, y);
    }
  }

  const result = editor.validate();
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test("MapEditor - validate passes for valid grid", () => {
  const editor = new MapEditor(10, 10);
  editor.addBorderWalls();

  const result = editor.validate();
  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test("MapEditor - fillRect fills area", () => {
  const editor = new MapEditor(10, 10);
  editor.fillRect(2, 2, 5, 5, Constants.CaseType.WALL);

  expect(editor.get(2, 2)).toBe(Constants.CaseType.WALL);
  expect(editor.get(5, 5)).toBe(Constants.CaseType.WALL);
  expect(editor.get(3, 4)).toBe(Constants.CaseType.WALL);
  expect(editor.get(1, 1)).toBe(Constants.CaseType.EMPTY);
  expect(editor.get(6, 6)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - setSnakeStart and removeSnakeStart", () => {
  const editor = new MapEditor(10, 10);

  editor.setSnakeStart(3, 3, Constants.Direction.RIGHT);
  expect(editor.snakeStartPositions.length).toBe(1);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.SNAKE);

  editor.removeSnakeStart(3, 3);
  expect(editor.snakeStartPositions.length).toBe(0);
  expect(editor.get(3, 3)).toBe(Constants.CaseType.EMPTY);
});

test("MapEditor - out of bounds get returns null", () => {
  const editor = new MapEditor(5, 5);
  expect(editor.get(-1, 0)).toBeNull();
  expect(editor.get(5, 0)).toBeNull();
  expect(editor.get(0, -1)).toBeNull();
  expect(editor.get(0, 5)).toBeNull();
});

test("MapEditor - out of bounds set is safe", () => {
  const editor = new MapEditor(5, 5);
  editor.set(-1, -1, Constants.CaseType.WALL); // should not throw
  editor.set(10, 10, Constants.CaseType.WALL); // should not throw
});
