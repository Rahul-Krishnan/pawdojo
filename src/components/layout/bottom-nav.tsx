"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/practice", label: "Practice", icon: "🔄" },
  { href: "/progress", label: "Progress", icon: "📊" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center py-2 text-xs ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
