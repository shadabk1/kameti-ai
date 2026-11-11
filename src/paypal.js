export function simulatePayPalPayment(member, amount) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'PAYPAL-SANDBOX-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        member: member.name,
        amount,
        status: 'COMPLETED',
        mode: 'sandbox',
        note: 'Simulated PayPal Sandbox payment. Replace with the real PayPal Checkout / Payouts API call here.'
      })
    }, 900)
  })
}

export function simulatePayout(winner, pot) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'PAYOUT-SANDBOX-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        winner: winner.name,
        amount: pot,
        status: 'COMPLETED',
        mode: 'sandbox',
        note: 'Simulated PayPal Payouts. Replace with the real Payouts API call here.'
      })
    }, 1200)
  })
}
