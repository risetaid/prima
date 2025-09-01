"use client";

export default function GlobalError({ 
  error,
  reset 
}: { 
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h1>
            <p className="text-gray-600 mb-4">
              Aplikasi mengalami kesalahan. Silakan coba lagi atau hubungi administrator.
            </p>
            <button
              onClick={reset}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}