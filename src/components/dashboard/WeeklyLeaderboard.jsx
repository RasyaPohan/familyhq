import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { MEMBER_COLORS, getFamilyCode } from "@/lib/familyStore";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default function WeeklyLeaderboard() {
  const [members, setMembers] = useState([]);

  const familyCode = getFamilyCode();

  useEffect(() => {
    db.FamilyMember.filter({ family_code: familyCode }).then(setMembers);
    const handler = () => db.FamilyMember.filter({ family_code: familyCode }).then(setMembers);
    window.addEventListener("xp-earned", handler);
    return () => window.removeEventListener("xp-earned", handler);
  }, []);

  const weekStart = getWeekStart();

  const ranked = [...members]
    .map((m) => ({
      ...m,
      weekXp: m.week_start === weekStart ? (m.weekly_xp || 0) : 0,
    }))
    .sort((a, b) => b.weekXp - a.weekXp);

  const anyXP = ranked.some((m) => m.weekXp > 0);

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Weekly Leaderboard
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Resets Monday</span>
      </div>

      {!anyXP ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          No XP earned this week yet. Go crush some chores! 💪
        </p>
      ) : (
        <div className="space-y-2">
          {ranked.map((m, i) => {
            const color = MEMBER_COLORS[m.color] || MEMBER_COLORS.purple;
            const isFirst = i === 0 && m.weekXp > 0;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isFirst
                    ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/30"
                    : "bg-muted/30"
                }`}
                style={isFirst ? { boxShadow: "0 0 24px rgba(234,179,8,0.18)" } : {}}
              >
                <span className="w-6 text-center text-sm font-bold shrink-0">
                  {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base shrink-0"
                  style={{ background: color.hex }}
                >
                  {m.emoji || m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-1">
                    {m.name}
                    {isFirst && (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-xs"
                      >
                        👑
                      </motion.span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.weekXp} XP this week</p>
                </div>
                <div
                  className="text-sm font-heading font-bold"
                  style={{ color: color.hex }}
                >
                  {m.weekXp > 0 ? `+${m.weekXp}` : "–"}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}