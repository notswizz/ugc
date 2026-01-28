import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service - Giglet</title>
        <meta name="description" content="Giglet Terms of Service - Read our terms and conditions for using the Giglet platform." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
        {/* Header */}
        <header className="px-5 py-4 flex items-center gap-4 border-b border-gray-100">
          <Link href="/">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-sm">🎬</span>
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              giglet
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="px-5 py-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: January 28, 2025</p>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-600">
                By accessing or using Giglet ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
              <p className="text-gray-600">
                Giglet is a marketplace platform that connects brands seeking user-generated content (UGC) with content creators. We facilitate the posting of content creation opportunities ("Gigs"), the submission of content, and the processing of payments between parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
              <p className="text-gray-600 mb-2">To use Giglet, you must:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Be at least 18 years of age</li>
                <li>• Provide accurate and complete registration information</li>
                <li>• Maintain the security of your account credentials</li>
                <li>• Notify us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Creator Terms</h2>
              <p className="text-gray-600 mb-2">As a creator on Giglet, you agree to:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Create original content that meets gig requirements</li>
                <li>• Grant brands the rights specified in each gig</li>
                <li>• Not submit content that infringes on third-party rights</li>
                <li>• Comply with all applicable laws and platform guidelines</li>
                <li>• Provide accurate payment information for receiving funds</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Brand Terms</h2>
              <p className="text-gray-600 mb-2">As a brand on Giglet, you agree to:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Provide clear and accurate gig requirements</li>
                <li>• Fund gigs before creators begin work</li>
                <li>• Review submissions in a timely manner</li>
                <li>• Pay creators for approved content as agreed</li>
                <li>• Use content only as permitted by the gig terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Payments</h2>
              <p className="text-gray-600">
                Payments are processed through our payment provider, Stripe. By using our payment services, you also agree to Stripe's terms of service. Giglet may charge service fees as disclosed on the platform. Payouts to creators are processed after content approval.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Content Rights</h2>
              <p className="text-gray-600">
                Creators retain ownership of their content until a gig is completed and paid. Upon payment, the rights transfer to the brand as specified in the gig terms. Giglet may use anonymized content for platform promotion and marketing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Prohibited Conduct</h2>
              <p className="text-gray-600 mb-2">Users may not:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Violate any applicable laws or regulations</li>
                <li>• Post false, misleading, or fraudulent content</li>
                <li>• Harass, abuse, or harm other users</li>
                <li>• Circumvent platform fees or payment systems</li>
                <li>• Use automated systems to access the platform</li>
                <li>• Attempt to gain unauthorized access to our systems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Termination</h2>
              <p className="text-gray-600">
                We reserve the right to suspend or terminate accounts that violate these terms. Users may close their accounts at any time. Pending payments will be processed according to our standard procedures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Disclaimer of Warranties</h2>
              <p className="text-gray-600">
                The platform is provided "as is" without warranties of any kind. We do not guarantee the quality, accuracy, or reliability of content or users on the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Limitation of Liability</h2>
              <p className="text-gray-600">
                Giglet shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability is limited to the fees paid to us in the 12 months preceding any claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to Terms</h2>
              <p className="text-gray-600">
                We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. We will notify users of material changes via email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact</h2>
              <p className="text-gray-600">
                For questions about these Terms of Service, contact us at{" "}
                <a href="mailto:legal@gogiglet.com" className="text-orange-500 hover:underline">
                  legal@gogiglet.com
                </a>
              </p>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-5 py-6 border-t border-gray-100 mt-8">
          <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link href="/about" className="hover:text-gray-900">About</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
          </div>
          <p className="text-center text-gray-400 text-xs mt-4">© 2025 Giglet. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
