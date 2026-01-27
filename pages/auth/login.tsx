import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { signInWithGoogle, user, appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user && appUser) {
      checkOnboardingAndRedirect();
    }
  }, [user, appUser, loading]);

  const checkOnboardingAndRedirect = async () => {
    if (!user || !appUser) return;

    try {
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
      router.push('/onboarding/role');
    } catch (error) {
      console.error('Error checking onboarding:', error);
      router.push('/onboarding/role');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - Giglet</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[60%] bg-gradient-to-b from-purple-600/20 via-pink-500/10 to-transparent blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-50 px-5 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-lg">🎬</span>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              giglet
            </span>
          </Link>
        </header>

        {/* Main content */}
        <main className="relative z-10 flex-1 flex flex-col justify-center px-5 pb-12">
          {/* Title */}
          <div className={`mb-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl font-black mb-2">Welcome back</h1>
            <p className="text-white/50">Sign in to continue earning</p>
          </div>

          {/* Auth buttons */}
          <div className={`space-y-4 transition-all duration-500 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-14 bg-white hover:bg-gray-100 text-gray-900 rounded-2xl font-semibold text-base active:scale-[0.98] transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </div>
              )}
            </Button>

            <div className="relative flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Button
              variant="outline"
              disabled
              className="w-full h-14 border-white/20 bg-white/5 text-white/50 rounded-2xl font-semibold text-base cursor-not-allowed"
            >
              <div className="flex items-center gap-3 justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                <span>GitHub coming soon</span>
              </div>
            </Button>
          </div>

          {/* Trust badges */}
          <div className={`flex justify-center gap-6 mt-10 transition-all duration-500 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-2">
              <span className="text-orange-400">⚡</span>
              <span className="text-xs text-white/40">Fast payouts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">🛡️</span>
              <span className="text-xs text-white/40">Secure</span>
            </div>
          </div>

          {/* Footer link */}
          <p className={`text-center mt-8 text-sm text-white/40 transition-all duration-500 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-orange-400 font-medium">
              Sign up
            </Link>
          </p>

          {/* Legal */}
          <p className="text-center mt-6 text-xs text-white/20">
            By continuing, you agree to our{' '}
            <a href="#" className="underline">Terms</a> & <a href="#" className="underline">Privacy</a>
          </p>
        </main>
      </div>
    </>
  );
}
