import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { X, Send } from "lucide-react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, getFamilyName } from "@/lib/familyStore";
import confetti from "canvas-confetti";

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const AI_COOLDOWN_MS = 30_000; // 30 seconds between AI calls

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

// ─── Corner snap positions ─────────────────────────────────────────────────────
// EDGE_PAD: distance from screen edges; BOTTOM_PAD: keeps pet above nav bar.
// Bottom-left is excluded (reserved for nav / layout elements).
const EDGE_PAD = 16;
const BOTTOM_PAD = 72;

// Returns the pixel {x, y} of each allowed corner's top-left origin
// given current viewport dimensions and pet size.
function cornerPositions(petSize) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return [
    { id: "bottom-right", x: W - petSize - EDGE_PAD, y: H - petSize - BOTTOM_PAD },
    { id: "top-right",    x: W - petSize - EDGE_PAD, y: 80 },
    { id: "top-left",     x: EDGE_PAD,               y: 80 },
  ];
}

const PET_CORNER_KEY = "hq_pet_corner"; // localStorage key for last corner id

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

// ─── Tap reaction system ───────────────────────────────────────────────────────
// Each reaction has an animation id and a speech bubble message.
// "angry" reactions flash a red face on the egg briefly.

const TAP_REACTIONS = [
  { anim: "tap-spin",   msg: "HEY! Stop that! 😡",           angry: true  },
  { anim: "tap-jump",   msg: "I am NOT a toy 😤",            angry: false },
  { anim: "tap-shake",  msg: "ow ow ow 🤕",                  angry: true  },
  { anim: "tap-flip",   msg: "do you MIND 😒",               angry: false },
  { anim: "tap-shrink", msg: "again?? seriously?? 🙄",        angry: false },
  { anim: "tap-run",    msg: "ok that one was kinda fun ngl 😳", angry: false },
  { anim: "tap-shake",  msg: "STOP POKING ME 😤",            angry: true  },
  { anim: "tap-jump",   msg: "...you good bro? 👀",           angry: false },
  { anim: "tap-spin",   msg: "I will remember this 😾",       angry: true  },
  { anim: "tap-run",    msg: "ok im calling mom 📱",          angry: false },
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

// ─── Full-screen centering wrapper — completely independent of pet position ────
// The outer div IS the backdrop. The inner div is the flex container that
// centers children. No transform on children means Framer Motion animations
// can't clobber the centering.
function PetCenteredModal({ children, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.7)",
          zIndex: 99998,
        }}
        onClick={onClose}
      />
      {/* Centering flex container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Shared modal shell ───────────────────────────────────────────────────────
function PetModal({ children, onClose }) {
  return (
    <div
      className="relative rounded-3xl p-5 shadow-2xl"
      style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.13)" }}
    >
      {/* X close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: "16px", lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      >×</button>
      {children}
    </div>
  );
}

// ─── Pet Chat bottom sheet ─────────────────────────────────────────────────────
function PetChat({ petName, petStage, onClose, onSend, messages, isTyping }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 350);
  }, []);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onSend(text);
  };

  const PetAvatar = () => {
    if (petStage === "egg")       return <EggPet size={40} />;
    if (petStage === "kitten")    return <KittenPet size={40} />;
    if (petStage === "cat")       return <CatPet size={40} />;
    if (petStage === "happy_cat") return <HappyCatPet size={40} />;
    return <LegendCatPet size={40} />;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 99990,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        }}
      />
      {/* Bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          zIndex: 99991,
          background: "#10101e",
          borderTop: "1px solid rgba(139,92,246,0.25)",
          borderRadius: "22px 22px 0 0",
          display: "flex", flexDirection: "column",
          height: "72vh", maxHeight: 560,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: "rgba(124,58,237,0.18)",
            border: "1.5px solid rgba(139,92,246,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            <PetAvatar />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: 0 }}>
              {petName || "Your Pet"}
            </p>
            <p style={{ color: "rgba(167,139,250,0.7)", fontSize: 11, margin: 0 }}>
              {isTyping ? "typing..." : "ready to chat 💬"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "auto", padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 24 }}>
              Say something to {petName || "your pet"} 👋
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(124,58,237,0.2)", marginRight: 7, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  🐾
                </div>
              )}
              <div style={{
                maxWidth: "72%",
                padding: "9px 13px",
                borderRadius: msg.role === "user"
                  ? "16px 4px 16px 16px"
                  : "4px 16px 16px 16px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
                  : "rgba(255,255,255,0.07)",
                border: msg.role === "assistant"
                  ? "1px solid rgba(139,92,246,0.2)"
                  : "none",
                color: "white",
                fontSize: 14,
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(124,58,237,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}>🐾</div>
              <div style={{
                padding: "10px 14px", borderRadius: "4px 16px 16px 16px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(139,92,246,0.2)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {[0, 1, 2].map(i => (
                  <motion.span key={i}
                    style={{
                      display: "inline-block", width: 6, height: 6,
                      borderRadius: "50%", background: "#a78bfa",
                    }}
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input row */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
            placeholder={`Message ${petName || "your pet"}...`}
            disabled={isTyping}
            style={{
              flex: 1, background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(139,92,246,0.35)",
              borderRadius: 20, padding: "10px 14px",
              color: "white", fontSize: 14, outline: "none",
              fontFamily: "system-ui, sans-serif",
              transition: "border-color 0.2s",
              opacity: isTyping ? 0.5 : 1,
            }}
            onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.75)"}
            onBlur={e => e.target.style.borderColor = "rgba(139,92,246,0.35)"}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={submit}
            disabled={!input.trim() || isTyping}
            style={{
              width: 40, height: 40, borderRadius: "50%", border: "none",
              background: input.trim() && !isTyping
                ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
                : "rgba(255,255,255,0.07)",
              color: input.trim() && !isTyping ? "white" : "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !isTyping ? "pointer" : "default",
              flexShrink: 0, transition: "all 0.2s",
            }}
          >
            <Send size={16} />
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const PET_NAME_KEY = "hq_pet_name";
const PET_STAGE_KEY = "hq_pet_last_stage";
const LAST_INTERACTION_KEY = "hq_last_interaction";
const LAST_AI_MSG_KEY = "hq_pet_last_ai_msg";

