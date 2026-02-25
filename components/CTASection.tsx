import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-20 bg-blue-600 dark:bg-blue-800 text-white transition-colors duration-300">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Take Control of Your Digital Security?
        </h2>
        <p className="text-xl mb-12 text-blue-100 dark:text-blue-200 max-w-2xl mx-auto">
          Join thousands of users who trust BreachBuddy to protect their digital identity.
          Start your free 14-day trial today.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
          <Link
            href="/signup"
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors text-lg"
          >
            Start Free Trial
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 bg-blue-400 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors text-lg"
          >
            View Pricing
          </Link>
        </div>

        <p className="text-blue-200">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
