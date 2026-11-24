// Edvora backend: Express + MongoDB + JWT. Pipeline: submit -> AI mark -> integrity check -> teacher review -> release.
require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { Schema, model } = mongoose;
const SECRET = process.env.JWT_SECRET || 'dev_secret';
const Crit = [{ name: String, got: Number, max: Number }];

const User = model('User', new Schema({ name: String, uid: { type: String, unique: true }, password: String,
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' }, active: { type: Boolean, default: true } }));
const Task = model('Task', new Schema({ title: String, type: String, course: String, deadline: Date, marks: Number, question: String, reference: String,
  rubric: [{ name: String, max: Number }], teacher: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true }));
const Submission = model('Submission', new Schema({ task: { type: Schema.Types.ObjectId, ref: 'Task' }, student: { type: Schema.Types.ObjectId, ref: 'User' },
  mode: String, text: String, files: [String], ocrWords: [{ w: String, conf: Number }],
  ai: { criteria: Crit, total: Number, note: String },
  integrity: { aiContent: Number, similarity: Number, sharedErrors: [String], matches: [{ with: String, score: Number }] },
  status: { type: String, default: 'ai-graded' }, // pending | ai-graded | reviewed | flagged
  final: { total: Number, criteria: Crit, comment: String, tips: [String], topics: [String], released: Boolean }, decision: String }, { timestamps: true }));

// ---- AI helpers: call the Python service when AI_URL is set, else use simple heuristics ----
const tok = s => (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); const i = [...A].filter(x => B.has(x)).length; return i / ((A.size + B.size - i) || 1); };
async function remote(path, body) { if (!process.env.AI_URL) return null; try { const r = await fetch(process.env.AI_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.ok ? r.json() : null; } catch { return null; } }
async function aiGrade(task, text) {
  const r = await remote('/grade', { text, reference: task.reference, rubric: task.rubric }); if (r) return r;
  const sim = Math.min(1, jaccard(tok(text), tok(task.reference)) * 2.2); // stand-in for semantic embeddings
  const criteria = (task.rubric || []).map(c => ({ name: c.name, max: c.max, got: Math.round(c.max * Math.min(1, sim + .1)) }));
  return { criteria, total: criteria.reduce((s, c) => s + c.got, 0), note: 'Meaning match with reference: ' + Math.round(sim * 100) + '%' };
}
async function integrityCheck(task, sub) {
  const peers = await Submission.find({ task: task._id, _id: { $ne: sub._id } }).populate('student', 'uid');
  const mine = tok(sub.text), matches = [];
  for (const p of peers) { const s = jaccard(mine, tok(p.text)); if (s > .5) matches.push({ with: p.student.uid, score: +s.toFixed(2) }); }
  const vocab = new Set(tok(task.reference + ' ' + task.question));
  const shared = mine.filter(w => !vocab.has(w) && w.length > 4 && peers.some(p => tok(p.text).includes(w))); // rare words shared with peers (e.g. same misspelling)
  const r = await remote('/ai-detect', { text: sub.text });
  return { aiContent: r ? r.probability : Math.min(60, Math.round(new Set(mine).size / (mine.length || 1) * 30)),
    similarity: Math.round(Math.max(0, ...matches.map(m => m.score)) * 100), sharedErrors: [...new Set(shared)].slice(0, 5), matches }; // signals only
}

const app = express(); app.use(cors()); app.use(express.json({ limit: '15mb' }));
const sign = u => jwt.sign({ id: u._id, role: u.role }, SECRET, { expiresIn: '7d' });
const auth = (...roles) => (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').slice(7), SECRET); if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' }); next(); } catch { res.status(401).json({ error: 'Please log in' }); } };
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(500).json({ error: e.message }));

app.post('/api/auth/register', wrap(async (req, res) => { const { name, uid, password, role } = req.body;
  if (!name || !uid || !password) return res.status(400).json({ error: 'Name, ID and password are required' });
  if (await User.findOne({ uid })) return res.status(409).json({ error: 'This ID is already registered' });
  const u = await User.create({ name, uid, password: await bcrypt.hash(password, 10), role: role === 'teacher' ? 'teacher' : 'student' });
  res.json({ token: sign(u), user: { id: u._id, name, uid, role: u.role } }); }));
app.post('/api/auth/login', wrap(async (req, res) => { const u = await User.findOne({ uid: req.body.uid });
  if (!u || !u.active || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ error: 'Wrong ID or password' });
  res.json({ token: sign(u), user: { id: u._id, name: u.name, uid: u.uid, role: u.role } }); }));

