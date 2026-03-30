import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export default function LevelUpOverlay() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setData(e.detail);
      // Big confetti burst
      confetti({ particleCount: 180, spread: 120, origin: { y: 0.5 }, colors: ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981"] });
      setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { x: 0.1, y: 0.6 } }), 400);
      setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { x: 0.9, y: 0.6 } }), 600);
    };
    window.addEventListener("level-up", handler);
    return () => window.removeEventListener("level-up", handler);
  }, []);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={() => setData(null)}
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 14, stiffness: 250 }}
            className="bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 rounded-3xl p-10 text-center text-white shadow-2xl shadow-purple-500/50 mx-6 max-w-sm w-full"
          >
            <motion.div
              animate={{ rotate: [0, -12, 12, -8, 0], scale: [1, 1.25, 1.1, 1.2, 1] }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-8xl mb-4 block"
            >
              🎉
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="font-heading text-xl font-bold tracking-widest uppercase text-white/80 mb-1"
            >
              Level Up!
            </motion.p>

            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", damping: 12 }}
              className="font-heading text-6xl font-bold mb-4"
            >
              {data.level}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 inline-block mb-6"
            >
              <p className="font-heading text-2xl font-bold">{data.title}</p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-white/50 text-sm"
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}