import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import LoadingSpinner from "@/components/ui/loading-spinner";
import WaitlistForm from "@/components/waitlist/WaitlistForm";

export default function Home() {
  const { user, appUser, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." size="lg" />;
  }

  if (user && appUser) {
    const dashboardUrl = appUser.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="text-white text-lg mb-2">Welcome back!</p>
          <p className="text-gray-400 mb-6">Redirecting...</p>
          <Link href={dashboardUrl}>
            <Button className="bg-white text-black rounded-full px-6 py-3 font-semibold">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Giglet - Get Paid to Create</title>
        <meta name="title" content="Giglet - Get Paid to Create" />
        <meta name="description" content="The creator marketplace. Grab gigs, post content, get paid instantly." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <header className="px-6 py-6 flex justify-center">
          <img src="/logo1.png" alt="Giglet" className="h-12" />
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col justify-center px-6 pb-12">
          <div className={`text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
              Get Paid to<br />
              <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Create
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-gray-400 mb-10 max-w-sm mx-auto leading-relaxed">
              Brands post gigs. You grab one, create content, get paid instantly.
            </p>

            {/* CTA */}
            <Button
              onClick={() => setShowWaitlist(true)}
              className="bg-white text-black text-lg px-10 py-6 rounded-full font-bold hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              Join the Waitlist
            </Button>

            {/* Bonus note */}
            <p className="mt-6 text-sm text-gray-500">
              Get <span className="text-green-400 font-semibold">$10 free</span> when we launch
            </p>
          </div>
        </main>

        {/* Features */}
        <section className={`px-6 pb-12 transition-all duration-700 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">⚡</span>
              </div>
              <p className="text-xs text-gray-400">Instant<br/>Payout</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🎯</span>
              </div>
              <p className="text-xs text-gray-400">No<br/>Pitching</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📱</span>
              </div>
              <p className="text-xs text-gray-400">Post to<br/>Your Socials</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-6 text-center border-t border-gray-900">
          <div className="flex justify-center gap-6 text-xs text-gray-600">
            <Link href="/about" className="hover:text-gray-400">About</Link>
            <Link href="/terms" className="hover:text-gray-400">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
          </div>
        </footer>
      </div>

      {/* Waitlist Modal */}
      <Dialog open={showWaitlist} onOpenChange={setShowWaitlist}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-0 p-0">
          <div className="p-6">
            <WaitlistForm onClose={() => setShowWaitlist(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
