import Link from 'next/link'

export const metadata = {
  title: 'Pricing - CourtPulse',
  description: 'Choose the perfect plan for your community',
}

const plans = [
  {
    name: 'Community Starter',
    price: '$19',
    period: '/month',
    description: 'Perfect for small communities getting started',
    features: [
      '1 live game per week',
      'Full game scores & schedules',
      'Real-time updates',
      'Mobile optimized',
      'Community support',
    ],
    cta: 'Start Free Trial',
    popular: false,
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Pro Locker Room',
    price: '$79',
    period: '/month',
    description: 'Most popular for active communities',
    features: [
      '1 live game per day',
      'Everything in Starter',
      'Priority updates',
      'Advanced analytics',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Get Started',
    popular: true,
    gradient: 'from-brand-accent to-orange-600',
  },
  {
    name: 'Franchise Max',
    price: '$249',
    period: '/month',
    description: 'For premium communities that want it all',
    features: [
      'Unlimited live games',
      'Everything in Pro',
      'Custom branding (coming soon)',
      'API access (coming soon)',
      'Dedicated account manager',
      '24/7 priority support',
    ],
    cta: 'Go Premium',
    popular: false,
    gradient: 'from-purple-600 to-pink-600',
  },
]

export default function PricingPage() {
  return (
    <div className="py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent <span className="text-brand-accent">Pricing</span>
        </h1>
        <p className="text-lg opacity-70 max-w-2xl mx-auto">
          Choose the plan that fits your community. All plans include real-time NBA scores and updates.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border-2 ${
              plan.popular ? 'border-brand-accent shadow-2xl scale-105' : 'border-black/10 shadow-lg'
            } bg-white overflow-hidden transition-transform hover:scale-105`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-accent to-orange-600 text-white text-center py-2 text-sm font-semibold">
                ⭐ MOST POPULAR
              </div>
            )}

            <div className={`p-8 ${plan.popular ? 'pt-14' : ''}`}>
              {/* Plan Name */}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm opacity-60 mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-lg opacity-60">{plan.period}</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                className={`w-full py-4 rounded-xl font-bold text-white mb-8 transition-all hover:shadow-lg ${
                  plan.popular
                    ? 'bg-gradient-to-r from-brand-accent to-orange-600 hover:opacity-90'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {plan.cta}
              </button>

              {/* Features */}
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-4">
                  What&apos;s included
                </div>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <svg
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.popular ? 'text-brand-accent' : 'text-gray-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked <span className="text-brand-accent">Questions</span>
        </h2>

        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-2">How does the free trial work?</h3>
            <p className="text-sm opacity-70">
              All plans include a 7-day free trial. No credit card required to start. Cancel anytime during the trial with no charges.
            </p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">What counts as a &quot;live game&quot;?</h3>
            <p className="text-sm opacity-70">
              A live game is any NBA game that is currently in progress. Scheduled and final games don&apos;t count toward your limit.
            </p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
            <p className="text-sm opacity-70">
              Yes! Change your plan anytime. Upgrades take effect immediately. Downgrades apply at the next billing cycle.
            </p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">Is this per-user or per-community pricing?</h3>
            <p className="text-sm opacity-70">
              Per-community! One price covers your entire community, regardless of how many members you have.
            </p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-sm opacity-70">
              We accept all major credit cards, debit cards, and PayPal through our secure payment processor.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-24 text-center">
        <div className="inline-block bg-gradient-to-r from-brand-accent/10 to-orange-100 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg opacity-70 mb-8 max-w-xl mx-auto">
            Join hundreds of communities already using CourtPulse to keep their members engaged with live NBA action.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-accent to-orange-600 text-white font-bold hover:opacity-90 transition shadow-lg"
            >
              View Live Games
            </Link>
            <button className="px-8 py-4 rounded-xl border-2 border-brand-accent text-brand-accent font-bold hover:bg-brand-accent hover:text-white transition">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
