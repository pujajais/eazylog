'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic, Zap, LayoutDashboard, User } from 'lucide-react';
import { IS_DEMO } from '@/lib/supabase/client';

const navItems = [
  { href: '/log', label: 'Log', icon: Mic },
  { href: '/quick-tap', label: 'Quick Tap', icon: Zap },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/body-map', label: 'Body Map', icon: User },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-sage-100 z-50 pb-safe">
      {IS_DEMO && (
        <div className="bg-terra-50 text-terra-600 text-center text-[11px] font-sans py-0.5">
          Demo Mode — data is local only
        </div>
      )}
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active
                  ? 'text-sage-600 bg-sage-50'
                  : 'text-gray-400 hover:text-sage-500'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[11px] font-sans">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
