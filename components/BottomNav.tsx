"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Bottom tab bar (briefing §5): Tournaments · Tools · Bets (center, raised) · Plans · Profile.

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  center?: boolean;
};

const I = {
  trophy: (
    <path d="M6 4h12v3a6 6 0 0 1-12 0V4Zm0 1H3v1a3 3 0 0 0 3 3m12-4h3v1a3 3 0 0 1-3 3M9 19h6m-3-4v4" />
  ),
  tools: <path d="M4 7h10M4 12h7M4 17h13M17 5l3 3-3 3" />,
  bets: <path d="M3 12c3-7 6-7 9 0s6 7 9 0" strokeWidth="2.4" />,
  plans: <path d="M4 6h16M4 12h16M4 18h10" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
};

const ITEMS: Item[] = [
  { href: "/tournaments", label: "Tournaments", icon: I.trophy },
  { href: "/tools", label: "Tools", icon: I.tools },
  { href: "/bets", label: "Bets", icon: I.bets, center: true },
  { href: "/plans", label: "Plans", icon: I.plans },
  { href: "/profile", label: "Profile", icon: I.profile },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-deep/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 max-w-md items-end justify-around px-2">
        {ITEMS.map((item) => {
          const active = isActive(item.href);

          if (item.center) {
            return (
              <li key={item.href} className="relative -top-2.5">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border bg-surface-2 transition ${
                      active ? "border-primary-bright" : "border-border-strong"
                    }`}
                    style={{
                      boxShadow: active
                        ? "0 6px 20px rgba(109,40,217,0.45)"
                        : "0 4px 14px rgba(0,0,0,0.4)",
                    }}
                  >
                    <Image src="/logo.png" alt="" width={26} height={26} priority />
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      active ? "text-primary-bright" : "text-faint"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-[10px] transition ${
                  active ? "text-primary-bright" : "text-faint hover:text-muted"
                }`}
              >
                <Icon>{item.icon}</Icon>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
