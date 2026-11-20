const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createServer(customConfig = {}) {
  const publicDir = path.join(__dirname, 'public');
  const podName = os.hostname();
  const startedAt = new Date().toISOString();
  let requestCounter = 0;

  const config = {
    version: customConfig.version || process.env.APP_VERSION || '1.0.0',
    environment: customConfig.environment || process.env.APP_ENV || process.env.NODE_ENV || 'local',
    bannerMessage:
      customConfig.bannerMessage ||
      process.env.BANNER_MESSAGE ||
      'Despliegue Cloud-Native listo para Amazon ECR y Kubernetes',
    silentLogs: Boolean(customConfig.silentLogs)
  };

  const server = http.createServer((req, res) => {
    const startNs = process.hrtime.bigint();
    requestCounter += 1;

    // Cabeceras de seguridad DevSecOps + identificacion del Pod
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Served-By-Pod', podName);

    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    const pathname = parsedUrl.pathname;

    const finishJson = (statusCode, payload) => {
      const body = JSON.stringify(payload);
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(body);
    };

    res.on('finish', () => {
      if (!config.silentLogs) {
        const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'orbitcloud-landing',
            pod: podName,
            version: config.version,
            method: req.method,
            path: pathname,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2))
          })
        );
      }
    });

    // Sondas para Kubernetes (livenessProbe / readinessProbe)
    if (pathname === '/healthz') {
      return finishJson(200, {
        status: 'UP',
        pod: podName,
        uptimeSeconds: Math.floor(process.uptime())
      });
    }

    if (pathname === '/readyz') {
      return finishJson(200, {
        status: 'READY',
        pod: podName,
        version: config.version
      });
    }

    // Endpoint para demostrar en vivo la orquestacion y balanceo de Pods en Kubernetes
    if (pathname === '/api/runtime') {
      return finishJson(200, {
        app: 'OrbitCloud Landing',
        pod: podName,
        version: config.version,
        environment: config.environment,
        bannerMessage: config.bannerMessage,
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt,
        podRequestsHandled: requestCounter,
        timestamp: new Date().toISOString()
      });
    }

    // Servir archivos estaticos del Frontend de forma segura (sin Path Traversal)
    const relativeTarget = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const safePath = path.normalize(path.join(publicDir, relativeTarget));

    if (!safePath.startsWith(publicDir)) {
      return finishJson(403, { error: 'FORBIDDEN' });
    }

    fs.readFile(safePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return finishJson(404, { error: 'NOT_FOUND', path: pathname });
        }
        return finishJson(500, { error: 'INTERNAL_ERROR' });
      }
      const ext = path.extname(safePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
      });
      return res.end(content);
    });
  });

  return server;
}

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  const server = createServer();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'orbitcloud-landing',
        pod: os.hostname(),
        message: `Frontend Landing disponible en http://localhost:${PORT}`
      })
    );
  });

  const shutdown = (signal) => {
    console.log(`Señal ${signal} recibida. Cerrando servidor limpiamente...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { createServer };
