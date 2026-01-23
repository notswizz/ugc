import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import AnimatedLogo from "@/components/branding/AnimatedLogo";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ComparisonChart from "@/components/ComparisonChart";

export default function Home() {
  const { user, appUser, loading } = useAuth();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading Giglet..." size="lg" />;
  }

  // If user is logged in, redirect to their dashboard
  if (user && appUser) {
    console.log('User logged in:', user.email, 'Role:', appUser.role);
    if (appUser.role === 'creator') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="mb-4">Welcome back, {appUser.name}!</p>
            <p className="mb-4">Redirecting to your creator dashboard...</p>
            <Link href="/creator/dashboard">
              <Button>Go to Creator Dashboard</Button>
            </Link>
          </div>
        </div>
      );
    } else if (appUser.role === 'brand') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="mb-4">Welcome back, {appUser.name}!</p>
            <p className="mb-4">Redirecting to your brand dashboard...</p>
            <Link href="/brand/dashboard">
              <Button>Go to Brand Dashboard</Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  console.log('No user logged in, showing landing page');

  return (
    <>
      <Head>
        <title>Giglet - DoorDash for UGC</title>
        <meta name="description" content="Get real-time UGC gigs. Create awesome content. Get paid fast. Join the gig economy for creators." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex justify-center">
        <div className="w-full max-w-[428px] bg-white min-h-screen shadow-2xl">
          {/* Header */}
          <header className="bg-white sticky top-0 z-50 border-b border-gray-200/60">
            <div className="px-4">
              <div className="flex justify-between items-center h-14">
                <div className="flex items-center gap-1.5">
                  <img 
                    src="/logo1.png" 
                    alt="Giglet Logo" 
                    className="h-6 w-auto"
                  />
                  <span className="text-lg font-semibold text-gray-900">
                    Giglet
                  </span>
                </div>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100">Sign In</Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="px-6 pt-8 pb-8 relative">
            <div className="text-center">
              {/* Logo in Glass Card */}
              <div 
                className={`mb-6 flex justify-center transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div 
                  className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50"
                  style={{
                    animation: mounted ? 'sparkle 0.6s ease-out 0.3s forwards' : 'none'
                  }}
                >
                  <img 
                    src="/logotext.png" 
                    alt="Giglet" 
                    className="h-16 w-auto"
                  />
                </div>
              </div>

              {/* Confidence Pill */}
              <div 
                className={`inline-block px-4 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-5 transition-all duration-700 delay-100 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                ⚡ Paid gigs. No pitching.
              </div>

              {/* Headline */}
              <h1 
                className={`text-4xl font-black text-gray-900 mb-3 leading-tight transition-all duration-700 delay-200 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                Get Paid to Post
              </h1>

              {/* Subheadline */}
              <p 
                className={`text-base text-gray-600 mb-6 leading-snug transition-all duration-700 delay-300 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                Brands post gigs. You grab one,<br/>post naturally, and get paid.
              </p>

              {/* 3-Step Micro Flow */}
              <div 
                className={`flex items-center justify-center gap-2 mb-8 text-xs text-gray-500 transition-all duration-700 delay-400 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Grab a Gig</span>
                </span>
                <span className="text-gray-300">→</span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Post</span>
                </span>
                <span className="text-gray-300">→</span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Get Paid</span>
                </span>
              </div>

              {/* Primary CTA */}
              <div 
                className={`mb-3 transition-all duration-700 delay-500 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <Link href="/auth/signup">
                  <Button 
                    size="lg" 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-14 text-base font-bold shadow-lg transition-all duration-200 active:scale-[0.98] pulse-after-idle"
                  >
                    💸 Start Earning
                  </Button>
                </Link>
              </div>

              {/* Secondary CTA */}
              <div 
                className={`mb-6 transition-all duration-700 delay-600 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <Link href="/auth/login">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full h-11 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Social Proof Strip */}
              <div 
                className={`flex items-center justify-center gap-6 text-xs text-gray-500 transition-all duration-700 delay-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">👥</span>
                  <span>2,100+ creators</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">💰</span>
                  <span>$18k paid out</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">⚡</span>
                  <span>Same-day payouts</span>
                </div>
              </div>
            </div>
          </section>


          {/* Features Grid */}
          <section className="px-6 py-10 bg-gray-50/50">
            <div className="mb-6 text-center">
              <Button
                variant="outline"
                onClick={() => setComparisonOpen(true)}
                className="text-xs font-medium border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                📊 See How We Compare
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-default bg-white">
                <div className="text-3xl mb-2">📱</div>
                <h3 className="text-sm font-bold mb-1 text-gray-900">Real-Time Gigs</h3>
                <p className="text-xs text-gray-600 leading-tight">Get notified instantly when brands post gigs</p>
              </Card>
              <Card className="p-4 text-center border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-default bg-white">
                <div className="text-3xl mb-2">💰</div>
                <h3 className="text-sm font-bold mb-1 text-gray-900">Instant Payments</h3>
                <p className="text-xs text-gray-600 leading-tight">Get paid instantly upon approval</p>
              </Card>
              <Card className="p-4 text-center border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-default bg-white">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="text-sm font-bold mb-1 text-gray-900">Smart Matching</h3>
                <p className="text-xs text-gray-600 leading-tight">AI matches you with perfect gigs</p>
              </Card>
              <Card className="p-4 text-center border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-default bg-white">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-sm font-bold mb-1 text-gray-900">Work Anywhere</h3>
                <p className="text-xs text-gray-600 leading-tight">Accept gigs on your schedule</p>
              </Card>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-6 py-10">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-6">
              How It Works
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">Browse Gigs</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">See real-time gig offers from brands</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">Accept & Post</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">Tap to accept, create content naturally</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">Get Paid</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">Submit and get paid instantly</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-10 bg-gray-900 text-white mx-6 rounded-2xl mb-8 shadow-xl">
            <div className="text-center">
              <h2 className="text-2xl font-black mb-2">Ready to Start?</h2>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Join thousands earning from<br/>UGC gigs on their schedule
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="w-full bg-white text-gray-900 hover:bg-gray-100 h-12 text-sm font-bold shadow-lg transition-all active:scale-[0.98]">
                  💸 Start Earning
                </Button>
              </Link>
              <p className="text-xs text-gray-400 mt-3">No credit card required</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="px-6 py-6 border-t border-gray-200 bg-white">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img 
                  src="/logo1.png" 
                  alt="Giglet Logo" 
                  className="h-5 w-auto"
                />
                <span className="font-semibold text-gray-900 text-sm">Giglet</span>
              </div>
              <p className="text-xs text-gray-400">© 2025 Giglet. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
      
      {/* Comparison Chart Modal */}
      <ComparisonChart open={comparisonOpen} onOpenChange={setComparisonOpen} />
    </>
  );
}
