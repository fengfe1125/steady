// Loopback-only evidence sink for the one-frame QA page. No product resources are written.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const args = process.argv.slice(2), flag = args.indexOf('--out');
if (flag < 0 || !args[flag + 1] || args[flag + 1].startsWith('--')) throw new Error('--out <evidence directory> is required');
const directory = path.resolve(args[flag + 1]), origin = 'http://127.0.0.1:8777';
fs.mkdirSync(directory, {recursive: true});
const respond = (res, status, data) => {
  res.writeHead(status, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'});
  res.end(JSON.stringify(data));
};
http.createServer(async (req, res) => {
  if (req.headers.origin !== origin) return respond(res, 403, {error: 'Only the local QA origin is allowed'});
  if (req.method === 'OPTIONS') return respond(res, 204, {});
  if (req.method !== 'POST' || !['/report', '/screenshot'].includes(req.url)) return respond(res, 404, {error: 'Unknown evidence route'});
  try {
    let length = 0, chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 8 * 1024 * 1024) throw new Error('Evidence exceeds 8 MiB');
      chunks.push(chunk);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    let file, bytes;
    if (req.url === '/report') {
      if (value.schema !== 1 || !Array.isArray(value.results) || !Number.isInteger(value.processedPages) ||
          value.results.length !== value.processedPages || !Number.isFinite(Date.parse(value.checkedAt))) throw new Error('Invalid runtime report');
      file = `runtime-${value.checkedAt.replace(/[^0-9TZ]/g, '-')}-${value.processedPages}.json`;
      bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    } else {
      if (typeof value.base64 !== 'string') throw new Error('Missing screenshot bytes');
      bytes = Buffer.from(value.base64, 'base64');
      const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpg = bytes[0] === 255 && bytes[1] === 216;
      if (!png && !jpg) throw new Error('Expected an actual PNG or JPEG screenshot');
      file = `runtime-ui-${new Date().toISOString().replace(/[^0-9TZ]/g, '-')}.${png ? 'png' : 'jpg'}`;
    }
    const saved = path.join(directory, file);
    fs.writeFileSync(saved, bytes, {flag: 'wx'});
    if (req.url === '/report') fs.writeFileSync(path.join(directory, 'latest.json'), bytes);
    const receipt = {path: saved, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
    if (req.url === '/screenshot') fs.writeFileSync(saved + '.json', JSON.stringify(receipt, null, 2) + '\n');
    respond(res, 201, receipt);
  } catch (error) { respond(res, 400, {error: String(error.message || error)}); }
}).listen(8778, '127.0.0.1', () => console.log(`Runtime evidence sink: ${directory}`));
