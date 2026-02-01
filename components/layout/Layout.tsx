import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCreatorData } from '@/components/dashboard/useCreatorData';
import { getRepLevel } from '@/lib/rep/service';
import { Home, Briefcase, UsersRound, Shield, Star, LogOut, DollarSign } from 'lucide-react';

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
          <header className="flex-shrink-0 z-50 w-full bg-gradient-to-r from-white via-orange-50/30 to-white border-b border-zinc-100/80 shadow-sm">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Logo + Brand */}
                <Link href={getDashboardPath()} className="flex items-center gap-2.5 group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                    <img
                      src="/logo1.png"
                      alt="Giglet Logo"
                      className="h-10 w-auto relative z-10 drop-shadow-sm"
                    />
                  </div>
                </Link>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                  {/* Rep Badge for Creators */}
                  {appUser?.role === 'creator' && creatorData && (() => {
                    const rep = creatorData.rep || 0;
                    const { level, title: levelLabel } = getRepLevel(rep);
                    return (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
                            <span className="text-white text-xs font-black">{level}</span>
                          </div>
                          <span className="text-white text-xs font-bold tracking-tight">{levelLabel}</span>
                        </div>
                        <div className="w-px h-4 bg-white/20" />
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span className="text-white/90 text-xs font-semibold">{rep.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Username Badge for Creators - Opens Settings */}
                  {appUser?.role === 'creator' && creatorData?.username && (
                    <button
                      onClick={() => router.push('/creator/dashboard?settings=true')}
                      className="relative group"
                      aria-label="Open settings"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-200" />
                      <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400">
                        <div className="px-4 py-2 bg-white rounded-[14px] flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                          <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500">
                            @{creatorData.username}
                          </span>
                        </div>
                      </div>
                    </button>
                  )}
                  
                  {/* Admin Button */}
                  {appUser?.email === '7jackdsmith@gmail.com' && (
                    <Link href="/admin/dashboard">
                      <button className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center hover:from-violet-200 hover:to-purple-200 transition-all duration-200 shadow-sm hover:shadow-md" aria-label="Admin dashboard">
                        <Shield className="w-4.5 h-4.5 text-violet-600" />
                      </button>
                    </Link>
                  )}
                  
                  {/* Logout Button for Brands */}
                  {appUser?.role === 'brand' && (
                    <button
                      onClick={handleLogout}
                      className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center hover:from-zinc-200 hover:to-zinc-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      aria-label="Logout"
                    >
                      <LogOut className="w-4.5 h-4.5 text-zinc-600" />
                    </button>
                  )}
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