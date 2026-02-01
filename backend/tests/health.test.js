const request = require("supertest");
const express = require("express");

// Create a minimal test app with basic health endpoint
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'test'
    });
  });
  
  return app;
};

describe("Health endpoints", () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });

  it("returns ok on /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it("includes uptime in health response", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
