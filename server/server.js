import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { trustScore } from '../src/trustScore.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com'
const GEMINI_MODEL = 'gemini-2.0-flash'

app.use(cors())
app.use(express.json())

function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function simulatedId(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 10).toUpperCase()
}

async function paypalAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  if (!response.ok) {
    throw new Error('PayPal Sandbox token request failed')
  }
  const data = await response.json()
  return data.access_token
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: paypalConfigured() ? 'live-sandbox' : 'simulated',
    paypal: paypalConfigured() ? 'configured' : 'not-configured',
    gemini: geminiConfigured() ? 'configured' : 'not-configured',
    sandbox: true
  })
})

app.post('/api/paypal/create-order', async (req, res) => {
  const amount = Number(req.body?.amount) || 0
  if (!amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'A positive amount is required' })
  }
  if (!paypalConfigured()) {
    return res.json({
      ok: true,
      mode: 'simulated',
      id: simulatedId('PAYPAL-SANDBOX'),
      status: 'CREATED',
      approvalLink: null,
      note: 'Simulated PayPal Sandbox order. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to use the real Sandbox API.'
    })
  }
  try {
    const token = await paypalAccessToken()
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: amount.toFixed(2) }
          }
        ]
      })
    })
    const data = await response.json()
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'PayPal Sandbox order creation failed' })
    }
    const approval = (data.links || []).find((link) => link.rel === 'approve')
    return res.json({
      ok: true,
      mode: 'live-sandbox',
      id: data.id,
      status: data.status,
      approvalLink: approval ? approval.href : null
    })
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'PayPal Sandbox order creation failed' })
  }
})

app.post('/api/paypal/payout', async (req, res) => {
  const email = String(req.body?.email || '').trim()
  const amount = Number(req.body?.amount) || 0
  if (!email || !amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'A payout email and a positive amount are required' })
  }
  if (!paypalConfigured()) {
    return res.json({
      ok: true,
      mode: 'simulated',
      id: simulatedId('PAYOUT-SANDBOX'),
      status: 'COMPLETED',
      receiver: email,
      amount,
      note: 'Simulated PayPal Sandbox payout. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to use the real Sandbox Payouts API.'
    })
  }
  try {
    const token = await paypalAccessToken()
    const response = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: simulatedId('BATCH'),
          email_subject: 'Your Kameti AI payout'
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: { value: amount.toFixed(2), currency: 'USD' },
            receiver: email,
            note: 'Your Kameti AI pot payout'
          }
        ]
      })
    })
    const data = await response.json()
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'PayPal Sandbox payout failed' })
    }
    return res.json({
      ok: true,
      mode: 'live-sandbox',
      id: data.batch_header?.payout_batch_id || simulatedId('PAYOUT-SANDBOX'),
      status: 'COMPLETED',
      receiver: email,
      amount
    })
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'PayPal Sandbox payout failed' })
  }
})

app.post('/api/ai/explain', async (req, res) => {
  const name = String(req.body?.name || 'This member').trim()
  const history = Array.isArray(req.body?.history) ? req.body.history : []
  const score = Number(req.body?.score)
  const trust = trustScore(history)
  const finalScore = Number.isFinite(score) ? score : trust.score
  if (!geminiConfigured()) {
    return res.json({
      ok: true,
      mode: 'simulated',
      explanation: trust.reason,
      score: finalScore,
      risk: trust.risk
    })
  }
  const prompt = `Explain this savings-circle trust score in two short plain-English sentences. Member: ${name}. Trust score: ${finalScore} out of 100 (${trust.risk}). Payment history: ${history.join(', ') || 'no history yet'}. On-time payments: ${trust.onTime}. Late payments: ${trust.late}. Missed payments: ${trust.missed}. Do not invent payments. Keep it friendly and practical.`
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    )
    const data = await response.json()
    if (!response.ok) {
      return res.json({
        ok: true,
        mode: 'simulated',
        explanation: trust.reason,
        score: finalScore,
        risk: trust.risk
      })
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return res.json({
      ok: true,
      mode: 'live-gemini',
      explanation: text || trust.reason,
      score: finalScore,
      risk: trust.risk
    })
  } catch (error) {
    return res.json({
      ok: true,
      mode: 'simulated',
      explanation: trust.reason,
      score: finalScore,
      risk: trust.risk
    })
  }
})

app.listen(PORT, () => {
  console.log(`Kameti AI server running on http://localhost:${PORT}`)
  console.log(`PayPal Sandbox: ${paypalConfigured() ? 'configured' : 'not configured (simulated mode)'}`)
  console.log(`Gemini: ${geminiConfigured() ? 'configured' : 'not configured (simulated mode)'}`)
})
