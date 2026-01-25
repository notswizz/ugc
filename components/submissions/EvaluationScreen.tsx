export default function EvaluationScreen() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 animate-pulse"></div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60 animate-float"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 4}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen text-center px-4">
        {/* Concentric animated rings */}
        <div className="relative mb-12">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-spin"
            style={{ width: '200px', height: '200px', margin: '-100px', animationDuration: '3s' }}
          ></div>
          {/* Middle ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-pink-500 via-orange-500 to-blue-500 animate-spin"
            style={{ width: '160px', height: '160px', margin: '-80px', animationDuration: '2s', animationDirection: 'reverse' }}
          ></div>
          {/* Inner ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 animate-spin"
            style={{ width: '120px', height: '120px', margin: '-60px', animationDuration: '1.5s' }}
          ></div>

          {/* Center pulsing orb */}
          <div
            className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 shadow-2xl animate-pulse"
            style={{ boxShadow: '0 0 60px rgba(139, 92, 246, 0.6), 0 0 100px rgba(236, 72, 153, 0.4)' }}
          >
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-75 animate-ping"
              style={{ animationDuration: '2s' }}
            ></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
          </div>
        </div>

        {/* Minimal text */}
        <h2 className="text-2xl font-bold text-white drop-shadow-lg animate-pulse">Analyzing</h2>
      </div>
    </div>
  );
}
