import { useEffect, useMemo, useState } from 'react'
import { demoMembers } from './demoData.js'
import { circleHealth, predictNextMonthRisk, trustScore } from './trustScore.js'
import { createPayPalOrder, explainTrustScore, getServerMode, payOutViaServer } from './api.js'

function loadSavedMembers() {
  try {
    const saved = JSON.parse(localStorage.getItem('kameti-members-v1') || 'null')
    if (Array.isArray(saved) && saved.length) return saved
  } catch {}
  return demoMembers
}

function shuffled(ids) {
  const a = [...ids]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function loadSavedOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem('kameti-order-v1') || 'null')
    if (Array.isArray(saved) && saved.length) return saved
  } catch {}
  return shuffled(demoMembers.map((m) => m.id))
}
function loadSavedDuration() {
  try {
    const saved = Number(localStorage.getItem('kameti-duration-v1'))
    if (saved >= 1 && saved <= 24) return saved
  } catch {}
  return 5
}

const DURATION_OPTIONS = [3, 5, 6, 10, 12]

export default function App() {
  const [circleName, setCircleName] = useState('Family Kameti')
  const [monthlyAmount, setMonthlyAmount] = useState(100)
  const [totalMonths, setTotalMonths] = useState(loadSavedDuration)
  const [youId, setYouId] = useState(demoMembers[0].id)
  const [payoutOrder, setPayoutOrder] = useState(loadSavedOrder)
  const [members, setMembers] = useState(loadSavedMembers)
  const [newMemberName, setNewMemberName] = useState('')
  const [month, setMonth] = useState(1)
  const [payingId, setPayingId] = useState(null)
  const [payingOut, setPayingOut] = useState(false)
  const [lastPayment, setLastPayment] = useState(null)
  const [lastPayout, setLastPayout] = useState(null)
  const [mode, setMode] = useState('simulated')
  const [aiMode, setAiMode] = useState('simulated')
  const [explanations, setExplanations] = useState({})
  const [explanationSource, setExplanationSource] = useState({})
  const [explainingId, setExplainingId] = useState(null)
  const [error, setError] = useState(null)
  const [loadingMode, setLoadingMode] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingMode(true)
    getServerMode()
      .then((data) => {
        if (cancelled) return
        setMode(data.mode || 'simulated')
        setAiMode(data.gemini === 'configured' ? 'live-gemini' : 'simulated')
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the server on localhost:3001. Running in Simulated mode — start it with npm run server in a second terminal.')
      })
      .finally(() => { if (!cancelled) setLoadingMode(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('kameti-members-v1', JSON.stringify(members)) } catch {}
  }, [members])

  useEffect(() => {
    try { localStorage.setItem('kameti-duration-v1', String(totalMonths)) } catch {}
  }, [totalMonths])

  useEffect(() => {
    try { localStorage.setItem('kameti-order-v1', JSON.stringify(payoutOrder)) } catch {}
  }, [payoutOrder])

  function drawRandomOrder() {
    if (circleStarted) return
    setPayoutOrder(shuffled(members.map((m) => m.id)))
  }

  const amount = Number(monthlyAmount) || 0
  const pot = amount * members.length
  const paidCount = members.filter((m) => m.paidThisMonth).length
  const collected = paidCount * amount
  const health = useMemo(() => circleHealth(members), [members])
  // Winner is drawn randomly, no repeats: the payout order is shuffled once
  // before the circle starts, and each month takes the next person in that order.
  const winner = payoutOrder.length && members.length
    ? members.find((m) => m.id === payoutOrder[(month - 1) % payoutOrder.length]) || null
    : null
  const you = members.find((m) => m.id === youId) || members[0] || null
  const orderNames = payoutOrder.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean)
  const allPaid = members.length > 0 && paidCount === members.length
  const unpaidMembers = members.filter((m) => !m.paidThisMonth)
  // Duration is decided before starting, and locked once anyone has paid or a payout happened.
  const circleStarted = month > 1 || paidCount > 0 || Boolean(lastPayout)
  const circleComplete = month > totalMonths
  const totalOverRun = pot * totalMonths
  const perMemberOverRun = amount * totalMonths
  const progress = totalMonths ? Math.min(100, Math.round(((month - 1) / totalMonths) * 100)) : 0
  const modeLabel = loadingMode
    ? 'Mode: Checking server…'
    : mode === 'live-sandbox' ? 'Mode: Live Sandbox' : 'Mode: Simulated (no keys)'

  function addMember(event) {
    event.preventDefault()
    const name = newMemberName.trim()
    if (!name) return
    setMembers([...members, { id: Date.now(), name, history: [], paidThisMonth: false }])
    setNewMemberName('')
  }

  function removeMember(id) {
    if (circleStarted) return
    setMembers(members.filter((m) => m.id !== id))
  }

  async function payMember(member) {
    if (circleComplete) return
    setError(null)
    setPayingId(member.id)
    try {
      const result = await createPayPalOrder(member, amount)
      if (!result || !result.id) throw new Error('Payment did not return an order')
      if (result.mode) setMode(result.mode)
      setMembers(members.map((m) => (m.id === member.id ? { ...m, paidThisMonth: true } : m)))
      setLastPayment(result)
    } catch (e) {
      setError(`Payment for ${member.name} failed. Please try again — they have not been marked as paid.`)
    } finally {
      setPayingId(null)
    }
  }

  async function payOutPot() {
    if (!winner || !allPaid || circleComplete) return
    setError(null)
    setPayingOut(true)
    try {
      const result = await payOutViaServer(winner, pot)
      if (!result || !result.id) throw new Error('Payout did not return an id')
      if (result.mode) setMode(result.mode)
      setLastPayout({ ...result, month })
      setMonth(month + 1)
      setMembers(members.map((m) => ({ ...m, paidThisMonth: false })))
      setLastPayment(null)
    } catch (e) {
      setError(`Payout to ${winner.name} failed. Please try again — the month has not advanced.`)
    } finally {
      setPayingOut(false)
    }
  }

  function startNewCircle() {
    setMonth(1)
    setMembers(members.map((m) => ({ ...m, paidThisMonth: false })))
    setLastPayment(null)
    setLastPayout(null)
    setError(null)
  }

  async function explainMember(member) {
    const trust = trustScore(member.history)
    setError(null)
    setExplainingId(member.id)
    try {
      const result = await explainTrustScore(member, trust)
      if (!result || !result.explanation) throw new Error('No explanation returned')
      setExplanations({ ...explanations, [member.id]: result.explanation })
      setExplanationSource({ ...explanationSource, [member.id]: result.mode || 'simulated' })
      if (result.mode) setAiMode(result.mode)
    } catch (e) {
      setError(`Could not get an AI explanation for ${member.name}. Showing the rule-based reason instead.`)
      setExplanations({ ...explanations, [member.id]: trust.reason })
      setExplanationSource({ ...explanationSource, [member.id]: 'simulated' })
    } finally {
      setExplainingId(null)
    }
  }

  return (
    <div className="page">
      <nav className="nav">
        <a className="nav-brand" href="#top">
          <svg className="logo small" viewBox="0 0 48 48" role="img" aria-label="Kameti logo">
            <rect width="48" height="48" rx="13" fill="#1d1d1f" />
            <path d="M24 10a14 14 0 1 1-13.2 9.4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <path d="M11 14v6h6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <text x="24" y="31" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif">K</text>
          </svg>
          <span>Kameti AI</span>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#members">Members</a>
          <a href="#setup">Your circle</a>
        </div>
        <a className="button primary nav-cta" href="#setup">Start your circle</a>
      </nav>

      <header className="hero" id="top">
        <p className="eyebrow">PayPal AI Hackathon — Sandbox only — No real money</p>
        <h1>Save together.<br />Win together.</h1>
        <p className="subtitle">
          Create a group, set how many months, and pay only your own share
          each month. One member is drawn at random to take the $1,000 pot —
          no one wins twice until everyone has won once.
        </p>
        <div className="hero-actions">
          <a className="button primary large" href="#setup">Start your circle</a>
          <a className="button large" href="#how">See how it works</a>
        </div>
        <p className="hero-note">No login. No real money. Set the length first — 5 months, 10 months, your call.</p>

        <div className="hero-visual">
          <div className="hero-card">
            <span className="hero-card-label">This month&apos;s pot</span>
            <strong className="hero-pot">${pot.toLocaleString()}</strong>
            <span className="hero-card-sub">${collected.toLocaleString()} collected · {paidCount} of {members.length} paid</span>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${members.length ? Math.round((paidCount / members.length) * 100) : 0}%` }} /></div>
            <span className="hero-card-sub">Next payout (random draw): {circleComplete ? 'Circle complete' : winner ? `${winner.name} — Month ${month} of ${totalMonths}` : 'Add a member first'}</span>
          </div>
          <div className="hero-card">
            <span className="hero-card-label">Circle health</span>
            <strong className="hero-pot">{health} / 100</strong>
            <span className="hero-card-sub">AI trust score, from real payment history</span>
            <p className="mode-line">{modeLabel} · AI: {aiMode === 'live-gemini' ? 'Live Gemini' : 'Rule-based (no key)'}</p>
          </div>
        </div>
      </header>

      <section className="features">
        <article className="feature">
          <span className="feature-icon">↻</span>
          <h3>Rotating pot</h3>
          <p>Everyone pays the same amount every month. One member takes the whole pot, in rotation, until the circle ends.</p>
        </article>
        <article className="feature">
          <span className="feature-icon">✦</span>
          <h3>AI trust score</h3>
          <p>Every member gets a 0–100 score from on-time, late and missed payments — explained in plain English, never invented.</p>
        </article>
        <article className="feature">
          <span className="feature-icon">$</span>
          <h3>PayPal Sandbox</h3>
          <p>Payments and payouts run through PayPal Sandbox. Real Sandbox orders, no real money ever moves.</p>
        </article>
      </section>

      <section className="card how" id="how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step"><strong>01</strong><h3>Set it up</h3><p>Name your circle, set $100 a month, and choose how many months — 5, 10, or your own number. That length locks in before you start.</p></div>
          <div className="step"><strong>02</strong><h3>Everyone pays</h3><p>Members pay in with PayPal Sandbox. Reminders show who hasn&apos;t paid yet this month.</p></div>
          <div className="step"><strong>03</strong><h3>One member wins — at random</h3><p>Once everyone has paid, the pot goes to that month&apos;s randomly drawn winner. No repeats until everyone has won once. Then the month advances.</p></div>
        </div>
      </section>

      <div className="progress-wrap" aria-label={`Month ${Math.min(month, totalMonths)} of ${totalMonths}`}>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <span className="progress-label">{circleComplete ? 'Circle complete' : `Month ${month} of ${totalMonths} — ${progress}%`}</span>
      </div>

      {error && (
        <div className="notice error" role="alert">
          <strong>Something went wrong</strong>
          <span>{error}</span>
          <button className="link-button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {circleComplete && (
        <div className="notice payout complete-banner">
          <strong>Circle complete — {totalMonths} months done.</strong>
          <span>Everyone paid ${perMemberOverRun} in total, and ${totalOverRun.toLocaleString()} moved through the circle.</span>
          <button className="button" onClick={startNewCircle}>Start a new circle</button>
        </div>
      )}

      <section className="card setup" id="setup">
        <h2>1. Create your group</h2>
        <p className="hint">Name it, set the amount and how many months, add your members, and pick who you are. The payout order is drawn at random before you start — then you only ever pay your own share.</p>
        <div className="form-row">
          <label>
            Circle name
            <input value={circleName} onChange={(e) => setCircleName(e.target.value)} disabled={circleStarted} />
          </label>
          <label>
            Monthly amount ($)
            <input
              type="number"
              min="1"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              disabled={circleStarted}
            />
          </label>
        </div>

        <div className="duration-block">
          <span className="duration-label">How many months?</span>
          <div className="segmented" role="group" aria-label="Circle length in months">
            {DURATION_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={totalMonths === n ? 'segment active' : 'segment'}
                onClick={() => setTotalMonths(n)}
                disabled={circleStarted}
                aria-pressed={totalMonths === n}
              >
                {n} mo
              </button>
            ))}
            <label className="custom-months">
              <span>Custom</span>
              <input
                type="number"
                min="1"
                max="24"
                value={totalMonths}
                onChange={(e) => setTotalMonths(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                disabled={circleStarted}
                aria-label="Custom number of months"
              />
            </label>
          </div>
          <p className="hint">
            {members.length} members × ${amount} × {totalMonths} months = ${totalOverRun.toLocaleString()} total through the circle, ${perMemberOverRun} each.
            {members.length > totalMonths ? ` Note: with ${members.length} members and only ${totalMonths} months, not everyone will get a payout.` : ''}
            {circleStarted ? ' Locked — the circle has started.' : ''}
          </p>
        </div>

        <div className="form-row">
          <label>
            You are
            <select value={youId} onChange={(e) => setYouId(Number(e.target.value))} disabled={circleStarted}>
              {members.map((m) => (<option key={m.id} value={m.id}>{m.name} (you)</option>))}
            </select>
          </label>
          <button className="button" type="button" onClick={drawRandomOrder} disabled={circleStarted}>
            Shuffle payout order
          </button>
        </div>
        {orderNames.length > 0 && (
          <p className="hint">
            Payout order — randomly drawn, no repeats: {orderNames.map((n, i) => `${i + 1}. ${n}`).join(' · ')}
          </p>
        )}

        <form className="form-row" onSubmit={addMember}>
          <label>
            Add a member
            <input
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="e.g. Zara"
              disabled={circleStarted}
            />
          </label>
          <button className="button" type="submit" disabled={circleStarted}>Add member</button>
        </form>
        {circleStarted && <p className="hint">Members and amount are locked while the circle is running. Start a new circle to change them.</p>}
      </section>

      <section className="stats">
        <div className="stat">
          <span>Circle</span>
          <strong>{circleName || 'Unnamed circle'}</strong>
        </div>
        <div className="stat">
          <span>Pot this month</span>
          <strong>${pot.toLocaleString()}</strong>
        </div>
        <div className="stat">
          <span>Collected</span>
          <strong>${collected.toLocaleString()} of ${pot.toLocaleString()}</strong>
        </div>
        <div className="stat">
          <span>Next payout — random</span>
          <strong>{circleComplete ? 'Done' : winner ? `${winner.name} — Month ${month}` : 'Add a member first'}</strong>
        </div>
      </section>

      {you && !circleComplete && (
        <section className="card your-payment" aria-label="Your payment">
          <div className="section-head">
            <div>
              <h2>Your payment — Month {month} of {totalMonths}</h2>
              <p className="hint">You pay only your own ${amount}. Other members pay themselves — you never pay for them.</p>
            </div>
            <strong className="score">${amount}</strong>
          </div>
          <p><strong>{you.name} (you)</strong> — {you.paidThisMonth ? 'Paid this month ✓' : 'Not paid yet this month'}</p>
          <button
            className="button primary large"
            onClick={() => payMember(you)}
            disabled={you.paidThisMonth || payingId === you.id}
          >
            {payingId === you.id ? 'Processing…' : you.paidThisMonth ? 'You paid ✓' : `Pay my $${amount} with PayPal (Sandbox)`}
          </button>
          {winner && (
            <p className="hint">This month&apos;s randomly drawn winner: <strong>{winner.name}</strong> — no repeats until everyone has won once.</p>
          )}
        </section>
      )}

      {!circleComplete && unpaidMembers.length > 0 && (
        <section className="card reminders" aria-label="Payment reminders">
          <h2>Reminders — Month {month} of {totalMonths}</h2>
          <p className="hint">
            {unpaidMembers.length} of {members.length} still to pay ${amount} this month. They pay themselves — this is demo only, to simulate them paying.
          </p>
          <ul>
            {unpaidMembers.map((m) => (
              <li key={m.id}>
                <span>{m.name}{m.id === youId ? ' (you)' : ''} — not paid yet</span>
                <button
                  className="button small"
                  onClick={() => payMember(m)}
                  disabled={payingId === m.id}
                >
                  {payingId === m.id ? 'Processing…' : m.id === youId ? `Pay my $${amount}` : 'Simulate payment'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lastPayment && !circleComplete && (
        <div className="notice success">
          <strong>{lastPayment.mode === 'live-sandbox' ? 'PayPal Sandbox payment created.' : 'PayPal Sandbox payment completed (simulated).'}</strong>
          <span>{lastPayment.member} paid ${lastPayment.amount}. ID: {lastPayment.id}</span>
          {lastPayment.approvalLink && (
            <span>
              Approve it in the Sandbox here: <a href={lastPayment.approvalLink} target="_blank" rel="noreferrer">{lastPayment.approvalLink}</a>
            </span>
          )}
        </div>
      )}

      {lastPayout && (
        <div className="notice payout">
          <strong>{lastPayout.mode === 'live-sandbox' ? 'PayPal Sandbox payout sent.' : 'PayPal Sandbox payout completed (simulated).'}</strong>
          <span>
            {lastPayout.winner} received ${lastPayout.amount} for Month {lastPayout.month}. ID: {lastPayout.id}
          </span>
        </div>
      )}

      <section className="card" id="members">
        <div className="section-head">
          <h2>2. Members and trust scores</h2>
          <button
            className="button primary"
            onClick={payOutPot}
            disabled={!winner || !allPaid || payingOut || circleComplete}
          >
            {payingOut ? 'Paying out…' : circleComplete ? 'Circle complete' : `Pay out $${pot.toLocaleString()} to ${winner ? winner.name : 'winner'}`}
          </button>
        </div>
        <p className="hint">
          The payout unlocks only when everyone has paid this month. After payout, the
          month advances and everyone starts unpaid again. The circle ends after Month {totalMonths}.
        </p>
        {members.length === 0 && <p>No members yet. Add one above to start the circle.</p>}
        {loadingMode && <p className="hint">Loading circle…</p>}
        <div className="members">
          {members.map((member) => {
            const trust = trustScore(member.history)
            const nextMonth = predictNextMonthRisk(member.history)
            const riskClass = trust.score >= 80 ? 'low' : trust.score >= 55 ? 'medium' : 'high'
            const aiText = explanations[member.id]
            const aiSource = explanationSource[member.id]
            return (
              <article className="member" key={member.id}>
                <div className="member-top">
                  <div>
                    <h3>{member.name}{member.id === youId ? ' — You' : ''}</h3>
                    <span className={`badge ${riskClass}`}>{trust.risk}</span>
                  </div>
                  <strong className="score">{trust.score}</strong>
                </div>
                {aiText ? (
                  <div className="ai-box">
                    <span className="ai-label">
                      {aiSource === 'live-gemini' ? '✦ AI explanation — Gemini' : 'AI explanation — rule-based'}
                    </span>
                    <p>{aiText}</p>
                  </div>
                ) : (
                  <p className="rule-reason"><span className="ai-label">Why this score</span>{trust.reason}</p>
                )}
                {explainingId === member.id && <p className="hint">Asking Gemini…</p>}
                <p className="counts">
                  {trust.onTime} on time · {trust.late} late · {trust.missed} missed
                </p>
                <p className="counts">
                  Next month risk: {nextMonth.risk} — {nextMonth.reason}
                </p>
                <p className="status">
                  {member.paidThisMonth ? 'Paid this month' : 'Not paid this month'}
                </p>
                <div className="member-actions">
                  {member.id === youId ? (
                    <button
                      className="button"
                      onClick={() => payMember(member)}
                      disabled={member.paidThisMonth || payingId === member.id || circleComplete}
                    >
                      {payingId === member.id ? 'Processing…' : member.paidThisMonth ? 'You paid ✓' : `Pay my $${amount} with PayPal (Sandbox)`}
                    </button>
                  ) : (
                    <span className="status">{member.paidThisMonth ? 'Paid ✓' : 'Waiting for them to pay'}</span>
                  )}
                  <button
                    className="link-button"
                    onClick={() => explainMember(member)}
                    disabled={explainingId === member.id}
                  >
                    {explainingId === member.id ? 'Explaining…' : 'Explain with AI'}
                  </button>
                  <button className="link-button" onClick={() => removeMember(member.id)} disabled={circleStarted}>
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="card how">
        <h2>How the trust score works</h2>
        <p>
          Every member starts at 70. An on-time payment adds 10, a late payment subtracts
          15, and a missed payment subtracts 30. The score is capped between 0 and 100.
          80 and above is low risk, 55 to 79 is medium risk, and below 55 is high risk.
        </p>
        <p>
          With no keys set, payments and payouts are simulated and the explanation is
          the rule-based reason. With free PayPal Sandbox keys set, the server creates
          real Sandbox orders and payouts. With a free Gemini key set, the explanation
          comes from Gemini instead. See <code>.env.example</code> and the README for
          how to get the free keys.
        </p>
      </section>

      <footer className="site-footer">
        <div>
          <strong>Kameti AI</strong>
          <span>Save together. Win together.</span>
        </div>
        <span>Free stack · PayPal Sandbox only · No real money moves here.</span>
      </footer>
    </div>
  )
}
