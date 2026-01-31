import Link from "next/link";
import { Sparkles, WalletMinimal, Menu } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/" },
  { label: "Markets", href: "/markets" },
  { label: "Smart Money", href: "/smart-money" },
  { label: "Insights", href: "#" },
  { label: "Calendar", href: "/calendar" }, // new item before API
  { label: "API", href: "#" },
];

export function Header() {
  return (
    <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300/30 via-indigo-400/30 to-purple-500/30 ring-1 ring-white/15">
          <Sparkles className="h-5 w-5 text-teal-100 drop-shadow-[0_0_12px_rgba(109,243,231,0.55)]" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/15 to-transparent" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm uppercase tracking-[0.3em] text-white/60">PolyGlass</span>
          <span className="text-lg font-semibold text-white">Polymarket Intelligence</span>
        </div>
      </div>

      <nav className="hidden items-center gap-4 text-sm text-white/70 lg:flex">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-full px-4 py-2 transition-colors hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button className="hidden items-center gap-2 rounded-full border border-teal-200/40 bg-gradient-to-r from-teal-400/20 to-indigo-500/30 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(109,243,231,0.25)] transition hover:scale-[1.01] md:flex">
          <WalletMinimal className="h-4 w-4" />
          Connect
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
