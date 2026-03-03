export default function Blog() {
  const posts = [
    {
      title: "Top 5 Cybersecurity Tips for 2024",
      date: "January 30, 2026",
      category: "Security",
      excerpt: "Learn the essential cybersecurity practices that can protect your digital identity in 2024.",
      image: "📝",
    },
    {
      title: "Understanding Data Breaches",
      date: "January 25, 2026",
      category: "Education",
      excerpt: "A comprehensive guide on how data breaches occur and what you can do to protect yourself.",
      image: "📚",
    },
    {
      title: "Password Security: Best Practices",
      date: "January 20, 2026",
      category: "How-to",
      excerpt: "Master the art of creating and managing strong passwords to keep your accounts secure.",
      image: "🔑",
    },
    {
      title: "Two-Factor Authentication Explained",
      date: "January 15, 2026",
      category: "Education",
      excerpt: "Everything you need to know about 2FA and why it's crucial for your online security.",
      image: "🔐",
    },
    {
      title: "Phishing Attacks: How to Stay Safe",
      date: "January 10, 2026",
      category: "Security",
      excerpt: "Identify and avoid phishing scams that target unsuspecting users every day.",
      image: "🎣",
    },
    {
      title: "Privacy Settings Guide for Popular Apps",
      date: "January 5, 2026",
      category: "How-to",
      excerpt: "Step-by-step guide to securing your privacy on social media and popular applications.",
      image: "⚙️",
    },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center mb-4 dark:text-white">BreachBuddy Blog</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-16">
          Stay informed with the latest security insights and tips
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <article key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-transparent dark:border-gray-700 shadow-sm">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-6xl">
                {post.image}
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded">
                    {post.category}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{post.date}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">{post.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{post.excerpt}</p>
                <a href="#" className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300">
                  Read More →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
