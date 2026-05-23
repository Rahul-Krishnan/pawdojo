"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, RepeatIcon, ChartIcon, UserIcon } from "@/components/icons";
import { playTap } from "@/lib/sounds";

const tabs = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/practice", label: "Practice", Icon: RepeatIcon },
  { href: "/progress", label: "Progress", Icon: ChartIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/80 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => playTap()}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 min-h-[44px] transition-colors ${
                isActive ? "text-primary-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.Icon size={22} aria-hidden="true" />
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
