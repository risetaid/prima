"use client";

import { DesktopHeader } from "@/components/ui/desktop-header";
import { MobileHeader } from "@/components/ui/mobile-header";

interface HeaderProps {
  showNavigation?: boolean;
  className?: string;
}

export function Header({ showNavigation = true, className = "" }: HeaderProps) {
  return (
    <div className={className}>
      {/* Desktop Header - Hidden on mobile */}
      <div className="hidden lg:block">
        <DesktopHeader showNavigation={showNavigation} />
      </div>

      {/* Mobile Header - Hidden on desktop */}
      <div className="lg:hidden">
        <MobileHeader showNavigation={showNavigation} />
      </div>
    </div>
  );
}

