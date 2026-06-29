import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''

/**
 * Usage-based recruiter billing — assessment credits.
 * One credit = one candidate assessed. Sold in packs (one-time payment), with
 * a lower per-unit price at higher volume. Price IDs come from env so they can
 * differ per environment; the pack metadata (credits) drives the grant.
 */
export interface CreditPack {
  id: 'starter' | 'team' | 'scale'
  name: string
  credits: number
  priceInr: number
  priceId: string
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 10,
    priceInr: 2999,
    priceId: process.env.STRIPE_CREDITS_STARTER_PRICE_ID || '',
  },
  {
    id: 'team',
    name: 'Team',
    credits: 25,
    priceInr: 5999,
    priceId: process.env.STRIPE_CREDITS_TEAM_PRICE_ID || '',
  },
  {
    id: 'scale',
    name: 'Scale',
    credits: 100,
    priceInr: 19999,
    priceId: process.env.STRIPE_CREDITS_SCALE_PRICE_ID || '',
  },
]

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id)
}

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
