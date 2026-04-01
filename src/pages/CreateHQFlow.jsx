import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import { setFamilySession, setPinUnlocked, MEMBER_COLORS } from "@/lib/familyStore";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import confetti from "canvas-confetti";

const FAMILY_EMOJIS = ["🏠","🏡","🌟","🎯","🦁","🦊","🐻","🌻","⭐","🎪","🏆","🌈"];
const AVATAR_EMOJIS = ["😎","👩","👨","🧑","👧","👦","🦸","🧙","⚡","🌟","🦊","🎨"];

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function CreateHQFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [familyCode, setFamilyCode] = useState('');

  const [family, setFamily] = useState({ name: '', emoji: '🏠' });
  const [founder, setFounder] = useState({ name: '', emoji: '😎', color: 'purple', role: 'Parent' });
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  const steps = [
    { title: "Name your family HQ", emoji: "🏠" },
    { title: "Your profile", emoji: "👤" },
    { title: "Set your HQ PIN", emoji: "🔒" },
    { title: "Your HQ is ready!", emoji: "🎉" },
  ];

  const handleNext = async () => {
    if (step === 0) {
      if (!family.name.trim()) return;
      setStep(1);
    } else if (step === 1) {
      if (!founder.name.trim()) return;
      setStep(2);
    } else if (step === 2) {
      if (pin.length !== 4) { setPinError('PIN must be 4 digits'); return; }
      if (pin !== pinConfirm) { setPinError("PINs don't match"); return; }
      setPinError('');
      setLoading(true);
      const code = generateCode();
      // Create FamilyHQ
      await db.FamilyHQ.create({
        family_code: code,
        family_name: family.name,
        family_emoji: family.emoji,
        pin,
      });
      // Create founder FamilyMember
      await db.FamilyMember.create({
        family_code: code,
        name: founder.name,
        emoji: founder.emoji,
        color: founder.color,
        role: founder.role,
        xp: 0, level: 1, streak: 0,
      });
      // Set session
      setFamilySession(code, `${family.name}'s HQ`);
      setPinUnlocked(code);
      setFamilyCode(code);
      setLoading(false);
      // Confetti!
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 300);
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 500);
      }, 200);
      setStep(3);
    } else if (step === 3) {
      navigate('/outdoor');
    }
  };

  const copyCode = () => {
    const display = `${familyCode.slice(0,3)}-${familyCode.slice(3)}`;
    navigator.clipboard.writeText(display);
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Back button */}
        {step < 3 && (
          <button
            onClick={() => step === 0 ? navigate('/') : setStep(step - 1)}
            className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-purple-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: Family Identity */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <p className="text-white/50 text-sm mb-1">Step 1 of 3</p>
                  <h2 className="text-white font-heading text-2xl font-bold">Name your Family HQ</h2>
                  <p className="text-white/40 text-sm mt-1">This is how your family's space will be identified</p>
                </div>
                <div>
                  <Label className="text-white/60">Family name</Label>
                  <Input
                    value={family.name}
                    onChange={e => setFamily({ ...family, name: e.target.value })}
                    placeholder="The Johnsons, Smith Family..."
                    className="bg-white border-white/20 text-black placeholder:text-gray-400 mt-1"
                    onKeyDown={e => e.key === 'Enter' && handleNext()}
                  />
                </div>
                <div>
                  <Label className="text-white/60 mb-2 block">Family emoji</Label>
                  <div className="flex flex-wrap gap-2">
                    {FAMILY_EMOJIS.map(e => (
                      <button key={e} onClick={() => setFamily({ ...family, emoji: e })}
                        className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center transition-all ${family.emoji === e ? 'bg-purple-500/40 ring-2 ring-purple-400 scale-110' : 'bg-white/8 hover:bg-white/15'}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleNext} disabled={!family.name.trim()}
                  className="w-full py-4 rounded-2xl text-white font-heading font-bold disabled:opacity-30 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}
                >
                  Continue →
                </button>
              </div>
            )}

            {/* Step 1: Founder Profile */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <p className="text-white/50 text-sm mb-1">Step 2 of 3</p>
                  <h2 className="text-white font-heading text-2xl font-bold">Your profile</h2>
                  <p className="text-white/40 text-sm mt-1">You're the founder of {family.emoji} {family.name}'s HQ</p>
                </div>
                <div>
                  <Label className="text-white/60">Your name</Label>
                  <Input
                    value={founder.name}
                    onChange={e => setFounder({ ...founder, name: e.target.value })}
                    placeholder="Enter your name..."
                    className="bg-white border-white/20 text-black placeholder:text-gray-400 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white/60 mb-2 block">Avatar emoji</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_EMOJIS.map(e => (
                      <button key={e} onClick={() => setFounder({ ...founder, emoji: e })}
                        className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center transition-all ${founder.emoji === e ? 'bg-purple-500/40 ring-2 ring-purple-400 scale-110' : 'bg-white/8 hover:bg-white/15'}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 mb-2 block">Color</Label>
                  <div className="flex gap-3">
                    {Object.entries(MEMBER_COLORS).map(([key, val]) => (
                      <button key={key} onClick={() => setFounder({ ...founder, color: key })}
                        className={`w-10 h-10 rounded-full transition-all ${founder.color === key ? 'ring-4 ring-offset-2 ring-offset-[#0a0a14] scale-110' : ''}`}
                        style={{ background: val.hex, '--tw-ring-color': val.hex }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-white/60">Role</Label>
                  <Select value={founder.role} onValueChange={v => setFounder({ ...founder, role: v })}>
                    <SelectTrigger className="bg-white/8 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Parent">Parent 👩‍👦</SelectItem>
                      <SelectItem value="Teen">Teen 🧑</SelectItem>
                      <SelectItem value="Kid">Kid 🧒</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button onClick={handleNext} disabled={!founder.name.trim()}
                  className="w-full py-4 rounded-2xl text-white font-heading font-bold disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}
                >
                  Continue →
                </button>
              </div>
            )}

            {/* Step 2: Set PIN */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="text-white/50 text-sm mb-1">Step 3 of 3</p>
                  <h2 className="text-white font-heading text-2xl font-bold">Protect your HQ</h2>
                  <p className="text-white/40 text-sm mt-1">Choose a 4-digit PIN. Only your family will know it.</p>
                </div>
                <div>
                  <Label className="text-white/60">PIN (4 digits)</Label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
                    placeholder="••••"
                    className="bg-white border-white/20 text-black placeholder:text-gray-400 mt-1 text-center text-2xl tracking-widest"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Confirm PIN</Label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0,4))}
                    placeholder="••••"
                    className="bg-white border-white/20 text-black placeholder:text-gray-400 mt-1 text-center text-2xl tracking-widest"
                  />
                </div>
                {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
                <button onClick={handleNext} disabled={loading || pin.length !== 4 || pinConfirm.length !== 4}
                  className="w-full py-4 rounded-2xl text-white font-heading font-bold disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}
                >
                  {loading ? 'Creating your HQ...' : 'Create My HQ! 🚀'}
                </button>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="space-y-6 text-center">
                <div>
                  <p className="text-5xl mb-3">🎉</p>
                  <h2 className="text-white font-heading text-2xl font-bold">{family.emoji} {family.name}'s HQ is ready!</h2>
                  <p className="text-white/50 text-sm mt-2">Share your family code so everyone can join</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <p className="text-white/40 text-xs mb-2">YOUR FAMILY CODE</p>
                  <p className="text-white font-heading text-5xl font-bold tracking-widest">
                    {familyCode.slice(0,3)}-{familyCode.slice(3)}
                  </p>
                  <p className="text-white/40 text-xs mt-2">This code never changes</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={copyCode}
                    className="py-3 rounded-xl text-white/70 bg-white/8 border border-white/10 text-sm font-medium hover:bg-white/15 transition-colors"
                  >
                    📋 Copy Code
                  </button>
                  {navigator.share && (
                    <button onClick={() => navigator.share({ title: `Join ${family.name}'s HQ`, text: `Join our Family HQ! Code: ${familyCode.slice(0,3)}-${familyCode.slice(3)}` }).catch(() => {})}
                      className="py-3 rounded-xl text-white/70 bg-white/8 border border-white/10 text-sm font-medium hover:bg-white/15 transition-colors"
                    >
                      📤 Share Code
                    </button>
                  )}
                </div>

                <button onClick={handleNext}
                  className="w-full py-4 rounded-2xl text-white font-heading font-bold"
                  style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}
                >
                  Enter My HQ 🏠
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}