// SnakeIA OnlineLeaderboard test
import OnlineLeaderboard from "../src/engine/OnlineLeaderboard.js";

// Use mock server for testing since we can't make real HTTP requests
test("OnlineLeaderboard - mock server submit and retrieve", async () => {
  const server = OnlineLeaderboard.createMockServer();

  const result = await server.submit({
    playerName: "Alice",
    score: 42,
    difficulty: "normal"
  });

  expect(result.id).toBe(1);
  expect(result.playerName).toBe("Alice");
  expect(result.score).toBe(42);
  expect(result.difficulty).toBe("normal");
});

test("OnlineLeaderboard - mock server get top scores", async () => {
  const server = OnlineLeaderboard.createMockServer();

  await server.submit({ playerName: "Alice", score: 42 });
  await server.submit({ playerName: "Bob", score: 100 });
  await server.submit({ playerName: "Charlie", score: 75 });

  const top = await server.getTop(2);
  expect(top.length).toBe(2);
  expect(top[0].playerName).toBe("Bob");
  expect(top[0].score).toBe(100);
  expect(top[1].playerName).toBe("Charlie");
  expect(top[1].score).toBe(75);
});

test("OnlineLeaderboard - mock server sorted by score desc", async () => {
  const server = OnlineLeaderboard.createMockServer();

  await server.submit({ playerName: "A", score: 10 });
  await server.submit({ playerName: "B", score: 50 });
  await server.submit({ playerName: "C", score: 30 });
  await server.submit({ playerName: "D", score: 80 });

  const all = await server.getTop(10);
  expect(all[0].score).toBe(80);
  expect(all[1].score).toBe(50);
  expect(all[2].score).toBe(30);
  expect(all[3].score).toBe(10);
});

test("OnlineLeaderboard - mock server get player scores", async () => {
  const server = OnlineLeaderboard.createMockServer();

  await server.submit({ playerName: "Alice", score: 42 });
  await server.submit({ playerName: "Bob", score: 100 });
  await server.submit({ playerName: "Alice", score: 55 });

  const aliceScores = await server.getPlayer("Alice");
  expect(aliceScores.length).toBe(2);
  expect(aliceScores[0].score).toBe(55); // sorted by score desc
  expect(aliceScores[1].score).toBe(42);
});

test("OnlineLeaderboard - mock server get rank", async () => {
  const server = OnlineLeaderboard.createMockServer();

  await server.submit({ playerName: "Alice", score: 42 });
  await server.submit({ playerName: "Bob", score: 100 });
  await server.submit({ playerName: "Charlie", score: 75 });

  const bobRank = await server.getRank("Bob");
  expect(bobRank.rank).toBe(1);

  const charlieRank = await server.getRank("Charlie");
  expect(charlieRank.rank).toBe(2);

  const aliceRank = await server.getRank("Alice");
  expect(aliceRank.rank).toBe(3);

  const unknownRank = await server.getRank("Unknown");
  expect(unknownRank.rank).toBeNull();
});

test("OnlineLeaderboard - mock server delete", async () => {
  const server = OnlineLeaderboard.createMockServer();

  const result = await server.submit({ playerName: "Alice", score: 42 });
  expect(server.getAll().length).toBe(1);

  await server.delete(result.id);
  expect(server.getAll().length).toBe(0);
});

test("OnlineLeaderboard - mock server clear", async () => {
  const server = OnlineLeaderboard.createMockServer();

  await server.submit({ playerName: "A", score: 10 });
  await server.submit({ playerName: "B", score: 20 });
  expect(server.getAll().length).toBe(2);

  server.clear();
  expect(server.getAll().length).toBe(0);
});

test("OnlineLeaderboard - mock server offset", async () => {
  const server = OnlineLeaderboard.createMockServer();

  await server.submit({ playerName: "A", score: 10 });
  await server.submit({ playerName: "B", score: 50 });
  await server.submit({ playerName: "C", score: 30 });

  const page2 = await server.getTop(1, 1);
  expect(page2.length).toBe(1);
  expect(page2[0].playerName).toBe("C");
});

test("OnlineLeaderboard - constructor normalizes URL", () => {
  const lb = new OnlineLeaderboard("https://api.example.com/leaderboard///");
  expect(lb.apiBaseUrl).toBe("https://api.example.com/leaderboard");
});

test("OnlineLeaderboard - constructor default options", () => {
  const lb = new OnlineLeaderboard("https://api.example.com");
  expect(lb.timeout).toBe(10000);
  expect(lb.authToken).toBeNull();
});

test("OnlineLeaderboard - constructor custom options", () => {
  const lb = new OnlineLeaderboard("https://api.example.com", {
    timeout: 5000,
    authToken: "test-token"
  });
  expect(lb.timeout).toBe(5000);
  expect(lb.authToken).toBe("test-token");
});

test("OnlineLeaderboard - setAuthToken", () => {
  const lb = new OnlineLeaderboard("https://api.example.com");
  expect(lb.authToken).toBeNull();

  lb.setAuthToken("my-token");
  expect(lb.authToken).toBe("my-token");
});

test("OnlineLeaderboard - _headers includes auth", () => {
  const lb = new OnlineLeaderboard("https://api.example.com", { authToken: "test-token" });
  const headers = lb._headers();
  expect(headers["Authorization"]).toBe("Bearer test-token");
  expect(headers["Content-Type"]).toBe("application/json");
});

test("OnlineLeaderboard - _headers without auth", () => {
  const lb = new OnlineLeaderboard("https://api.example.com");
  const headers = lb._headers();
  expect(headers["Authorization"]).toBeUndefined();
  expect(headers["Content-Type"]).toBe("application/json");
});

test("OnlineLeaderboard - submitScore validates input", async () => {
  const lb = new OnlineLeaderboard("https://api.example.com");

  await expect(lb.submitScore(null)).rejects.toThrow();
  await expect(lb.submitScore({})).rejects.toThrow();
  await expect(lb.submitScore({ playerName: "Test" })).rejects.toThrow();
  await expect(lb.submitScore({ score: 42 })).rejects.toThrow();
});

test("OnlineLeaderboard - mock server IDs increment", async () => {
  const server = OnlineLeaderboard.createMockServer();

  const r1 = await server.submit({ playerName: "A", score: 10 });
  const r2 = await server.submit({ playerName: "B", score: 20 });
  const r3 = await server.submit({ playerName: "C", score: 30 });

  expect(r1.id).toBe(1);
  expect(r2.id).toBe(2);
  expect(r3.id).toBe(3);
});

test("OnlineLeaderboard - mock server default difficulty", async () => {
  const server = OnlineLeaderboard.createMockServer();
  const result = await server.submit({ playerName: "A", score: 10 });
  expect(result.difficulty).toBe("normal");
});

test("OnlineLeaderboard - mock server delete nonexistent", async () => {
  const server = OnlineLeaderboard.createMockServer();
  const result = await server.delete(999);
  expect(result.deleted).toBe(false);
});
