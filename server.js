/* eslint-env node */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

app.use((req, _res, next) => {
  console.info(`[http] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

const licenses = new Set();
const users = new Map([["admin", "password"]]);

app.get('/api/licenses', (_req, res) => {
  res.json({ licenses: Array.from(licenses) });
});

app.post('/api/licenses', (req, res) => {
  const { key } = req.body || {};
  if (!key) {
    return res.status(400).json({ error: 'missing key' });
  }
  licenses.add(key);
  res.status(201).json({ key });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'missing credentials' });
  }
  const expected = users.get(username);
  if (expected && expected === password) {
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    return res.json({ token });
  }
  res.status(401).json({ error: 'invalid credentials' });
});

app.delete('/api/licenses/:key', (req, res) => {
  const { key } = req.params;
  if (licenses.delete(key)) {
    return res.json({ ok: true });
  }
  res.status(404).json({ error: 'not found' });
});

app.post('/api/licenses/verify', (req, res) => {
  const { key } = req.body || {};
  if (!key) {
    return res.status(400).json({ error: 'missing key' });
  }
  res.json({ valid: licenses.has(key) });
});

app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
