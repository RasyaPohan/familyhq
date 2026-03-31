import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode } from "@/lib/familyStore";
import confetti from "canvas-confetti";

// ─── Evolution stages ──────────────────────────────────────────────────────────
const STAGES = [
  { id: "egg",       minXp: 0,    label: "Egg",        nextXp: 200  },
  { id: "kitten",    minXp: 200,  label: "Kitten",     nextXp: 500  },
  { id: "cat",       minXp: 500,  label: "Cat",        nextXp: 1000 },
  { id: "happy_cat", minXp: 1000, label: "Happy Cat",  nextXp: 2000 },
  { id: "legend",    minXp: 2000, label: "Legend Cat", nextXp: null },
];

function getStage(totalXp) {
  let stage = STAGES[0];
  for (const s of STAGES) {
    if (totalXp >= s.minXp) stage = s;
  }
  return stage;
}

// ─── Corner positions ──────────────────────────────────────────────────────────
const CORNERS = [
  { bottom: 24, right: 24, left: "auto" },
  { bottom: 24, right: "auto", left: 24 },
  { bottom: "auto", top: 80, right: 24, left: "auto" },
];

// ─── Idle speech messages ──────────────────────────────────────────────────────
const IDLE_MESSAGES = [
  "Purrrr... 🐾",
  "I believe in your family! 💪",
  "Today's a great day to earn XP ⚡",
  "Have you hydrated today? 💧",
  "I love this family 🧡",
  "Tap me again, I dare you 😏",
  "*slow blinks at you* 🐱",
  "Don't forget to hug someone today 🤗",
  "The fridge is calling your name 🍕",
];

// ─── CSS Cat SVG drawing ───────────────────────────────────────────────────────

function EggPet({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      {/* Egg body */}
      <ellipse cx="26" cy="29" rx="17" ry="20" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5"/>
      {/* Cracks */}
      <path d="M22 16 L25 20 L23 23" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M30 14 L28 18" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Eyes peeking */}
      <circle cx="22" cy="26" r="2" fill="#1e1b4b"/>
      <circle cx="30" cy="26" r="2" fill="#1e1b4b"/>
      <circle cx="22.7" cy="25.3" r="0.6" fill="white"/>
      <circle cx="30.7" cy="25.3" r="0.6" fill="white"/>
    </svg>
  );
}

function KittenPet({ size = 52, accessory }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 56" fill="none">
      {/* Tail */}
      <path d="M36 46 Q44 42 43 35 Q42 30 38 32" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <ellipse cx="26" cy="42" rx="14" ry="11" fill="#fce7f3"/>
      {/* Head */}
      <circle cx="26" cy="26" r="13" fill="#fce7f3"/>
      {/* Ears */}
      <polygon points="14,17 11,8 20,15" fill="#fce7f3"/>
      <polygon points="38,17 41,8 32,15" fill="#fce7f3"/>
      {/* Inner ears */}
      <polygon points="14.5,16 12.5,10 18.5,15" fill="#fbcfe8"/>
      <polygon points="37.5,16 39.5,10 33.5,15" fill="#fbcfe8"/>
      {/* Eyes */}
      <ellipse cx="21" cy="25" rx="3" ry="3.5" fill="#1e1b4b"/>
      <ellipse cx="31" cy="25" rx="3" ry="3.5" fill="#1e1b4b"/>
      <circle cx="22" cy="23.5" r="1" fill="white"/>
      <circle cx="32" cy="23.5" r="1" fill="white"/>
      {/* Nose */}
      <ellipse cx="26" cy="29" rx="1.5" ry="1" fill="#f9a8d4"/>
      {/* Mouth */}
      <path d="M23 31 Q26 33.5 29 31" stroke="#f9a8d4" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      {/* Whiskers */}
      <line x1="15" y1="28" x2="23" y2="29" stroke="#d1d5db" strokeWidth="0.8"/>
      <line x1="15" y1="30" x2="23" y2="30.5" stroke="#d1d5db" strokeWidth="0.8"/>
      <line x1="29" y1="29" x2="37" y2="28" stroke="#d1d5db" strokeWidth="0.8"/>
      <line x1="29" y1="30.5" x2="37" y2="30" stroke="#d1d5db" strokeWidth="0.8"/>
    </svg>
  );
}

