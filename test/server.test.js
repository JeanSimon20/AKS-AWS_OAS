const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

test('orbitcloud-landing: sirve el HTML del landing, sondas K8s y telemetria /api/runtime', async () => {
  const server = createServer({ version: '1.0.0', environment: 'test', silentLogs: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const homeRes = await fetch(`${baseUrl}/`);
    assert.equal(homeRes.status, 200);
    const html = await homeRes.text();
    assert.match(html, /Orbit<strong>Cloud<\/strong>/);

    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'UP');

    const runtimeRes = await fetch(`${baseUrl}/api/runtime`);
    assert.equal(runtimeRes.status, 200);
    const runtime = await runtimeRes.json();
    assert.equal(runtime.version, '1.0.0');
    assert.equal(runtime.environment, 'test');
    assert.ok(runtime.pod.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
