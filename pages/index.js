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
        <title>UGC Dash - DoorDash for UGC Creators</title>
        <meta name="description" content="Be a UGC Dasher! Get real-time campaign offers, accept gigs instantly, create authentic content, and get paid fast. DoorDash for user-generated content." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="UGC Dash" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <AnimatedLogo size="lg" showText />
              </Link>
              <div className="flex gap-4">
                <Link href="/auth/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex flex-col items-center gap-8 mb-8">
              <div className="flex justify-center">
                <AnimatedLogo size="xl" />
              </div>
              <img 
                src="/logotext.PNG" 
                alt="UGC Dash" 
                className="h-24 md:h-32 lg:h-40 w-auto"
              />
            </div>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
              DoorDash for UGC. Be a creator "dasher" - get notified of campaigns matching your skills,
              accept gigs instantly, deliver authentic content, and get paid fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                  🚗 Become a Dasher
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  📦 Post Campaign
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Why Choose UGC Dock?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Built for creators and brands who value authenticity and quality
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-2xl mb-2">📱</CardTitle>
                  <CardTitle>Real-Time Offers</CardTitle>
                  <CardDescription>
                    Get notified instantly when campaigns match your skills and location
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Push notifications for urgent gigs. Accept or decline in seconds
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-2xl mb-2">⚡</CardTitle>
                  <CardTitle>Fast & Fair Pay</CardTitle>
                  <CardDescription>
                    Guaranteed payment within 24 hours of brand approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No waiting periods. Get paid like DoorDash drivers
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-2xl mb-2">🎯</CardTitle>
                  <CardTitle>Smart Qualification</CardTitle>
                  <CardDescription>
                    Only receive offers for campaigns you can actually complete
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Tags, location, and past performance determine your opportunities
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Simple, transparent process from campaign to payment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  🚗
                </div>
                <h3 className="text-xl font-semibold mb-2">Go Online</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Activate your dasher status and get ready to receive offers
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  📱
                </div>
                <h3 className="text-xl font-semibold mb-2">Get Offers</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Receive push notifications for campaigns matching your profile
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  ⚡
                </div>
                <h3 className="text-xl font-semibold mb-2">Accept & Create</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Quick accept/decline. Create authentic content on your timeline
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  💰
                </div>
                <h3 className="text-xl font-semibold mb-2">Get Paid Fast</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Brand approves, you get paid within 24 hours
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-orange-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Dash?
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Download the app, go online, and start earning from UGC gigs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50">
                  🚗 Start Dashing
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-orange-600">
                  📦 Post Campaign
                </Button>
              </Link>
            </div>
            <p className="text-orange-200 mt-4 text-sm">
              📱 Add to home screen for the full experience
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white border-t border-slate-800">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-4">
              <h3 className="text-2xl font-bold">UGC Dock</h3>
            </div>
            <p className="text-slate-400 mb-4">
              Connecting brands with creators for authentic user-generated content
            </p>
            <p className="text-sm text-slate-500">
              © 2025 UGC Dock. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
