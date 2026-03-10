"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavBarProps {
  username: string;
  isAdmin?: boolean;
}

export function NavBar({ username, isAdmin }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight text-white">
            Portfolio
          </span>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`py-2 text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? "font-semibold text-white underline underline-offset-4"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-300">{username}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-3 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
