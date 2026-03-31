import { Outlet, useLocation, useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import XPPopup from "@/components/XPPopup";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import { Sun, Moon, Home, Calendar, CheckSquare, Camera, MoreHorizontal, Utensils, DollarSign, Pin, Target, HelpCircle, LogOut, DoorOpen } from "lucide-react";
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
  { path: "/moments", icon: Camera, label: "Moments" },
];

const NAV_PATHS = NAV_ITEMS.map((i) => i.path);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [member, setMember] = useState(getActiveMember());
  const [isDark, setIsDark] = useState(getThemeMode() === "dark");
  const [showMore, setShowMore] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const moreRef = useRef(null);
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

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showMore]);

  useEffect(() => { setShowMore(false); }, [location.pathname]);

  const toggleTheme = () => {
    const newMode = isDark ? "light" : "dark";
    setThemeMode(newMode);
    setIsDark(!isDark);
  };

  const handleSignOut = () => {
    setActiveMember(null);
    setShowMore(false);
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

    // Ignore if primarily vertical scroll or too short
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 50) return;

    const currentIdx = NAV_PATHS.indexOf(location.pathname);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < NAV_PATHS.length - 1) {
      // Swipe left → next page
      navigate(NAV_PATHS[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      // Swipe right → previous page
      navigate(NAV_PATHS[currentIdx - 1]);
    }
  };

  return (
    <div className="bg-background flex" style={{ minHeight: "100dvh" }}>
      <OnboardingWizard />
      <XPPopup />
      <LevelUpOverlay />

      {/* Left Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-30 flex flex-col items-center py-3 shrink-0"
        style={{
          width: "56px",
          background: "rgba(10,10,15,0.92)",
          borderRight: `1px solid ${memberColor.hex}30`,
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* Nav icons */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.85 }}
                title={item.label}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: `${memberColor.hex}22` }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className="w-5 h-5 relative z-10 transition-all duration-200"
                  style={{
                    color: isActive ? memberColor.hex : "rgba(255,255,255,0.45)",
                    filter: isActive
                      ? `drop-shadow(0 0 6px ${memberColor.hex}) drop-shadow(0 0 12px ${memberColor.hex}80)`
                      : "none",
                  }}
                />
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + more */}
        <div className="flex flex-col items-center gap-1 mt-auto">
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.85 }}
            title={isDark ? "Light mode" : "Dark mode"}
            className="flex items-center justify-center w-10 h-10 rounded-xl"
          >
            {isDark
              ? <Sun className="w-4 h-4 text-yellow-400" />
              : <Moon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.45)" }} />
            }
          </motion.button>

          <div className="relative" ref={moreRef}>
            <motion.button
              onClick={() => setShowMore(!showMore)}
              whileTap={{ scale: 0.85 }}
              title="More"
              className="flex items-center justify-center w-10 h-10 rounded-xl"
            >
              <MoreHorizontal
                className="w-5 h-5 transition-all duration-200"
                style={{
                  color: showMore ? memberColor.hex : "rgba(255,255,255,0.45)",
                  filter: showMore ? `drop-shadow(0 0 6px ${memberColor.hex})` : "none",
                }}
              />
            </motion.button>

            {/* More popup — floats to the right of the sidebar */}
            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute left-12 bottom-0 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50"
                  style={{ background: "#1c1c2e" }}
                >
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={() => { navigate("/guide"); setShowMore(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all"
                    >
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      How it works
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Switch Member
                    </button>
                    <button
                      onClick={() => { setShowMore(false); setShowLeaveConfirm(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <DoorOpen className="w-4 h-4 shrink-0" />
                      Leave HQ
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div
        className="flex flex-col flex-1"
        style={{ marginLeft: "56px", minHeight: "100dvh" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <motion.button
            onClick={() => navigate("/select")}
            whileTap={{ scale: 0.85 }}
            className="flex items-center gap-2"
          >
            <span className="text-2xl">🏠</span>
            <span className="font-heading font-bold text-base hidden sm:block">Family HQ</span>
          </motion.button>
          {member && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`}
              style={{ background: memberColor.hex }}
            >
              {member.emoji || member.name[0]}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* More menu backdrop */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[29]"
            onClick={() => setShowMore(false)}
          />
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
