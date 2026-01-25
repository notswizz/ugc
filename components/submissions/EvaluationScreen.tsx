import { Loader2 } from 'lucide-react';

export default function EvaluationScreen() {
  return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center px-6">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Animated loader */}
        <div className="relative mb-8">
          {/* Outer ring */}
          <div className="w-24 h-24 rounded-full border-4 border-zinc-700 border-t-violet-500 animate-spin" />
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Content</h2>
        <p className="text-zinc-400 text-sm mb-8">Our AI is reviewing your submission for quality and compliance</p>

        {/* Progress steps */}
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400">✓</span>
            </div>
            <span className="text-sm text-zinc-300">Video uploaded successfully</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-violet-500/50">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            </div>
            <span className="text-sm text-white font-medium">Checking compliance...</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
              <span className="text-zinc-500">3</span>
            </div>
            <span className="text-sm text-zinc-500">Quality scoring</span>
          </div>
        </div>

        {/* Tip */}
        <p className="text-xs text-zinc-500 mt-8">This usually takes 30-60 seconds</p>
      </div>
    </div>
  );
}
