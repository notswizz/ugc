import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Home, History, Briefcase, Plus, Users, UsersRound, Shield } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, appUser, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const getDashboardPath = () => {
    if (!appUser) return '/';
    if (appUser.role === 'brand') return '/brand/dashboard';
    if (appUser.role === 'creator') return '/creator/dashboard';
    return '/';
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[428px] bg-white min-h-screen shadow-xl md:shadow-2xl">
        {user && (
          <header className="sticky top-0 z-50 w-full border-b bg-white">
            <div className="px-4">
            <div className="flex h-14 items-center justify-between">
              <Link href={getDashboardPath()} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img 
                  src="/logo1.PNG" 
                  alt="UGC Dash Logo" 
                  className="h-10 w-auto"
                />
                <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  UGC Dash
                </span>
              </Link>

              <div className="flex items-center gap-2">
                {appUser?.email === '7jackdsmith@gmail.com' && (
                  <Link href="/admin/dashboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5 p-2 h-9"
                    >
                      <Shield className="w-4 h-4" />
                      <span className="text-xs">Admin</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 p-2 h-9"
                >
                  <LogOut className="w-4 h-4" />
                  {appUser?.role === 'brand' && (
                    <span className="text-xs">Logout</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main className="px-4 py-8 pb-20">
        {children}
      </main>

      {/* Bottom Navigation (for creators) */}
      {user && appUser?.role === 'creator' && (
        <div className="fixed bottom-0 w-full max-w-[428px] bg-white border-t border-gray-200 z-50 safe-area-bottom shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-3">
            <Link 
              href="/creator/dashboard" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                router.pathname === '/creator/dashboard' 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Home className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </Link>
            <Link 
              href="/creator/jobs" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                (router.pathname === '/creator/jobs' || (router.pathname.startsWith('/creator/jobs/') && router.pathname !== '/creator/jobs/history'))
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Briefcase className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Browse</span>
            </Link>
            <Link 
              href="/creator/jobs/history" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                router.pathname === '/creator/jobs/history'
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <History className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">History</span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation (for brands) */}
      {user && appUser?.role === 'brand' && (
        <div className="fixed bottom-0 w-full max-w-[428px] bg-white border-t border-gray-200 z-50 safe-area-bottom shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-3">
            <Link 
              href="/brand/dashboard" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                router.pathname === '/brand/dashboard' 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Home className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </Link>
            <Link 
              href="/brand/jobs" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                router.pathname === '/brand/jobs' || (router.pathname.startsWith('/brand/jobs/') && router.pathname !== '/brand/jobs/new')
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Briefcase className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Campaigns</span>
            </Link>
            <Link 
              href="/brand/squads" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                router.pathname === '/brand/squads' || router.pathname.startsWith('/brand/squads/')
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UsersRound className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Squads</span>
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}