interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const containerClass = fullScreen 
    ? 'min-h-screen flex items-center justify-center' 
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClass}>
      <div className="text-center space-y-4">
        {/* Animated spinner with gradient rings */}
        <div className="relative mx-auto inline-block">
          {/* Outer spinning ring */}
          <div className={`relative ${sizeClasses[size]} border-4 border-orange-100 rounded-full`}>
            <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-orange-500 rounded-full animate-spin`}></div>
          </div>
          {/* Pulsing center dots */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-1.5">
            <span className={`${dotSizes[size]} bg-orange-500 rounded-full animate-pulse`} style={{ animationDelay: '0s', animationDuration: '1.4s' }}></span>
            <span className={`${dotSizes[size]} bg-orange-500 rounded-full animate-pulse`} style={{ animationDelay: '0.2s', animationDuration: '1.4s' }}></span>
            <span className={`${dotSizes[size]} bg-orange-500 rounded-full animate-pulse`} style={{ animationDelay: '0.4s', animationDuration: '1.4s' }}></span>
          </div>
        </div>
        {text && (
          <p className="text-sm text-gray-600 font-medium">{text}</p>
        )}
      </div>
    </div>
  );
}