import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SCREENS = [
  { emoji: "📅", title: "Family Calendar", body: "One place for everyone's events. Birthdays, practices, appointments — all colour-coded by person.", color: "#3B82F6" },
  { emoji: "✅", title: "Chores & XP", body: "Gamified chore tracking. Complete tasks, earn XP, level up, and climb the leaderboard. May the best Yanwar win.", color: "#8B5CF6" },
  { emoji: "🍽️", title: "Meal Planner", body: "Plan the whole week's meals. Vote on dinner. No more \"idk what do you want\" conversations.", color: "#EC4899" },
  { emoji: "💸", title: "Family Budget", body: "Track spending, manage kids' allowances, and approve purchase requests. Full visibility for everyone.", color: "#10B981" },
  { emoji: "📢", title: "Noticeboard", body: "The family corkboard — gone digital. Pin urgent notes, drop reminders, react with emojis.", color: "#F59E0B" },
  { emoji: "🎯", title: "Goals", body: "Set family savings goals or personal ones. Track progress together and celebrate when you hit them.", color: "#06B6D4" },
  { emoji: "🏠", title: "The Yanwar's HQ is yours.", body: "Go make it home. Everything's here. Everyone's here. Let's do this.", color: "#8B5CF6", isLast: true },
];

export default function FeatureTour({ onDone }) {
  const [screen, setScreen] = useState(0);
  const navigate = useNavigate();
  const current = SCREENS[screen];
  const isLast = screen === SCREENS.length - 1;

  const handleNext = () => {
    if (isLast) { onDone(); navigate('/dashboard'); return; }
    setScreen(s => s + 1);
  };

  const handleSkip = () => { onDone(); navigate('/dashboard'); };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.35 }}
          className="max-w-sm w-full text-center"
        >
          {/* Big emoji illustration */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-9xl mb-8"
          >
            {current.emoji}
          </motion.div>

          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 text-white"
            style={{ background: current.color }}
          >
            {screen + 1} of {SCREENS.length}
          </div>

          <h2 className="font-heading text-3xl font-bold text-white mb-4">{current.title}</h2>
          <p className="text-white/60 text-base leading-relaxed mb-10">{current.body}</p>

          <div className="space-y-3">
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl font-heading font-bold text-white text-lg"
              style={{ background: `linear-gradient(135deg, ${current.color}, #EC4899)` }}
            >
              {isLast ? "Go to HQ 🏠" : "Next →"}
            </button>
            {!isLast && (
              <button onClick={handleSkip} className="w-full py-2 text-white/40 text-sm hover:text-white/70 transition-colors">
                Skip tour
              </button>
            )}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-8">
            {SCREENS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${i === screen ? 'w-6 h-1.5' : 'w-1.5 h-1.5 bg-white/20'}`}
                style={i === screen ? { background: current.color } : {}}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}