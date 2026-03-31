import { Outlet, useLocation, useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import XPPopup from "@/components/XPPopup";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import { Sun, Moon, Home, Calendar, CheckSquare, Camera, Utensils, DollarSign, Pin, Target, Gift, HelpCircle, LogOut, DoorOpen, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getActiveMember, setActiveMember, getThemeMode, setThemeMode, MEMBER_COLORS, clearFamilySession } from "@/lib/familyStore";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/chores", icon: CheckSquare, label: "Chores" },
  { path: "/meals", icon: Utensils, label: "Meals" },
  { path: "/budget", icon: DollarSign, label: "Budget" },
  { path: "/noticeboard", icon: Pin, label: "Board" },
  { path: "/goals", icon: Target, label: "Goals" },
  { path: "/rewards", icon: Gift, label: "Rewards Shop" },
  { path: "/moments", icon: Camera, label: "Moments" },
];

const NAV_PATHS = NAV_ITEMS.map((i) => i.path);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [member, setMember] = useState(getActiveMember());
  const [isDark, setIsDark] = useState(getThemeMode() === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const memberColor = member ? MEMBER_COLORS[member.color] : MEMBER_COLORS.purple;

  useEffect(() => {
    const checkMember = () => setMember(getActiveMember());
    window.addEventListener("storage", checkMember);
    window.addEventListener("member-changed", checkMember);
    return () => {
      window.removeEventListener("storage", checkMember);
      window.removeEventListener("member-changed", checkMember);
    };
  }, []);

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const toggleTheme = () => {
    const newMode = isDark ? "light" : "dark";
    setThemeMode(newMode);
    setIsDark(!isDark);
  };

  const handleSignOut = () => {
    setActiveMember(null);
    setSidebarOpen(false);
    navigate("/select");
  };

  const handleLeaveHQ = () => {
    clearFamilySession();
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("hq_pin_unlocked_")) localStorage.removeItem(k);
    });
    setShowLeaveConfirm(false);
    navigate("/", { replace: true });
  };

  const handleNavClick = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 50) return;

    // Swipe right from left edge opens sidebar
    if (dx > 0 && e.changedTouches[0].clientX - dx < 30) {
      setSidebarOpen(true);
      return;
    }

    if (sidebarOpen) return; // don't page-navigate while sidebar is open

    const currentIdx = NAV_PATHS.indexOf(location.pathname);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < NAV_PATHS.length - 1) {
      navigate(NAV_PATHS[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      navigate(NAV_PATHS[currentIdx - 1]);
    }
  };

  return (
    <div
      className="bg-background flex flex-col"
      style={{ minHeight: "100dvh" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <OnboardingWizard />
      <XPPopup />
      <LevelUpOverlay />

      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center shrink-0">
        {/* Hamburger — left */}
        <motion.button
          onClick={() => setSidebarOpen(true)}
          whileTap={{ scale: 0.85 }}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </motion.button>

        {/* Logo — center */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-xl">🏠</span>
          <span className="font-heading font-bold text-base">Family HQ</span>
        </div>

        {/* Member avatar — right */}
        {member ? (
          <motion.button
            onClick={() => navigate("/select")}
            whileTap={{ scale: 0.85 }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: memberColor.hex }}
          >
            {member.emoji || member.name[0]}
          </motion.button>
        ) : (
          <div className="w-9 h-9 shrink-0" />
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Sidebar overlay backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[40] bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 z-[50] flex flex-col w-72"
            style={{
              background: "rgba(10,10,18,0.97)",
              borderRight: `1px solid ${memberColor.hex}30`,
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Sidebar header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
              {member && (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ background: memberColor.hex, boxShadow: `0 0 16px ${memberColor.hex}60` }}
                >
                  {member.emoji || member.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{member?.name ?? "Family HQ"}</p>
                <p className="text-white/40 text-xs">{member?.role ?? ""}</p>
              </div>
              <motion.button
                onClick={toggleTheme}
                whileTap={{ scale: 0.85 }}
                className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
              >
                {isDark
                  ? <Sun className="w-4 h-4 text-yellow-400" />
                  : <Moon className="w-4 h-4 text-white/50" />
                }
              </motion.button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    whileTap={{ scale: 0.97 }}
                    className="relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                    style={{
                      background: isActive ? `${memberColor.hex}18` : "transparent",
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                        style={{ background: memberColor.hex, boxShadow: `0 0 8px ${memberColor.hex}` }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <Icon
                      className="w-5 h-5 shrink-0 transition-all duration-150"
                      style={{
                        color: isActive ? memberColor.hex : "rgba(255,255,255,0.5)",
                        filter: isActive ? `drop-shadow(0 0 6px ${memberColor.hex}80)` : "none",
                      }}
                    />
                    <span
                      className="text-sm font-medium transition-colors duration-150"
                      style={{ color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)" }}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </nav>

            {/* Sidebar footer actions */}
            <div className="border-t border-white/8 px-3 py-3 space-y-0.5">
              <button
                onClick={() => handleNavClick("/guide")}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
              >
                <HelpCircle className="w-4 h-4 shrink-0" />
                How it works
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Switch Member
              </button>
              <button
                onClick={() => { setSidebarOpen(false); setShowLeaveConfirm(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-500/8 transition-all"
              >
                <DoorOpen className="w-4 h-4 shrink-0" />
                Leave HQ
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Leave HQ Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-3xl mb-3 text-center">🔑</div>
            <h3 className="font-heading font-bold text-lg text-center mb-2">Leave this HQ?</h3>
            <p className="text-muted-foreground text-sm text-center mb-6">You'll need the family code to get back in 🔑</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleLeaveHQ} className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors">Yes, leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
