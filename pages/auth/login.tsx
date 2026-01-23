import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AnimatedLogo from '@/components/branding/AnimatedLogo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { ShieldCheck, Zap, BadgeCheck } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signInWithGoogle, user, appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is already logged in and redirect
  useEffect(() => {
    if (!loading && user && appUser) {
      checkOnboardingAndRedirect();
    }
  }, [user, appUser, loading]);

  const checkOnboardingAndRedirect = async () => {
    if (!user || !appUser) return;

    try {
      // Check if user has completed onboarding by checking for brand/creator profile
      if (appUser.role === 'brand') {
        const brandDoc = await getDoc(doc(db, 'brands', user.uid));
        if (brandDoc.exists()) {
          router.push('/brand/dashboard');
          return;
        }
      } else if (appUser.role === 'creator') {
        const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
        if (creatorDoc.exists()) {
          router.push('/creator/dashboard');
          return;
        }
      }

      // If no profile exists, go to role selection
      if (appUser.role) {
        router.push('/onboarding/role');
      } else {
        router.push('/onboarding/role');
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
      // Fallback to role selection on error
      router.push('/onboarding/role');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // The useEffect will handle redirect after auth state updates
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4 py-6 sm:py-8 relative overflow-hidden">
      {/* Subtle radial background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(251, 146, 60, 0.08) 0%, transparent 70%)'
        }}
      />
      
      <div className="w-full max-w-[420px] space-y-5 sm:space-y-7 relative z-10">
        {/* Brand Section */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          {/* Logo with sparkle animation */}
          <div 
            className={`flex justify-center mb-2 sm:mb-3 transition-all duration-400 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div 
              className="relative"
              style={{
                animation: mounted ? 'sparkle 0.6s ease-out 0.3s forwards' : 'none'
              }}
            >
              <AnimatedLogo size="xl" />
            </div>
          </div>

          {/* Title */}
          <h1 
            className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 transition-all duration-400 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Sign in to start earning
          </h1>

          {/* Subhead */}
          <p 
            className={`text-xs sm:text-sm text-gray-600 max-w-xs mx-auto leading-snug px-4 transition-all duration-400 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Grab gigs. Post. Get paid.
          </p>
        </div>

        {/* Auth Card */}
        <div 
          className={`transition-all duration-400 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Card className="border border-gray-200 shadow-lg bg-white rounded-2xl">
            <CardContent className="pt-5 pb-5 px-5 sm:pt-6 sm:pb-6 sm:px-6 space-y-4">
              {/* Primary CTA */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold bg-gray-900 hover:bg-gray-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] rounded-xl"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 sm:gap-3 justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="whitespace-nowrap">Continue with Google</span>
                  </div>
                )}
              </Button>

              {/* Legal text */}
              <p className="text-center text-[10px] sm:text-xs text-gray-400 pt-1 sm:pt-2 leading-tight">
                By continuing, you agree to{' '}
                <a href="#" className="text-gray-500 hover:text-gray-700 hover:underline transition-colors">Terms</a>
                {' '}&{' '}
                <a href="#" className="text-gray-500 hover:text-gray-700 hover:underline transition-colors">Privacy</a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Bullets */}
        <div 
          className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 transition-all duration-400 delay-400 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-900">Same-day payouts</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-900">Human verified</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-900">Protected payouts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
