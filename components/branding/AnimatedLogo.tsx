import { useState, useEffect } from 'react';

const LOGOS = ['/logo1.PNG', '/logo2.PNG', '/logo3.PNG', '/logo4.PNG'];

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export default function AnimatedLogo({ size = 'md', className = '', showText = false }: AnimatedLogoProps) {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Randomize initial logo
    const initialIndex = Math.floor(Math.random() * LOGOS.length);
    setCurrentLogoIndex(initialIndex);
    setFadeKey(Math.random()); // Random initial key

    // Rotate logos every 4 seconds with fade
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentLogoIndex((prev) => (prev + 1) % LOGOS.length);
        setFadeKey((k) => k + 1);
        setIsVisible(true);
      }, 500); // Half second fade out
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-14 md:h-16',
    xl: 'h-32 md:h-40',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <img
          key={fadeKey}
          src={LOGOS[currentLogoIndex]}
          alt="UGC Dash Logo"
          className={`${sizeClasses[size]} w-auto transition-opacity duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
      {showText && (
        <img
          src="/logotext.PNG"
          alt="UGC Dash"
          className={`${size === 'sm' ? 'h-6' : size === 'md' ? 'h-10' : size === 'lg' ? 'h-12 md:h-14' : 'h-16 md:h-20'} w-auto hidden sm:block`}
        />
      )}
    </div>
  );
}