app.get('/api/tasks', auth(), wrap(async (req, res) => res.json(await Task.find().sort('-createdAt'))));
app.post('/api/tasks', auth('teacher'), wrap(async (req, res) => res.json(await Task.create({ ...req.body, teacher: req.user.id }))));
app.post('/api/rubric/generate', auth('teacher'), wrap(async (req, res) => { const r = await remote('/rubric', req.body); const m = +req.body.marks || 10, a = Math.round(m * .4), b = Math.round(m * .3);
  res.json(r || [{ name: 'Concept accuracy', max: a }, { name: 'Terminology', max: b }, { name: 'Completeness', max: m - a - b }]); }));

app.post('/api/submissions', auth('student'), wrap(async (req, res) => { const task = await Task.findById(req.body.task);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.deadline && new Date() > task.deadline) return res.status(400).json({ error: 'The deadline has passed' });
  const sub = await Submission.findOne({ task: task._id, student: req.user.id }) || new Submission({ task: task._id, student: req.user.id }); // resubmit allowed before deadline
  let text = req.body.text || '', ocrWords = [];
  if (req.body.mode === 'scan') { const o = await remote('/ocr', { files: req.body.files }); if (o) { text = o.text; ocrWords = o.words; } } // handwriting OCR service
  Object.assign(sub, { mode: req.body.mode, text, files: req.body.files || [], ocrWords }); await sub.save();
  sub.ai = await aiGrade(task, text); sub.integrity = await integrityCheck(task, sub);
  sub.status = sub.integrity.similarity > 70 || sub.integrity.sharedErrors.length ? 'flagged' : 'ai-graded'; await sub.save(); res.json({ ok: true, id: sub._id }); }));
app.get('/api/submissions/mine', auth('student'), wrap(async (req, res) => { // students only ever see approved marks
  const subs = await Submission.find({ student: req.user.id }).populate('task', 'title course marks');
  res.json(subs.map(s => ({ _id: s._id, task: s.task, status: s.status, result: s.final && s.final.released ? s.final : null }))); }));

app.get('/api/tasks/:id/submissions', auth('teacher'), wrap(async (req, res) => res.json(await Submission.find({ task: req.params.id }).populate('student', 'name uid'))));
app.put('/api/submissions/:id/review', auth('teacher'), wrap(async (req, res) => { const { criteria, comment, tips, topics, action } = req.body; const s = await Submission.findById(req.params.id);
  const c = criteria || s.ai.criteria; s.final = { criteria: c, total: c.reduce((t, x) => t + x.got, 0), comment, tips, topics, released: true };
  s.status = 'reviewed'; s.decision = action === 'override' ? 'overridden' : 'approved'; await s.save(); res.json(s); }));
app.put('/api/submissions/:id/integrity', auth('teacher'), wrap(async (req, res) => res.json(await Submission.findByIdAndUpdate(req.params.id,
  { decision: req.body.decision, status: req.body.decision === 'dismissed' ? 'ai-graded' : 'flagged' }, { new: true }))));
app.get('/api/analytics', auth('teacher'), wrap(async (req, res) => { const subs = await Submission.find({ 'final.released': true });
  const dist = [0, 0, 0, 0, 0]; subs.forEach(s => dist[Math.min(4, Math.floor(s.final.total / 2))]++);
  const t = {}; subs.forEach(s => (s.final.topics || []).forEach(x => t[x] = (t[x] || 0) + 1));
  res.json({ pending: await Submission.countDocuments({ status: 'ai-graded' }), flagged: await Submission.countDocuments({ status: 'flagged' }), distribution: dist,
    weakTopics: Object.entries(t).sort((a, b) => b[1] - a[1]).map(([topic, count]) => ({ topic, count })) }); }));
app.get('/api/users', auth('admin'), wrap(async (req, res) => res.json(await User.find().select('-password'))));
app.put('/api/users/:id', auth('admin'), wrap(async (req, res) => res.json(await User.findByIdAndUpdate(req.params.id, { active: req.body.active }, { new: true }))));

async function seed() { await User.deleteMany(); const h = await bcrypt.hash('password', 10);
  await User.create([{ name: 'Muhammad Rauf Akbar', uid: '23-arid-561', password: h }, { name: 'Ms. Nergis Abbasi', uid: 'T-001', password: h, role: 'teacher' }, { name: 'Admin', uid: 'A-001', password: h, role: 'admin' }]);
  console.log('Seeded 23-arid-561 (student), T-001 (teacher), A-001 (admin); password: password'); }
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edvora').then(async () => {
  if (process.argv.includes('--seed')) { await seed(); process.exit(); }
  app.listen(process.env.PORT || 5000, () => console.log('Edvora API on :' + (process.env.PORT || 5000))); }).catch(e => console.error('MongoDB error:', e.message));
