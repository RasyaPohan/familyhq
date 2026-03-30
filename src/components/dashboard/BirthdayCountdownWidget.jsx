import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

const BIRTHDAYS = [
  { name: "Dad", emoji: "👨", month: 1, day: 4 },
  { name: "Mom", emoji: "👩", month: 7, day: 21 },
  { name: "Rasya", emoji: "🧑", month: 6, day: 7 },
  { name: "Radif", emoji: "👦", month: 12, day: 16 },
  { name: "Rania", emoji: "👧", month: 11, day: 10 },
];

function getDaysUntil(month, day) {
  const today = new Date();
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next < today) next = new Date(thisYear + 1, month - 1, day);
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function isToday(month, day) {
  const now = new Date();
  return now.getMonth() + 1 === month && now.getDate() === day;
}

export default function BirthdayCountdownWidget() {
  const [celebrated, setCelebrated] = useState(false);

  const todayBirthdays = BIRTHDAYS.filter(b => isToday(b.month, b.day));
  const upcoming = BIRTHDAYS
    .filter(b => !isToday(b.month, b.day))
    .map(b => ({ ...b, days: getDaysUntil(b.month, b.day) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  useEffect(() => {
    if (todayBirthdays.length > 0 && !celebrated) {
      setCelebrated(true);
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 400);
      setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 600);
    }
  }, []);

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-heading font-bold text-lg mb-4">🎂 Birthdays</h3>

      {todayBirthdays.map(b => (
        <motion.div
          key={b.name}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-3 p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center"
        >
          <p className="text-2xl mb-1">{b.emoji} 🎉</p>
          <p className="font-heading font-bold">Happy Birthday, {b.name}!</p>
          <p className="text-sm opacity-80">Today is your special day! 🎈</p>
        </motion.div>
      ))}

      <div className="space-y-2">
        {upcoming.map((b, i) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <span className="text-2xl">{b.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{b.name}'s Birthday</p>
              <p className="text-xs text-muted-foreground">
                {b.days === 0 ? "Today! 🎉" : `in ${b.days} day${b.days !== 1 ? 's' : ''} 🎂`}
              </p>
            </div>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
              {b.days}d
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}