import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveMember } from "@/lib/familyStore";
import { isRasya } from "@/lib/tzCurrency";

const sections = (showTz) => [
  {
    emoji: "👤",
    title: "Getting In",
    content: (
      <p className="text-white/70 leading-relaxed">
        Open the app → tap your avatar → you're in. No passwords, no fuss. Each family member has their own profile with their own XP, level, and streak.
      </p>
    ),
  },
  {
    emoji: "✅",
    title: "Earning XP",
    content: (
      <div className="space-y-2">
        {[
          { icon: "✅", label: "Complete a chore on time", xp: "+10 XP" },
          { icon: "⚡", label: "Complete a chore early", xp: "+20 XP" },
          { icon: "🍽️", label: "Vote on dinner", xp: "+5 XP" },
          { icon: "📅", label: "Add a calendar event", xp: "+5 XP" },
          { icon: "📌", label: "Post on the board", xp: "+5 XP" },
          { icon: "🎯", label: "Family goal completed", xp: "+100 XP (everyone!)" },
          { icon: "🆕", label: "First time using a feature", xp: "+15 XP" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
            <span className="text-sm text-white/80">{row.icon} {row.label}</span>
            <span className="text-sm font-heading font-bold text-violet-400 shrink-0 ml-3">{row.xp}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: "🔥",
    title: "Streaks",
    content: (
      <div className="space-y-3">
        <p className="text-white/70 text-sm leading-relaxed">
          Complete chores every day to build your streak — the longer it goes, the bigger the bonus:
        </p>
        {[
          { days: "3 days", bonus: "+25 XP", flame: "🔥" },
          { days: "7 days", bonus: "+50 XP", flame: "🔥🔥" },
          { days: "14 days", bonus: "+75 XP", flame: "🔥🔥🔥" },
          { days: "30 days", bonus: "+150 XP", flame: "🔥🔥🔥🔥" },
        ].map((row) => (
          <div key={row.days} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
            <span className="text-base">{row.flame}</span>
            <span className="text-sm text-white/80 flex-1">{row.days} streak</span>
            <span className="text-sm font-heading font-bold text-orange-400">{row.bonus}</span>
          </div>
        ))}
        <p className="text-white/50 text-xs mt-2">Miss a day and it resets. Don't break it 😤</p>
      </div>
    ),
  },
  {
    emoji: "🏆",
    title: "Levels & Titles",
    content: (
      <div className="space-y-2">
        <p className="text-white/70 text-sm mb-3">Earn XP to rank up and unlock your title:</p>
        {[
          { emoji: "🐣", title: "New Member", xp: "0 XP" },
          { emoji: "🌱", title: "Getting There", xp: "100 XP" },
          { emoji: "⚡", title: "Active Member", xp: "300 XP" },
          { emoji: "🌟", title: "Family Star", xp: "600 XP" },
          { emoji: "👑", title: "HQ Legend", xp: "1000 XP" },
        ].map((lvl, i) => (
          <div key={lvl.title} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
            <span className="text-2xl">{lvl.emoji}</span>
            <span className="flex-1 text-sm font-medium text-white/80">{lvl.title}</span>
            <span className="text-xs text-violet-400 font-heading font-bold">{lvl.xp}</span>
          </div>
        ))}
        <p className="text-white/50 text-xs mt-2">Level up and the whole family sees your celebration 🎉</p>
      </div>
    ),
  },
  {
    emoji: "📊",
    title: "Leaderboard",
    content: (
      <p className="text-white/70 leading-relaxed text-sm">
        The weekly leaderboard resets every Monday. The #1 spot wears the 👑 crown until next reset. Anyone can win — yes, even Rania 😂
      </p>
    ),
  },
  {
    emoji: "🎁",
    title: "Rewards Shop",
    content: (
      <p className="text-white/70 leading-relaxed text-sm">
        Rack up XP → head to the <strong className="text-white">Rewards Shop</strong> → redeem something good → wait for Mom or Dad to approve it ✅. XP gets deducted once approved.
      </p>
    ),
  },
  {
    emoji: "⚠️",
    title: "Penalties",
    content: (
      <p className="text-white/70 leading-relaxed text-sm">
        Miss a chore past its deadline → <span className="text-red-400 font-bold">-5 XP</span>. Stay on top of it. You've been warned 😅
      </p>
    ),
  },
  ...(showTz
    ? [
        {
          emoji: "🌏",
          title: "Timezone & Currency",
          content: (
            <p className="text-white/70 leading-relaxed text-sm">
              You're in Vancouver 🇨🇦 so everything shows in <strong className="text-white">PDT and CAD</strong>. The family sees the same events in WIB and IDR automatically — no one has to do the math.
            </p>
          ),
        },
      ]
    : []),
  {
    emoji: "🐱",
    title: "Your Family Pet",
    content: (
      <div className="space-y-3">
        <p className="text-white/70 text-sm leading-relaxed">
          Your family has a shared pet that lives in the corner of the app. It grows as your family earns XP together. <strong className="text-white">Tap</strong> it for messages, <strong className="text-white">long press</strong> to see its XP progress, <strong className="text-white">double tap</strong> to make it spin.
        </p>
        <div className="space-y-2 mt-2">
          {[
            { emoji: "🥚", stage: "Egg",       range: "0 – 200 XP",    desc: "Just hatching..."          },
            { emoji: "🐱", stage: "Kitten",     range: "200 – 500 XP",  desc: "Getting livelier!"         },
            { emoji: "🐈", stage: "Cat",        range: "500 – 1000 XP", desc: "Fully grown!"              },
            { emoji: "😸", stage: "Happy Cat",  range: "1000 – 2000 XP",desc: "Accessorized and happy!"   },
            { emoji: "👑", stage: "Legend Cat", range: "2000+ XP",      desc: "Crowned and glowing!"      },
          ].map((s) => (
            <div key={s.stage} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
              <span className="text-2xl shrink-0">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{s.stage}</p>
                <p className="text-xs text-white/50">{s.desc}</p>
              </div>
              <span className="text-xs font-heading font-bold text-violet-400 shrink-0">{s.range}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    emoji: "📸",
    title: "Moments",
    content: (
      <p className="text-white/70 leading-relaxed text-sm">
        Post photos for the whole family to see. React with emojis, leave comments, and build your family memory wall together. Head to <strong className="text-white">Moments</strong> in the sidebar to get started.
      </p>
    ),
  },
  {
    emoji: "✈️",
    title: "Travel Mode",
    content: (
      <p className="text-white/70 leading-relaxed text-sm">
        If a family member is abroad, they can set their timezone in <strong className="text-white">profile settings</strong> (tap your avatar → Edit Profile). The app automatically converts all event times to their timezone and shows a <strong className="text-white">dual clock</strong> on the dashboard so everyone always knows what time it is for each other.
      </p>
    ),
  },
];

function Section({ section, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <motion.span
          animate={{ rotate: open ? [0, -15, 15, 0] : 0, scale: open ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.4 }}
          className="text-2xl shrink-0"
        >
          {section.emoji}
        </motion.span>
        <span className="font-heading font-bold text-white text-base flex-1">{section.title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-5 h-5 text-white/40" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{section.content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function GuidePage() {
  const navigate = useNavigate();
  const member = getActiveMember();
  const showTz = isRasya(member);
  const guide = sections(showTz);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white/50 hover:text-white transition-colors text-sm">
          ← Back
        </button>
        <h1 className="font-heading font-bold text-xl flex-1">📖 How It Works</h1>
      </div>

      {/* Intro */}
      <div className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-600/30 to-pink-500/20 border border-violet-500/30 rounded-2xl p-5 mb-6"
        >
          <p className="font-heading font-bold text-lg mb-1">Welcome to The Yanwar's HQ 🏠</p>
          <p className="text-white/60 text-sm leading-relaxed">
            This is your family's command center. Earn XP, level up, compete on the leaderboard, and claim rewards. Here's everything you need to know.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-3 pb-32">
          {guide.map((section, i) => (
            <Section key={section.title} section={section} index={i} />
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-[#0f0f1a] to-transparent pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pointer-events-auto"
        >
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full h-12 text-base font-heading font-bold gap-2"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            <Rocket className="w-5 h-5" /> Got it! Let's go 🚀
          </Button>
        </motion.div>
      </div>
    </div>
  );
}