const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const TEST_API_KEY = "test-api-key";
process.env.API_SECRET_KEY = TEST_API_KEY;

const app = require("../server");

const server = http.createServer(app);

server.listen(0, "127.0.0.1");

const serverReady = new Promise((resolve, reject) => {
  server.once("listening", resolve);
  server.once("error", reject);
});

after(async () => {
  await serverReady;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

async function get(path) {
  await serverReady;

  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}${path}`);
}

test("GET /api/store returns store information", async () => {
  const response = await get("/api/store");
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof data.name, "string");
  assert.equal(data.totalProducts, 8);
});

test("GET /api/products returns all products", async () => {
  const response = await get("/api/products");
  const products = await response.json();

  assert.equal(response.status, 200);
  assert.equal(products.length, 8);
});

test("GET /api/products/1 returns the requested product", async () => {
  const response = await get("/api/products/1");
  const product = await response.json();

  assert.equal(response.status, 200);
  assert.equal(product.id, 1);
  assert.equal(product.name, "Merino crew neck");
});

test("GET /api/products/999 returns 404 for a missing product", async () => {
  const response = await get("/api/products/999");
  const data = await response.json();

  assert.equal(response.status, 404);
  assert.equal(data.error, "Product not found");
});

test("POST /api/cart/validate rejects requests without an API key", async () => {
  await serverReady;

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/cart/validate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: 1, quantity: 1 }] }),
    }
  );

  assert.equal(response.status, 401);
});

test("POST /api/cart/validate rejects an invalid cart payload", async () => {
  await serverReady;

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/cart/validate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify({ items: "not-an-array" }),
    }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Invalid cart payload",
  });
});

test("POST /api/cart/validate calculates a valid cart total", async () => {
  await serverReady;

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/cart/validate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify({ items: [{ id: 1, quantity: 1 }] }),
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.items[0].valid, true);
  assert.equal(data.items[0].quantity, 1);
  assert.equal(data.total, data.items[0].price);
});

test("POST /api/cart/validate rejects quantities exceeding stock", async () => {
  await serverReady;

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/cart/validate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TEST_API_KEY,
      },
      body: JSON.stringify({ items: [{ id: 1, quantity: 999 }] }),
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.items[0].valid, false);
  assert.equal(data.items[0].reason, "Insufficient stock");
  assert.equal(data.total, 0);
});
