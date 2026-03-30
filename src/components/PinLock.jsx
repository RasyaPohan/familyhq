import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CORRECT_PIN = "2304";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60; // seconds
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const STORAGE_KEY = "hq_pin_unlocked_at";
const ATTEMPTS_KEY = "hq_pin_attempts";
const LOCKOUT_KEY = "hq_pin_lockout_until";

function isSessionValid() {
  const unlockedAt = localStorage.getItem(STORAGE_KEY);
  if (!unlockedAt) return false;
  return Date.now() - parseInt(unlockedAt) < SESSION_DURATION;
}

export default function PinLock({ children }) {
  const [unlocked, setUnlocked] = useState(() => isSessionValid());
  const [pin, setPin] = useState("");

  // Re-check on every mount/refresh to guarantee localStorage is read
  useEffect(() => {
    if (isSessionValid()) setUnlocked(true);
  }, []);
  const [shake, setShake] = useState(false);
  const [dotsError, setDotsError] = useState(false);
  const [attempts, setAttempts] = useState(() => parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0"));
  const [lockoutUntil, setLockoutUntil] = useState(() => parseInt(localStorage.getItem(LOCKOUT_KEY) || "0"));
  const [countdown, setCountdown] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (lockoutUntil > Date.now()) {
      const tick = () => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setCountdown(0);
          setAttempts(0);
          localStorage.setItem(ATTEMPTS_KEY, "0");
          localStorage.removeItem(LOCKOUT_KEY);
          setLockoutUntil(0);
        } else {
          setCountdown(remaining);
        }
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  const handleDigit = useCallback((d) => {
    if (lockoutUntil > Date.now()) return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);

    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        // Correct
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        localStorage.setItem(ATTEMPTS_KEY, "0");
        setFadeOut(true);
        setTimeout(() => setUnlocked(true), 600);
      } else {
        // Wrong
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(ATTEMPTS_KEY, newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION * 1000;
          setLockoutUntil(until);
          localStorage.setItem(LOCKOUT_KEY, until.toString());
        }

        setDotsError(true);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDotsError(false);
          setPin("");
        }, 700);
      }
    }
  }, [pin, attempts, lockoutUntil]);

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
  };

  if (unlocked) return children;

  const isLocked = lockoutUntil > Date.now();

  return (
    <AnimatePresence>
      <motion.div
        key="pinlock"
        initial={{ opacity: 1 }}
        animate={{ opacity: fadeOut ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[9999] bg-[#0a0a14] flex flex-col items-center justify-between py-16 px-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-5xl"
          >
            🏠
          </motion.div>
          <h1 className="font-heading text-white text-2xl font-bold mt-2">The Yanwar's HQ</h1>
          <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
            <span>🔒</span>
            <span>Family access only</span>
          </div>
        </div>

        {/* Dots */}
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex gap-4"
          >
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{
                  scale: pin.length > i ? 1.2 : 1,
                  backgroundColor: dotsError
                    ? "#ef4444"
                    : pin.length > i
                    ? "#8B5CF6"
                    : "rgba(255,255,255,0.15)"
                }}
                transition={{ duration: 0.15 }}
                className="w-4 h-4 rounded-full"
              />
            ))}
          </motion.div>

          {isLocked && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm text-center"
            >
              Too many attempts 😅 Try again in {countdown}s
            </motion.p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleDigit(String(d))}
              disabled={isLocked}
              className="h-16 rounded-2xl bg-white/10 text-white text-2xl font-heading font-bold disabled:opacity-30 active:bg-white/20 transition-colors"
            >
              {d}
            </motion.button>
          ))}
          {/* Bottom row: empty, 0, delete */}
          <div />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleDigit("0")}
            disabled={isLocked}
            className="h-16 rounded-2xl bg-white/10 text-white text-2xl font-heading font-bold disabled:opacity-30 active:bg-white/20 transition-colors"
          >
            0
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleDelete}
            disabled={isLocked}
            className="h-16 rounded-2xl bg-white/5 text-white/50 text-xl disabled:opacity-30 active:bg-white/10 transition-colors"
          >
            ⌫
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}