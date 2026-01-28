import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <>
      <Head>
        <title>About - Giglet</title>
        <meta name="description" content="Learn about Giglet - the UGC creator marketplace connecting brands with authentic content creators." />
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
          <h1 className="text-3xl font-black text-gray-900 mb-6">About Giglet</h1>
          
          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">What We Do</h2>
              <p className="text-gray-600 mb-4">
                Giglet is a UGC (User-Generated Content) marketplace that connects brands with authentic content creators. We make it simple: brands post paid gigs, creators grab them, create content, and get paid instantly.
              </p>
              <p className="text-gray-600">
                No pitching. No invoicing. No waiting weeks for payment. Just grab a gig, create great content, and get paid.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">For Creators</h2>
              <ul className="text-gray-600 space-y-2">
                <li>• Browse available gigs from real brands</li>
                <li>• See pay rates, requirements, and deadlines upfront</li>
                <li>• Create authentic content your way</li>
                <li>• Get paid same-day via instant payouts</li>
                <li>• Level up to unlock higher-paying opportunities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">For Brands</h2>
              <ul className="text-gray-600 space-y-2">
                <li>• Post gigs and get authentic UGC content</li>
                <li>• Access thousands of vetted creators</li>
                <li>• Set your budget, requirements, and timeline</li>
                <li>• Review and approve content before payment</li>
                <li>• Scale your content production efficiently</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h2>
              <p className="text-gray-600">
                We believe creating content should be simple and rewarding. Our mission is to empower creators to earn from their creativity while helping brands get authentic content that resonates with real audiences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
              <p className="text-gray-600">
                Have questions? Reach out to us at{" "}
                <a href="mailto:support@gogiglet.com" className="text-orange-500 hover:underline">
                  support@gogiglet.com
                </a>
              </p>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-10 p-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-2xl text-center">
            <h2 className="text-xl font-bold text-white mb-2">Ready to get started?</h2>
            <p className="text-white/80 text-sm mb-4">Join Giglet today and start earning.</p>
            <Link href="/auth/signup">
              <Button className="bg-white text-purple-600 font-bold px-8 py-3 rounded-xl">
                Sign Up Free
              </Button>
            </Link>
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
