import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { getFamilyCode, getFamilyName, setPinUnlocked, clearFamilySession } from "@/lib/familyStore";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 60;

export default function PinScreen() {
  const navigate = useNavigate();
  const [hq, setHq] = useState(null);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [dotsError, setDotsError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const code = getFamilyCode();
    if (!code) { navigate('/', { replace: true }); return; }
    db.FamilyHQ.filter({ family_code: code }).then(results => {
      if (results && results.length > 0) setHq(results[0]);
    });
  }, []);

  const startLockout = (until) => {
    const tick = () => {
      const rem = Math.ceil((until - Date.now()) / 1000);
      if (rem <= 0) { setCountdown(0); setAttempts(0); setLockoutUntil(0); return; }
      setCountdown(rem);
      setTimeout(tick, 1000);
    };
    tick();
  };

  const handleDigit = (d) => {
    if (lockoutUntil > Date.now()) return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);

    if (next.length === 4) {
      if (next === hq?.pin) {
        const code = getFamilyCode();
        setPinUnlocked(code);
        setFadeOut(true);
        setTimeout(() => navigate('/outdoor', { replace: true }), 500);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECS * 1000;
          setLockoutUntil(until);
          startLockout(until);
        }
        setDotsError(true);
        setShake(true);
        setTimeout(() => { setShake(false); setDotsError(false); setPin(''); }, 700);
      }
    }
  };

  const isLocked = lockoutUntil > Date.now();

  return (
    <motion.div
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-[#0a0a14] flex flex-col items-center justify-between py-16 px-6"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-2 mt-6">
        <motion.div
          animate={{ y: [0,-6,0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="text-5xl"
        >
          {hq?.family_emoji || '🏠'}
        </motion.div>
        <h1 className="font-heading text-white text-2xl font-bold mt-2">
          {hq?.family_name || getFamilyName()}'s HQ
        </h1>
        <div className="flex items-center gap-2 text-white/40 text-sm mt-1">
          <span>🔒</span>
          <span>Family access only</span>
        </div>
      </div>

      {/* Dots */}
      <div className="flex flex-col items-center gap-5">
        <motion.div
          animate={shake ? { x: [-10,10,-8,8,-5,5,0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex gap-4"
        >
          {[0,1,2,3].map(i => (
            <motion.div
              key={i}
              animate={{
                scale: pin.length > i ? 1.2 : 1,
                backgroundColor: dotsError ? '#ef4444' : pin.length > i ? '#8B5CF6' : 'rgba(255,255,255,0.15)'
              }}
              transition={{ duration: 0.15 }}
              className="w-4 h-4 rounded-full"
            />
          ))}
        </motion.div>
        {isLocked && (
          <p className="text-red-400 text-sm text-center">Too many attempts 😅 Try again in {countdown}s</p>
        )}
      </div>

      {/* Numpad */}
      <div className="space-y-4 w-full max-w-xs">
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <motion.button key={d} whileTap={{ scale: 0.88 }} onClick={() => handleDigit(String(d))} disabled={isLocked}
              className="h-16 rounded-2xl bg-white/10 text-white text-2xl font-heading font-bold disabled:opacity-30"
            >{d}</motion.button>
          ))}
          <div />
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleDigit('0')} disabled={isLocked}
            className="h-16 rounded-2xl bg-white/10 text-white text-2xl font-heading font-bold disabled:opacity-30"
          >0</motion.button>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setPin(p => p.slice(0,-1))} disabled={isLocked}
            className="h-16 rounded-2xl bg-white/5 text-white/50 text-xl disabled:opacity-30"
          >⌫</motion.button>
        </div>
        <button
          onClick={() => { clearFamilySession(); navigate('/', { replace: true }); }}
          className="w-full text-white/20 hover:text-white/40 text-xs transition-colors py-2"
        >
          Switch Family HQ
        </button>
      </div>
    </motion.div>
  );
}