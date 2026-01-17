export default function SimpleTest() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          CSS Test Page
        </h1>
        <p className="text-gray-700 mb-6">
          If you can see this styled page, Tailwind CSS is working!
        </p>
        <div className="space-y-4">
          <div className="bg-green-100 p-4 rounded border border-green-300">
            <p className="text-green-800 font-medium">
              ✅ Green background = Tailwind working
            </p>
          </div>
          <div className="bg-red-100 p-4 rounded border border-red-300">
            <p className="text-red-800 font-medium">
              🔴 Red background = Custom colors working
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}