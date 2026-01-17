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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to UGC Dock!</h1>
          <p className="text-muted-foreground">
            Tell us about yourself so we can personalize your experience
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Creator Card */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedRole === 'creator' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedRole('creator')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎨 Creator
              </CardTitle>
              <CardDescription>
                Create amazing content for brands and get paid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Showcase your portfolio</li>
                <li>• Get discovered by brands</li>
                <li>• Set your own rates</li>
                <li>• Receive payments securely</li>
              </ul>
            </CardContent>
          </Card>

          {/* Brand Card */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedRole === 'brand' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedRole('brand')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏢 Brand
              </CardTitle>
              <CardDescription>
                Find creators and run successful UGC campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Post campaigns and briefs</li>
                <li>• Discover talented creators</li>
                <li>• Manage contracts and payments</li>
                <li>• Review and approve content</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {selectedRole && (
          <div className="text-center mt-8">
            <Button
              onClick={() => handleRoleSelection(selectedRole)}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? 'Setting up...' : `Continue as ${selectedRole === 'creator' ? 'Creator' : 'Brand'}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}