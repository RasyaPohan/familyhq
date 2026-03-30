import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

const ONCE_KEY = "logo_anim_played_v2";
const LOGO_URL = "https://media.base44.com/images/public/69c85a9423981da590798674/b5384615f_Gemini_Generated_Image_sfs4pzsfs4pzsfs4.png";

export default function AnimatedLogo({ size = 80 }) {
  const alreadyPlayed = sessionStorage.getItem(ONCE_KEY) === "1";
  const controls = useAnimation();
  const glowControls = useAnimation();
  const leftArcControls = useAnimation();
  const rightArcControls = useAnimation();

  useEffect(() => {
    if (alreadyPlayed) {
      controls.set({ opacity: 1, scale: 1 });
      return;
    }
    sessionStorage.setItem(ONCE_KEY, "1");

    async function runAnimation() {
      controls.set({ opacity: 0, scale: 0.6 });
      leftArcControls.set({ x: -size * 0.8, opacity: 0 });
      rightArcControls.set({ x: size * 0.8, opacity: 0 });

      await Promise.all([
        leftArcControls.start({ x: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }),
        rightArcControls.start({ x: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }),
      ]);

      await controls.start({
        opacity: 1,
        scale: [0.6, 1.1, 1],
        transition: { duration: 0.4, ease: "easeOut" },
      });

      leftArcControls.start({ opacity: 0, transition: { duration: 0.15 } });
      rightArcControls.start({ opacity: 0, transition: { duration: 0.15 } });

      await glowControls.start({
        opacity: [0, 0.7, 0],
        scale: [1, 1.18, 1],
        transition: { duration: 0.55, ease: "easeInOut" },
      });
    }

    runAnimation();
  }, []);

  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      {/* Left arc sweep overlay */}
      <motion.div
        animate={leftArcControls}
        initial={{ opacity: 0 }}
        style={{
          position: "absolute", inset: 0, zIndex: 10,
          borderRadius: "28%",
          background: "linear-gradient(90deg, #F97316 0%, #A855F7 100%)",
          clipPath: "inset(0 50% 0 0)",
          pointerEvents: "none",
        }}
      />

      {/* Right arc sweep overlay */}
      <motion.div
        animate={rightArcControls}
        initial={{ opacity: 0 }}
        style={{
          position: "absolute", inset: 0, zIndex: 10,
          borderRadius: "28%",
          background: "linear-gradient(270deg, #84CC16 0%, #A855F7 100%)",
          clipPath: "inset(0 0 0 50%)",
          pointerEvents: "none",
        }}
      />

      {/* Glow pulse */}
      <motion.div
        animate={glowControls}
        initial={{ opacity: 0, scale: 1 }}
        style={{
          position: "absolute",
          inset: -size * 0.1,
          borderRadius: "32%",
          background: "radial-gradient(circle, rgba(168,85,247,0.55) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* The actual logo image */}
      <motion.img
        animate={controls}
        initial={{ opacity: 0, scale: 0.6 }}
        src={LOGO_URL}
        alt="FamilyHQ Logo"
        style={{
          width: size,
          height: size,
          borderRadius: "28%",
          display: "block",
          position: "relative",
          zIndex: 6,
          boxShadow: "0 4px 24px rgba(124,58,237,0.35)",
        }}
      />
    </div>
  );
}