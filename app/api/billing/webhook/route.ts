import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await connectDB()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!userId) break

        // Fetch the subscription to get period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        const periodEnd = subscription.items?.data?.[0]?.current_period_end ?? null

        await User.findByIdAndUpdate(userId, {
          subscriptionTier: 'pro',
          subscriptionStatus: subscription.status,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        })
        console.log(`[billing] Pro activated for user ${userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          // Fallback: find user by stripeCustomerId
          const customerId = subscription.customer as string
          const user = await User.findOne({ stripeCustomerId: customerId }).select('_id').lean()
          if (!user) break

          const isActive = subscription.status === 'active' || subscription.status === 'trialing'
          await User.findByIdAndUpdate((user as { _id: unknown })._id, {
            subscriptionTier: isActive ? 'pro' : 'free',
            subscriptionStatus: subscription.status,
            stripeSubscriptionId: subscription.id,
            subscriptionCurrentPeriodEnd: subscription.items?.data?.[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000)
            : null,
          })
          break
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        await User.findByIdAndUpdate(userId, {
          subscriptionTier: isActive ? 'pro' : 'free',
          subscriptionStatus: subscription.status,
          stripeSubscriptionId: subscription.id,
          subscriptionCurrentPeriodEnd: subscription.items?.data?.[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000)
            : null,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const user = await User.findOne({ stripeCustomerId: customerId }).select('_id').lean()
        if (!user) break

        await User.findByIdAndUpdate((user as { _id: unknown })._id, {
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: '',
          subscriptionCurrentPeriodEnd: null,
        })
        console.log(`[billing] Subscription canceled for customer ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const user = await User.findOne({ stripeCustomerId: customerId }).select('_id').lean()
        if (user) {
          await User.findByIdAndUpdate((user as { _id: unknown })._id, { subscriptionStatus: 'past_due' })
        }
        break
      }

      default:
        // Unhandled event type — not an error
        break
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
