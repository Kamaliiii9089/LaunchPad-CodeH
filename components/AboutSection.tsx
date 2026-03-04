import Link from "next/link";

export default function AboutSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 dark:text-white">
              Why Choose BreachBuddy?
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              In today's digital landscape, protecting your identity is more important than ever.
              BreachBuddy combines advanced technology with user-friendly design to give you peace
              of mind.
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
              Our team of security experts continuously monitors emerging threats and updates our
              systems to keep you safe from the latest cyber attacks.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3 text-xl">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Military-grade encryption</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3 text-xl">✓</span>
                <span className="text-gray-700 dark:text-gray-300">24/7 threat monitoring</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3 text-xl">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Privacy-first approach</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-500 font-bold mr-3 text-xl">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Expert customer support</span>
              </li>
            </ul>

            <Link href="/about" className="btn-primary inline-block">
              Learn More About Us
            </Link>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-8 text-white h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <p className="text-xl font-semibold">Your Security is Our Priority</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
