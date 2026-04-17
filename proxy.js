const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`[PROXY] ${req.method} ${req.url}`);
  console.log(`[HEADERS] Content-Type: ${req.headers['content-type']}`);

  // Build target options.  When running local PHP server (port 3002),
  // forward `/api/*` requests there; otherwise fall back to live host.
  let options;
  if (req.url.startsWith('/api/')) {
    // forward to local php server if it's running
    options = {
      hostname: 'localhost',
      port: 3002,
      path: req.url,         // local server already serves at /api
      method: req.method,
      headers: {
        ...req.headers,
        host: 'localhost:3002'
      },
      rejectUnauthorized: false
    };
  } else {
    const targetPath = '/tasks-app' + req.url;
    options = {
      hostname: 'indiangroupofschools.com',
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: 'indiangroupofschools.com'
      },
      rejectUnauthorized: false
    };
  }

  const proxyReq = https.request(options, (proxyRes) => {
    console.log(`[RESPONSE] ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[ERROR]', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  // Forward the request body
  req.pipe(proxyReq);
});

const PORT = 3001;
server.listen(PORT, 'localhost', () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
  console.log(`   Forwarding to indiangroupofschools.com`);
});
