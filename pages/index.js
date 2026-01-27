import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import LoadingSpinner from "@/components/ui/loading-spinner";
import confetti from "canvas-confetti";

export default function Home() {
  const { user, appUser, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f97316', '#ec4899', '#8b5cf6']
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." size="lg" />;
  }

  // Redirect logged-in users
  if (user && appUser) {
    const dashboardUrl = appUser.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 via-white to-orange-50 px-6">
        <div className="text-center">
          <p className="text-gray-900 text-lg mb-2">Welcome back!</p>
          <p className="text-gray-500 mb-6">Redirecting...</p>
          <Link href={dashboardUrl}>
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl px-6 py-3">
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
        <meta name="description" content="Grab gigs, post content, get paid instantly." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#fff7ed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 text-gray-900 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="relative z-50 px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">🎬</span>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              giglet
            </span>
          </div>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 text-sm px-3">
              Sign In
            </Button>
          </Link>
        </header>

        {/* Hero */}
        <section className="relative z-10 flex-1 flex flex-col justify-center px-5 pb-8">
          {/* Live badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm w-fit mb-6 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-gray-600">12 gigs live now</span>
          </div>

          {/* Headline */}
          <h1 className={`text-[2.75rem] leading-[1.1] font-black mb-4 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="text-gray-900">Get Paid to </span>
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">Create</span>
          </h1>

          {/* Subheadline */}
          <p className={`text-lg text-gray-500 mb-8 leading-relaxed transition-all duration-500 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Brands post gigs. You grab one, post content, get paid. <span className="text-orange-500 font-medium">No pitching.</span>
          </p>

          {/* Stats row */}
          <div className={`flex gap-6 mb-10 transition-all duration-500 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div>
              <div className="text-2xl font-black text-orange-500">2.1k+</div>
              <div className="text-xs text-gray-400">Creators</div>
            </div>
            <div>
              <div className="text-2xl font-black text-pink-500">$18k</div>
              <div className="text-xs text-gray-400">Paid Out</div>
            </div>
            <div>
              <div className="text-2xl font-black text-purple-500">24hr</div>
              <div className="text-xs text-gray-400">Avg Payout</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={`space-y-3 transition-all duration-500 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link href="/auth/signup" className="block">
              <Button 
                onClick={triggerConfetti}
                className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white text-lg py-6 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-[0.98] transition-transform"
              >
                Start Earning 💸
              </Button>
            </Link>
            <Link href="/auth/login" className="block">
              <Button 
                variant="outline"
                className="w-full border-gray-200 bg-white text-gray-700 py-6 rounded-2xl font-semibold active:scale-[0.98] transition-transform shadow-sm"
              >
                I'm a Brand
              </Button>
            </Link>
          </div>
        </section>

        {/* How it works - scrollable cards */}
        <section className="relative z-10 pb-8">
          <h2 className="px-5 text-lg font-bold text-gray-900 mb-4">How it works</h2>
          <div className="flex gap-3 px-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            <div className="flex-shrink-0 w-[75vw] snap-start bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl mb-4">
                🎯
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Grab a Gig</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Browse gigs from brands. See pay, requirements, deadline upfront.</p>
            </div>
            <div className="flex-shrink-0 w-[75vw] snap-start bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl mb-4">
                📱
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Create & Post</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Make authentic content your way. Post to your socials.</p>
            </div>
            <div className="flex-shrink-0 w-[75vw] snap-start bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mr-5">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-xl flex items-center justify-center text-2xl mb-4">
                💰
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Get Paid</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Submit your link, get approved, money hits your account.</p>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="relative z-10 px-5 pb-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Instant Alerts</h3>
              <p className="text-xs text-gray-500">Get pinged when gigs drop</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Smart Match</h3>
              <p className="text-xs text-gray-500">AI finds your best gigs</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-2">💳</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Same-Day Pay</h3>
              <p className="text-xs text-gray-500">No waiting weeks</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-2">📈</div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">Level Up</h3>
              <p className="text-xs text-gray-500">Unlock better gigs</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA card */}
        <section className="relative z-10 px-5 pb-6">
          <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-2xl p-6 text-center shadow-lg">
            <h2 className="text-xl font-bold text-white mb-2">Ready to earn?</h2>
            <p className="text-sm text-white/80 mb-4">Join thousands getting paid for content.</p>
            <Link href="/auth/signup">
              <Button 
                onClick={triggerConfetti}
                className="bg-white text-purple-600 font-bold px-8 py-3 rounded-xl active:scale-[0.98] transition-transform shadow-md"
              >
                Get Started 🚀
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 px-5 py-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xs">🎬</span>
              </div>
              <span className="text-sm font-bold text-gray-400">giglet</span>
            </div>
            <p className="text-gray-300 text-xs">© 2025</p>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