// ── Mood system ───────────────────────────────────────────────────────────────
// Mood is derived from live family data when context is gathered.
// It affects the bubble border color only — a subtle signal, not intrusive.
const MOODS = {
  proud:   { color: "rgba(251,191,36,0.55)",  label: "proud"   }, // gold  — lots of XP/chores done
  curious: { color: "rgba(167,139,250,0.45)", label: "curious" }, // purple — default / neutral
  worried: { color: "rgba(239,68,68,0.45)",   label: "worried" }, // red   — 0 chores done late in day
  playful: { color: "rgba(52,211,153,0.45)",  label: "playful" }, // green — morning / photo posted recently
};

function deriveMood(ctx) {
  const hour = ctx.hour ?? new Date().getHours();
  const doneRatio = ctx.totalChores > 0 ? ctx.doneToday / ctx.totalChores : 0;
  if (hour >= 18 && doneRatio === 0 && ctx.totalChores > 0) return MOODS.worried;
  if (doneRatio >= 0.8) return MOODS.proud;
  if (hour < 12 || (ctx.daysSincePhoto != null && ctx.daysSincePhoto <= 1)) return MOODS.playful;
  return MOODS.curious;
}

export default function FamilyPet() {
  const familyCode = getFamilyCode();
  const member = getActiveMember();

  const [petName, setPetName] = useState(() => localStorage.getItem(PET_NAME_KEY) || null);
  const [nameInput, setNameInput] = useState("");
  const [totalXp, setTotalXp] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  const [petState, setPetState] = useState("idle"); // idle | happy | sleeping | excited | tap-*
  const [bubble, setBubble] = useState(null); // { text, type }
  const [cornerId, setCornerId] = useState(
    () => localStorage.getItem(PET_CORNER_KEY) || "bottom-right"
  );
  const [showLongPress, setShowLongPress] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // { role: "user"|"assistant", content }[]
  const [chatTyping, setChatTyping] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [angryFlash, setAngryFlash] = useState(false); // red overlay on egg
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [mood, setMood] = useState(MOODS.curious);
  const [isDragging, setIsDragging] = useState(false);

  // Framer Motion values for drag position (pixel x/y from top-left of viewport)
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const petSizeRef = useRef(80); // updated after first render

  const sleepTimer = useRef(null);
  const longPressTimer = useRef(null);
  const bubbleTimer = useRef(null);
  const lastReactionIdx = useRef(-1);
  const lastAICallTime = useRef(0);
  const aiContext = useRef({});

  // Drag tracking refs
  const pointerDownPos = useRef(null);   // { x, y, time }
  const lastPointerPos = useRef(null);   // { x, y } — previous frame position for delta
  const isDragActive = useRef(false);    // true while finger is dragging

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
    }).catch(() => { /* silent — pet just won't show XP if DB is unavailable */ });
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
      const memberName = e.detail?.memberName || "";
      setPetState("excited");
      // Show instant local message first, then optionally follow with AI
      showBubble(`+${amount} XP! Keep going! ⚡`, "xp", 3000);
      setTimeout(() => setPetState("happy"), 2000);
      setTimeout(() => setPetState("idle"), 4000);

      // If we can call AI without breaking cooldown, fire a follow-up reaction
      if (ANTHROPIC_API_KEY && Date.now() - lastAICallTime.current >= AI_COOLDOWN_MS) {
        setTimeout(async () => {
          try {
            const ctx = await gatherContext();
            const text = await fetchAIMessage(ctx, `${memberName} just earned ${amount} XP`);
            if (text) {
              lastAICallTime.current = Date.now();
              showBubble(text, "ai", 6000);
            }
          } catch { /* silent */ }
        }, 3200); // fire after the local message fades
      }
    };
    window.addEventListener("xp-earned", onXp);
    return () => window.removeEventListener("xp-earned", onXp);
  }, [petName]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Snap helper: animate motionX/Y to a named corner ─────────────────────
  const snapToCorner = useCallback((id, springOpts = {}) => {
    const petSize = petSizeRef.current;
    const corners = cornerPositions(petSize);
    const target = corners.find(c => c.id === id) || corners[0];
    const opts = { type: "spring", stiffness: 260, damping: 22, ...springOpts };
    animate(motionX, target.x, opts);
    animate(motionY, target.y, opts);
    setCornerId(id);
    localStorage.setItem(PET_CORNER_KEY, id);
  }, [motionX, motionY]);

  // ── Position pet on mount and after resize ────────────────────────────────
  useEffect(() => {
    const place = () => {
      const saved = localStorage.getItem(PET_CORNER_KEY) || "bottom-right";
      const corners = cornerPositions(petSizeRef.current);
      const target = corners.find(c => c.id === saved) || corners[0];
      motionX.set(target.x);
      motionY.set(target.y);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI morning greeting (once per day, 06:00–11:00) ─────────────────────
  useEffect(() => {
    if (!petName || !member || !familyCode) return;
    const hour = new Date().getHours();
    const greetKey = `hq_pet_greeted_${new Date().toDateString()}`;
    if (localStorage.getItem(greetKey) || hour < 6 || hour >= 11) return;
    localStorage.setItem(greetKey, "1");

    setTimeout(async () => {
      if (!ANTHROPIC_API_KEY) {
        showBubble(`Good morning, ${member.name}! 🌅 Check your chores today~`, "greeting");
        return;
      }
      try {
        const ctx = await gatherContext();
        setMood(deriveMood(ctx));
        const text = await fetchAIMessage(ctx, "morning greeting");
        if (text) { showBubble(text, "ai", 7000); setPetState("happy"); setTimeout(() => setPetState("idle"), 2400); }
      } catch {
        showBubble(`Good morning, ${member.name}! 🌅`, "greeting");
      }
    }, 3500);
  }, [petName, member, familyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Proactive 6pm nudge — once per day if chores undone ──────────────────
  useEffect(() => {
    if (!petName || !member || !familyCode || !ANTHROPIC_API_KEY) return;
    const nudgeKey = `hq_pet_nudge_${new Date().toDateString()}`;
    if (localStorage.getItem(nudgeKey)) return;

    // Check every minute whether it's past 18:00 and nudge hasn't fired yet
    const interval = setInterval(async () => {
      const h = new Date().getHours();
      if (h < 18) return;
      clearInterval(interval);
      if (localStorage.getItem(nudgeKey)) return;
      localStorage.setItem(nudgeKey, "1");

      try {
        const ctx = await gatherContext();
        const newMood = deriveMood(ctx);
        setMood(newMood);
        if (ctx.totalChores > 0 && ctx.doneToday < ctx.totalChores) {
          const text = await fetchAIMessage(ctx, "evening nudge about unfinished chores");
          if (text) {
            showBubble(text, "ai", 8000);
            setPetState("excited");
            setTimeout(() => setPetState("idle"), 3000);
          }
        }
      } catch { /* silent */ }
    }, 60_000);

    return () => clearInterval(interval);
  }, [petName, member, familyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  function showBubble(text, type = "idle", duration = 5000) {
    clearTimeout(bubbleTimer.current);
    setBubble({ text, type });
    bubbleTimer.current = setTimeout(() => setBubble(null), duration);
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

  // ── Gather live context for AI prompt ────────────────────────────────────
  const gatherContext = useCallback(async () => {
    if (!familyCode) return {};
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const hour = now.getHours();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    try {
      const [chores, events, photos] = await Promise.all([
        db.Chore.filter({ family_code: familyCode }),
        db.CalendarEvent.filter({ family_code: familyCode }),
        db.FamilyPhoto.filter({ family_code: familyCode }),
      ]);

      const doneToday = chores.filter(c => c.completed).length;
      const totalChores = chores.filter(c => {
        const due = c.due_date || c.date || "";
        return due.slice(0, 10) === today || !due;
      }).length;

      const upcomingEvents = events
        .filter(e => (e.date || e.start_date || "") >= today)
        .sort((a, b) => (a.date || a.start_date || "").localeCompare(b.date || b.start_date || ""))
        .slice(0, 1);
      const nextEvent = upcomingEvents[0];
      const nextEventStr = nextEvent
        ? `"${nextEvent.title}" on ${nextEvent.date || nextEvent.start_date}`
        : "none upcoming";

      const lastPhoto = photos.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
      const daysSincePhoto = lastPhoto
        ? Math.floor((Date.now() - new Date(lastPhoto.created_at)) / 86_400_000)
        : null;
      const photoStr = daysSincePhoto != null
        ? `${daysSincePhoto} day${daysSincePhoto !== 1 ? "s" : ""} ago`
        : "never";

      return {
        familyName: getFamilyName().replace(/\s*(HQ|Family HQ)$/i, "").trim() || "Family",
        memberName: member?.name ?? "Someone",
        memberRole: member?.role ?? "Member",
        timeStr,
        hour,
        doneToday,
        totalChores,
        nextEventStr,
        photoStr,
        daysSincePhoto,
        totalXp,
        petName: petName || "the pet",
        stageLabel: stage.label,
      };
    } catch {
      return {
        familyName: getFamilyName().replace(/\s*(HQ|Family HQ)$/i, "").trim() || "Family",
        memberName: member?.name ?? "Someone",
        memberRole: member?.role ?? "Member",
        timeStr,
        hour: new Date().getHours(),
        totalXp,
        petName: petName || "the pet",
        stageLabel: stage.label,
      };
    }
  }, [familyCode, member, totalXp, petName, stage]);

  // ── Fetch AI message from Claude ──────────────────────────────────────────
  const fetchAIMessage = useCallback(async (ctx, hint = "") => {
    if (!ANTHROPIC_API_KEY) throw new Error("No API key");

    const lastMsg = localStorage.getItem(LAST_AI_MSG_KEY) || "";
    const userPrompt = [
      `Family name: ${ctx.familyName}.`,
      `Current user: ${ctx.memberName}, role: ${ctx.memberRole}.`,
      `Time: ${ctx.timeStr}.`,
      ctx.totalChores != null
        ? `Today's chores completed: ${ctx.doneToday} of ${ctx.totalChores}.`
        : "",
      ctx.nextEventStr ? `Upcoming events: ${ctx.nextEventStr}.` : "",
      ctx.photoStr ? `Last moment posted: ${ctx.photoStr}.` : "",
      `Family XP total: ${ctx.totalXp}.`,
      `Pet name: ${ctx.petName}, evolution stage: ${ctx.stageLabel}.`,
      hint ? `Context hint: ${hint}.` : "",
      lastMsg ? `Do NOT repeat or closely echo this previous message you said: "${lastMsg}".` : "",
      `Generate one short funny/warm/relevant message the pet would say right now. Be specific to this family's actual data. Max 2 sentences.`,
    ].filter(Boolean).join(" ");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 100,
          system: "You are a cute family pet living inside a family app. You are playful, funny, warm and slightly sassy. You speak in short punchy sentences — max 2 sentences. You know everything about this family and give relevant, specific, funny observations. Never be generic.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? null;
    if (text) localStorage.setItem(LAST_AI_MSG_KEY, text);
    return text;
  }, []);

  // ── Tap handling ──────────────────────────────────────────────────────────
  const handleTap = () => {
    resetSleepTimer();
    if (isAIThinking) return; // ignore taps while AI is loading

    const now = Date.now();
    const sinceLastAI = now - lastAICallTime.current;
    const canCallAI = ANTHROPIC_API_KEY && sinceLastAI >= AI_COOLDOWN_MS;

    if (canCallAI) {
      // ── AI path: show thinking immediately, fetch in background ──
      setPetState("idle");
      setIsAIThinking(true);
      showBubble("...", "thinking", 30_000);

      // Use setTimeout(0) so the UI commits the thinking state before async work starts
      setTimeout(async () => {
        try {
          const ctx = await gatherContext();
          aiContext.current = ctx;
          setMood(deriveMood(ctx));
          const text = await fetchAIMessage(ctx);
          if (!text) throw new Error("empty");
          lastAICallTime.current = Date.now();
          setIsAIThinking(false);
          showBubble(text, "ai", 5000);
          setPetState("happy");
          setTimeout(() => setPetState("idle"), 2400);
        } catch {
          setIsAIThinking(false);
          playLocalReaction();
        }
      }, 0);

    } else if (sinceLastAI < AI_COOLDOWN_MS && lastAICallTime.current > 0) {
      // Tapped too soon after AI — show cooldown nudge
      showBubble("I need a moment to think... 🐱", "tap", 2000);
      setPetState("tap-shake");
      setTimeout(() => setPetState("idle"), 600);

    } else {
      // No API key or first tap — local reaction
      playLocalReaction();
    }
  };

  function playLocalReaction() {
    let idx;
    do {
      idx = Math.floor(Math.random() * TAP_REACTIONS.length);
    } while (idx === lastReactionIdx.current && TAP_REACTIONS.length > 1);
    lastReactionIdx.current = idx;

    const reaction = TAP_REACTIONS[idx];
    showBubble(reaction.msg, "tap", 2000);
    setPetState(reaction.anim);

    if (reaction.angry) {
      setAngryFlash(true);
      setTimeout(() => setAngryFlash(false), 600);
    }

    const animDurations = {
      "tap-spin": 600, "tap-jump": 800, "tap-shake": 600,
      "tap-flip": 700, "tap-shrink": 500, "tap-run": 1000,
    };
    setTimeout(() => setPetState("idle"), animDurations[reaction.anim] ?? 800);
  }

  // ── Chat send ─────────────────────────────────────────────────────────────
  const sendChatMessage = useCallback(async (text) => {
    // Append user message
    const userMsg = { role: "user", content: text };
    setChatHistory(prev => [...prev, userMsg]);
    setChatTyping(true);

    try {
      const ctx = await gatherContext();
      const contextBlock = [
        `Current user: ${ctx.memberName ?? "someone"}, role: ${ctx.memberRole ?? "member"}.`,
        `Time: ${ctx.timeStr ?? "unknown"}.`,
        ctx.totalChores != null ? `Today's chores: ${ctx.doneToday} of ${ctx.totalChores} done.` : "",
        ctx.nextEventStr ? `Next event: ${ctx.nextEventStr}.` : "",
        `Family XP: ${ctx.totalXp ?? 0}.`,
      ].filter(Boolean).join(" ");

      // Build messages array: system + last 5 turns + new user message
      const history = [...chatHistory, userMsg].slice(-5);
      const messages = history.map(m => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let res;
      try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 150,
            system: `You are ${petName || "the family pet"}, a cute pet living inside the Yanwar family app. You are funny, warm and slightly sassy. You know everything about this family. Keep responses short — max 3 sentences. Sign off with your name. Family context: ${contextBlock}`,
            messages,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.content?.[0]?.text?.trim();
      if (!reply) throw new Error("empty");

      setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("PetChat API error:", err);
      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: "Meow... my brain is fuzzy right now. Try again in a moment! 🐾",
      }]);
    } finally {
      setChatTyping(false);
    }
  }, [chatHistory, gatherContext, petName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag & snap pointer handlers ─────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    // Capture pointer so we get move/up even if finger leaves element
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    isDragActive.current = false;

    // Long-press (300ms) → open chat (only if not dragging)
    longPressTimer.current = setTimeout(() => {
      if (!isDragActive.current) {
        clearTimeout(bubbleTimer.current);
        setBubble(null);
        setShowChat(true);
      }
    }, 300);
  }, [bubbleTimer]);

  const handlePointerMove = useCallback((e) => {
    if (!pointerDownPos.current) return;
    const totalDx = e.clientX - pointerDownPos.current.x;
    const totalDy = e.clientY - pointerDownPos.current.y;
    const dist = Math.hypot(totalDx, totalDy);
    const elapsed = Date.now() - pointerDownPos.current.time;

    // Enter drag mode: moved >6px AND held >150ms
    if (!isDragActive.current && dist > 6 && elapsed > 150) {
      isDragActive.current = true;
      clearTimeout(longPressTimer.current);
      setIsDragging(true);
    }

    if (isDragActive.current) {
      const petSize = petSizeRef.current;
      const prev = lastPointerPos.current || { x: e.clientX, y: e.clientY };
      const frameDx = e.clientX - prev.x;
      const frameDy = e.clientY - prev.y;
      const newX = motionX.get() + frameDx;
      const newY = motionY.get() + frameDy;
      // Clamp so pet stays on screen
      motionX.set(Math.max(0, Math.min(window.innerWidth - petSize, newX)));
      motionY.set(Math.max(0, Math.min(window.innerHeight - petSize, newY)));
    }
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  }, [motionX, motionY]);

  const handlePointerUp = useCallback((e) => {
    clearTimeout(longPressTimer.current);
    const wasDown = pointerDownPos.current;
    pointerDownPos.current = null;

    if (isDragActive.current) {
      // Find nearest allowed corner
      isDragActive.current = false;
      setIsDragging(false);
      const petSize = petSizeRef.current;
      const curX = motionX.get();
      const curY = motionY.get();
      const corners = cornerPositions(petSize);
      let nearest = corners[0];
      let minDist = Infinity;
      for (const c of corners) {
        const d = Math.hypot(curX - c.x, curY - c.y);
        if (d < minDist) { minDist = d; nearest = c; }
      }
      snapToCorner(nearest.id);
    } else {
      // It was a tap — only fire if press was short enough (<500ms and <10px move)
      if (!wasDown) return;
      const elapsed = Date.now() - wasDown.time;
      const dx = e.clientX - wasDown.x;
      const dy = e.clientY - wasDown.y;
      if (elapsed < 500 && Math.hypot(dx, dy) < 10) {
        handleTap();
      }
    }
  }, [motionX, motionY, snapToCorner]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const catSize = stage.id === "legend" ? 64 : stage.id === "cat" || stage.id === "happy_cat" ? 60 : stage.id === "kitten" ? 56 : 80;
  petSizeRef.current = catSize;

  // Derive bubble position style based on which corner the pet is in
  const isOnLeft = cornerId === "top-left";
  const isAtTop  = cornerId === "top-right" || cornerId === "top-left";
  const bubbleStyle = isOnLeft
    ? { // pet on left — bubble opens rightward
        position: "absolute",
        top: isAtTop ? "calc(100% + 12px)" : "auto",
        bottom: isAtTop ? "auto" : "calc(100% + 12px)",
        left: 0,
        right: "auto",
        width: "200px",
        zIndex: 10,
      }
    : { // pet on right (bottom-right or top-right) — bubble opens leftward
        position: "absolute",
        top: isAtTop ? "calc(100% + 12px)" : "auto",
        bottom: isAtTop ? "auto" : "calc(100% + 12px)",
        right: 0,
        left: "auto",
        width: "200px",
        zIndex: 10,
      };

  // Triangle pointer points toward the pet
  // - pet on left: triangle on left side of bubble pointing left-down or left-up
  // - pet on right: triangle on right side pointing right-down or right-up
  // - pet at bottom: triangle points down; at top: triangle points up
  const triangleStyle = (() => {
    const base = { position: "absolute", width: 0, height: 0 };
    if (isAtTop) {
      // bubble is below pet → triangle at top of bubble pointing up
      const side = isOnLeft ? { left: "18px" } : { right: "18px" };
      return { ...base, top: "-7px", ...side,
        borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
        borderBottom: "7px solid #1a1a2e" };
    } else {
      // bubble is above pet → triangle at bottom of bubble pointing down
      const side = isOnLeft ? { left: "18px" } : { right: "18px" };
      return { ...base, bottom: "-7px", ...side,
        borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
        borderTop: "7px solid #1a1a2e" };
    }
  })();

  return (
    <>
      {/* ── Name prompt modal ── */}
      <AnimatePresence>
        {showNamePrompt && (
          <PetCenteredModal onClose={() => setShowNamePrompt(false)}>
            <motion.div
              key="name-modal"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              style={{ width: "85vw", maxWidth: "340px" }}
              onClick={e => e.stopPropagation()}
            >
              <PetModal onClose={() => setShowNamePrompt(false)}>
                <div className="flex justify-center mb-3">
                  <KittenPet size={64} />
                </div>
                <p className="text-white font-heading font-bold text-lg text-center mb-1">A new friend appeared! 🐾</p>
                <p className="text-white/50 text-sm text-center mb-5">What should your family call me?</p>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && savePetName()}
                  placeholder="Give me a name..."
                  className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 outline-none mb-3"
                  style={{ border: "1px solid rgba(255,255,255,0.15)", fontSize: "15px" }}
                />
                <button
                  onClick={savePetName}
                  disabled={!nameInput.trim()}
                  className="w-full py-3 rounded-2xl font-heading font-bold text-white text-sm disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
                >
                  Nice to meet you! 🤝
                </button>
              </PetModal>
            </motion.div>
          </PetCenteredModal>
        )}
      </AnimatePresence>

      {/* ── Chat bottom sheet ── */}
      <AnimatePresence>
        {showChat && (
          <PetChat
            petName={petName}
            petStage={stage.id}
            messages={chatHistory}
            isTyping={chatTyping}
            onClose={() => setShowChat(false)}
            onSend={sendChatMessage}
          />
        )}
      </AnimatePresence>

      {/* ── Long-press info modal ── */}
      <AnimatePresence>
        {showLongPress && (
          <PetCenteredModal onClose={() => setShowLongPress(false)}>
            <motion.div
              key="info-modal"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              style={{ width: "85vw", maxWidth: "320px" }}
              onClick={e => e.stopPropagation()}
            >
              <PetModal onClose={() => setShowLongPress(false)}>
                <div className="flex justify-center mb-3">
                  {stage.id === "egg"       && <EggPet size={56} />}
                  {stage.id === "kitten"    && <KittenPet size={56} />}
                  {stage.id === "cat"       && <CatPet size={56} />}
                  {stage.id === "happy_cat" && <HappyCatPet size={56} />}
                  {stage.id === "legend"    && <LegendCatPet size={56} />}
                </div>
                <p className="text-white font-heading font-bold text-center text-base mb-0.5">
                  {petName || "Your Pet"} — {stage.label}
                </p>
                <p className="text-white/50 text-sm text-center mb-4">{totalXp} total family XP</p>
                {stage.nextXp ? (
                  <>
                    <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round(((totalXp - stage.minXp) / (stage.nextXp - stage.minXp)) * 100))}%`,
                          background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                        }}
                      />
                    </div>
                    <p className="text-white/40 text-xs text-center">
                      {stage.nextXp - totalXp} XP until next evolution
                    </p>
                  </>
                ) : (
                  <p className="text-yellow-400 text-sm text-center font-semibold">👑 Max evolution reached!</p>
                )}
              </PetModal>
            </motion.div>
          </PetCenteredModal>
        )}
      </AnimatePresence>

      {/* The pet widget — fixed position, draggable with corner snapping */}
      <motion.div
        className="fixed z-[9700]"
        style={{
          x: motionX,
          y: motionY,
          top: 0,
          left: 0,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none", // prevent scroll interference while dragging
        }}
      >
        <div className="relative select-none">

          {/* Speech bubble — smart positioning based on which corner pet is in */}
          <AnimatePresence>
            {bubble && (
              <motion.div
                initial={{ opacity: 0, y: isAtTop ? -6 : 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: isAtTop ? -6 : 6, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={bubbleStyle}
              >
                <div
                  style={{
                    background: "#1a1a2e",
                    border: isAIThinking || bubble.type === "ai"
                      ? `1px solid ${mood.color}`
                      : "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    position: "relative",
                    boxShadow: bubble.type === "ai"
                      ? `0 0 12px ${mood.color}`
                      : "none",
                  }}
                >
                  <button
                    onClick={() => setBubble(null)}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "8px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "13px",
                      lineHeight: "1",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >×</button>
                  {isAIThinking ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: "18px" }}>
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          style={{
                            display: "inline-block", width: 6, height: 6,
                            borderRadius: "50%", background: "#a78bfa",
                          }}
                          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p
                      style={{
                        color: bubble.type === "ai" ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.92)",
                        fontSize: "14px",
                        lineHeight: "1.45",
                        margin: 0,
                        paddingRight: "18px",
                        whiteSpace: "pre-wrap",
                      }}
                    >{bubble.text}</p>
                  )}
                </div>
                <div style={triangleStyle} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sleeping Zzz */}
          {petState === "sleeping" && <SleepingZzz />}

          {/* Cat body with animation state */}
          <motion.div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ cursor: isDragging ? "grabbing" : "pointer", position: "relative", userSelect: "none" }}
            animate={
              isAIThinking             ? { y: [0, -3, 0], scaleX: [1, 1.02, 1] } :
              petState === "idle"      ? { y: [0, -2, 0], scaleX: [1, 1.01, 1] } :
              petState === "happy"     ? { y: [0, -8, 0, -6, 0] } :
              petState === "sleeping"  ? { rotate: [0, 3, 0, -3, 0] } :
              petState === "excited"   ? { rotate: [0, -12, 12, -12, 12, 0] } :
              // ── Tap reactions ──
              petState === "tap-spin"   ? { rotate: [0, 360] } :
              petState === "tap-jump"   ? { y: [0, -28, 0, -10, 0] } :
              petState === "tap-shake"  ? { x: [0, -8, 8, -8, 8, -6, 6, 0] } :
              petState === "tap-flip"   ? { scaleY: [1, -1, -1, 1] } :
              petState === "tap-shrink" ? { scale: [1, 0.35, 1.2, 1] } :
              petState === "tap-run"    ? { x: [0, 0, 120, 120, 0] } :
              {}
            }
            transition={
              isAIThinking             ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } :
              petState === "idle"      ? { duration: 3, repeat: Infinity, ease: "easeInOut" } :
              petState === "happy"     ? { duration: 0.6, repeat: 3, ease: "easeOut" } :
              petState === "sleeping"  ? { duration: 4, repeat: Infinity, ease: "easeInOut" } :
              petState === "excited"   ? { duration: 0.5, repeat: 3 } :
              petState === "tap-spin"  ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] } :
              petState === "tap-jump"  ? { duration: 0.75, ease: [0.33, 1, 0.68, 1], times: [0, 0.4, 0.7, 1] } :
              petState === "tap-shake" ? { duration: 0.55, ease: "easeInOut" } :
              petState === "tap-flip"  ? { duration: 0.65, ease: "easeInOut", times: [0, 0.3, 0.7, 1] } :
              petState === "tap-shrink"? { duration: 0.45, ease: "easeInOut", times: [0, 0.35, 0.75, 1] } :
              petState === "tap-run"   ? { duration: 0.9, ease: "easeInOut", times: [0, 0.05, 0.5, 0.55, 1] } :
              {}
            }
          >
            {/* Angry red flash overlay */}
            <AnimatePresence>
              {angryFlash && (
                <motion.div
                  key="angry-flash"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.55, 0.35, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(239,68,68,0.7) 0%, rgba(239,68,68,0) 70%)",
                    pointerEvents: "none", zIndex: 2,
                  }}
                />
              )}
            </AnimatePresence>

            {stage.id === "egg"       && <EggPet size={catSize} />}
            {stage.id === "kitten"    && <KittenPet size={catSize} />}
            {stage.id === "cat"       && <CatPet size={catSize} />}
            {stage.id === "happy_cat" && <HappyCatPet size={catSize} />}
            {stage.id === "legend"    && <LegendCatPet size={catSize} />}

            {/* Mood dot — tiny colored indicator, bottom-left of pet */}
            {ANTHROPIC_API_KEY && (
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", bottom: 2, left: 2,
                  width: 7, height: 7, borderRadius: "50%",
                  background: mood.color.replace(/[\d.]+\)$/, "1)"), // full opacity for the dot itself
                  boxShadow: `0 0 6px ${mood.color}`,
                  pointerEvents: "none",
                }}
              />
            )}
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
