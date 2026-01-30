export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="text-5xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-700">
              BreachBuddy ("we", "us", "our", or "Company") operates the BreachBuddy service. 
              This page informs you of our policies regarding the collection, use, and disclosure 
              of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information Collection and Use</h2>
            <p className="text-gray-700 mb-3">
              We collect several different types of information for various purposes to provide 
              and improve our Service to you.
            </p>
            <h3 className="text-xl font-semibold mb-2">Types of Data Collected:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Personal identification information (name, email address, phone number, etc.)</li>
              <li>Device information (IP address, browser type, device type)</li>
              <li>Usage information (how you interact with our Service)</li>
              <li>Security information (for breach detection and monitoring)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Use of Data</h2>
            <p className="text-gray-700 mb-3">
              BreachBuddy uses the collected data for various purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information about our Service usage</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical and security issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Security of Data</h2>
            <p className="text-gray-700">
              The security of your data is important to us but remember that no method of 
              transmission over the Internet or method of electronic storage is 100% secure. 
              While we strive to use commercially acceptable means to protect your Personal Data, 
              we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Changes to This Privacy Policy</h2>
            <p className="text-gray-700">
              We may update our Privacy Policy from time to time. We will notify you of any 
              changes by posting the new Privacy Policy on this page and updating the "Last Updated" 
              date at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at 
              privacy@breachbuddy.com
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
