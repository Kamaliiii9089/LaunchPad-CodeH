export default function FeaturesSection() {
  const features = [
    {
      icon: "🔍",
      title: "Real-time Monitoring",
      description: "Continuously monitor your accounts and get instant alerts for suspicious activity",
    },
    {
      icon: "⚠️",
      title: "Breach Detection",
      description: "Immediate notifications if your credentials appear in known data breaches",
    },
    {
      icon: "🔐",
      title: "Secure Password Vault",
      description: "Military-grade encrypted password manager with autofill capabilities",
    },
    {
      icon: "🛡️",
      title: "Identity Protection",
      description: "Comprehensive monitoring of your personal information across the internet",
    },
    {
      icon: "📊",
      title: "Security Reports",
      description: "Detailed insights into your security posture with actionable recommendations",
    },
    {
      icon: "📱",
      title: "Multi-Device Sync",
      description: "Access your security dashboard from any device, anywhere",
    },
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 dark:text-white">
          Powerful Security Features
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 text-center mb-16">
          Everything you need to protect your digital identity
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-3 dark:text-white">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
