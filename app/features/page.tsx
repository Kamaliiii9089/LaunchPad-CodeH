export default function Features() {
  const features = [
    {
      title: "Real-time Monitoring",
      description: "Continuously monitor your digital presence across multiple platforms and get instant alerts.",
      icon: "🔍",
    },
    {
      title: "Data Breach Detection",
      description: "Get notified immediately if your credentials appear in known data breaches.",
      icon: "⚠️",
    },
    {
      title: "Password Management",
      description: "Securely store and manage all your passwords in one encrypted vault.",
      icon: "🔐",
    },
    {
      title: "Multi-Device Support",
      description: "Access your security dashboard from any device, anywhere, anytime.",
      icon: "📱",
    },
    {
      title: "Detailed Reports",
      description: "Get comprehensive security reports and actionable recommendations.",
      icon: "📊",
    },
    {
      title: "24/7 Support",
      description: "Our security experts are available round the clock to assist you.",
      icon: "👨‍💼",
    },
  ];

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center mb-4">Our Features</h1>
        <p className="text-xl text-gray-600 text-center mb-16">
          Comprehensive security tools to protect your digital identity
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
