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
