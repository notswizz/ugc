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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex justify-center">
      <div className="w-full max-w-[428px] bg-white h-screen shadow-2xl flex flex-col overflow-hidden relative">
        {user && (
          <header className="flex-shrink-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
            <div className="px-4">
            <div className="flex h-16 items-center justify-between">
              <Link href={getDashboardPath()} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <img 
                  src="/logo1.png" 
                  alt="Giglet Logo" 
                  className="h-11 w-auto"
                />
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  Giglet
                </span>
              </Link>

              <div className="flex items-center gap-1">
                {appUser?.email === '7jackdsmith@gmail.com' && (
                  <Link href="/admin/dashboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <Shield className="w-4 h-4" />
                      <span className="text-xs font-semibold">Admin</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  {appUser?.role === 'brand' && (
                    <span className="text-xs font-semibold">Logout</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-1 overflow-y-auto px-4 py-6" style={{ paddingBottom: user && (appUser?.role === 'creator' || appUser?.role === 'brand') ? '80px' : undefined }}>
        {children}
      </main>

      {/* Bottom Navigation (for creators) */}
      {user && appUser?.role === 'creator' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[428px] mx-auto w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 z-50 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto grid grid-cols-3">
            <Link 
              href="/creator/dashboard" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                router.pathname === '/creator/dashboard' 
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent' 
                  : 'text-gray-600 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <Home className={`w-5 h-5 mb-1 ${router.pathname === '/creator/dashboard' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Home</span>
            </Link>
            <Link 
              href="/creator/gigs" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                router.pathname === '/creator/gigs' || router.pathname.startsWith('/creator/gigs/')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent' 
                  : 'text-gray-600 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <Briefcase className={`w-5 h-5 mb-1 ${(router.pathname === '/creator/gigs' || router.pathname.startsWith('/creator/gigs/')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Gigs</span>
            </Link>
            <Link 
              href="/creator/squads" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                router.pathname === '/creator/squads' || router.pathname.startsWith('/creator/squads/')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent' 
                  : 'text-gray-600 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <UsersRound className={`w-5 h-5 mb-1 ${(router.pathname === '/creator/squads' || router.pathname.startsWith('/creator/squads/')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Squads</span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation (for brands) */}
      {user && appUser?.role === 'brand' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[428px] mx-auto w-full bg-white/95 backdrop-blur-sm border-t border-gray-100 z-50 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto grid grid-cols-3">
            <Link 
              href="/brand/dashboard" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                router.pathname === '/brand/dashboard' 
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent' 
                  : 'text-gray-600 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <Home className={`w-5 h-5 mb-1 ${router.pathname === '/brand/dashboard' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Home</span>
            </Link>
            <Link 
              href="/brand/gigs" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                router.pathname === '/brand/gigs' || (router.pathname.startsWith('/brand/gigs/') && router.pathname !== '/brand/gigs/new')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent' 
                  : 'text-gray-600 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <Briefcase className={`w-5 h-5 mb-1 ${(router.pathname === '/brand/gigs' || (router.pathname.startsWith('/brand/gigs/') && router.pathname !== '/brand/gigs/new')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Gigs</span>
            </Link>
            <Link 
              href="/brand/squads" 
              className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 ${
                router.pathname === '/brand/squads' || router.pathname.startsWith('/brand/squads/')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent' 
                  : 'text-gray-600 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <UsersRound className={`w-5 h-5 mb-1 ${(router.pathname === '/brand/squads' || router.pathname.startsWith('/brand/squads/')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Squads</span>
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}