import React, { useState, useEffect, useRef, useCallback } from 'react'

/* ============================================================
   API (falls back to demo data when backend is offline)
   ============================================================ */
const API = import.meta.env.VITE_API || 'http://localhost:5000/api'
const call = async (path, method = 'GET', body) => {
  try {
    const r = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('edvora_token') || localStorage.getItem('aiq_token') || '') },
      body: body && JSON.stringify(body)
    })
    const d = await r.json()
    return r.ok ? d : { error: d.error || 'Something went wrong' }
  } catch { return null } // null = offline
}

/* ============================================================
   DEMO DATA
   ============================================================ */
const D = {
  tasks: [
    { id: 1, title: 'Quiz 4: Queues', type: 'Quiz', course: 'Data Structures', due: 2, marks: 10, status: 'open' },
    { id: 2, title: 'Lab 5: Binary Trees', type: 'Lab', course: 'Data Structures', due: 5, marks: 20, status: 'open' },
    { id: 3, title: 'Assignment 3: Sorting', type: 'Assignment', course: 'Algorithms', due: 9, marks: 15, status: 'open' },
    { id: 4, title: 'Quiz 3: Stacks', type: 'Quiz', course: 'Data Structures', due: -3, marks: 10, status: 'graded' }
  ],
  results: [{
    task: 'Quiz 3: Stacks', total: 7, max: 10,
    criteria: [['Concept accuracy', 3, 4], ['Terminology', 2, 3], ['Completeness', 2, 3]],
    comment: 'Good explanation of LIFO. Mention time complexity of push and pop next time.',
    tips: ['Revise Big-O notation for stack operations.', 'Practise writing key terms such as push and pop carefully.'],
    topics: ['Big-O notation', 'Linked list implementation']
  }],
  trend: [58, 64, 61, 72, 70, 78, 74],
  trendLabels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7'],
  topics: [['Stacks', 82], ['Queues', 71], ['Linked lists', 55], ['Big-O notation', 48], ['Recursion', 44]],
  subs: [
    { id: 1, uid: '23-arid-561', status: 'ai-graded', text: 'A stack is a linear data structure that follows the LIFO principle. Elements are added using pussh and removed using pop. A stack can be implemented with an array or a linked list.', low: ['pussh'], med: ['LIFO', 'linked list'], crit: [['Concept accuracy', 3, 4], ['Terminology', 2, 3], ['Completeness', 2, 3]], ai: 18, flag: 1 },
    { id: 2, uid: '23-arid-558', status: 'flagged', text: 'A stack follows pussh and pop. It is used in undo operations.', low: ['pussh'], med: ['undo operations'], crit: [['Concept accuracy', 2, 4], ['Terminology', 2, 3], ['Completeness', 1, 3]], ai: 34, flag: 2 },
    { id: 3, uid: '23-arid-571', status: 'reviewed', text: 'Stack is LIFO. Push adds, pop removes the top element.', low: [], med: [], crit: [['Concept accuracy', 4, 4], ['Terminology', 3, 3], ['Completeness', 2, 3]], ai: 6, flag: 0 }
  ],
  dist: [2, 5, 11, 8, 4],
  misc: ['Many students confuse stack LIFO order with queue FIFO order.', 'Time complexity of push and pop is often omitted.']
}

/* ============================================================
   SVG ICONS
   ============================================================ */
const PATHS = {
  home:    'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  list:    'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  upload:  'M12 16V4m0 0l-4 4m4-4l4 4M4 20h16',
  star:    'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  chart:   'M4 20V10m6 10V4m6 16v-7m5 7H3',
  plus:    'M12 5v14M5 12h14',
  inbox:   'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
  shield:  'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  clock:   'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  users:   'M16 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 15c2.5 0 4 1.5 4 4',
  check:   'M5 12l5 5 9-10',
  logout:  'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  bell:    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  menu:    'M4 6h16M4 12h16M4 18h16',
  close:   'M6 18L18 6M6 6l12 12',
  student: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  teacher: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  ai:      'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1',
  flag:    'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
  tip:     'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  export:  'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  eye:     'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  scan:    'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
  code:    'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  type:    'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  approve: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warn:    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  trash:   'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  drag:    'M4 8h16M4 16h16',
}

const Ic = ({ n, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]} />
  </svg>
)

/* ============================================================
   SMALL REUSABLE COMPONENTS
   ============================================================ */

function Badge({ children, variant = 'blue' }) {
  return (
    <span className={`badge ${variant}`}>{children}</span>
  )
}

function TaskTypeBadge({ type }) {
  return <Badge variant="blue">{type}</Badge>
}

function StatusBadge({ status }) {
  const map = {
    'ai-graded': ['Graded', 'blue'],
    'flagged':   ['Flagged', 'blue'],
    'reviewed':  ['Reviewed', 'blue'],
    'open':      ['Open', 'blue'],
    'graded':    ['Graded', 'blue'],
    'pending':   ['Pending', 'gray'],
  }
  const [label, variant] = map[status] || [status, 'gray']
  return <Badge variant={variant}>{label}</Badge>
}

function DueBadge({ days }) {
  if (days < 0) return <Badge variant="gray">Closed</Badge>
  if (days === 0) return <Badge variant="blue">Due today</Badge>
  if (days <= 2) return <Badge variant="blue">Due in {days}d</Badge>
  return <Badge variant="blue">Due in {days} days</Badge>
}

function ProgressBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.round(value / max * 100))
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: pct + '%' }} />
    </div>
  )
}

function ProgressRow({ label, value, max = 100 }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div className="progress-label-row">
        <span className="progress-label">{label}</span>
        <span className="progress-value">{value}{typeof max === 'number' && max !== 100 ? ` / ${max}` : '%'}</span>
      </div>
      <ProgressBar value={value} max={max} />
    </div>
  )
}

/* ============================================================
   SVG CHARTS
   ============================================================ */

function BarChart({ data, labels }) {
  const max = Math.max(...data, 1)
  const W = 320, H = 160
  const barW = 40, gap = (W - 20 - data.length * barW) / (data.length - 1 || 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {data.map((v, i) => {
        const x = 10 + i * (barW + gap)
        const barH = Math.max(4, (v / max) * 110)
        const y = 125 - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="#0f3b7a" />
            <text x={x + barW / 2} y={148} textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="Inter, sans-serif">{labels[i]}</text>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#000000" fontFamily="Space Grotesk, sans-serif">{v}</text>
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ data, labels }) {
  const max = Math.max(...data), minVal = Math.min(...data) - 5
  const range = max - minVal || 1
  const W = 340, H = 140, padL = 30, padR = 10, padT = 15, padB = 30
  const iW = W - padL - padR, iH = H - padT - padB
  const pts = data.map((v, i) => [padL + (i / (data.length - 1)) * iW, padT + (1 - (v - minVal) / range) * iH])
  const pathD = pts.map((p, i) => (i === 0 ? `M` : `L`) + `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaD = pathD + ` L${pts.at(-1)[0].toFixed(1)},${padT + iH} L${padL},${padT + iH} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f3b7a" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0f3b7a" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={padT + t * iH} y2={padT + t * iH}
          stroke="#E2E8F0" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '4 3'} />
      ))}
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="#0f3b7a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4.5" fill="#ffffff" stroke="#0f3b7a" strokeWidth="2.5" />
          {labels && <text x={p[0]} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#64748B" fontFamily="Inter">{labels[i]}</text>}
          <title>{data[i]}%</title>
        </g>
      ))}
    </svg>
  )
}