function CatPet({ size = 56, accessory }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 56 62" fill="none">
      {/* Tail */}
      <path d="M40 54 Q50 46 48 36 Q46 28 41 31" stroke="#c4b5fd" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <ellipse cx="27" cy="48" rx="16" ry="13" fill="#ede9fe"/>
      {/* Tummy */}
      <ellipse cx="27" cy="50" rx="8" ry="7" fill="#faf5ff"/>
      {/* Head */}
      <circle cx="27" cy="27" r="15" fill="#ede9fe"/>
      {/* Ears */}
      <polygon points="14,19 10,7 21,17" fill="#ede9fe"/>
      <polygon points="40,19 44,7 33,17" fill="#ede9fe"/>
      <polygon points="14.5,18 11.5,9 20,17" fill="#ddd6fe"/>
      <polygon points="39.5,18 42.5,9 34,17" fill="#ddd6fe"/>
      {/* Eyes */}
      <ellipse cx="21" cy="26" rx="3.5" ry="4" fill="#1e1b4b"/>
      <ellipse cx="33" cy="26" rx="3.5" ry="4" fill="#1e1b4b"/>
      <circle cx="22.2" cy="24.5" r="1.2" fill="white"/>
      <circle cx="34.2" cy="24.5" r="1.2" fill="white"/>
      {/* Nose */}
      <path d="M24.5 31 L27 29.5 L29.5 31 L27 32 Z" fill="#c4b5fd"/>
      {/* Mouth */}
      <path d="M23 33 Q27 36 31 33" stroke="#c4b5fd" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      {/* Whiskers */}
      <line x1="10" y1="29" x2="22" y2="30" stroke="#e5e7eb" strokeWidth="0.9"/>
      <line x1="10" y1="31.5" x2="22" y2="32" stroke="#e5e7eb" strokeWidth="0.9"/>
      <line x1="32" y1="30" x2="44" y2="29" stroke="#e5e7eb" strokeWidth="0.9"/>
      <line x1="32" y1="32" x2="44" y2="31.5" stroke="#e5e7eb" strokeWidth="0.9"/>
    </svg>
  );
}

function HappyCatPet({ size = 56 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 56 64" fill="none">
      {/* Tail */}
      <path d="M40 56 Q52 47 50 36 Q48 27 42 30" stroke="#f9a8d4" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <ellipse cx="27" cy="50" rx="16" ry="13" fill="#fce7f3"/>
      <ellipse cx="27" cy="52" rx="8" ry="7" fill="#fff1f9"/>
      {/* Bow tie on neck */}
      <polygon points="20,38 26,41 20,44" fill="#ec4899"/>
      <polygon points="34,38 28,41 34,44" fill="#ec4899"/>
      <circle cx="27" cy="41" r="2.5" fill="#f472b6"/>
      {/* Head */}
      <circle cx="27" cy="27" r="15" fill="#fce7f3"/>
      {/* Ears */}
      <polygon points="14,19 10,7 21,17" fill="#fce7f3"/>
      <polygon points="40,19 44,7 33,17" fill="#fce7f3"/>
      <polygon points="14.5,18 11.5,9 20,17" fill="#fbcfe8"/>
      <polygon points="39.5,18 42.5,9 34,17" fill="#fbcfe8"/>
      {/* Happy eyes (^ ^ shape) */}
      <path d="M18 26 Q21 22.5 24 26" stroke="#1e1b4b" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <path d="M30 26 Q33 22.5 36 26" stroke="#1e1b4b" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      {/* Rosy cheeks */}
      <ellipse cx="17" cy="31" rx="4" ry="2.5" fill="#fbcfe8" opacity="0.6"/>
      <ellipse cx="37" cy="31" rx="4" ry="2.5" fill="#fbcfe8" opacity="0.6"/>
      {/* Nose */}
      <path d="M24.5 31 L27 29.5 L29.5 31 L27 32 Z" fill="#f9a8d4"/>
      {/* Big smile */}
      <path d="M21 33 Q27 39 33 33" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Whiskers */}
      <line x1="10" y1="29" x2="22" y2="30" stroke="#fce7f3" strokeWidth="0.9"/>
      <line x1="10" y1="31.5" x2="22" y2="32" stroke="#fce7f3" strokeWidth="0.9"/>
      <line x1="32" y1="30" x2="44" y2="29" stroke="#fce7f3" strokeWidth="0.9"/>
      <line x1="32" y1="32" x2="44" y2="31.5" stroke="#fce7f3" strokeWidth="0.9"/>
    </svg>
  );
}

