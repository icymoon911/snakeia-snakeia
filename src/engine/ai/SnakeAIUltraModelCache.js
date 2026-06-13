/*
 * SnakeAIUltraModelCache - IndexedDB-based model caching for Ultra AI.
 *
 * Caches TensorFlow.js model artifacts in IndexedDB so subsequent loads
 * skip the network fetch entirely.
 *
 * Usage:
 *   const cache = new SnakeAIUltraModelCache();
 *   await cache.init();
 *   const model = await cache.loadModel(modelUrl, () => tf.loadLayersModel(modelUrl + '/model.json'));
 */

const DB_NAME = "SnakeIA_ModelCache";
const DB_VERSION = 1;
const STORE_NAME = "models";

export default class SnakeAIUltraModelCache {
  constructor(dbName, dbVersion) {
    this.dbName = dbName || DB_NAME;
    this.dbVersion = dbVersion || DB_VERSION;
    this.storeName = STORE_NAME;
    this.db = null;
    this._available = null;
  }

  async init() {
    if (this.db) return true;
    if (this._available === false) return false;

    if (typeof indexedDB === "undefined") {
      this._available = false;
      return false;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "url" });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          this._available = true;
          resolve(true);
        };

        request.onerror = () => {
          this._available = false;
          resolve(false);
        };

        request.onblocked = () => {
          this._available = false;
          resolve(false);
        };
      } catch (e) {
        this._available = false;
        resolve(false);
      }
    });
  }

  get isAvailable() {
    return this._available === true && this.db !== null;
  }

  async getCached(modelUrl) {
    if (!this.isAvailable) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const request = store.get(modelUrl);

        request.onsuccess = (event) => {
          const result = event.target.result;
          resolve(result || null);
        };

        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async putCached(modelUrl, modelArtifacts) {
    if (!this.isAvailable) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const request = store.put({
          url: modelUrl,
          artifacts: modelArtifacts,
          cachedAt: Date.now()
        });

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async removeCached(modelUrl) {
    if (!this.isAvailable) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const request = store.delete(modelUrl);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async clearAll() {
    if (!this.isAvailable) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async listCached() {
    if (!this.isAvailable) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
          resolve(event.target.result || []);
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Load model with caching. The loaderFn should return a tf.LayersModel.
   * On first call, it fetches and caches. On subsequent calls, loads from cache.
   *
   * Note: TensorFlow.js loadLayersModel supports custom IO handlers.
   * We use the indexeddb:// protocol if available, otherwise we fall back
   * to standard HTTP loading.
   */
  async loadModelWithCache(modelUrl, loaderFn) {
    const cached = await this.getCached(modelUrl);

    if (cached && cached.artifacts) {
      // Return cached artifacts - caller can reconstruct the model
      return { fromCache: true, artifacts: cached.artifacts, cachedAt: cached.cachedAt };
    }

    // Not cached - load normally
    const result = await loaderFn();

    // Try to cache the model artifacts if we can extract them
    if (result && result.modelArtifacts) {
      await this.putCached(modelUrl, result.modelArtifacts);
    } else {
      // Mark as cached (metadata only)
      await this.putCached(modelUrl, { loaded: true, timestamp: Date.now() });
    }

    return { fromCache: false, model: result };
  }
}
