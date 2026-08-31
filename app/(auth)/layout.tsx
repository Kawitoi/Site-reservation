import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold text-foreground">
        TableFlow
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
