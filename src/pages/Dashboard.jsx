import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getActiveMember, getFamilyCode } from "@/lib/familyStore";
import { db } from "@/lib/db";
import { Plus, Calendar, CheckSquare, Utensils, StickyNote, BookOpen, Camera, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GreetingWidget from "@/components/dashboard/GreetingWidget";
import TodayChoresWidget from "@/components/dashboard/TodayChoresWidget";
import UpcomingEventsWidget from "@/components/dashboard/UpcomingEventsWidget";
import DinnerWidget from "@/components/dashboard/DinnerWidget";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import WeeklyLeaderboard from "@/components/dashboard/WeeklyLeaderboard";
import BirthdayCountdownWidget from "@/components/dashboard/BirthdayCountdownWidget";
import DualClockWidget from "@/components/dashboard/DualClockWidget";

const quickActions = [
  { label: "Add Event", emoji: "📅", path: "/calendar", icon: Calendar },
  { label: "Add Chore", emoji: "✅", path: "/chores", icon: CheckSquare },
  { label: "Plan Meal", emoji: "🍽️", path: "/meals", icon: Utensils },
  { label: "Post Note", emoji: "📢", path: "/noticeboard", icon: StickyNote },
  { label: "Post Moment", emoji: "📸", path: "/moments?upload=true", icon: Camera },
  { label: "Rewards Shop", emoji: "🎁", path: "/rewards", icon: Gift },
];

// Detect the local IANA timezone of the browser
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default function Dashboard() {
  const member = getActiveMember();
  const familyCode = getFamilyCode();
  const navigate = useNavigate();
  const [showQuick, setShowQuick] = useState(false);
  const [clockConfig, setClockConfig] = useState(null); // { homeTimezone, awayTimezone, awayMemberName, awayMemberEmoji }

  useEffect(() => {
    if (!familyCode) return;
    db.FamilyMember.filter({ family_code: familyCode }).then((members) => {
      // Find members who have a different timezone set from the current device timezone
      const awayMember = members.find(
        m => m.timezone && m.timezone !== LOCAL_TZ
      );
      if (!awayMember) return;

      // Find the "home" timezone — prefer a member without a custom tz, else use browser tz
      const homeMember = members.find(m => !m.timezone || m.timezone === LOCAL_TZ);
      const homeTimezone = homeMember?.timezone || LOCAL_TZ;

      setClockConfig({
        homeTimezone,
        awayTimezone: awayMember.timezone,
        awayMemberName: awayMember.name,
        awayMemberEmoji: awayMember.emoji,
      });
    });
  }, [familyCode]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="relative">
        <GreetingWidget />
        <Link
          to="/guide"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
          title="How It Works"
        >
          <BookOpen className="w-4 h-4 text-white" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <TodayChoresWidget />
        <UpcomingEventsWidget />
        <DinnerWidget />
        <BirthdayCountdownWidget />
        {clockConfig && (
          <DualClockWidget
            homeTimezone={clockConfig.homeTimezone}
            awayTimezone={clockConfig.awayTimezone}
            awayMemberName={clockConfig.awayMemberName}
            awayMemberEmoji={clockConfig.awayMemberEmoji}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <WeeklyLeaderboard />
        <ActivityFeed />
      </div>

      {/* Floating Quick Add Button */}
      <div className="fixed left-6 z-40" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <AnimatePresence>
          {showQuick && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 bg-card rounded-2xl shadow-xl border border-border p-3 space-y-1 min-w-[180px]"
            >
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => { navigate(action.path); setShowQuick(false); }}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <span className="text-xl">{action.emoji}</span>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: showQuick ? 45 : 0 }}
          onClick={() => setShowQuick(!showQuick)}
          className="w-14 h-14 rounded-full gradient-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
}
