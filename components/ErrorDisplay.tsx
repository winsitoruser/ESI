export default function ErrorDisplay({ message = 'Terjadi kesalahan', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 text-lg font-semibold mb-2">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Coba Lagi
        </button>
      )}
    </div>
  );
}
