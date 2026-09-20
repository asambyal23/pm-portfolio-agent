/* Tiny zero-dependency static server for local preview: npm run dev */
import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const dist = join(root, 'dist');
// PORT=0 is valid (OS-assigned ephemeral port) — tests use it to avoid collisions.
const portRaw = process.env.PORT;
const port = portRaw && Number.isInteger(Number(portRaw)) && Number(portRaw) >= 0 ? Number(portRaw) : 8000;
const host = process.env.HOST || '127.0.0.1';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

const distReal = await realpath(dist).catch(() => dist);
const resolveSafe = async (urlPath) => {
  let p = decodeURIComponent(new URL(urlPath, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const joined = normalize(join(dist, p));
  const prefix = distReal.endsWith(sep) ? distReal : distReal + sep;
  // QA-found bug fix: a symlink INSIDE dist/ pointing OUTSIDE must be rejected.
  // realpath() follows the link, so compare the resolved path, not the lexical one.
  // (The old code OR-ed the lexical joined path, which let the link through.)
  const real = await realpath(joined).catch(() => null);
  if (!real) throw new Error('not-found');
  if (real !== distReal && !real.startsWith(prefix)) throw new Error('forbidden');
  return real;
};

const server = createServer(async (req, res) => {
  const noStore = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
  if (req.method === 'HEAD') {
    try {
      const file = await resolveSafe(req.url);
      const s = await stat(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': s.size, ...noStore });
      res.end();
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain', ...noStore });
      res.end();
    }
    return;
  }
  try {
    const file = await resolveSafe(req.url);
    const body = await readFile(file);
    const s = await stat(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': s.size, ...noStore });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain', ...noStore });
    res.end('404 — run `npm run build` first?');
  }
});
server.listen(port, host, () => {
  // With PORT=0 the OS picks; print the ACTUAL bound port so scripts can parse it.
  const bound = server.address().port;
  console.log(`Portfolio running at http://${host}:${bound}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✖ port ${port} in use — retry with PORT=8001 npm run dev`);
    process.exit(1);
  }
  throw err;
});
