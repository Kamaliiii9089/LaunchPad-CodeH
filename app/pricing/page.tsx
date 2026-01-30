export default function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "$9.99",
      period: "/month",
      features: [
        "Basic monitoring",
        "Email alerts",
        "Password manager (50 entries)",
        "Mobile app access",
      ],
      cta: "Start Free Trial",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "/month",
      features: [
        "Advanced monitoring",
        "Real-time alerts",
        "Unlimited password storage",
        "Family account (up to 5)",
        "Priority support",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: [
        "Complete monitoring suite",
        "Instant alerts",
        "Unlimited everything",
        "Team management",
        "24/7 dedicated support",
        "Custom integrations",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center mb-4">Pricing Plans</h1>
        <p className="text-xl text-gray-600 text-center mb-16">
          Choose the perfect plan for your security needs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg p-8 ${
                plan.highlighted
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-50"
              }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-gray-500">{plan.period}</span>}
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <span className="mr-3">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-white text-blue-600 hover:bg-gray-100"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
