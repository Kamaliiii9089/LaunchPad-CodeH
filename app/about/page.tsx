export default function About() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold mb-8 dark:text-white">About BreachBuddy</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold mb-4 dark:text-gray-100">Our Mission</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              At BreachBuddy, we believe that everyone deserves to have complete control over their
              digital footprint. Our mission is to empower individuals and businesses with
              cutting-edge security tools that make protecting your data simple and accessible.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              In a world where data breaches are increasingly common, we're here to ensure you
              stay one step ahead of cyber threats.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-gray-800 p-8 rounded-lg border border-transparent dark:border-gray-700">
            <h2 className="text-3xl font-bold mb-4 dark:text-white">Why Choose Us?</h2>
            <ul className="space-y-4 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">✓</span>
                <span>Industry-leading security experts</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">✓</span>
                <span>Military-grade encryption</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">✓</span>
                <span>Real-time threat detection</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">✓</span>
                <span>14-day free trial</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 font-bold mr-3">✓</span>
                <span>No credit card required</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 dark:text-white">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "John Smith", role: "CEO & Founder" },
              { name: "Sarah Johnson", role: "Chief Security Officer" },
              { name: "Mike Chen", role: "Head of Product" },
            ].map((member, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-transparent dark:border-gray-700">
                <div className="w-24 h-24 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-bold dark:text-white">{member.name}</h3>
                <p className="text-gray-600 dark:text-gray-400">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-600 text-white p-12 rounded-lg text-center shadow-xl">
          <h2 className="text-3xl font-bold mb-4">Our Commitment</h2>
          <p className="text-lg">
            We are committed to providing you with the best security solutions, transparent
            practices, and exceptional customer support. Your trust is our responsibility.
          </p>
        </div>
      </div>
    </main>
  );
}
