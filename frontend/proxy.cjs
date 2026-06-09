const http = require('http');
const net = require('net');

const TARGET = 5000;
const PORT = 3000;

const server = http.createServer((req, res) => {
  const opts = {
    hostname: 'localhost',
    port: TARGET,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = http.request(opts, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res, { end: true });
  });
  proxy.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(proxy, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  const target = net.connect(TARGET, 'localhost', () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [k, v] of Object.entries(req.headers)) lines.push(`${k}: ${v}`);
    target.write(lines.join('\r\n') + '\r\n\r\n');
    if (head && head.length) target.write(head);
    socket.pipe(target);
    target.pipe(socket);
  });
  socket.on('error', () => target.destroy());
  target.on('error', () => socket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy: port ${PORT} → ${TARGET}`);
});
