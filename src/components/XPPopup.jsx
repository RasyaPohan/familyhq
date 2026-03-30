import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function XPPopup() {
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    let timer;
    const handler = (e) => {
      setPopup(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setPopup(null), 2500);
    };
    window.addEventListener("xp-earned", handler);
    return () => {
      window.removeEventListener("xp-earned", handler);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          key={popup.amount + popup.memberName}
          initial={{ opacity: 0, y: 50, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          transition={{ type: "spring", damping: 18, stiffness: 350 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-pink-500 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-purple-500/40 font-heading font-bold text-lg whitespace-nowrap">
            <motion.span
              animate={{ rotate: [0, -15, 15, -10, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5 }}
            >
              ⚡
            </motion.span>
            <span>+{popup.amount} XP</span>
            {popup.memberName && (
              <span className="text-sm font-normal opacity-80">· {popup.memberName}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}