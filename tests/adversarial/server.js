const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const BASE_DIR = __dirname;

const server = http.createServer((req, res) => {
    // Enable CORS for telemetry and cross-origin probes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsedUrl = url.parse(req.url, true);
    const isApiOrTelemetry = /^\/(metrics|analytics|collect|telemetry|log|api|track|ingest)/i.test(parsedUrl.pathname);

    // Handle any API or Telemetry endpoint (GET, POST, PUT)
    if (isApiOrTelemetry || req.method === 'POST' || req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'received',
                path: parsedUrl.pathname,
                query: parsedUrl.query,
                body: body
            }));
        });
        return;
    }

    if (req.method !== 'GET') {
        res.writeHead(405);
        return res.end('Method Not Allowed');
    }

    let safePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\' || !safePath) safePath = '/index.html';
    
    const filePath = path.join(BASE_DIR, safePath);
    
    if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    let extname = path.extname(filePath);
    let contentType = 'text/html';
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.css') contentType = 'text/css';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            let headers = { 'Content-Type': contentType };
            if (req.url.includes('csp-strict.html')) {
                headers['Content-Security-Policy'] = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline';";
            }
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => console.log('Harness running on http://localhost:8080'));
