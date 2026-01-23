import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import AnimatedLogo from "@/components/branding/AnimatedLogo";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ComparisonChart from "@/components/ComparisonChart";

export default function Home() {
  const { user, appUser, loading } = useAuth();
  const [comparisonOpen, setComparisonOpen] = useState(false);

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

      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex justify-center">
        <div className="w-full max-w-[428px] bg-white min-h-screen shadow-2xl">
          {/* Header */}
          <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="px-4">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-2">
                  <img 
                    src="/logo1.png" 
                    alt="Giglet Logo" 
                    className="h-9 w-auto"
                  />
                  <span className="text-xl font-bold bg-gradient-to-r from-red-600 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                    Giglet
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="h-9 px-4 text-sm font-medium hover:bg-orange-50">Sign In</Button>
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="px-6 pt-16 pb-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-orange-100/30 to-transparent pointer-events-none" />
            <div className="text-center relative z-10">
              <div className="mb-8 flex justify-center">
                <img 
                  src="/logotext.png" 
                  alt="Giglet" 
                  className="h-20 w-auto drop-shadow-lg"
                />
              </div>
              <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
                🚀 The Future of UGC
              </div>
              <h1 className="text-4xl font-black text-gray-900 mb-4 leading-tight">
                DoorDash for<br/>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Content Creators
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                Get gigs instantly. Create amazing content.<br/>Get paid instantly. 💰
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 h-14 text-base font-semibold shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40">
                    🎬 Start Creating
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="w-full h-14 text-base font-semibold border-2 hover:bg-orange-50 hover:border-orange-300">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Stats Bar */}
          <section className="px-6 py-6 bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold mb-1">⚡</div>
                <div className="text-xs opacity-90">Instant Match</div>
              </div>
              <div>
                <div className="text-2xl font-bold mb-1">💰</div>
                <div className="text-xs opacity-90">Instant Pay</div>
              </div>
              <div>
                <div className="text-2xl font-bold mb-1">🔥</div>
                <div className="text-xs opacity-90">Hot Gigs</div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="px-6 py-12">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Why Creators Love Giglet
            </h2>
            <div className="mb-6 text-center">
              <Button
                variant="outline"
                onClick={() => setComparisonOpen(true)}
                className="text-sm font-medium border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
              >
                📊 See How We Compare
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 text-center border-2 hover:border-orange-300 hover:shadow-lg transition-all cursor-default">
                <div className="text-4xl mb-3">📱</div>
                <h3 className="text-base font-bold mb-2">Real-Time Gigs</h3>
                <p className="text-xs text-gray-600">Get notified instantly when brands post gigs you're perfect for</p>
              </Card>
              <Card className="p-5 text-center border-2 hover:border-orange-300 hover:shadow-lg transition-all cursor-default">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="text-base font-bold mb-2">Instant Payments</h3>
                <p className="text-xs text-gray-600">Get paid instantly upon approval. No waiting!</p>
              </Card>
              <Card className="p-5 text-center border-2 hover:border-orange-300 hover:shadow-lg transition-all cursor-default">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-base font-bold mb-2">Smart Matching</h3>
                <p className="text-xs text-gray-600">Our AI matches you with gigs you'll actually love</p>
              </Card>
              <Card className="p-5 text-center border-2 hover:border-orange-300 hover:shadow-lg transition-all cursor-default">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-base font-bold mb-2">Go Online</h3>
                <p className="text-xs text-gray-600">Accept gigs anytime, anywhere. Work on your schedule</p>
              </Card>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-6 py-12 bg-gradient-to-b from-orange-50 to-white">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              How It Works
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Browse Hot Gigs</h3>
                  <p className="text-sm text-gray-600">See real-time gig offers from brands looking for creators like you</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Accept & Create</h3>
                  <p className="text-sm text-gray-600">Tap to accept gigs you love. Create amazing content on your terms</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Get Paid Instantly</h3>
                  <p className="text-sm text-gray-600">Submit your content and get paid instantly. Cha-ching! 💸</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-6 py-12 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white mx-6 rounded-2xl mb-12 shadow-2xl">
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-black mb-3">Ready to Start?</h2>
              <p className="text-lg text-orange-100 mb-6 leading-relaxed">
                Join thousands of creators earning from<br/>UGC gigs on their own schedule
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="w-full bg-white text-orange-600 hover:bg-orange-50 h-14 text-base font-bold shadow-xl transition-all hover:scale-105">
                  🚀 Get Started for Free
                </Button>
              </Link>
              <p className="text-xs text-orange-200 mt-4">No credit card required • Free forever</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="px-6 py-8 border-t bg-gray-50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <img 
                  src="/logo1.png" 
                  alt="Giglet Logo" 
                  className="h-6 w-auto"
                />
                <span className="font-bold text-gray-900">Giglet</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">The DoorDash of UGC</p>
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
