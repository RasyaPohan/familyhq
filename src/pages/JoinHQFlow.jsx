import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import { setFamilySession, setPinUnlocked } from "@/lib/familyStore";
import { ChevronLeft } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 60;

export default function JoinHQFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=code, 1=pin
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [hqRecord, setHqRecord] = useState(null); // found FamilyHQ

  // PIN state
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [dotsError, setDotsError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const handleCheckCode = async () => {
    const clean = codeInput.replace(/\D/g, '');
    if (clean.length !== 6) { setCodeError('Please enter a 6-digit code'); return; }
    setCodeError('');
    const results = await db.FamilyHQ.filter({ family_code: clean });
    if (!results || results.length === 0) {
      setCodeError("Hmm, that code doesn't match any HQ 🤔 Double check with your family!");
      return;
    }
    setHqRecord(results[0]);
    setStep(1);
  };

  const handleDigit = (d) => {
    if (lockoutUntil > Date.now()) return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);

    if (next.length === 4) {
      if (next === hqRecord.pin) {
        // Correct
        setFamilySession(hqRecord.family_code, `${hqRecord.family_name}'s HQ`);
        setPinUnlocked(hqRecord.family_code);
        navigate('/outdoor', { replace: true });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECS * 1000;
          setLockoutUntil(until);
          const tick = () => {
            const rem = Math.ceil((until - Date.now()) / 1000);
            if (rem <= 0) { setCountdown(0); setAttempts(0); setLockoutUntil(0); return; }
            setCountdown(rem);
            setTimeout(tick, 1000);
          };
          tick();
        }
        setDotsError(true);
        setShake(true);
        setTimeout(() => { setShake(false); setDotsError(false); setPin(''); }, 700);
      }
    }
  };

  const isLocked = lockoutUntil > Date.now();

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button
          onClick={() => step === 0 ? navigate('/') : setStep(0)}
          className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="code" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-8">
              {/* Key emoji with glow */}
              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-28 h-28 rounded-full bg-purple-600/30 blur-2xl"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-7xl relative z-10 select-none"
                  >🔑</motion.div>
                </div>
                <div>
                  <h2 className="text-white font-heading text-3xl font-bold tracking-tight">Enter your Family Code</h2>
                  <p className="text-white/40 text-sm mt-2">Your family admin will give you this code</p>
                </div>
              </div>

              {/* Input */}
              <div>
                <input
                  type="text"
                  maxLength={7}
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="000-000"
                  className="w-full rounded-2xl px-4 py-5 text-center text-3xl font-heading tracking-widest focus:outline-none transition-all"
                  style={{
                    background: '#1a1a2e',
                    color: '#fff',
                    border: '1.5px solid rgba(139,92,246,0.35)',
                    caretColor: '#a78bfa',
                    boxShadow: '0 0 0 0px rgba(139,92,246,0)',
                  }}
                  onFocus={e => { e.target.style.border = '1.5px solid rgba(139,92,246,0.85)'; e.target.style.boxShadow = '0 0 18px rgba(139,92,246,0.35)'; }}
                  onBlur={e => { e.target.style.border = '1.5px solid rgba(139,92,246,0.35)'; e.target.style.boxShadow = 'none'; }}
                  onKeyDown={e => e.key === 'Enter' && handleCheckCode()}
                />
                {codeError && (
                  <p className="text-red-400 text-sm mt-2 text-center">{codeError}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCheckCode}
                className="w-full py-4 rounded-2xl text-white font-heading font-bold text-lg"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #DB2777)', boxShadow: '0 4px 24px rgba(124,58,237,0.45)' }}
              >
                Find My HQ ✨
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="pin" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col items-center gap-8">
              <div className="text-center">
                <p className="text-4xl mb-2">{hqRecord?.family_emoji || '🏠'}</p>
                <h2 className="text-white font-heading text-xl font-bold">{hqRecord?.family_name}'s HQ</h2>
                <p className="text-white/40 text-sm mt-1">🔒 Enter the HQ PIN</p>
              </div>

              {/* Dots */}
              <motion.div
                animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : { x: 0 }}
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

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <motion.button key={d} whileTap={{ scale: 0.88 }} onClick={() => handleDigit(String(d))} disabled={isLocked}
                    className="h-14 rounded-2xl bg-white/10 text-white text-xl font-heading font-bold disabled:opacity-30"
                  >{d}</motion.button>
                ))}
                <div />
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleDigit('0')} disabled={isLocked}
                  className="h-14 rounded-2xl bg-white/10 text-white text-xl font-heading font-bold disabled:opacity-30"
                >0</motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setPin(p => p.slice(0,-1))} disabled={isLocked}
                  className="h-14 rounded-2xl bg-white/5 text-white/50 text-lg disabled:opacity-30"
                >⌫</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}