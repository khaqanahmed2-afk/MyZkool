import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { MyZkoolLogo } from "../common/MyZkoolLogo";

export interface NavbarProps {
  onOpenDemo: () => void;
  onOpenLogin: () => void;
}

interface NavItem {
  label: string;
  href: string;
  targetId: string;
  isRoute?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Product", href: "/#philosophy", targetId: "philosophy" },
  { label: "Features", href: "/#features", targetId: "features" },
  { label: "Website Builder", href: "/#website-builder", targetId: "website-builder" },
  { label: "Academics", href: "/#academics", targetId: "academics" },
  { label: "Pricing", href: "/#pricing", targetId: "pricing" },
  { label: "How it works", href: "/#how-it-works", targetId: "how-it-works" },
  { label: "About", href: "/about", targetId: "about", isRoute: true },
  { label: "FAQ", href: "/#faq", targetId: "faq" },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Handle section anchor clicks smoothly when already on homepage
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `#${targetId}`);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-[#E6EAF3] transition-colors shadow-2xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-8">
        <div className="flex items-center justify-between h-20 flex-nowrap gap-4">
          {/* Official Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0"
            id="navbar-logo"
            aria-label="MyZkool Homepage"
            onClick={() => setMobileMenuOpen(false)}
          >
            <MyZkoolLogo size={38} showText={true} />
          </Link>

          {/* Desktop Navigation Links (xl+ screens, single horizontal line) */}
          <nav
            className="hidden xl:flex items-center justify-center flex-nowrap gap-1 2xl:gap-1.5 shrink min-w-0"
            aria-label="Main Navigation"
          >
            {NAV_ITEMS.map((item) =>
              item.isRoute ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="px-2.5 py-2 text-[13.5px] 2xl:text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.targetId)}
                  className="px-2.5 py-2 text-[13.5px] 2xl:text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          {/* Desktop Action Buttons (xl+ screens, identical height & single line) */}
          <div className="hidden xl:flex items-center gap-2 2xl:gap-2.5 shrink-0 flex-nowrap">
            <Link
              to="/login"
              id="navbar-login-btn"
              className="h-10 px-3.5 flex items-center justify-center text-sm font-semibold text-[#141A2E] hover:text-[#2158E0] hover:bg-[#F6F8FC] transition-colors rounded-full whitespace-nowrap"
            >
              Login
            </Link>
            <Link
              to="/register"
              id="navbar-register-btn"
              className="h-10 px-4 flex items-center justify-center text-sm font-semibold text-[#2158E0] bg-white border border-[#2158E0] hover:bg-[#2158E0]/5 active:scale-[0.98] transition-all rounded-full shadow-2xs whitespace-nowrap"
            >
              Register School
            </Link>
            <button
              onClick={onOpenDemo}
              id="navbar-demo-btn"
              className="h-10 px-4.5 2xl:px-5 flex items-center justify-center text-sm font-semibold text-white bg-[#141A2E] hover:bg-[#2158E0] active:scale-[0.98] transition duration-200 rounded-full shadow-sm hover:shadow-lg hover:shadow-[#2158E0]/25 gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Book a Free Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Tablet & Mobile Right Action Group (screens below xl) */}
          <div className="flex xl:hidden items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap">
            {/* Tablet Register School button */}
            <Link
              to="/register"
              className="hidden md:inline-flex items-center justify-center h-9 px-3.5 text-xs sm:text-sm font-semibold text-[#2158E0] bg-white border border-[#2158E0] hover:bg-[#2158E0]/5 active:scale-[0.98] transition-all rounded-full shadow-2xs whitespace-nowrap"
            >
              Register School
            </Link>

            {/* Quick Demo CTA for tablet and mobile */}
            <button
              onClick={onOpenDemo}
              className="inline-flex items-center justify-center h-9 px-3 sm:px-3.5 text-xs sm:text-sm font-semibold text-white bg-[#141A2E] hover:bg-[#2158E0] active:scale-[0.98] transition-all rounded-full shadow-xs whitespace-nowrap cursor-pointer"
            >
              <span>Book Demo</span>
            </button>

            {/* Hamburger / Close Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 flex items-center justify-center p-1.5 text-[#141A2E] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-20 bg-slate-900/40 backdrop-blur-xs z-30 xl:hidden animate-in fade-in duration-200"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="mobile-navigation"
            aria-label="Mobile and Tablet Navigation"
            className="relative z-40 xl:hidden bg-white border-b border-[#E6EAF3] px-4 sm:px-6 py-5 shadow-2xl animate-in slide-in-from-top duration-200 max-h-[calc(100vh-5rem)] overflow-y-auto"
          >
            {/* Navigation Links in a responsive grid (2 columns on tablet, 1 on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 pb-4">
              {NAV_ITEMS.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 text-base font-medium text-[#141A2E] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-xl transition-colors"
                  >
                    <span>{item.label}</span>
                    <span className="text-slate-300 font-light">&rarr;</span>
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleAnchorClick(e, item.targetId)}
                    className="flex items-center justify-between px-3.5 py-2.5 text-base font-medium text-[#141A2E] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-xl transition-colors"
                  >
                    <span>{item.label}</span>
                    <span className="text-slate-300 font-light">&rarr;</span>
                  </a>
                )
              )}
            </div>

            {/* CTA action buttons inside drawer */}
            <div className="pt-4 border-t border-[#E6EAF3] flex flex-col md:flex-row items-center gap-2.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                id="mobile-login-btn"
                className="w-full md:flex-1 h-11 flex items-center justify-center font-medium text-[#141A2E] border border-[#E6EAF3] hover:border-[#2158E0]/30 hover:bg-[#F6F8FC] rounded-full transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                id="mobile-register-btn"
                className="w-full md:flex-1 h-11 flex items-center justify-center font-semibold text-[#2158E0] border border-[#2158E0] bg-white hover:bg-[#2158E0]/5 active:scale-[0.98] rounded-full transition-colors shadow-2xs"
              >
                Register School
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo();
                }}
                id="mobile-demo-btn"
                className="w-full md:flex-1 h-11 flex items-center justify-center font-semibold text-white bg-[#2158E0] hover:bg-[#1A47B8] rounded-full shadow-md shadow-[#2158E0]/20 gap-2 cursor-pointer transition-colors"
              >
                <span>Book a Free Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
};

export default Navbar;
