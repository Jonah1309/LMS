export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-10">Last updated: September 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Ministry LMS, you agree to be bound by these Terms of Service.
            If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You must provide accurate information when registering. Accounts may not be shared or
            transferred.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Course Access & Enrollment</h2>
          <p>
            Upon successful payment, you receive a non-transferable license to access the enrolled
            course content for personal, non-commercial educational use. Course access is granted
            indefinitely unless the course is removed or your account is terminated for violations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Payments & Refunds</h2>
          <p>
            All prices are listed in USD or INR. Payments are processed securely by Stripe or
            Razorpay. Refunds may be requested within 7 days of purchase if you have not completed
            more than 20% of the course content. Approved refunds are processed within 5–10
            business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Instructor Content</h2>
          <p>
            Instructors retain ownership of their content. By publishing on Ministry LMS,
            instructors grant us a non-exclusive license to host, display, and deliver their
            content to enrolled students. Instructors are responsible for ensuring their content
            does not infringe third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Prohibited Conduct</h2>
          <p>You may not:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Share, resell, or redistribute course content</li>
            <li>Attempt to circumvent enrollment or payment gates</li>
            <li>Post spam, abusive content, or misinformation in Q&A or reviews</li>
            <li>Use automated tools to scrape or download course materials</li>
            <li>Impersonate other users, instructors, or staff</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Limitation of Liability</h2>
          <p>
            Ministry LMS is provided "as is." We make no warranties regarding uninterrupted access
            or the completeness of any course. Our liability is limited to the amount you paid for
            the relevant course.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the platform after changes
            constitutes acceptance. We will notify registered users by email for material changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:legal@ministry-lms.com" className="text-indigo-600 hover:underline">
              legal@ministry-lms.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
