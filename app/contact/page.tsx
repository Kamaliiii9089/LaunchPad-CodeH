export default function Contact() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center mb-4 dark:text-white">Contact Us</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-16">
          Get in touch with our team. We'd love to hear from you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold mb-8 dark:text-white">Get in Touch</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-200">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-200">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-200">Subject</label>
                <input
                  type="text"
                  placeholder="How can we help?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-200">Message</label>
                <textarea
                  placeholder="Your message..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                ></textarea>
              </div>
              <button className="w-full btn-primary shadow-lg">Send Message</button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-8 dark:text-white">Contact Information</h2>
            <div className="space-y-8">
              <div>
                <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Email</h3>
                <p className="text-gray-600 dark:text-gray-400">support@breachbuddy.com</p>
                <p className="text-gray-600 dark:text-gray-400">hello@breachbuddy.com</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Phone</h3>
                <p className="text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Address</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  123 Security Street<br />
                  San Francisco, CA 94102<br />
                  United States
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 dark:text-gray-100">Business Hours</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                  Saturday - Sunday: Closed<br />
                  <span className="text-blue-500 font-semibold">24/7 Support for Premium Members</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
