import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { getFamilyCode } from "@/lib/familyStore";
import confetti from "canvas-confetti";

function getDaysUntil(month, day) {
  const today = new Date();
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  // If today is exactly the birthday, days = 0
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (next < todayMidnight) next = new Date(thisYear + 1, month - 1, day);
  return Math.round((next - todayMidnight) / (1000 * 60 * 60 * 24));
}

function isToday(month, day) {
  const now = new Date();
  return now.getMonth() + 1 === month && now.getDate() === day;
}

export default function BirthdayCountdownWidget() {
  const [members, setMembers] = useState([]);
  const [celebrated, setCelebrated] = useState(false);
  const familyCode = getFamilyCode();

  useEffect(() => {
    if (!familyCode) return;
    db.FamilyMember.filter({ family_code: familyCode }).then((all) => {
      // Only members who have a birthday set
      const withBirthday = all.filter(m => m.birthday);
      setMembers(withBirthday);
    });
  }, [familyCode]);

  const parsed = members.map(m => {
    const d = new Date(m.birthday);
    // Use UTC values to avoid timezone shifting the date
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return { ...m, month, day };
  });

  const todayBirthdays = parsed.filter(m => isToday(m.month, m.day));
  const upcoming = parsed
    .filter(m => !isToday(m.month, m.day))
    .map(m => ({ ...m, days: getDaysUntil(m.month, m.day) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  useEffect(() => {
    if (todayBirthdays.length > 0 && !celebrated) {
      setCelebrated(true);
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 400);
      setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 600);
    }
  }, [todayBirthdays.length]);

  // Hide widget entirely if no members have birthdays set
  if (members.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-heading font-bold text-lg mb-4">🎂 Birthdays</h3>

      {todayBirthdays.map(m => (
        <motion.div
          key={m.id}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-3 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center"
        >
          <p className="text-2xl mb-1">{m.emoji || "🎂"} 🎉</p>
          <p className="font-heading font-bold">Happy Birthday, {m.name}!</p>
          <p className="text-sm opacity-80">Today is your special day! 🎈</p>
        </motion.div>
      ))}

      {upcoming.length > 0 ? (
        <div className="space-y-2">
          {upcoming.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <span className="text-2xl">{m.emoji || "🎂"}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{m.name}'s Birthday</p>
                <p className="text-xs text-muted-foreground">
                  {m.days === 0 ? "Today! 🎉" : `in ${m.days} day${m.days !== 1 ? 's' : ''} 🎂`}
                </p>
              </div>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                {m.days}d
              </span>
            </motion.div>
          ))}
        </div>
      ) : todayBirthdays.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">No upcoming birthdays</p>
      )}
    </div>
  );
}
