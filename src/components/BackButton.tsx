"use client";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="text-sm font-mono text-emerald-bright hover:underline flex items-center gap-1 mb-3"
    >
      ← Back
    </button>
  );
}
