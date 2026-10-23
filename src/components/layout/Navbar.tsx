import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { MyZkoolLogo } from "../common/MyZkoolLogo";

export interface NavbarProps {
  onOpenDemo: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo, onOpenLogin }) => {
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 border-b border-[#E6EAF3] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Official Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            id="navbar-logo"
            aria-label="MyZkool Homepage"
            onClick={() => setMobileMenuOpen(false)}
          >
            <MyZkoolLogo size={42} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
            <a
              href="/#philosophy"
              onClick={(e) => handleAnchorClick(e, "philosophy")}
              className="px-3.5 py-2 text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors"
            >
              Product
            </a>
            <a
              href="/#features"
              onClick={(e) => handleAnchorClick(e, "features")}
              className="px-3.5 py-2 text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors"
            >
              Features
            </a>
            <a
              href="/#pricing"
              onClick={(e) => handleAnchorClick(e, "pricing")}
              className="px-3.5 py-2 text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors"
            >
              Pricing
            </a>
            <a
              href="/#how-it-works"
              onClick={(e) => handleAnchorClick(e, "how-it-works")}
              className="px-3.5 py-2 text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors"
            >
              How it works
            </a>
            <Link
              to="/about"
              className="px-3.5 py-2 text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors"
            >
              About
            </Link>
            <a
              href="/#faq"
              onClick={(e) => handleAnchorClick(e, "faq")}
              className="px-3.5 py-2 text-sm font-medium text-[#5B6478] hover:text-[#2158E0] hover:bg-[#F6F8FC] rounded-lg transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              id="navbar-login-btn"
              className="px-4 py-2 text-sm font-medium text-[#141A2E] hover:text-[#2158E0] transition-colors rounded-full"
            >
              Login
            </Link>
            <button
              onClick={onOpenDemo}
              id="navbar-demo-btn"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#141A2E] hover:bg-[#2158E0] active:scale-[0.98] transition duration-200 rounded-full shadow-sm hover:shadow-lg hover:shadow-[#2158E0]/25 flex items-center gap-2 cursor-pointer"
            >
              <span>Book a Free Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenDemo}
              className="text-xs px-3 py-1.5 font-semibold bg-[#2158E0] text-white rounded-full cursor-pointer"
            >
              Book Demo
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg cursor-pointer"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown & backdrop */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-20 bg-black/30 backdrop-blur-2xs z-30 md:hidden"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="mobile-navigation"
            aria-label="Mobile Navigation"
            className="relative z-40 md:hidden bg-white border-b border-[#E6EAF3] px-4 pt-2 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top duration-200"
          >
            <a
              href="/#philosophy"
              onClick={(e) => handleAnchorClick(e, "philosophy")}
              className="block px-3 py-2 text-base font-medium text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg"
            >
              Product
            </a>
            <a
              href="/#features"
              onClick={(e) => handleAnchorClick(e, "features")}
              className="block px-3 py-2 text-base font-medium text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg"
            >
              Features
            </a>
            <a
              href="/#pricing"
              onClick={(e) => handleAnchorClick(e, "pricing")}
              className="block px-3 py-2 text-base font-medium text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg"
            >
              Pricing
            </a>
            <a
              href="/#how-it-works"
              onClick={(e) => handleAnchorClick(e, "how-it-works")}
              className="block px-3 py-2 text-base font-medium text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg"
            >
              How it works
            </a>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg"
            >
              About
            </Link>
            <a
              href="/#faq"
              onClick={(e) => handleAnchorClick(e, "faq")}
              className="block px-3 py-2 text-base font-medium text-[#141A2E] hover:bg-[#F6F8FC] rounded-lg"
            >
              FAQ
            </a>
            <div className="pt-3 border-t border-[#E6EAF3] flex flex-col gap-2.5">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center font-medium text-[#141A2E] border border-[#E6EAF3] rounded-full"
              >
                Login
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo();
                }}
                className="w-full py-3 text-center font-semibold text-white bg-[#2158E0] rounded-full shadow-md shadow-[#2158E0]/20 cursor-pointer"
              >
                Book a Free Demo
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
};

export default Navbar;
