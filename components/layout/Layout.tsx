import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCreatorData } from '@/components/dashboard/useCreatorData';
import { getRepLevel } from '@/lib/rep/service';
import { Home, Briefcase, UsersRound, Shield, Star, LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, appUser, signOut } = useAuth();
  const router = useRouter();
  const { creatorData } = useCreatorData(user, appUser);

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
          <header className="flex-shrink-0 z-50 w-full bg-white">
            <div className="px-4 py-3">
              <div className="flex items-center justify-center gap-3">
                <Link href={getDashboardPath()} className="hover:opacity-80 transition-opacity duration-200">
                  <img
                    src="/logo1.png"
                    alt="Giglet Logo"
                    className="h-9 w-auto"
                  />
                </Link>

                <div className="flex items-center gap-2">
                  {/* Rep Badge for Creators */}
                  {appUser?.role === 'creator' && creatorData && (() => {
                    const rep = creatorData.rep || 0;
                    const { level, title: levelLabel } = getRepLevel(rep);
                    return (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl">
                        <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{level}</span>
                        </div>
                        <span className="text-white text-xs font-semibold">{levelLabel}</span>
                        <div className="w-px h-3 bg-white/30" />
                        <Star className="w-3 h-3 text-amber-300" />
                        <span className="text-violet-200 text-xs font-medium">{rep.toLocaleString()}</span>
                      </div>
                    );
                  })()}
                  {/* Username Badge for Creators - Opens Settings */}
                  {appUser?.role === 'creator' && creatorData?.username && (
                    <button
                      onClick={() => router.push('/creator/dashboard?settings=true')}
                      className="relative p-[2px] rounded-xl bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 hover:shadow-lg hover:shadow-orange-500/20 transition-shadow duration-200"
                      aria-label="Open settings"
                    >
                      <div className="px-3 py-1.5 bg-gradient-to-r from-orange-50 via-pink-50 to-violet-50 rounded-[10px]">
                        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500">
                          @{creatorData.username}
                        </span>
                      </div>
                    </button>
                  )}
                  {appUser?.email === '7jackdsmith@gmail.com' && (
                    <Link href="/admin/dashboard">
                      <button className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center hover:bg-violet-200 transition-colors duration-200" aria-label="Admin dashboard">
                        <Shield className="w-4 h-4 text-violet-600" />
                      </button>
                    </Link>
                  )}
                  {/* Brands can logout from their settings */}
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
        <nav className="fixed bottom-0 left-0 right-0 max-w-[428px] mx-auto w-full bg-white/95 backdrop-blur-sm border-t border-zinc-100 z-50 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Main navigation">
          <div className="max-w-md mx-auto grid grid-cols-3">
            <Link
              href="/creator/dashboard"
              className={`flex flex-col items-center justify-center py-3 px-2 transition-[colors,transform,background-color] duration-200 ${
                router.pathname === '/creator/dashboard'
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent'
                  : 'text-zinc-600 hover:bg-zinc-50 active:scale-95'
              }`}
              aria-label="Home"
            >
              <Home className={`w-5 h-5 mb-1 ${router.pathname === '/creator/dashboard' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Home</span>
            </Link>
            <Link
              href="/creator/gigs"
              className={`flex flex-col items-center justify-center py-3 px-2 transition-[colors,transform,background-color] duration-200 ${
                router.pathname === '/creator/gigs' || router.pathname.startsWith('/creator/gigs/')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent'
                  : 'text-zinc-600 hover:bg-zinc-50 active:scale-95'
              }`}
              aria-label="Gigs"
            >
              <Briefcase className={`w-5 h-5 mb-1 ${(router.pathname === '/creator/gigs' || router.pathname.startsWith('/creator/gigs/')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Gigs</span>
            </Link>
            <Link
              href="/creator/squads"
              className={`flex flex-col items-center justify-center py-3 px-2 transition-[colors,transform,background-color] duration-200 ${
                router.pathname === '/creator/squads' || router.pathname.startsWith('/creator/squads/')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent'
                  : 'text-zinc-600 hover:bg-zinc-50 active:scale-95'
              }`}
              aria-label="Squads"
            >
              <UsersRound className={`w-5 h-5 mb-1 ${(router.pathname === '/creator/squads' || router.pathname.startsWith('/creator/squads/')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Squads</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Bottom Navigation (for brands) */}
      {user && appUser?.role === 'brand' && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[428px] mx-auto w-full bg-white/95 backdrop-blur-sm border-t border-zinc-100 z-50 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Main navigation">
          <div className="max-w-md mx-auto grid grid-cols-3">
            <Link
              href="/brand/dashboard"
              className={`flex flex-col items-center justify-center py-3 px-2 transition-[colors,transform,background-color] duration-200 ${
                router.pathname === '/brand/dashboard'
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent'
                  : 'text-zinc-600 hover:bg-zinc-50 active:scale-95'
              }`}
              aria-label="Home"
            >
              <Home className={`w-5 h-5 mb-1 ${router.pathname === '/brand/dashboard' ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Home</span>
            </Link>
            <Link
              href="/brand/gigs"
              className={`flex flex-col items-center justify-center py-3 px-2 transition-[colors,transform,background-color] duration-200 ${
                router.pathname === '/brand/gigs' || (router.pathname.startsWith('/brand/gigs/') && router.pathname !== '/brand/gigs/new')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent'
                  : 'text-zinc-600 hover:bg-zinc-50 active:scale-95'
              }`}
              aria-label="Gigs"
            >
              <Briefcase className={`w-5 h-5 mb-1 ${(router.pathname === '/brand/gigs' || (router.pathname.startsWith('/brand/gigs/') && router.pathname !== '/brand/gigs/new')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Gigs</span>
            </Link>
            <Link
              href="/brand/squads"
              className={`flex flex-col items-center justify-center py-3 px-2 transition-[colors,transform,background-color] duration-200 ${
                router.pathname === '/brand/squads' || router.pathname.startsWith('/brand/squads/')
                  ? 'text-brand-600 bg-gradient-to-b from-orange-50 to-transparent'
                  : 'text-zinc-600 hover:bg-zinc-50 active:scale-95'
              }`}
              aria-label="Squads"
            >
              <UsersRound className={`w-5 h-5 mb-1 ${(router.pathname === '/brand/squads' || router.pathname.startsWith('/brand/squads/')) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-semibold">Squads</span>
            </Link>
          </div>
        </nav>
      )}
      </div>
    </div>
  );
}