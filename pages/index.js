import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import AnimatedLogo from "@/components/branding/AnimatedLogo";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Home() {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading UGC Dash..." size="lg" />;
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
        <title>UGC Dash</title>
        <meta name="description" content="Be a UGC Dasher - Get real-time campaign offers and get paid fast" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white flex justify-center">
        <div className="w-full max-w-[428px] bg-white min-h-screen shadow-xl md:shadow-2xl">
          {/* Header */}
          <header className="border-b bg-white sticky top-0 z-50">
            <div className="px-4">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-2">
                  <img 
                    src="/logo1.PNG" 
                    alt="UGC Dash Logo" 
                    className="h-8 w-auto"
                  />
                  <span className="text-lg font-semibold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                    UGC Dash
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="h-9 px-3 text-sm">Sign In</Button>
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section - Compact */}
          <section className="px-4 pt-12 pb-8">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <img 
                  src="/logotext.PNG" 
                  alt="UGC Dash" 
                  className="h-16 w-auto"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                DoorDash for UGC
              </h1>
              <p className="text-sm text-gray-600 mb-8">
                Get campaigns. Create content. Get paid fast.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full bg-orange-600 hover:bg-orange-700 h-12">
                    Get Started
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="w-full h-12">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features - Compact Grid */}
          <section className="px-4 py-8">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <div className="text-3xl mb-2">📱</div>
                <h3 className="text-sm font-semibold mb-1">Real-Time</h3>
                <p className="text-xs text-gray-600">Instant notifications</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl mb-2">⚡</div>
                <h3 className="text-sm font-semibold mb-1">Fast Pay</h3>
                <p className="text-xs text-gray-600">Paid in 24hrs</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="text-sm font-semibold mb-1">Smart Match</h3>
                <p className="text-xs text-gray-600">Relevant offers</p>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl mb-2">🚗</div>
                <h3 className="text-sm font-semibold mb-1">Go Online</h3>
                <p className="text-xs text-gray-600">Accept anytime</p>
              </Card>
            </div>
          </section>

          {/* CTA - Compact */}
          <section className="px-4 py-8 bg-orange-600 text-white mx-4 rounded-lg mb-8">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Ready to Dash?</h2>
              <p className="text-sm text-orange-100 mb-4">Start earning from UGC gigs</p>
              <Link href="/auth/signup">
                <Button size="lg" className="w-full bg-white text-orange-600 hover:bg-orange-50 h-12">
                  Get Started
                </Button>
              </Link>
            </div>
          </section>

          {/* Footer - Minimal */}
          <footer className="px-4 py-6 border-t">
            <div className="text-center">
              <p className="text-xs text-gray-500">© 2025 UGC Dash</p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