function RingChart({ value, max, label }) {
  const r = 54, c = 2 * Math.PI * r
  const pct = value / max
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 140 140" width="140" style={{ overflow: 'visible' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#0f3b7a" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 70 70)" />
        <text x="70" y="66" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="26" fontWeight="700" fill="#0f3b7a">{value}</text>
        <text x="70" y="82" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#64748B">of {max}</text>
      </svg>
      {label && <div className="ring-label">{label}</div>}
    </div>
  )
}

/* ============================================================
   TOAST SYSTEM
   ============================================================ */

function Toast({ message, type = 'default' }) {
  if (!message) return null
  const icon = type === 'success' ? 'check' : type === 'error' ? 'warn' : 'info'
  return (
    <div className="toast-container">
      <div className={`toast ${type !== 'default' ? type : ''}`}>
        <Ic n={icon} size={16} />
        {message}
      </div>
    </div>
  )
}

/* ============================================================
   LANDING PAGE
   ============================================================ */

function Landing({ onLoginClick }) {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img src="/logo.png" alt="Edvora" />
          <span>Edvora</span>
        </div>
        <div className="landing-nav-cta">
          <button className="btn-ghost" onClick={() => onLoginClick('student')}>Student Login</button>
          <button className="btn pri" onClick={() => onLoginClick('teacher')}>Teacher Login</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            Academic Assessment Platform
          </div>

          <h1 className="hero-title">
            Grade Smarter.<br />
            <span className="blue-text">Fair &amp; Objective.</span>
          </h1>

          <p className="hero-sub">
            Edvora provides a structured, clear assessment workflow for typed, handwritten, and code submissions — 
            with teachers in full control of every mark.
          </p>

          <div className="hero-cta-group">
            <button className="btn-hero-primary" onClick={() => onLoginClick('student')}>
              <Ic n="student" size={18} />
              Student Portal
            </button>
            <button className="btn-hero-secondary" onClick={() => onLoginClick('teacher')}>
              <Ic n="teacher" size={18} />
              Teacher Portal
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="section-label">
          <div className="eyebrow">Features</div>
          <h2>Everything you need for academic assessment</h2>
          <p>Built for clarity, speed, and academic integrity.</p>
        </div>
        <div className="features-grid">
          {[
            { icon: 'shield', title: 'Rubric Assessment', desc: 'Standardized rubric-based scoring across typed, scanned, and code submissions.' },
            { icon: 'shield', title: 'Integrity Verification', desc: 'Check for plagiarism, shared errors, and anomalous patterns with full teacher oversight.' },
            { icon: 'tip', title: 'Detailed Feedback', desc: 'Criterion-by-criterion marks, actionable feedback notes, and topic revision guidance.' },
            { icon: 'chart', title: 'Performance Analytics', desc: 'Score distributions, class averages, and topic trends to help educators optimize teaching.' },
            { icon: 'scan', title: 'Handwritten Work', desc: 'Students can scan handwritten solutions with extracted text preview for easy review.' },
            { icon: 'users', title: 'Dedicated Portals', desc: 'Separate, focused dashboards for students and faculty with complete submission logs.' },
          ].map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon"><Ic n={f.icon} size={22} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how">
        <div className="section-label">
          <div className="eyebrow">Workflow</div>
          <h2>How Edvora works</h2>
          <p>From task setup to final results in four simple steps.</p>
        </div>
        <div className="how-grid">
          {[
            { n: '01', title: 'Teacher creates task', desc: 'Define questions, specify deadlines, and establish clear rubric criteria.' },
            { n: '02', title: 'Students submit', desc: 'Upload typed answers, code solutions, or scanned handwritten assignments.' },
            { n: '03', title: 'Rubric evaluation', desc: 'Submissions are mapped against rubric criteria with automated consistency checks.' },
            { n: '04', title: 'Teacher approves', desc: 'Review, modify scores, add direct feedback, and release marks to students.' },
          ].map(s => (
            <div className="how-step" key={s.n}>
              <div className="how-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="footer-brand-col">
            <div className="landing-logo footer-logo">
              <img src="/logo.png" alt="Edvora" />
              <span>Edvora</span>
            </div>
            <p className="footer-brand-text">
              A modern, unified academic assessment platform designed for educators and students.
              Streamlined evaluation for typed, handwritten, and code submissions.
            </p>
          </div>

          <div className="footer-demo-col">
            <div className="footer-demo-title">Active Demo Credentials</div>
            <div className="footer-demo-cards">
              <div className="footer-demo-card">
                <div className="demo-role-tag">Teacher Portal</div>
                <div className="demo-user-name">Ms. Nergis Abbasi</div>
                <div className="demo-user-details">
                  <span>ID: <code>T-001</code></span>
                  <span>Pass: <code>password</code></span>
                </div>
              </div>
              <div className="footer-demo-card">
                <div className="demo-role-tag">Student Portal</div>
                <div className="demo-user-name">Muhammad Rauf Akbar</div>
                <div className="demo-user-details">
                  <span>ID: <code>23-arid-561</code></span>
                  <span>Pass: <code>password</code></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>&copy; {new Date().getFullYear()} Edvora — Academic Assessment Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

/* ============================================================
   AUTH PAGE
   ============================================================ */

function Auth({ initialRole = 'student', onAuth }) {
  const [role, setRole] = useState(initialRole)
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', uid: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const tryDemo = () => {
    onAuth({
      name: role === 'teacher' ? 'Ms. Nergis Abbasi' : 'Muhammad Rauf Akbar',
      uid: role === 'teacher' ? 'T-001' : '23-arid-561',
      role
    })
  }

  const submit = async e => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const r = await call(isRegister ? '/auth/register' : '/auth/login', 'POST', { ...form, role })
    setLoading(false)
    if (!r) return setErr('Server is offline. Use "Try Demo" to explore with sample data.')
    if (r.error) return setErr(r.error)
    localStorage.setItem('edvora_token', r.token)
    onAuth(r.user)
  }

  return (
    <div className="auth-page">
      {/* Left branding panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo">
            <img src="/logo.png" alt="Edvora" />
            <div className="auth-logo-name">Edvora</div>
          </div>

          <h1>Academic assessment,<br />made simple.</h1>
          <p className="sub">
            Rubric evaluation, integrity verification, and detailed feedback.
            Typed, handwritten, and code submissions — in one unified platform.
          </p>

          <div className="auth-features">
            {[
              { icon: 'shield', title: 'Rubric Scoring', desc: 'Consistent criteria-based evaluation for all tasks.' },
              { icon: 'shield', title: 'Integrity Checks', desc: 'Comprehensive checks for plagiarism and code clones.' },
              { icon: 'tip', title: 'Direct Feedback', desc: 'Clear scores and guidance for student improvement.' },
              { icon: 'chart', title: 'Performance Analytics', desc: 'Meaningful class trends and learning insights.' },
            ].map(f => (
              <div className="auth-feature" key={f.title}>
                <div className="auth-feature-icon"><Ic n={f.icon} size={18} /></div>
                <div className="auth-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{isRegister ? 'Create account' : 'Sign In'}</h2>
            <p>{isRegister ? 'Register your AssessIQ account.' : 'Sign in to access your portal.'}</p>
          </div>

          {/* Role selector */}
          <div className="role-selector" style={{ marginBottom: '1.2rem' }}>
            {['student', 'teacher'].map(r => (
              <label className="role-option" key={r}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                <span className="role-label">
                  <Ic n={r === 'student' ? 'student' : 'teacher'} size={16} />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </span>
              </label>
            ))}
          </div>

          <form onSubmit={submit}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" placeholder="Muhammad Rauf Akbar" value={form.name} onChange={set('name')} required />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">University ID or Email</label>
              <input type="text" placeholder={role === 'teacher' ? 'T-001' : '23-arid-561'}
                value={form.uid} onChange={set('uid')} required />
            </div>

            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
            </div>

            {err && (
              <div className="error-msg" style={{ marginBottom: '1rem' }}>
                <Ic n="warn" size={15} />
                {err}
              </div>
            )}

            <button type="submit" className="btn pri full lg" disabled={loading}>
              {loading ? 'Signing in…' : (isRegister ? 'Create account' : 'Sign in')}
            </button>

            <div className="auth-divider">or</div>

            <button type="button" className="btn full" onClick={tryDemo}>
              Demo as a {role}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to Edvora?'}
            {' '}
            <a href="#" onClick={e => { e.preventDefault(); setIsRegister(!isRegister) }}>
              {isRegister ? 'Sign in' : 'Create account'}
            </a>
          </div>

          <div style={{ marginTop: '1.2rem', padding: '0.85rem 1rem', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--mut)' }}>
            <strong style={{ color: 'var(--ink)' }}>Demo credentials</strong><br />
            Student: <code>23-arid-561</code> / <code>password</code> (Muhammad Rauf Akbar)<br />
            Teacher: <code>T-001</code> / <code>password</code> (Ms. Nergis Abbasi)
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   SHELL (Authenticated Layout)
   ============================================================ */

const NAV_ITEMS = {
  student: [
    ['dash', 'Dashboard', 'home'],
    ['tasks', 'My Tasks', 'list'],
    ['submit', 'Submit Work', 'upload'],
    ['results', 'Results', 'star'],
    ['progress', 'Progress', 'chart'],
  ],
  teacher: [
    ['dash', 'Dashboard', 'home'],
    ['create', 'Create Task', 'plus'],
    ['review', 'Submissions', 'inbox'],
    ['integrity', 'Integrity', 'shield'],
    ['analytics', 'Analytics', 'chart'],
  ]
}

const PAGE_TITLES = {
  dash: 'Dashboard', tasks: 'My Tasks', submit: 'Submit Work',
  results: 'Results', progress: 'Progress', create: 'Create Task',
  review: 'Submissions', integrity: 'Integrity Check', analytics: 'Analytics',
}

function Shell({ user, children, page, setPage, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const nav = NAV_ITEMS[user.role]
  const initials = user.name ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('') : '?'

  return (
    <div className="shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Edvora" />
          <span className="sidebar-logo-text">Edvora</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {nav.map(([k, label, icon]) => (
            <button key={k}
              className={`nav-item${page === k ? ' active' : ''}`}
              onClick={() => { setPage(k); setSidebarOpen(false) }}
              aria-current={page === k ? 'page' : undefined}
            >
              <Ic n={icon} size={18} />
              {label}
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: '0.5rem' }}>Account</div>
          <button className="nav-item" onClick={onLogout}>
            <Ic n="logout" size={18} />
            Log out
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.uid} · {user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="main-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu">
              <Ic n={sidebarOpen ? 'close' : 'menu'} size={20} />
            </button>
            <span className="topbar-title">{PAGE_TITLES[page]}</span>
          </div>
          <div className="topbar-actions">
            <button className="topbar-notification" aria-label="Notifications">
              <Ic n="bell" size={17} />
            </button>
            <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.85rem', borderRadius: 8, cursor: 'default' }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="main-body">
          {children}
        </main>
      </div>
    </div>
  )
}

/* ============================================================
   STUDENT PAGES
   ============================================================ */

/* -- Dashboard -- */
function StudentDash({ go, user }) {
  const open = D.tasks.filter(t => t.status === 'open')

  return (
    <>
      {/* Welcome hero */}
      <div className="welcome-hero">
        <div className="welcome-hero-content">
          <div className="welcome-eyebrow">Academic Portal</div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p>You have <strong>{open.length} open tasks</strong>. Quiz 4 is due in 2 days.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn pri" onClick={() => go('submit')}>
              <Ic n="upload" size={16} />
              Submit Work
            </button>
            <button className="btn" onClick={() => go('tasks')}>
              View All Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid g4" style={{ marginBottom: '1.2rem' }}>
        {[
          { icon: 'list', label: 'Open Tasks', value: open.length, variant: 'blue' },
          { icon: 'star', label: 'Average Score', value: '74%', variant: 'blue' },
          { icon: 'check', label: 'Submitted', value: '12', variant: 'blue' },
          { icon: 'clock', label: 'Next Deadline', value: '2 days', variant: 'blue' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <div className={`stat-icon ${s.variant}`}><Ic n={s.icon} size={22} /></div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid g21" style={{ marginBottom: '1.2rem' }}>
        {/* Upcoming tasks */}
        <div className="card">
          <h2>Upcoming Deadlines</h2>
          {open.map(t => (
            <div className="list-row" key={t.id}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.93rem' }}>{t.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--mut)', marginTop: '0.1rem' }}>
                  {t.course} · {t.marks} marks
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <DueBadge days={t.due} />
                <button className="btn sm ghost-blue" onClick={() => go('submit')}>Submit</button>
              </div>
            </div>
          ))}
        </div>

        {/* Latest result */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ alignSelf: 'flex-start' }}>Latest Result</h2>
          <RingChart value={7} max={10} label="Quiz 3: Stacks" />
          <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
            <Badge variant="blue">Approved by teacher</Badge>
          </div>
          <button className="btn sm ghost-blue" style={{ marginTop: '0.9rem' }} onClick={() => go('results')}>
            View full feedback
          </button>
        </div>
      </div>

      <div className="grid g2">
        {/* Score trend */}
        <div className="card">
          <h2>Performance Over Time</h2>
          <LineChart data={D.trend} labels={D.trendLabels} />
        </div>

        {/* Topics to revise */}
        <div className="card">
          <h2>Topics to Revise</h2>
          {D.topics.slice(2).map(([t, v]) => (
            <ProgressRow key={t} label={t} value={v} />
          ))}
        </div>
      </div>
    </>
  )
}

/* -- My Tasks -- */
function StudentTasks({ go }) {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Quiz', 'Assignment', 'Lab']
  const list = D.tasks.filter(t => filter === 'All' || t.type === filter)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Tasks</h1>
          <div style={{ color: 'var(--mut)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            {D.tasks.length} tasks · {D.tasks.filter(t => t.status === 'open').length} open
          </div>
        </div>
      </div>

      <div className="tab-bar">
        {filters.map(f => (
          <button key={f} className={`tab-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="grid g3">
        {list.map(t => (
          <div className="task-card" key={t.id}>
            <div className="task-card-header">
              <TaskTypeBadge type={t.type} />
              <DueBadge days={t.due} />
            </div>
            <div>
              <div className="task-title">{t.title}</div>
              <div className="task-meta" style={{ marginTop: '0.4rem' }}>
                <Ic n="list" size={13} />
                {t.course}
                <span>·</span>
                <Ic n="star" size={13} />
                {t.marks} marks
              </div>
            </div>
            <div className="task-card-footer">
              <StatusBadge status={t.status} />
              {t.status === 'open'
                ? <button className="btn sm pri" onClick={() => go('submit')}>Submit <Ic n="upload" size={13} /></button>
                : <button className="btn sm ghost-blue" onClick={() => go('results')}>View Result</button>
              }
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* -- Submit Work -- */
function StudentSubmit({ toast }) {
  const [mode, setMode] = useState('type')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [over, setOver] = useState(false)
  const fileRef = useRef()

  const addFiles = fl => setFiles(x => [
    ...x,
    ...[...fl].filter(f => f.size < 10e6).map(f => ({
      name: f.name,
      preview: f.type.startsWith('image') ? URL.createObjectURL(f) : null
    }))
  ])

  const send = async () => {
    const r = await call('/submissions', 'POST', { task: 1, mode, text, files: files.map(f => f.name) })
    toast(r && r.error ? r.error : 'Submitted! You can resubmit until the deadline.', 'default')
  }

  const modes = [
    { key: 'type', label: 'Type Answer', icon: 'type' },
    { key: 'code', label: 'Upload Code', icon: 'code' },
    { key: 'scan', label: 'Handwritten', icon: 'scan' },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">Data Structures › Quiz 4</div>
          <h1>Submit Your Answer</h1>
        </div>
        <DueBadge days={2} />
      </div>

      {/* Task instructions */}
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ color: 'var(--blue)', marginTop: '2px' }}><Ic n="info" size={18} /></div>
          <div>
            <h3 style={{ marginBottom: '0.4rem', color: 'var(--ink)', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.95rem' }}>Instructions</h3>
            <p style={{ color: 'var(--mut)', fontSize: '0.9rem' }}>
              Explain how a queue works and give one use case. You may type, upload code, or upload scans of handwritten pages. You can resubmit until the deadline.
            </p>
          </div>
        </div>
      </div>

      <div className="grid g21" style={{ marginBottom: '1.2rem' }}>
        <div>
          {/* Mode selector */}
          <div className="submit-mode-selector">
            {modes.map(m => (
              <button key={m.key} className={`submit-mode-btn${mode === m.key ? ' active' : ''}`} onClick={() => setMode(m.key)}>
                <div className={`mode-icon${mode === m.key ? ' active' : ''}`}><Ic n={m.icon} size={20} /></div>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Type mode */}
          {mode === 'type' && (
            <textarea
              rows={10}
              placeholder="Write your answer here…"
              value={text}
              onChange={e => setText(e.target.value)}
              aria-label="Your answer"
              style={{ borderRadius: 12, padding: '1rem 1.1rem', fontSize: '0.95rem', lineHeight: 1.7 }}
            />
          )}

          {/* Code mode */}
          {mode === 'code' && (
            <textarea
              rows={10}
              className="code-area"
              placeholder="# Paste your code here…"
              value={text}
              onChange={e => setText(e.target.value)}
              aria-label="Your code"
            />
          )}

          {/* Scan mode */}
          {mode === 'scan' && (
            <div>
              <div
                className={`dropzone${over ? ' over' : ''}`}
                onDragOver={e => { e.preventDefault(); setOver(true) }}
                onDragLeave={() => setOver(false)}
                onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files) }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="drop-icon"><Ic n="scan" size={28} /></div>
                <h3>Drag &amp; drop your scans here</h3>
                <p>JPG, PNG or PDF, up to 10 MB each</p>
                <button className="btn ghost-blue" style={{ marginTop: '1rem' }} type="button">Browse files</button>
                <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf" onChange={e => addFiles(e.target.files)} />
              </div>

              {files.length > 0 && (
                <div className="file-thumbs" style={{ marginTop: '1rem' }}>
                  {files.map((f, i) => (
                    <div className="file-thumb" key={i}>
                      {f.preview ? <img src={f.preview} alt={f.name} /> : (
                        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--blue)' }}>
                          <Ic n="scan" size={28} />
                        </div>
                      )}
                      <div className="file-thumb-info">
                        <div className="file-thumb-name">{f.name}</div>
                        <Badge variant="blue">Ready</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.1rem' }}>
            <button className="btn" onClick={() => toast('Draft saved', 'default')}>Save Draft</button>
            <button className="btn pri" onClick={send}>
              <Ic n="upload" size={16} />
              Submit
            </button>
          </div>
        </div>

        {/* Rubric sidebar */}
        <div className="card">
          <h2>Rubric Criteria</h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--mut)', marginBottom: '1rem' }}>Submissions are evaluated against these criteria.</p>
          {[['Concept accuracy', 4], ['Terminology', 3], ['Completeness', 3]].map(([name, max]) => (
            <div key={name} className="list-row">
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{name}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue)' }}>{max} pts</span>
            </div>
          ))}
          <div className="info-note">
            <Ic n="info" size={16} />
            The teacher reviews and approves all final marks.
          </div>
        </div>
      </div>
    </>
  )
}

/* -- Results -- */
function StudentResults() {
  const r = D.results[0]
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">Data Structures › Quiz 3</div>
          <h1>Your Result</h1>
        </div>
        <Badge variant="blue">Approved by teacher</Badge>
      </div>

      <div className="grid g21" style={{ marginBottom: '1.2rem' }}>
        {/* Score ring */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <RingChart value={r.total} max={r.max} label="Total marks received" />
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--mut)', textAlign: 'center' }}>
            Score: <strong style={{ color: 'var(--ink)' }}>{Math.round(r.total / r.max * 100)}%</strong>
          </div>
        </div>

        {/* Criteria breakdown */}
        <div className="card">
          <h2>Breakdown by Criterion</h2>
          <div className="criteria-breakdown">
            {r.criteria.map(([name, got, max]) => (
              <div className="criterion-row" key={name}>
                <div className="criterion-label-row">
                  <span className="criterion-name">{name}</span>
                  <span className="criterion-score">{got} / {max}</span>
                </div>
                <ProgressBar value={got} max={max} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: '1.2rem' }}>
        {/* Teacher comment */}
        <div className="card">
          <h2>Teacher Comment</h2>
          <p style={{ fontSize: '0.93rem', lineHeight: 1.7, color: 'var(--mut)', background: 'var(--bg)', padding: '1rem', borderRadius: '12px', borderLeft: '3px solid var(--blue)' }}>
            {r.comment}
          </p>
        </div>

        {/* Learning tips */}
        <div className="card">
          <h2>Learning Tips</h2>
          <div className="tip-list">
            {r.tips.map((t, i) => (
              <div className="tip-item" key={i}>
                <div className="tip-bullet"><Ic n="check" size={11} /></div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Topics to Revise</h2>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {r.topics.map(t => <Badge key={t} variant="blue">{t}</Badge>)}
        </div>
      </div>
    </>
  )
}

/* -- Progress -- */
function StudentProgress() {
  const best = D.topics.filter(([, v]) => v >= 70)
  const weak = D.topics.filter(([, v]) => v < 60)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Progress</h1>
          <div style={{ color: 'var(--mut)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Across all tasks and topics this semester
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid g4" style={{ marginBottom: '1.2rem' }}>
        {[
          { icon: 'star', label: 'Average Score', value: '74%', variant: 'blue' },
          { icon: 'check', label: 'Tasks Completed', value: '12', variant: 'blue' },
          { icon: 'chart', label: 'Topics Covered', value: '5', variant: 'blue' },
          { icon: 'tip', label: 'Weak Areas', value: weak.length, variant: 'blue' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <div className={`stat-icon ${s.variant}`}><Ic n={s.icon} size={22} /></div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid g2" style={{ marginBottom: '1.2rem' }}>
        {/* Score trend */}
        <div className="card">
          <h2>Score Trend</h2>
          <LineChart data={D.trend} labels={D.trendLabels} />
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--mut)', display: 'flex', gap: '1rem' }}>
            <span>Improving over last 7 weeks</span>
            <span style={{ color: 'var(--blue)', fontWeight: 600 }}>+16 pts</span>
          </div>
        </div>

        {/* Topic mastery */}
        <div className="card">
          <h2>Topic Mastery</h2>
          {D.topics.map(([t, v]) => (
            <ProgressRow key={t} label={t} value={v} />
          ))}
        </div>
      </div>

      <div className="grid g2">
        {/* Strong areas */}
        <div className="card">
          <h2>Strong Areas</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
            {best.map(([t, v]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{t}</span>
                <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '1rem' }}>{v}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="card">
          <h2>Achievements</h2>
          <div className="achievements">
            {[
              { label: 'First Submission', earned: true },
              { label: 'Perfect Score', earned: false },
              { label: 'Early Bird', earned: true },
              { label: 'Consistency King', earned: false },
            ].map(a => (
              <div key={a.label} className={`achievement ${a.earned ? 'earned' : 'locked'}`}>
                <Ic n={a.earned ? 'star' : 'clock'} size={16} />
                {a.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   TEACHER PAGES
   ============================================================ */

/* -- Teacher Dashboard -- */
function TeacherDash({ go, user }) {
  return (
    <>
      {/* Welcome hero */}
      <div className="welcome-hero">
        <div className="welcome-hero-content">
          <div className="welcome-eyebrow">Faculty Overview</div>
          <h1>Welcome back, {user?.name || 'Ms. Nergis Abbasi'}</h1>
          <p><strong>18 submissions</strong> are waiting for review and <strong>3 integrity alerts</strong> need your decision.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn pri" onClick={() => go('review')}>
              <Ic n="inbox" size={16} />
              Review Submissions
            </button>
            <button className="btn" onClick={() => go('create')}>
              Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid g4" style={{ marginBottom: '1.2rem' }}>
        {[
          { icon: 'inbox', label: 'Pending Reviews', value: '18', variant: 'blue' },
          { icon: 'shield', label: 'Integrity Alerts', value: '3', variant: 'blue' },
          { icon: 'list', label: 'Active Tasks', value: '6', variant: 'blue' },
          { icon: 'chart', label: 'Class Average', value: '72%', variant: 'blue' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <div className={`stat-icon ${s.variant}`}><Ic n={s.icon} size={22} /></div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid g21" style={{ marginBottom: '1.2rem' }}>
        {/* Recent tasks table */}
        <div className="card">
          <h2>Recent Tasks</h2>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Quiz 3: Stacks', '28 / 30', 'blue', '12 to review'],
                  ['Lab 4: Linked Lists', '30 / 30', 'blue', '2 flagged'],
                  ['Assignment 2: Arrays', '25 / 30', 'gray', 'Reviewed'],
                ].map(([title, sub, v, status]) => (
                  <tr key={title}>
                    <td>{title}</td>
                    <td style={{ color: 'var(--mut)', fontWeight: 400 }}>{sub}</td>
                    <td><Badge variant={v}>{status}</Badge></td>
                    <td><button className="btn sm ghost-blue" onClick={() => go('review')}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integrity alerts */}
        <div className="card">
          <h2>Integrity Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
            {[
              { text: 'Lab 4: two students share an identical rare error', level: 'High', variant: 'blue' },
              { text: 'Quiz 3: similarity estimate above threshold', level: 'Check', variant: 'blue' },
              { text: 'Assignment 2: Unusually similar structure', level: 'Low', variant: 'gray' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                <div style={{ color: 'var(--blue)', marginTop: '2px' }}>
                  <Ic n="flag" size={16} />
                </div>
                <div style={{ flex: 1, fontSize: '0.85rem' }}>{a.text}</div>
                <Badge variant={a.variant}>{a.level}</Badge>
              </div>
            ))}
          </div>
          <button className="btn sm ghost-blue" style={{ marginTop: '0.9rem', width: '100%' }} onClick={() => go('integrity')}>
            View All Flags
          </button>
        </div>
      </div>

      <div className="grid g2">
        {/* Score distribution */}
        <div className="card">
          <h2>Score Distribution</h2>
          <BarChart data={D.dist} labels={['0–2', '3–4', '5–6', '7–8', '9–10']} />
        </div>

        {/* Weak topics */}
        <div className="card">
          <h2>Weakest Topics This Week</h2>
          {D.topics.slice(2).map(([t, v]) => (
            <ProgressRow key={t} label={t} value={v} />
          ))}
        </div>
      </div>
    </>
  )
}

/* -- Create Task -- */
function TeacherCreate({ toast }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    title: 'Quiz 4: Queues',
    type: 'Quiz',
    course: 'Data Structures',
    deadline: '2026-11-25',
    marks: 10,
    question: 'Explain how a queue works and give one use case.',
    reference: 'FIFO structure; enqueue at rear, dequeue at front.'
  })
  const [rubric, setRubric] = useState([
    ['Concept accuracy', 4],
    ['Terminology', 3],
    ['Completeness', 3],
  ])

  const totalW = rubric.reduce((s, r) => s + +r[1], 0)
  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const draftRubric = () => {
    setRubric([
      ['Concept accuracy', 4],
      ['Definition of FIFO', 2],
      ['Use case example', 2],
      ['Terminology', 2],
    ])
    toast('Rubric template loaded — review and adjust before publishing.', 'default')
  }

  const publish = async () => {
    if (totalW !== +form.marks) return toast(`Rubric totals ${totalW} marks, but task has ${form.marks}. Adjust before publishing.`, 'error')
    const r = await call('/tasks', 'POST', { ...form, rubric: rubric.map(([name, max]) => ({ name, max: +max })) })
    toast(r && r.error ? r.error : 'Task published successfully!', 'default')
  }

  const steps = ['Task Details', 'Question & Reference', 'Rubric Criteria', 'Preview & Publish']

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Create Task</h1>
          <div style={{ color: 'var(--mut)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
            Set up a new assignment, quiz, or lab task
          </div>
        </div>
      </div>

      {/* Wizard steps */}
      <div className="wizard-steps" style={{ marginBottom: '1.8rem' }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`wizard-step ${i < step ? 'done' : i === step ? 'active' : 'pending'}`}
              style={{ cursor: i <= step ? 'pointer' : 'default' }}
              onClick={() => i <= step && setStep(i)}>
              <div className="wizard-step-num">
                {i < step ? <Ic n="check" size={14} /> : i + 1}
              </div>
              <span className="wizard-step-label">{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`wizard-connector${i < step ? ' done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Task details */}
      {step === 0 && (
        <div className="card">
          <h2>Task Details</h2>
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input type="text" value={form.title} onChange={set('title')} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select value={form.type} onChange={set('type')}>
                <option>Quiz</option>
                <option>Assignment</option>
                <option>Lab</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Course</label>
              <input type="text" value={form.course} onChange={set('course')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input type="date" value={form.deadline} onChange={set('deadline')} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Marks</label>
              <input type="number" value={form.marks} onChange={set('marks')} min={1} max={100} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn pri" onClick={() => setStep(1)}>Next: Question</button>
          </div>
        </div>
      )}

      {/* Step 1: Question */}
      {step === 1 && (
        <div className="card">
          <h2>Question &amp; Reference Answer</h2>
          <div className="form-group">
            <label className="form-label">Question</label>
            <textarea rows={4} value={form.question} onChange={set('question')} />
          </div>
          <div className="form-group">
            <label className="form-label">Reference / Model Answer <span style={{ color: 'var(--mut)', fontWeight: 400 }}>(used to evaluate submissions)</span></label>
            <textarea rows={4} value={form.reference} onChange={set('reference')} />
          </div>
          <div className="info-note">
            <Ic n="info" size={16} />
            The reference answer helps calibrate grading against the defined rubric criteria.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn" onClick={() => setStep(0)}>Back</button>
            <button className="btn pri" onClick={() => setStep(2)}>Next: Rubric</button>
          </div>
        </div>
      )}

      {/* Step 2: Rubric */}
      {step === 2 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Grading Rubric</h2>
            <button className="btn ghost-blue" onClick={draftRubric}>
              <Ic n="plus" size={15} />
              Load Template
            </button>
          </div>

          {rubric.map((r, i) => (
            <div className="rubric-row" key={i}>
              <input className="rubric-name-input" value={r[0]}
                onChange={e => setRubric(rubric.map((x, j) => j === i ? [e.target.value, x[1]] : x))}
                placeholder="Criterion name" />
              <input type="number" style={{ width: 75 }} value={r[1]} min={0}
                onChange={e => setRubric(rubric.map((x, j) => j === i ? [x[0], e.target.value] : x))} />
              <span style={{ fontSize: '0.82rem', color: 'var(--mut)', minWidth: 32 }}>pts</span>
              <button className="btn sm danger" onClick={() => setRubric(rubric.filter((_, j) => j !== i))} aria-label="Remove">
                <Ic n="trash" size={13} />
              </button>
            </div>
          ))}

          <button className="btn sm" style={{ marginTop: '0.9rem' }} onClick={() => setRubric([...rubric, ['New criterion', 0]])}>
            <Ic n="plus" size={14} /> Add criterion
          </button>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: totalW === +form.marks ? 'var(--bg)' : 'rgba(0,0,0,0.04)', borderRadius: '10px', border: '1px solid var(--line)', fontSize: '0.9rem', fontWeight: 600, color: totalW === +form.marks ? 'var(--blue)' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ic n={totalW === +form.marks ? 'check' : 'warn'} size={16} />
            Rubric total: {totalW} / {form.marks} marks
            {totalW !== +form.marks && ' — Adjust weights before publishing'}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn" onClick={() => setStep(1)}>Back</button>
            <button className="btn" onClick={() => toast('Draft saved', 'default')}>Save Draft</button>
            <button className="btn pri" onClick={() => setStep(3)}>Preview</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & publish */}
      {step === 3 && (
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2>Preview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem 1.5rem', marginBottom: '1rem' }}>
              {[['Title', form.title], ['Type', form.type], ['Course', form.course], ['Deadline', form.deadline], ['Marks', form.marks]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Question</div>
              <div style={{ background: 'var(--bg)', padding: '0.9rem', borderRadius: '10px', fontSize: '0.93rem' }}>{form.question}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--mut)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Rubric</div>
              {rubric.map(([n, m]) => (
                <div key={n} className="list-row">
                  <span style={{ fontWeight: 500 }}>{n}</span>
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{m} pts</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            <button className="btn" onClick={() => toast('Draft saved', 'default')}>Save as Draft</button>
            <button className="btn pri" onClick={publish}>
              <Ic n="check" size={16} />
              Publish Task
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* -- Submissions / Review -- */
function TeacherReview({ toast }) {
  const [selected, setSelected] = useState(null)
  const [comment, setComment] = useState('')
  const [subs, setSubs] = useState(D.subs)
  const [crit, setCrit] = useState(null)

  const openSub = idx => {
    setSelected(idx)
    setCrit(subs[idx].crit.map(x => [...x]))
    setComment('')
  }

  const total = crit ? crit.reduce((t, x) => t + +x[1], 0) : 0

  const mark = (word, sub) => {
    const clean = word.replace(/[.,!?]/g, '')
    if (sub.low.includes(clean)) return 'hl-low'
    if (sub.med.some(p => p.split(' ').includes(clean))) return 'hl-med'
    return null
  }

  const finalize = action => {
    const s = subs[selected]
    call(`/submissions/${s.id}/review`, 'PUT', { action, comment, criteria: crit.map(([name, got, max]) => ({ name, got: +got, max })) })
    setSubs(subs.map((x, k) => k === selected ? { ...x, status: 'reviewed' } : x))
    toast(action === 'approve' ? `Approved ${total}/10 and released to student` : 'Override saved and released', 'default')
    setSelected(null)
  }

  /* Submission list */
  if (selected === null) return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">Data Structures › Quiz 3</div>
          <h1>Submissions</h1>
        </div>
        <Badge variant="blue">{subs.filter(s => s.status !== 'reviewed').length} pending</Badge>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Status</th>
                <th>Marks</th>
                <th>Integrity</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, k) => (
                <tr key={s.id}>
                  <td>{s.uid}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td style={{ fontWeight: 700 }}>{s.crit.reduce((t, y) => t + y[1], 0)} / 10</td>
                  <td>
                    {s.flag > 0
                      ? <Badge variant="blue"><Ic n="flag" size={11} /> {s.flag} flag{s.flag > 1 ? 's' : ''}</Badge>
                      : <Badge variant="blue"><Ic n="check" size={11} /> Clear</Badge>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn sm pri" onClick={() => openSub(k)}>
                      <Ic n="eye" size={13} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  /* Grading panel */
  const s = subs[selected]
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">Quiz 3 › Submission {selected + 1} of {subs.length}</div>
          <h1>Review: {s.uid}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={() => setSelected(null)}>← Back to list</button>
          <StatusBadge status={s.status} />
        </div>
      </div>

      <div className="grid g13" style={{ marginBottom: '1.2rem' }}>
        {/* Scan + extracted text */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2>Original Scan</h2>
            <div className="scan-viewer">
              <div style={{ textAlign: 'center' }}>
                <Ic n="scan" size={36} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>[Handwritten page image]</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: text + grading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2>Extracted Text</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--mut)', marginBottom: '0.6rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span className="hl-low" style={{ padding: '1px 6px' }}>word</span> Low OCR confidence</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span className="hl-med" style={{ padding: '1px 6px' }}>phrase</span> Medium confidence</span>
            </p>
            <p style={{ lineHeight: 2, fontSize: '0.93rem' }}>
              {s.text.split(' ').map((w, k) => {
                const cls = mark(w, s)
                return cls ? <span key={k} className={cls}>{w} </span> : <span key={k}>{w} </span>
              })}
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2>Marks by Criterion</h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--mut)' }}>Rubric evaluation</span>
            </div>
            {crit.map((x, k) => (
              <div className="grading-slider" key={x[0]}>
                <span className="grading-slider-name">{x[0]}</span>
                <input
                  className="grading-slider-input"
                  type="number" min={0} max={x[2]}
                  value={x[1]}
                  onChange={e => setCrit(crit.map((y, j) => j === k ? [y[0], e.target.value, y[2]] : y))}
                  aria-label={x[0]}
                />
                <span className="grading-slider-max">/ {x[2]}</span>
              </div>
            ))}

            <div className="info-note">
              <Ic n="info" size={15} />
              Note: push and pop explained; time complexity not mentioned.
            </div>

            {/* Integrity */}
            <div style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mut)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Integrity</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--mut)', marginBottom: '0.3rem' }}>
                Similarity estimate: <strong style={{ color: 'var(--ink)' }}>{s.ai}%</strong>
              </div>
              {s.flag > 0 && <Badge variant="blue"><Ic n="flag" size={11} /> {s.flag} integrity flag{s.flag > 1 ? 's' : ''} to review</Badge>}
            </div>

            <div className="form-group">
              <label className="form-label">Comment to student</label>
              <input type="text" placeholder="Add feedback comment…" value={comment} onChange={e => setComment(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="btn pri" onClick={() => finalize('approve')}>
                <Ic n="check" size={16} />
                Approve {total} / 10
              </button>
              <button className="btn" onClick={() => finalize('override')}>
                <Ic n="drag" size={16} />
                Override &amp; Release
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* -- Integrity Check -- */
function TeacherIntegrity({ toast }) {
  const matrix = [['A', '—', '0.91', '0.22'], ['B', '0.91', '—', '0.19'], ['C', '0.22', '0.19', '—']]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">Lab 4</div>
          <h1>Integrity Report</h1>
        </div>
        <Badge variant="blue">High similarity detected</Badge>
      </div>

      {/* Stats */}
      <div className="grid g4" style={{ marginBottom: '1.2rem' }}>
        {[
          { icon: 'shield', label: 'Similarity Estimate', value: '18%', variant: 'blue', note: 'signal only' },
          { icon: 'list', label: 'Text Similarity', value: '12%', variant: 'blue', note: 'TF-IDF' },
          { icon: 'users', label: 'Code Clone Pairs', value: '2', variant: 'blue', note: 'AST analysis' },
          { icon: 'inbox', label: 'Shared-Error Flags', value: '1', variant: 'blue', note: 'rare misspelling' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <div className={`stat-icon ${s.variant}`}><Ic n={s.icon} size={22} /></div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-change" style={{ color: 'var(--mut)', fontWeight: 400 }}>{s.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pair comparison */}
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Pair Comparison: Student A &amp; Student B</h2>
          <Badge variant="blue">High Similarity</Badge>
        </div>

        <div className="pair-compare">
          <div className="compare-panel">
            <h4>Student A</h4>
            <p>A stack follows <span className="hl-low">pussh</span> and pop. It is used in <span className="hl-med">undo operations</span>.</p>
          </div>
          <div className="compare-panel">
            <h4>Student B</h4>
            <p>The stack uses <span className="hl-low">pussh</span> and pop. Common in <span className="hl-med">undo operations</span>.</p>
          </div>
        </div>

        <div style={{ marginTop: '0.9rem', padding: '0.75rem 1rem', background: 'var(--bg)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--ink)', borderLeft: '3px solid var(--blue)' }}>
          Identical rare misspelling ("pussh") and matching phrase structure found. The instructor makes the final decision.
        </div>
      </div>

      <div className="grid g2">
        {/* Similarity matrix */}
        <div className="card">
          <h2>Similarity Matrix</h2>
          <div className="table-wrap">
            <table className="tbl sim-matrix">
              <thead>
                <tr><th></th><th>A</th><th>B</th><th>C</th></tr>
              </thead>
              <tbody>
                {matrix.map(row => (
                  <tr key={row[0]}>
                    <td><strong>{row[0]}</strong></td>
                    {row.slice(1).map((v, j) => (
                      <td key={j}>
                        {v === '—' ? <span style={{ color: 'var(--mut)' }}>—</span>
                          : +v > 0.8 ? <Badge variant="blue">{v}</Badge>
                          : <span style={{ fontWeight: 600 }}>{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teacher decision */}
        <div className="card">
          <h2>Teacher Decision</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--mut)', marginBottom: '1rem' }}>
            Review the evidence and choose an action. All decisions are logged in the audit trail.
          </p>
          <div className="form-group">
            <label className="form-label">Decision Notes</label>
            <textarea rows={3} placeholder="Add your reasoning here…" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button className="btn" onClick={() => toast('Flag dismissed and logged', 'default')}>
              Dismiss Flag
            </button>
            <button className="btn pri" onClick={() => toast('Flag confirmed and escalated to academic board', 'default')}>
              <Ic n="flag" size={15} />
              Escalate
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* -- Analytics -- */
function TeacherAnalytics({ toast }) {
  const exportCSV = () => {
    const rows = ['range,students', ...['0-2', '3-4', '5-6', '7-8', '9-10'].map((l, i) => `${l},${D.dist[i]}`)]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'quiz3-analytics.csv'
    a.click()
    toast('CSV exported', 'default')
  }

  const heatColors = v => {
    if (v >= 70) return { bg: 'rgba(15,59,122,0.18)', color: '#0f3b7a' }
    if (v >= 50) return { bg: 'var(--bg)', color: '#0F172A' }
    return { bg: 'rgba(0,0,0,0.06)', color: '#64748B' }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">Data Structures › Quiz 3</div>
          <h1>Class Analytics</h1>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={exportCSV}>
            <Ic n="export" size={15} />
            Export CSV
          </button>
          <button className="btn" onClick={() => window.print()}>
            <Ic n="scan" size={15} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid g4" style={{ marginBottom: '1.2rem' }}>
        {[
          { icon: 'users', label: 'Total Students', value: '30', variant: 'blue' },
          { icon: 'chart', label: 'Class Average', value: '72%', variant: 'blue' },
          { icon: 'star', label: 'Top Score', value: '10/10', variant: 'blue' },
          { icon: 'warn', label: 'Below Pass', value: '7', variant: 'blue' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <div className={`stat-icon ${s.variant}`}><Ic n={s.icon} size={22} /></div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid g2" style={{ marginBottom: '1.2rem' }}>
        {/* Bar chart */}
        <div className="card">
          <h2>Score Distribution</h2>
          <BarChart data={D.dist} labels={['0–2', '3–4', '5–6', '7–8', '9–10']} />
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--mut)', textAlign: 'center' }}>
            Most students scored in the 5–6 range
          </div>
        </div>

        {/* Topic heatmap */}
        <div className="card">
          <h2>Performance by Topic</h2>
          <div className="heatmap" style={{ marginTop: '0.5rem' }}>
            {D.topics.map(([t, v]) => {
              const { bg, color } = heatColors(v)
              return (
                <div className="heatmap-row" key={t}>
                  <span className="heatmap-label">{t}</span>
                  <div className="heatmap-cell" style={{ background: bg, color }}>
                    {v}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Class trend */}
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <h2>Class Score Trend</h2>
        <LineChart
          data={[62, 67, 65, 71, 70, 74, 72]}
          labels={['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7']}
        />
      </div>

      {/* Misconceptions */}
      <div className="card">
        <h2>Common Misconceptions</h2>
        <div style={{ marginTop: '0.25rem' }}>
          {D.misc.map((m, i) => (
            <div className="misc-item" key={i}>
              <div className="misc-icon"><Ic n="info" size={16} /></div>
              <span>{m}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Badge variant="blue">Suggested: review Big-O Notation</Badge>
          <Badge variant="blue">Suggested: stack vs queue worksheet</Badge>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   ROOT APP
   ============================================================ */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edvora_user') || localStorage.getItem('aiq_user') || 'null') } catch { return null }
  })
  const [page, setPage] = useState('dash')
  const [toast, setToast] = useState({ msg: '', type: 'default' })
  const [showLanding, setShowLanding] = useState(true)
  const [landingRole, setLandingRole] = useState('student')

  useEffect(() => {
    if (user) {
      localStorage.setItem('edvora_user', JSON.stringify(user))
      setShowLanding(false)
    } else {
      localStorage.removeItem('edvora_user')
      localStorage.removeItem('aiq_user')
    }
  }, [user])

  const showToast = useCallback((msg, type = 'default') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'default' }), 3000)
  }, [])

  const handleAuth = u => {
    setUser(u)
    setPage('dash')
  }

  const handleLogout = () => {
    localStorage.removeItem('edvora_token')
    localStorage.removeItem('aiq_token')
    setUser(null)
    setShowLanding(true)
  }

  const handleLandingLogin = role => {
    setLandingRole(role)
    setShowLanding(false)
  }

  /* Landing */
  if (showLanding && !user) {
    return <Landing onLoginClick={handleLandingLogin} />
  }

  /* Auth */
  if (!user) {
    return <Auth initialRole={landingRole} onAuth={handleAuth} />
  }

  /* Validate role */
  if (!NAV_ITEMS[user.role]) {
    return <Auth initialRole="student" onAuth={handleAuth} />
  }

  /* Student pages map */
  const studentPages = {
    dash:     <StudentDash go={setPage} user={user} />,
    tasks:    <StudentTasks go={setPage} />,
    submit:   <StudentSubmit toast={showToast} />,
    results:  <StudentResults />,
    progress: <StudentProgress />,
  }

  /* Teacher pages map */
  const teacherPages = {
    dash:      <TeacherDash go={setPage} user={user} />,
    create:    <TeacherCreate toast={showToast} />,
    review:    <TeacherReview toast={showToast} />,
    integrity: <TeacherIntegrity toast={showToast} />,
    analytics: <TeacherAnalytics toast={showToast} />,
  }

  const pages = user.role === 'student' ? studentPages : teacherPages
  const currentPage = pages[page] || pages['dash']

  return (
    <>
      <Shell user={user} page={page} setPage={setPage} onLogout={handleLogout}>
        {currentPage}
      </Shell>

      {/* Toast */}
      {toast.msg && <Toast message={toast.msg} type={toast.type} />}
    </>
  )
}