function LegendCatPet({ size = 60 }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 60 72" fill="none">
      {/* Glow ring */}
      <circle cx="29" cy="29" r="22" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.4"/>
      <circle cx="29" cy="29" r="19" fill="none" stroke="#fcd34d" strokeWidth="0.6" opacity="0.3"/>
      {/* Tail */}
      <path d="M42 60 Q55 51 53 39 Q51 29 44 33" stroke="#fcd34d" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Body */}
      <ellipse cx="29" cy="55" rx="17" ry="14" fill="#fef9c3"/>
      <ellipse cx="29" cy="57" rx="9" ry="8" fill="#fffde7"/>
      {/* Crown */}
      <rect x="18" y="6" width="22" height="7" rx="2" fill="#fbbf24"/>
      <polygon points="18,13 20,6 23,12" fill="#f59e0b"/>
      <polygon points="28,13 29,5 30,13" fill="#f59e0b"/>
      <polygon points="40,13 38,6 35,12" fill="#f59e0b"/>
      <circle cx="18" cy="6" r="1.5" fill="#ef4444"/>
      <circle cx="29" cy="5" r="1.5" fill="#22c55e"/>
      <circle cx="40" cy="6" r="1.5" fill="#3b82f6"/>
      {/* Head */}
      <circle cx="29" cy="30" r="16" fill="#fef9c3"/>
      {/* Ears */}
      <polygon points="15,21 11,8 22,19" fill="#fef9c3"/>
      <polygon points="43,21 47,8 36,19" fill="#fef9c3"/>
      <polygon points="15.5,20 12.5,11 21,19" fill="#fde68a"/>
      <polygon points="42.5,20 45.5,11 37,19" fill="#fde68a"/>
      {/* Star eyes */}
      <text x="21.5" y="33" fontSize="7" textAnchor="middle" fill="#1e1b4b">★</text>
      <text x="36.5" y="33" fontSize="7" textAnchor="middle" fill="#1e1b4b">★</text>
      {/* Rosy cheeks */}
      <ellipse cx="18" cy="35" rx="4.5" ry="3" fill="#fde68a" opacity="0.7"/>
      <ellipse cx="40" cy="35" rx="4.5" ry="3" fill="#fde68a" opacity="0.7"/>
      {/* Nose */}
      <path d="M26.5 35 L29 33.5 L31.5 35 L29 36 Z" fill="#fbbf24"/>
      {/* Royal smile */}
      <path d="M23 37 Q29 44 35 37" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Whiskers */}
      <line x1="9" y1="32" x2="23" y2="33.5" stroke="#fde68a" strokeWidth="0.9"/>
      <line x1="9" y1="35" x2="23" y2="35.5" stroke="#fde68a" strokeWidth="0.9"/>
      <line x1="35" y1="33.5" x2="49" y2="32" stroke="#fde68a" strokeWidth="0.9"/>
      <line x1="35" y1="35.5" x2="49" y2="35" stroke="#fde68a" strokeWidth="0.9"/>
      {/* Sparkles */}
      <text x="5" y="18" fontSize="9" opacity="0.8">✨</text>
      <text x="48" y="22" fontSize="7" opacity="0.7">⭐</text>
    </svg>
  );
}

