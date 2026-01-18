import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRole } from '@/lib/models/types';
import toast from 'react-hot-toast';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, appUser, refreshUser } = useAuth();
  const router = useRouter();

  // Check if user already has a profile and redirect
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user || !appUser) return;

      try {
        // Check if brand profile exists
        if (appUser.role === 'brand') {
          const brandDoc = await getDoc(doc(db, 'brands', user.uid));
          if (brandDoc.exists()) {
            router.push('/brand/dashboard');
            return;
          }
        }
        
        // Check if creator profile exists
        if (appUser.role === 'creator') {
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
          if (creatorDoc.exists()) {
            router.push('/creator/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking existing profile:', error);
      }
    };

    checkExistingProfile();
  }, [user, appUser, router]);

  const handleRoleSelection = async (role: UserRole) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update user role in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        role,
        lastActiveAt: serverTimestamp(),
      });

      // Refresh user data
      await refreshUser();

      // Redirect to appropriate onboarding flow
      if (role === 'creator') {
        router.push('/onboarding/creator');
      } else if (role === 'brand') {
        router.push('/onboarding/brand');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
            ✨ Welcome to Giglet
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Creator Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-2xl border-2 ${
              selectedRole === 'creator' 
                ? 'ring-4 ring-orange-500 border-orange-500 shadow-xl scale-105' 
                : 'border-gray-200 hover:border-orange-300'
            }`}
            onClick={() => setSelectedRole('creator')}
          >
            <CardHeader className="text-center py-8">
              <div className="text-6xl mb-4">🎨</div>
              <CardTitle className="text-2xl font-bold">Creator</CardTitle>
              <CardDescription className="text-base mt-2">
                Make content. Get paid instantly.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Continue Button - Mobile Only (between cards) */}
          {selectedRole && (
            <div className="md:hidden text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                onClick={() => handleRoleSelection(selectedRole)}
                disabled={isLoading}
                size="lg"
                className="w-full px-12 h-14 text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? 'Setting up...' : `Continue as ${selectedRole === 'creator' ? 'Creator' : 'Brand'} →`}
              </Button>
            </div>
          )}

          {/* Brand Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-2xl border-2 ${
              selectedRole === 'brand' 
                ? 'ring-4 ring-orange-500 border-orange-500 shadow-xl scale-105' 
                : 'border-gray-200 hover:border-orange-300'
            }`}
            onClick={() => setSelectedRole('brand')}
          >
            <CardHeader className="text-center py-8">
              <div className="text-6xl mb-4">🏢</div>
              <CardTitle className="text-2xl font-bold">Brand</CardTitle>
              <CardDescription className="text-base mt-2">
                Find creators. Launch gigs. Scale fast.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Continue Button - Desktop Only (below cards) */}
        {selectedRole && (
          <div className="hidden md:block text-center mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button
              onClick={() => handleRoleSelection(selectedRole)}
              disabled={isLoading}
              size="lg"
              className="px-12 h-14 text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? 'Setting up...' : `Continue as ${selectedRole === 'creator' ? 'Creator' : 'Brand'} →`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}