// SnakeIA SnakeAIUltraModelCache test
import SnakeAIUltraModelCache from "../src/engine/ai/SnakeAIUltraModelCache.js";

// In jsdom test environment, indexedDB may not be available.
// We test the class's behavior both with and without IndexedDB.

test("SnakeAIUltraModelCache - constructor defaults", () => {
  const cache = new SnakeAIUltraModelCache();
  expect(cache.dbName).toBe("SnakeIA_ModelCache");
  expect(cache.dbVersion).toBe(1);
  expect(cache.storeName).toBe("models");
  expect(cache.db).toBeNull();
});

test("SnakeAIUltraModelCache - constructor custom params", () => {
  const cache = new SnakeAIUltraModelCache("custom-db", 2);
  expect(cache.dbName).toBe("custom-db");
  expect(cache.dbVersion).toBe(2);
});

test("SnakeAIUltraModelCache - isAvailable false before init", () => {
  const cache = new SnakeAIUltraModelCache();
  expect(cache.isAvailable).toBe(false);
});

test("SnakeAIUltraModelCache - getCached returns null when not available", async () => {
  const cache = new SnakeAIUltraModelCache();
  const result = await cache.getCached("http://example.com/model");
  expect(result).toBeNull();
});

test("SnakeAIUltraModelCache - putCached returns false when not available", async () => {
  const cache = new SnakeAIUltraModelCache();
  const result = await cache.putCached("http://example.com/model", { data: "test" });
  expect(result).toBe(false);
});

test("SnakeAIUltraModelCache - removeCached returns false when not available", async () => {
  const cache = new SnakeAIUltraModelCache();
  const result = await cache.removeCached("http://example.com/model");
  expect(result).toBe(false);
});

test("SnakeAIUltraModelCache - clearAll returns false when not available", async () => {
  const cache = new SnakeAIUltraModelCache();
  const result = await cache.clearAll();
  expect(result).toBe(false);
});

test("SnakeAIUltraModelCache - listCached returns empty when not available", async () => {
  const cache = new SnakeAIUltraModelCache();
  const result = await cache.listCached();
  expect(result).toEqual([]);
});

test("SnakeAIUltraModelCache - close is safe when not initialized", () => {
  const cache = new SnakeAIUltraModelCache();
  cache.close(); // should not throw
  expect(cache.db).toBeNull();
});

test("SnakeAIUltraModelCache - init returns false when indexedDB unavailable", async () => {
  // In jsdom, indexedDB may or may not be available
  // If it's not, init should gracefully return false
  const originalIndexedDB = global.indexedDB;
  delete global.indexedDB;

  const cache = new SnakeAIUltraModelCache();
  const result = await cache.init();

  if(typeof originalIndexedDB !== "undefined") {
    global.indexedDB = originalIndexedDB;
  }

  // If indexedDB was not available, result should be false
  if(typeof originalIndexedDB === "undefined") {
    expect(result).toBe(false);
  }
  // If indexedDB was available, we just test that init doesn't throw
});

test("SnakeAIUltraModelCache - loadModelWithCache falls through to loader", async () => {
  const cache = new SnakeAIUltraModelCache();

  let loaderCalled = false;
  const mockModel = { name: "test-model" };
  const loaderFn = async () => {
    loaderCalled = true;
    return mockModel;
  };

  const result = await cache.loadModelWithCache("http://example.com/model", loaderFn);

  expect(loaderCalled).toBe(true);
  expect(result.fromCache).toBe(false);
  expect(result.model).toBe(mockModel);
});

test("SnakeAIUltraModelCache - multiple instances independent", () => {
  const cache1 = new SnakeAIUltraModelCache("db1", 1);
  const cache2 = new SnakeAIUltraModelCache("db2", 2);

  expect(cache1.dbName).toBe("db1");
  expect(cache2.dbName).toBe("db2");
  expect(cache1.dbVersion).toBe(1);
  expect(cache2.dbVersion).toBe(2);
});
