import { useEffect } from "react";
import AnimatedLogo from "@/components/AnimatedLogo";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getFamilyCode, isPinValid, getActiveMember } from "@/lib/familyStore";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = getFamilyCode();
    if (code) {
      if (isPinValid(code)) {
        navigate('/outdoor', { replace: true });
      } else {
        navigate('/pin', { replace: true });
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="flex flex-col items-center gap-6 relative z-10 max-w-sm w-full"
      >
        {/* Logo */}
        <AnimatedLogo size={100} />

        <div className="text-center">
          <h1 className="text-white font-heading text-4xl font-bold">FamilyHQ</h1>
          <p className="text-white/50 mt-2 text-base">Your family's private command center</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {["📅 Calendar", "✅ Chores", "⚡ XP & Levels", "🍽️ Meals", "🎯 Goals"].map(f => (
            <span key={f} className="text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-full">{f}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/create-hq')}
            className="w-full py-4 rounded-2xl text-white font-heading font-bold text-lg"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
          >
            Create a Family HQ 🏠
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/join-hq')}
            className="w-full py-4 rounded-2xl text-white/70 font-heading font-bold text-lg bg-white/8 border border-white/10 hover:bg-white/12 transition-colors"
          >
            Join a Family HQ 🔑
          </motion.button>
        </div>

        <p className="text-white/20 text-xs text-center mt-4">
          Each family gets their own private, isolated space
        </p>
      </motion.div>
    </div>
  );
}