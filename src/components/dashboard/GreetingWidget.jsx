import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, getGreeting, MEMBER_COLORS, getLevelFromXp, getLevelTitle, getLevelProgress, LEVELS } from "@/lib/familyStore";
import { motion } from "framer-motion";

export default function GreetingWidget() {
  const member = getActiveMember();
  const [liveXp, setLiveXp] = useState(member?.xp || 0);
  const color = member ? MEMBER_COLORS[member.color] || MEMBER_COLORS.purple : MEMBER_COLORS.purple;

  useEffect(() => {
    if (!member?.id) return;
    // Refresh XP when any XP is earned
    const handler = () => {
      db.FamilyMember.filter({ id: member.id }).then(r => {
        if (r[0]) setLiveXp(r[0].xp || 0);
      });
    };
    handler();
    window.addEventListener('xp-earned', handler);
    return () => window.removeEventListener('xp-earned', handler);
  }, [member?.id]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const level = getLevelFromXp(liveXp);
  const levelTitle = getLevelTitle(level);
  const progress = getLevelProgress(liveXp);
  const nextLevelMin = LEVELS[level]?.min || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color.hex}, ${color.hex}aa)` }}
    >
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-10 translate-x-10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-10 -translate-x-10" />
      
      <div className="relative z-10">
        <p className="text-white/80 text-sm font-medium">{dateStr}</p>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mt-1">
          {member ? `Good ${getGreeting()}, ${member.name}! ${getGreeting() === 'morning' ? '☀️' : getGreeting() === 'afternoon' ? '👋' : '🌙'}` : 'Hello!'}
        </h1>

        {/* XP Bar */}
        {member && (
          <div className="mt-3 mb-1">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>⚡ {liveXp} XP · {levelTitle}</span>
              {nextLevelMin && <span>{nextLevelMin - liveXp} XP to next level</span>}
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <p className="text-white/70 mt-2 text-sm">
          {member?.role === 'Kid' 
            ? `Level ${member.level || 1} • ${member.xp || 0} XP • 🔥 ${member.streak || 0} day streak`
            : "Here's what's happening today"
          }
        </p>
      </div>
    </motion.div>
  );
}