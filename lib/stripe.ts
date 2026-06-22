import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'INR',
    features: [
      'Unlimited AI interview sessions',
      'GitHub profile analysis',
      'Public profile + badges + proof pages',
      'Atlas proactive skill insights',
      'Badge embed for READMEs',
    ],
  },
  pro: {
    name: 'Pro',
    price: 399,
    currency: 'INR',
    features: [
      'Everything in Free',
      'All data sources (LinkedIn, StackOverflow, DevTo)',
      'Score history sparklines',
      'Score-change email alerts',
      'Priority ranking in recruiter search',
      'Full interview report share links',
    ],
  },
} as const

export function isPro(user: { subscriptionTier?: string; subscriptionStatus?: string }): boolean {
  return user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active'
}
