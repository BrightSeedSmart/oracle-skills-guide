"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
      <h1 className="text-lg font-semibold text-violet-300">เกิดข้อผิดพลาดในแดชบอร์ด</h1>
      <p className="max-w-md text-sm text-zinc-400">{error.message}</p>
      {error.digest ? (
        <p className="font-mono text-xs text-zinc-600">digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        ลองใหม่
      </button>
    </div>
  );
}