function SleepingZzz() {
  return (
    <div className="absolute -top-8 right-0 flex flex-col items-end gap-0.5 pointer-events-none">
      {[{ size: "text-sm", delay: 0 }, { size: "text-base", delay: 0.4 }, { size: "text-lg", delay: 0.8 }].map((z, i) => (
        <motion.span
          key={i}
          className={`${z.size} font-bold leading-none`}
          style={{ color: "rgba(147,197,253,0.9)" }}
          animate={{ opacity: [0, 1, 0], y: [0, -6, -12] }}
          transition={{ duration: 1.8, delay: z.delay, repeat: Infinity, ease: "easeOut" }}
        >
          z
        </motion.span>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const PET_NAME_KEY = "hq_pet_name";
const PET_STAGE_KEY = "hq_pet_last_stage";
const LAST_INTERACTION_KEY = "hq_last_interaction";

export default function FamilyPet() {
  const familyCode = getFamilyCode();
  const member = getActiveMember();

  const [petName, setPetName] = useState(() => localStorage.getItem(PET_NAME_KEY) || null);
  const [nameInput, setNameInput] = useState("");
  const [totalXp, setTotalXp] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [petState, setPetState] = useState("idle"); // idle | happy | sleeping | excited | spinning
  const [bubble, setBubble] = useState(null); // { text, type }
  const [cornerIdx, setCornerIdx] = useState(0);
  const [showLongPress, setShowLongPress] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  const sleepTimer = useRef(null);
  const moveTimer = useRef(null);
  const longPressTimer = useRef(null);
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const bubbleTimer = useRef(null);

  // ── Load family XP & check evolution ──────────────────────────────────────
  useEffect(() => {
    if (!familyCode) return;
    db.FamilyMember.filter({ family_code: familyCode }).then((members) => {
      const xp = members.reduce((sum, m) => sum + (m.xp || 0), 0);
      setTotalXp(xp);
      const newStage = getStage(xp);
      setStage(newStage);

      // Trigger evolution celebration if stage improved
      const lastStageId = localStorage.getItem(PET_STAGE_KEY);
      if (lastStageId && lastStageId !== newStage.id) {
        const oldIdx = STAGES.findIndex(s => s.id === lastStageId);
        const newIdx = STAGES.findIndex(s => s.id === newStage.id);
        if (newIdx > oldIdx) {
          triggerEvolutionCelebration(newStage);
        }
      }
      localStorage.setItem(PET_STAGE_KEY, newStage.id);
    });
  }, [familyCode]);

  // ── Show name prompt on first appearance ──────────────────────────────────
  useEffect(() => {
    if (!petName && familyCode) {
      setTimeout(() => setShowNamePrompt(true), 2000);
    }
  }, [petName, familyCode]);

  // ── Listen for XP events ──────────────────────────────────────────────────
  useEffect(() => {
    const onXp = (e) => {
      const amount = e.detail?.amount || 0;
      setPetState("excited");
      showBubble(`+${amount} XP! Keep going! ⚡`, "xp");
      setTimeout(() => setPetState("happy"), 2000);
      setTimeout(() => setPetState("idle"), 4000);
    };
    window.addEventListener("xp-earned", onXp);
    return () => window.removeEventListener("xp-earned", onXp);
  }, [petName]);

  // ── Sleep timer ───────────────────────────────────────────────────────────
  const resetSleepTimer = useCallback(() => {
    clearTimeout(sleepTimer.current);
    localStorage.setItem(LAST_INTERACTION_KEY, Date.now().toString());
    if (petState === "sleeping") setPetState("idle");
    sleepTimer.current = setTimeout(() => {
      setPetState("sleeping");
    }, 30_000);
  }, [petState]);

  useEffect(() => {
    resetSleepTimer();
    return () => clearTimeout(sleepTimer.current);
  }, []);

  // ── Corner movement every 3 minutes ───────────────────────────────────────
  useEffect(() => {
    moveTimer.current = setInterval(() => {
      setCornerIdx(prev => (prev + 1) % CORNERS.length);
    }, 3 * 60_000);
    return () => clearInterval(moveTimer.current);
  }, []);

  // ── Contextual morning greeting ───────────────────────────────────────────
  useEffect(() => {
    if (!petName || !member) return;
    const hour = new Date().getHours();
    const shownKey = `hq_pet_greeted_${new Date().toDateString()}`;
    if (!localStorage.getItem(shownKey) && hour >= 6 && hour < 11) {
      localStorage.setItem(shownKey, "1");
      setTimeout(() => {
        showBubble(`Good morning, ${member.name}! 🌅 Check your chores today~`, "greeting");
      }, 3000);
    }
  }, [petName, member]);

  function showBubble(text, type = "idle") {
    clearTimeout(bubbleTimer.current);
    setBubble({ text, type });
    bubbleTimer.current = setTimeout(() => setBubble(null), 5000);
  }

  function triggerEvolutionCelebration(newStage) {
    setPetState("excited");
    confetti({ particleCount: 200, spread: 140, origin: { y: 0.5 }, colors: ["#8B5CF6","#EC4899","#FBBF24","#34D399"] });
    setTimeout(() => confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0 } }), 400);
    setTimeout(() => confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1 } }), 700);
    setTimeout(() => {
      showBubble(`I evolved into a ${newStage.label}! ✨🎉`, "evolution");
    }, 800);
    setTimeout(() => setPetState("idle"), 4000);
  }

  // ── Tap handling ──────────────────────────────────────────────────────────
  const handleTap = () => {
    resetSleepTimer();
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      if (tapCount.current >= 2) {
        // Double tap → spin
        setPetState("spinning");
        setTimeout(() => setPetState("idle"), 1500);
      } else {
        // Single tap → random message
        const msg = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
        showBubble(petName ? `${msg}\n— ${petName}` : msg);
        setPetState("happy");
        setTimeout(() => setPetState("idle"), 2000);
      }
      tapCount.current = 0;
    }, 280);
  };

  // ── Long press ────────────────────────────────────────────────────────────
  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowLongPress(true);
      clearTimeout(bubbleTimer.current);
      setBubble(null);
    }, 600);
  };

  const handlePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  // ── Save pet name ─────────────────────────────────────────────────────────
  const savePetName = () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(PET_NAME_KEY, name);
    setPetName(name);
    setShowNamePrompt(false);
    setTimeout(() => showBubble(`Meow! My name is ${name}! 🐾`), 400);
  };

  if (!familyCode) return null;

  const pos = CORNERS[cornerIdx];
  const catSize = stage.id === "legend" ? 60 : stage.id === "cat" || stage.id === "happy_cat" ? 56 : 52;

  return (
    <>
      {/* Name prompt overlay */}
      <AnimatePresence>
        {showNamePrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9800] bg-black/50 backdrop-blur-sm"
              onClick={() => setShowNamePrompt(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9810] w-80 rounded-3xl p-6 shadow-2xl"
              style={{ background: "#1c1c2e", border: "1px solid rgba(255,255,255,0.12)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-3">
                <KittenPet size={64} />
              </div>
              <p className="text-white font-heading font-bold text-lg text-center mb-1">A new friend appeared! 🐾</p>
              <p className="text-white/50 text-sm text-center mb-4">What should your family call me?</p>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && savePetName()}
                placeholder="Give me a name..."
                className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 mb-3"
                style={{ "--tw-ring-color": "#8B5CF6" }}
              />
              <button
                onClick={savePetName}
                disabled={!nameInput.trim()}
                className="w-full py-3 rounded-2xl font-heading font-bold text-white text-sm disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
              >
                Nice to meet you! 🤝
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Long press info panel */}
      <AnimatePresence>
        {showLongPress && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9800] bg-black/50"
              onClick={() => setShowLongPress(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9810] w-72 rounded-3xl p-5 shadow-2xl"
              style={{ background: "#1c1c2e", border: "1px solid rgba(255,255,255,0.12)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-3">
                {stage.id === "egg" && <EggPet size={52} />}
                {stage.id === "kitten" && <KittenPet size={52} />}
                {stage.id === "cat" && <CatPet size={52} />}
                {stage.id === "happy_cat" && <HappyCatPet size={52} />}
                {stage.id === "legend" && <LegendCatPet size={52} />}
              </div>
              <p className="text-white font-heading font-bold text-center text-base mb-0.5">
                {petName || "Your Pet"} — {stage.label}
              </p>
              <p className="text-white/50 text-xs text-center mb-3">{totalXp} total family XP</p>
              {stage.nextXp ? (
                <>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((totalXp - stage.minXp) / (stage.nextXp - stage.minXp)) * 100))}%`,
                        background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                      }}
                    />
                  </div>
                  <p className="text-white/40 text-[11px] text-center">
                    {stage.nextXp - totalXp} XP until next evolution
                  </p>
                </>
              ) : (
                <p className="text-yellow-400 text-xs text-center font-semibold">👑 Max evolution reached!</p>
              )}
              <button
                onClick={() => setShowLongPress(false)}
                className="mt-4 w-full py-2 rounded-xl text-white/60 text-sm hover:text-white/80 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* The pet widget */}
      <motion.div
        animate={pos}
        transition={{ type: "spring", stiffness: 80, damping: 18 }}
        className="fixed z-[9700]"
        style={{ position: "fixed" }}
      >
        <div className="relative select-none">
          {/* Speech bubble */}
          <AnimatePresence>
            {bubble && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="absolute bottom-full mb-3 right-0 max-w-[200px] rounded-2xl rounded-br-sm px-3 py-2 text-xs font-medium shadow-xl whitespace-pre-wrap"
                style={{
                  background: "#1c1c2e",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: "1.4",
                }}
              >
                {bubble.text}
                <button
                  onClick={() => setBubble(null)}
                  className="ml-2 text-white/30 hover:text-white/60"
                >×</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sleeping Zzz */}
          {petState === "sleeping" && <SleepingZzz />}

          {/* Cat body with animation state */}
          <motion.div
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
            onClick={handleTap}
            style={{ cursor: "pointer" }}
            animate={
              petState === "idle" ? { y: [0, -2, 0], scaleX: [1, 1.01, 1] } :
              petState === "happy" ? { y: [0, -8, 0, -6, 0] } :
              petState === "sleeping" ? { rotate: [0, 3, 0, -3, 0] } :
              petState === "excited" ? { rotate: [0, -12, 12, -12, 12, 0] } :
              petState === "spinning" ? { rotate: [0, 360] } :
              {}
            }
            transition={
              petState === "idle" ? { duration: 3, repeat: Infinity, ease: "easeInOut" } :
              petState === "happy" ? { duration: 0.6, repeat: 3, ease: "easeOut" } :
              petState === "sleeping" ? { duration: 4, repeat: Infinity, ease: "easeInOut" } :
              petState === "excited" ? { duration: 0.5, repeat: 3 } :
              petState === "spinning" ? { duration: 0.5, ease: "easeInOut" } :
              {}
            }
          >
            {stage.id === "egg"       && <EggPet size={catSize} />}
            {stage.id === "kitten"    && <KittenPet size={catSize} />}
            {stage.id === "cat"       && <CatPet size={catSize} />}
            {stage.id === "happy_cat" && <HappyCatPet size={catSize} />}
            {stage.id === "legend"    && <LegendCatPet size={catSize} />}
          </motion.div>

          {/* Egg wobble override */}
          {stage.id === "egg" && petState === "idle" && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ rotate: [0, 4, -4, 4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
      </motion.div>
    </>
  );
}
