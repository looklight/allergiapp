'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold text-red-600">Qualcosa e andato storto</h2>
      <p className="text-gray-500 text-sm max-w-md text-center">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-800"
      >
        Riprova
      </button>
    </div>
  );
}
