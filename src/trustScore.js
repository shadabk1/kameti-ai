export function trustScore(history) {
  let score = 70
  let onTime = 0
  let late = 0
  let missed = 0

  for (const h of history) {
    if (h === 'on-time') { score += 10; onTime++ }
    if (h === 'late') { score -= 15; late++ }
    if (h === 'missed') { score -= 30; missed++ }
  }

  score = Math.max(0, Math.min(100, score))
  const risk = score >= 80 ? 'Low risk' : score >= 55 ? 'Medium risk' : 'High risk'

  let reason = ''
  if (missed > 0) reason = `Missed ${missed} payment${missed > 1 ? 's' : ''}. Highest risk in this circle.`
  else if (late > 0) reason = `Paid late ${late} time${late > 1 ? 's' : ''}, but never missed a payment.`
  else if (onTime > 0) reason = `Paid on time ${onTime}/${history.length} times. Reliable member.`
  else reason = 'No payment history yet. New member.'

  return { score, risk, onTime, late, missed, reason }
}

export function circleHealth(members) {
  const scores = members.map(m => trustScore(m.history).score)
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  return avg
}

export function predictNextMonthRisk(history) {
  if (!history || history.length === 0) {
    return { risk: 'Unknown', reason: 'No payment history yet — cannot predict next month.' }
  }
  const lastTwo = history.slice(-2)
  if (lastTwo.includes('missed')) {
    return { risk: 'High', reason: 'Missed a payment in the last 2 months — most at risk next month.' }
  }
  const { score } = trustScore(history)
  if (score >= 80) return { risk: 'Low', reason: 'Strong payment history — very likely to pay on time next month.' }
  if (score >= 55) return { risk: 'Medium', reason: 'Mixed history — may pay late next month.' }
  return { risk: 'High', reason: 'Low trust score — at risk of missing next month.' }
}
