import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminCommerceShell({ children }: { children: ReactNode }) {
  return (
    <main className="admin-commerce">
      <header className="admin-commerce__header">
        <div>
          <span className="admin-commerce__eyebrow">LapLapLa operations</span>
          <h1>Commerce Admin</h1>
        </div>
        <nav aria-label="Commerce administration">
          <Link href="/admin/commerce">Commerce</Link>
          <Link href="/admin/commerce">Orders</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
