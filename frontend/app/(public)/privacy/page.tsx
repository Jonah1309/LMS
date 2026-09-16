export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-10">Last updated: September 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Information We Collect</h2>
          <p>
            We collect information you provide directly: your name, email address, and any profile
            information you add. When you enroll in a course or make a purchase, we also collect
            payment details (processed securely by Stripe or Razorpay — we do not store your card
            number). We automatically collect usage data such as pages visited, courses viewed,
            video watch time, and quiz scores.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide, maintain, and improve our platform</li>
            <li>Process transactions and send related receipts</li>
            <li>Track your learning progress and issue completion certificates</li>
            <li>Send course updates and promotional content (you may opt out at any time)</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Data Sharing</h2>
          <p>
            We do not sell your personal data. We share data only with service providers necessary
            to operate the platform (payment processors, cloud hosting, email delivery) and when
            required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Cookies</h2>
          <p>
            We use cookies and similar technologies to keep you logged in, remember preferences,
            and analyze usage patterns. You can control cookie preferences using our cookie consent
            banner.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Your Rights (GDPR)</h2>
          <p>If you are located in the European Economic Area, you have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request erasure of your personal data</li>
            <li>Object to or restrict processing</li>
            <li>Data portability</li>
          </ul>
          <p className="mt-3">
            You can exercise these rights from your{" "}
            <a href="/account/privacy" className="text-indigo-600 hover:underline">
              Privacy & Data settings
            </a>{" "}
            page, where you can download all your data or delete your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active. If you delete your
            account, your personal information is anonymized immediately. Anonymized records
            (purchase history, completion records) are retained for accounting and legal purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Contact</h2>
          <p>
            For privacy inquiries, contact us at{" "}
            <a href="mailto:privacy@ministry-lms.com" className="text-indigo-600 hover:underline">
              privacy@ministry-lms.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
