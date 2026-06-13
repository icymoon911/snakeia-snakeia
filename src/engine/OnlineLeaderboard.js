/*
 * OnlineLeaderboard - Simple REST API client for online score submission and ranking.
 *
 * Usage:
 *   const lb = new OnlineLeaderboard("https://api.example.com/leaderboard");
 *   await lb.submitScore({ playerName: "Alice", score: 42, difficulty: "normal" });
 *   const top = await lb.getTopScores(10);
 */

export default class OnlineLeaderboard {
  constructor(apiBaseUrl, options) {
    this.apiBaseUrl = (apiBaseUrl || "").replace(/\/+$/, "");
    this.options = options || {};
    this.timeout = this.options.timeout || 10000;
    this.authToken = this.options.authToken || null;
  }

  _headers() {
    const headers = { "Content-Type": "application/json" };
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  async _fetch(url, options) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timeoutId = null;

    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), this.timeout);
    }

    try {
      const fetchOptions = {
        ...options,
        signal: controller ? controller.signal : undefined
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorBody ? " - " + errorBody : ""}`);
      }

      return await response.json();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async submitScore(entry) {
    if (!entry || !entry.playerName || entry.score == null) {
      throw new Error("Entry must include playerName and score");
    }

    const payload = {
      playerName: String(entry.playerName).substring(0, 50),
      score: Number(entry.score),
      difficulty: entry.difficulty || "normal",
      aiLevel: entry.aiLevel || null,
      gridWidth: entry.gridWidth || null,
      gridHeight: entry.gridHeight || null,
      timestamp: entry.timestamp || Date.now(),
      gameVersion: entry.gameVersion || null
    };

    return this._fetch(`${this.apiBaseUrl}/scores`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(payload)
    });
  }

  async getTopScores(limit, offset) {
    limit = Math.min(Math.max(1, limit || 10), 100);
    offset = Math.max(0, offset || 0);
    return this._fetch(`${this.apiBaseUrl}/scores?limit=${limit}&offset=${offset}`, {
      method: "GET",
      headers: this._headers()
    });
  }

  async getPlayerScores(playerName, limit) {
    limit = Math.min(Math.max(1, limit || 10), 100);
    const encoded = encodeURIComponent(playerName);
    return this._fetch(`${this.apiBaseUrl}/scores/player/${encoded}?limit=${limit}`, {
      method: "GET",
      headers: this._headers()
    });
  }

  async getPlayerRank(playerName) {
    const encoded = encodeURIComponent(playerName);
    return this._fetch(`${this.apiBaseUrl}/scores/rank/${encoded}`, {
      method: "GET",
      headers: this._headers()
    });
  }

  async deleteScore(scoreId) {
    return this._fetch(`${this.apiBaseUrl}/scores/${scoreId}`, {
      method: "DELETE",
      headers: this._headers()
    });
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Create a simple in-memory mock server for testing purposes.
   * Returns an object with methods that simulate the REST API.
   */
  static createMockServer() {
    const scores = [];
    let nextId = 1;

    return {
      submit(entry) {
        const record = {
          id: nextId++,
          playerName: entry.playerName,
          score: Number(entry.score),
          difficulty: entry.difficulty || "normal",
          timestamp: entry.timestamp || Date.now()
        };
        scores.push(record);
        scores.sort((a, b) => b.score - a.score);
        return Promise.resolve(record);
      },

      getTop(limit, offset) {
        limit = limit || 10;
        offset = offset || 0;
        return Promise.resolve(scores.slice(offset, offset + limit));
      },

      getPlayer(playerName, limit) {
        limit = limit || 10;
        const filtered = scores.filter(s => s.playerName === playerName);
        return Promise.resolve(filtered.slice(0, limit));
      },

      getRank(playerName) {
        const idx = scores.findIndex(s => s.playerName === playerName);
        return Promise.resolve({ rank: idx >= 0 ? idx + 1 : null, playerName });
      },

      delete(id) {
        const idx = scores.findIndex(s => s.id === id);
        if (idx >= 0) scores.splice(idx, 1);
        return Promise.resolve({ deleted: idx >= 0 });
      },

      getAll() {
        return scores.slice();
      },

      clear() {
        scores.length = 0;
        nextId = 1;
      }
    };
  }
}
