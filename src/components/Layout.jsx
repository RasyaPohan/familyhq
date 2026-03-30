import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import OnboardingWizard from "@/components/OnboardingWizard";
import XPPopup from "@/components/XPPopup";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import { Sun, Moon, Bell, Home, Calendar, CheckSquare, Camera, MoreHorizontal, Utensils, DollarSign, Pin, Target, HelpCircle, LogOut, DoorOpen, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getActiveMember, setActiveMember, getThemeMode, setThemeMode, MEMBER_COLORS, clearFamilySession, getFamilyCode } from "@/lib/familyStore";
import { motion, AnimatePresence } from "framer-motion";

const MAIN_NAV = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/chores", icon: CheckSquare, label: "Chores" },
  { path: "/moments", icon: Camera, label: "Moments" },
];

const MORE_ITEMS = [
  { path: "/meals", icon: Utensils, label: "Meals", emoji: "🍽️" },
  { path: "/budget", icon: DollarSign, label: "Budget", emoji: "💸" },
  { path: "/noticeboard", icon: Pin, label: "Board", emoji: "📌" },
  { path: "/goals", icon: Target, label: "Goals", emoji: "🎯" },
  { path: "/guide", icon: HelpCircle, label: "How it works", emoji: "❓" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [member, setMember] = useState(getActiveMember());
  const [isDark, setIsDark] = useState(getThemeMode() === "dark");
  const [showMore, setShowMore] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const moreRef = useRef(null);
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

  // Close more menu on navigation
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

  const isMoreActive = MORE_ITEMS.some(i => i.path === location.pathname);

  return (
    <div className="bg-background flex flex-col" style={{ minHeight: "100dvh" }}>
      <OnboardingWizard />
      <XPPopup />
      <LevelUpOverlay />

      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <motion.button
          onClick={() => navigate("/select")}
          whileTap={{ scale: 0.85 }}
          className="flex items-center gap-2"
        >
          <span className="text-2xl">🏠</span>
          <span className="font-heading font-bold text-base hidden sm:block">Family HQ</span>
        </motion.button>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
          {member && (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ml-1 ${memberColor.bg}`}>
              {member.emoji || member.name[0]}
            </div>
          )}
        </div>
      </header>

      {/* Page content — padding clears the fixed nav bar */}
      <main className="layout-main flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* More menu backdrop */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-[9990]"
            onClick={() => setShowMore(false)}
          />
        )}
      </AnimatePresence>

      {/* More menu popup */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            ref={moreRef}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed right-3 z-[9995] w-56 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: "#1c1c2e", bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="p-2 space-y-0.5">
              {MORE_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive ? "bg-purple-500/20 text-purple-300" : "text-white/60 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-lg w-6 text-center">{item.emoji}</span>
                    {item.label}
                  </button>
                );
              })}
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                Switch Member
              </button>
              <button
                onClick={() => { setShowMore(false); setShowLeaveConfirm(true); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
              >
                <DoorOpen className="w-5 h-5 shrink-0" />
                Leave HQ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav
        className="bottom-nav-bar flex items-center justify-around backdrop-blur-xl"
        style={{
          background: "rgba(10,10,15,0.92)",
          borderTop: `1px solid ${memberColor.hex}40`,
          boxShadow: `0 -1px 0 ${memberColor.hex}25, 0 -8px 32px rgba(0,0,0,0.6)`,
        }}
      >
        {MAIN_NAV.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.85 }}
              className="relative flex flex-col items-center justify-center w-14 h-12"
            >
              <motion.div
                animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Icon
                  className="w-6 h-6 transition-all duration-200"
                  style={{
                    color: isActive ? memberColor.hex : "rgba(255,255,255,0.55)",
                    filter: isActive ? `drop-shadow(0 0 8px ${memberColor.hex}) drop-shadow(0 0 16px ${memberColor.hex}80)` : "none",
                  }}
                />
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="active-dot"
                  className="absolute bottom-0 w-1 h-1 rounded-full"
                  style={{ background: memberColor.hex, boxShadow: `0 0 6px ${memberColor.hex}` }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}

        {/* More button */}
        <motion.button
          onClick={() => setShowMore(!showMore)}
          whileTap={{ scale: 0.85 }}
          className="relative flex flex-col items-center justify-center w-14 h-12"
        >
          <motion.div animate={showMore || isMoreActive ? { scale: 1.15 } : { scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
            <MoreHorizontal
              className="w-6 h-6 transition-all duration-200"
                    style={{
                      color: showMore || isMoreActive ? memberColor.hex : "rgba(255,255,255,0.55)",
                      filter: showMore || isMoreActive ? `drop-shadow(0 0 8px ${memberColor.hex}) drop-shadow(0 0 16px ${memberColor.hex}80)` : "none",
              }}
            />
          </motion.div>
          {isMoreActive && !showMore && (
            <motion.div
              className="absolute bottom-0 w-1 h-1 rounded-full"
              style={{ background: memberColor.hex, boxShadow: `0 0 6px ${memberColor.hex}` }}
            />
          )}
        </motion.button>
      </nav>

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