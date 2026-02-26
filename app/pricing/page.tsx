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
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center mb-4 dark:text-white">Pricing Plans</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-16">
          Choose the perfect plan for your security needs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg p-8 transition-all duration-300 ${plan.highlighted
                  ? "bg-blue-600 text-white shadow-xl scale-105 z-10"
                  : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md"
                }`}
            >
              <h3 className={`text-2xl font-bold mb-2 ${!plan.highlighted && 'dark:text-white'}`}>{plan.name}</h3>
              <div className="mb-6">
                <span className={`text-4xl font-bold ${!plan.highlighted && 'dark:text-white'}`}>{plan.price}</span>
                {plan.period && <span className={plan.highlighted ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}>{plan.period}</span>}
              </div>
              <ul className="mb-8 space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <span className={`mr-3 ${plan.highlighted ? "text-blue-200" : "text-green-500"}`}>✓</span>
                    <span className={plan.highlighted ? "text-white" : "dark:text-gray-300"}>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-4 rounded-lg font-bold transition-all ${plan.highlighted
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
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
