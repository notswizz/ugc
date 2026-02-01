import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Giglet</title>
        <meta name="description" content="Giglet Privacy Policy - Learn how we collect, use, and protect your personal information." />
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
          <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-8">Last updated: January 28, 2025</p>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-gray-600">
                Giglet ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Personal Information</h3>
              <p className="text-gray-600 mb-2">We collect information you provide directly, including:</p>
              <ul className="text-gray-600 space-y-1 ml-4 mb-4">
                <li>• Name and email address</li>
                <li>• Phone number (for verification)</li>
                <li>• Social media account information</li>
                <li>• Payment and banking information</li>
                <li>• Profile information and content you upload</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">Automatically Collected Information</h3>
              <p className="text-gray-600 mb-2">We automatically collect:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Device information (type, operating system)</li>
                <li>• IP address and location data</li>
                <li>• Browser type and settings</li>
                <li>• Usage data (pages visited, features used)</li>
                <li>• Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <p className="text-gray-600 mb-2">We use your information to:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Provide and maintain our services</li>
                <li>• Process transactions and send related information</li>
                <li>• Verify your identity and prevent fraud</li>
                <li>• Connect creators with brands</li>
                <li>• Send notifications about gigs and platform updates</li>
                <li>• Improve our platform and develop new features</li>
                <li>• Respond to your requests and support inquiries</li>
                <li>• Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Information Sharing</h2>
              <p className="text-gray-600 mb-2">We may share your information with:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• <strong>Other users:</strong> Creators and brands can see relevant profile information to facilitate gigs</li>
                <li>• <strong>Service providers:</strong> Third parties that help us operate our platform (payment processors, hosting providers)</li>
                <li>• <strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                <li>• <strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payment Information</h2>
              <p className="text-gray-600">
                Payment processing is handled by Stripe. Your payment information is transmitted directly to Stripe and is subject to their privacy policy. We do not store complete credit card numbers or bank account details on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Security</h2>
              <p className="text-gray-600">
                We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
              <p className="text-gray-600">
                We retain your information for as long as your account is active or as needed to provide services. We may retain certain information as required by law or for legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
              <p className="text-gray-600 mb-2">Depending on your location, you may have the right to:</p>
              <ul className="text-gray-600 space-y-1 ml-4">
                <li>• Access the personal information we hold about you</li>
                <li>• Request correction of inaccurate information</li>
                <li>• Request deletion of your information</li>
                <li>• Object to or restrict processing of your information</li>
                <li>• Data portability</li>
                <li>• Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Cookies</h2>
              <p className="text-gray-600">
                We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Third-Party Links</h2>
              <p className="text-gray-600">
                Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Children's Privacy</h2>
              <p className="text-gray-600">
                Giglet is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected information from a child, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to This Policy</h2>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact Us</h2>
              <p className="text-gray-600">
                If you have questions about this Privacy Policy or our data practices, please contact us at{" "}
                <a href="mailto:privacy@gogiglet.com" className="text-orange-500 hover:underline">
                  privacy@gogiglet.com
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
          <p className="text-center text-gray-400 text-xs mt-4">© 2025 Giglet. All rights reserved<Link href="/auth/login" className="text-gray-300 hover:text-gray-500">.</Link></p>
        </footer>
      </div>
    </>
  );
}
