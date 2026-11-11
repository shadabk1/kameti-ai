import { simulatePayPalPayment, simulatePayout } from './paypal.js'

const SERVER_URL = 'http://localhost:3001'

// Payout receiver for the Live Sandbox test.
// PayPal Sandbox rejects payouts to a fake @example.com address.
// Set this to your Sandbox Personal test account email, e.g.
// 'sb-xxxxx@personal.example.com' (from developer.paypal.com > Sandbox > Accounts > Personal).
// Leave it as '' to use the demo-generated address (simulated / may fail in Live Sandbox).
const PAYOUT_EMAIL = ''

async function postJson(path, body) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error('Server request failed')
  return response.json()
}

export async function getServerMode() {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`)
    if (!response.ok) return { mode: 'simulated', paypal: 'not-configured', gemini: 'not-configured' }
    return response.json()
  } catch (error) {
    return { mode: 'simulated', paypal: 'not-configured', gemini: 'not-configured' }
  }
}

export async function createPayPalOrder(member, amount) {
  try {
    const data = await postJson('/api/paypal/create-order', { amount })
    if (!data.ok) throw new Error('Order failed')
    return {
      id: data.id,
      member: member.name,
      amount,
      status: data.status === 'CREATED' ? 'COMPLETED' : data.status,
      mode: data.mode,
      approvalLink: data.approvalLink || null,
      note: data.note || null
    }
  } catch (error) {
    return simulatePayPalPayment(member, amount)
  }
}

export async function payOutViaServer(winner, pot) {
  try {
    const data = await postJson('/api/paypal/payout', {
      email: PAYOUT_EMAIL || `${winner.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
      amount: pot
    })
    if (!data.ok) throw new Error('Payout failed')
    return {
      id: data.id,
      winner: winner.name,
      amount: pot,
      status: data.status,
      mode: data.mode,
      note: data.note || null
    }
  } catch (error) {
    return simulatePayout(winner, pot)
  }
}

export async function explainTrustScore(member, trust) {
  try {
    const data = await postJson('/api/ai/explain', {
      name: member.name,
      history: member.history,
      score: trust.score
    })
    if (!data.ok) throw new Error('Explain failed')
    return { explanation: data.explanation, mode: data.mode }
  } catch (error) {
    return { explanation: trust.reason, mode: 'simulated' }
  }
}
