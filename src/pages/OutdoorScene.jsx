import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveMember, getFamilyCode, getFamilyName, MEMBER_COLORS } from "@/lib/familyStore";

// ─── Deterministic star field ──────────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: ((Math.sin(i * 137.508 + 1.2) + 1) / 2) * 100,
  y: ((Math.cos(i * 97.31 + 0.5) + 1) / 2) * 42, // top 42% = sky
  r: i % 5 === 0 ? 1.8 : i % 3 === 0 ? 1.2 : 0.7,
  delay: (i % 7) * 0.55,
  dur: 2.0 + (i % 5) * 0.6,
}));

// ─── Firefly particles ────────────────────────────────────────────────────────
const FIREFLIES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: 18 + (i * 31.7) % 64,
  y: 52 + (i * 17.3) % 18,
  delay: i * 0.9,
}));

export default function OutdoorScene() {
  const navigate = useNavigate();
  const member = getActiveMember();
  const familyCode = getFamilyCode();
  // Strip trailing "HQ" variants but keep the rest exactly as stored
  const rawName = getFamilyName().replace(/\s*(Family\s+)?HQ\s*$/i, "").trim() || "Family";
  const memberColor = member ? (MEMBER_COLORS[member.color] || MEMBER_COLORS.purple) : MEMBER_COLORS.purple;

  const [zooming, setZooming] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [doorGlow, setDoorGlow] = useState(false);
  const [petBubble, setPetBubble] = useState(false);
  const petBubbleTimer = useRef(null);

  const PET_GREETINGS = [
    "Welcome home! 🐾",
    "Finally, you're back! 😸",
    "I missed you! 🐱",
    "Ready to go inside? 🏠",
    "The family is waiting! ✨",
  ];
  const petGreeting = useRef(PET_GREETINGS[Math.floor(Math.random() * PET_GREETINGS.length)]);

  useEffect(() => {
    if (!familyCode) { navigate("/", { replace: true }); return; }
    // Show tap hint after 2s
    const t = setTimeout(() => setHintVisible(true), 2000);
    return () => clearTimeout(t);
  }, [familyCode]);

  const handleEnter = () => {
    if (zooming) return;
    setDoorGlow(true);
    setZooming(true);
    // Navigation happens in onAnimationComplete — no setTimeout needed
  };

  const carColor = memberColor.hex;
  // Derive a slightly darker shade for car roof
  const carRoofColor = memberColor.hex + "cc";

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(180deg, #03040a 0%, #060818 35%, #0a0d1f 60%, #0d1228 100%)",
        overflow: "hidden",
        cursor: zooming ? "default" : "pointer",
      }}
      onClick={handleEnter}
    >
      {/* ── Stars ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {STARS.map(s => (
          <motion.div
            key={s.id}
            style={{
              position: "absolute",
              borderRadius: "50%",
              background: "white",
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.r * 2,
              height: s.r * 2,
            }}
            animate={{ opacity: [0.1, 0.9, 0.1] }}
            transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Moon */}
        <div style={{
          position: "absolute", top: "6%", right: "12%",
          width: 38, height: 38, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #fef9c3, #fde68a)",
          boxShadow: "0 0 24px 8px rgba(253,230,138,0.18), 0 0 60px 20px rgba(253,230,138,0.07)",
        }}>
          {/* Moon crater details */}
          <div style={{ position: "absolute", top: 9, left: 11, width: 7, height: 7, borderRadius: "50%", background: "rgba(180,150,50,0.25)" }}/>
          <div style={{ position: "absolute", top: 19, left: 20, width: 4, height: 4, borderRadius: "50%", background: "rgba(180,150,50,0.2)" }}/>
        </div>
      </div>

      {/* ── Single zoom container: ALL scene elements zoom together ── */}
      <motion.div
        style={{ position: "absolute", inset: 0, transformOrigin: "50% 46%" }}
        animate={zooming ? { scale: 4, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={zooming
          ? { duration: 1.0, ease: [0.4, 0, 0.8, 1] }
          : { duration: 0 }
        }
        onAnimationComplete={() => { if (zooming) navigate("/home"); }}
      >
        {/* ── Welcome text ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: zooming ? 0 : 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "10%",
            left: 0,
            right: 0,
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
            gap: 4,
          }}
        >
          <span style={{
            fontSize: 14,
            fontWeight: 400,
            color: "rgba(196,181,253,0.7)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.06em",
          }}>
            Welcome to
          </span>
          <span style={{
            fontSize: 34,
            fontWeight: 700,
            color: "rgba(255,255,255,0.96)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.01em",
            textShadow: "0 0 24px rgba(167,139,250,0.55), 0 0 48px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.6)",
          }}>
            {rawName} HQ
          </span>
        </motion.div>

        <svg
          viewBox="0 0 400 520"
          width="100%"
          height="100%"
          style={{ display: "block", position: "absolute", inset: 0 }}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Window glow filter */}
            <filter id="winGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            {/* Soft ambient glow */}
            <filter id="ambientGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8"/>
            </filter>
            {/* Door glow */}
            <filter id="doorGlowF" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            {/* Tree foliage gradient */}
            <radialGradient id="foliage" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#166534"/>
              <stop offset="100%" stopColor="#052e16"/>
            </radialGradient>
            {/* Grass gradient */}
            <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#15803d"/>
              <stop offset="100%" stopColor="#052e16"/>
            </linearGradient>
            {/* Sky gradient (redundant backup) */}
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#03040a"/>
              <stop offset="100%" stopColor="#0a0d1f"/>
            </linearGradient>
            {/* Car body gradient */}
            <linearGradient id="carGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={carColor}/>
              <stop offset="100%" stopColor={carColor + "99"}/>
            </linearGradient>
            {/* Headlight glow */}
            <radialGradient id="headlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#fef9c3" stopOpacity="0"/>
            </radialGradient>
            {/* Window ambient spread */}
            <radialGradient id="winSpread" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="doorSpread" cx="50%" cy="100%" r="70%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* ── SKY (implicit from page bg) — just the SVG area fill ── */}
          <rect x="0" y="0" width="400" height="520" fill="transparent"/>

          {/* ── Distant city silhouette ── */}
          {[
            [20,280,18,40],[55,268,14,50],[80,272,20,44],[112,264,12,52],[138,268,16,48],
            [310,270,14,46],[338,264,18,42],[362,272,12,50],[385,268,16,44],
          ].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#080c1a"/>
          ))}
          {/* Tiny windows on buildings */}
          {[[28,284],[58,272],[85,278],[118,270],[143,272],[315,274],[342,268],[366,278],[390,272]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="2.5" height="2" rx="0.5"
              fill="#fde68a" opacity={0.4 + (i % 3) * 0.15}/>
          ))}

          {/* ── Ground / lawn ── */}
          {/* Main lawn */}
          <rect x="0" y="370" width="400" height="150" fill="url(#grassGrad)"/>
          {/* Lawn texture — subtle dark bands */}
          {Array.from({length:10},(_,i)=>(
            <rect key={i} x={i*40} y="370" width="20" height="150" fill="#052e16" opacity="0.12"/>
          ))}

          {/* ── Sidewalk / street at very bottom ── */}
          <rect x="0" y="476" width="400" height="44" fill="#1e2130"/>
          <rect x="0" y="476" width="400" height="2" fill="#2d3354" opacity="0.8"/>
          {/* Road dashes */}
          {Array.from({length:8},(_,i)=>(
            <rect key={i} x={16+i*52} y="494" width="32" height="4" rx="2" fill="#f59e0b" opacity="0.25"/>
          ))}

          {/* ── Driveway ── */}
          {/* Concrete path from street to house */}
          <polygon points="145,476 255,476 235,375 165,375" fill="#1c2035"/>
          {/* Driveway lines */}
          <line x1="165" y1="375" x2="145" y2="476" stroke="#252a45" strokeWidth="1"/>
          <line x1="235" y1="375" x2="255" y2="476" stroke="#252a45" strokeWidth="1"/>
          {/* Driveway texture blocks */}
          {[395,415,435,455].map((y,i)=>(
            <line key={i} x1={146+i*1.5} y1={y} x2={254-i*1.5} y2={y}
              stroke="#252a45" strokeWidth="0.8" opacity="0.6"/>
          ))}

          {/* ── Front path (from door to driveway) ── */}
          <polygon points="180,370 220,370 225,400 175,400" fill="#1e243a"/>
          <polygon points="183,370 217,370 222,398 178,398" fill="#232947" opacity="0.6"/>
          {/* Path stepping stones */}
          {[[196,373,8,5],[194,381,12,5],[192,389,16,5]].map(([x,y,w,h],i)=>(
            <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#2a3150" opacity="0.8"/>
          ))}

          {/* ── HOUSE facade ── */}
          {/* House body */}
          <rect x="100" y="220" width="200" height="155" fill="#111827"/>
          <rect x="100" y="220" width="200" height="155" fill="#0d1120" opacity="0.4"/>
          {/* Foundation */}
          <rect x="96" y="370" width="208" height="8" rx="2" fill="#0a0e1a"/>

          {/* Roof */}
          <polygon points="88,222 200,150 312,222" fill="#1a1d3a"/>
          <polygon points="88,222 200,150 200,222" fill="#13162e"/>
          {/* Roof ridge */}
          <line x1="200" y1="150" x2="200" y2="222" stroke="#4338ca" strokeWidth="1" opacity="0.5"/>
          {/* Eaves */}
          <polygon points="82,222 318,222 313,232 87,232" fill="#111827"/>
          <line x1="82" y1="222" x2="318" y2="222" stroke="#312e81" strokeWidth="1.2"/>

          {/* Chimney */}
          <rect x="152" y="158" width="16" height="42" rx="1" fill="#1e1b4b" stroke="#3730a3" strokeWidth="0.8"/>
          <rect x="149" y="156" width="22" height="5" rx="1" fill="#2d2a6e"/>

          {/* ── Windows (warm glowing) ── */}
          {/* Top row: 3 windows */}
          {[118,188,258].map((x,i)=>(
            <g key={i}>
              {/* Ambient light spill on wall below window */}
              <rect x={x-6} y={242} width={46} height={30} fill="url(#winSpread)" opacity="0.7"/>
              {/* Window frame */}
              <rect x={x} y={238} width={34} height={26} rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="0.8"/>
              {/* Warm glow fill */}
              <rect x={x+2} y={240} width={30} height={22} rx="2"
                fill="#fde68a" opacity="0.18" filter="url(#winGlow)"/>
              {/* Inner warm pane */}
              <rect x={x+2} y={240} width={30} height={22} rx="2" fill="#fbbf24" opacity="0.09"/>
              {/* Cross divider */}
              <line x1={x+17} y1={240} x2={x+17} y2={262} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
              <line x1={x} y1={251} x2={x+34} y2={251} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
              {/* Curtain hints */}
              <rect x={x+2} y={240} width={7} height={22} rx="1" fill="#7c3aed" opacity="0.15"/>
              <rect x={x+21} y={240} width={9} height={22} rx="1" fill="#7c3aed" opacity="0.15"/>
            </g>
          ))}

          {/* Bottom row: 2 side windows */}
          {[118,258].map((x,i)=>(
            <g key={i}>
              <rect x={x-4} y={293} width={42} height={28} fill="url(#winSpread)" opacity="0.6"/>
              <rect x={x} y={297} width={34} height={24} rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="0.8"/>
              <rect x={x+2} y={299} width={30} height={20} rx="2" fill="#fde68a" opacity="0.16" filter="url(#winGlow)"/>
              <line x1={x+17} y1={299} x2={x+17} y2={319} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
              <line x1={x} y1={309} x2={x+34} y2={309} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
            </g>
          ))}

          {/* ── Front door ── */}
          <g>
            {/* Door ambient glow spread on ground */}
            <rect x="166" y="320" width="68" height="60" fill="url(#doorSpread)" opacity="0.9"/>

            {/* Door frame */}
            <rect x="172" y="308" width="56" height="65" rx="2"
              fill={doorGlow ? "#f97316" : "#4338ca"} opacity="0.25"
              filter="url(#doorGlowF)"/>

            {/* Door body */}
            <rect x="176" y="312" width="48" height="62" rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="1.2"/>

            {/* Door arch */}
            <path d="M176,326 Q200,308 224,326" fill="none" stroke="#4338ca" strokeWidth="0.9" opacity="0.7"/>

            {/* Door panels */}
            <rect x="180" y="330" width="18" height="20" rx="2" fill="#151c33"/>
            <rect x="202" y="330" width="18" height="20" rx="2" fill="#151c33"/>
            <rect x="180" y="355" width="18" height="14" rx="2" fill="#151c33"/>
            <rect x="202" y="355" width="18" height="14" rx="2" fill="#151c33"/>

            {/* Door window */}
            <rect x="184" y="316" width="32" height="10" rx="3"
              fill="#fde68a" opacity={doorGlow ? 0.45 : 0.22} filter="url(#winGlow)"/>

            {/* Doorknob */}
            <circle cx="218" cy="344" r="3" fill={doorGlow ? "#fbbf24" : "#6d28d9"}/>
            <circle cx="218" cy="344" r="1.5" fill={doorGlow ? "#fef3c7" : "#8b5cf6"} opacity="0.8"/>

            {/* Door step */}
            <rect x="168" y="373" width="64" height="6" rx="2" fill="#1e243a"/>
            <rect x="164" y="377" width="72" height="4" rx="1" fill="#191f36"/>
          </g>

          {/* ── Porch light ── */}
          <circle cx="200" cy="308" r="4" fill="#fde68a" opacity="0.9" filter="url(#winGlow)"/>
          <rect x="197" y="305" width="6" height="3" rx="1" fill="#374151"/>
          {/* Light cone */}
          <polygon points="196,312 204,312 210,328 190,328"
            fill="#fde68a" opacity="0.06"/>

          {/* ── House number ── */}
          <rect x="190" y="295" width="20" height="10" rx="2" fill="#1e243a"/>
          <text x="200" y="303" textAnchor="middle" fontSize="6" fontWeight="700"
            fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>HQ</text>

          {/* ── Gutter / wall details ── */}
          <line x1="100" y1="230" x2="100" y2="370" stroke="#1e293b" strokeWidth="1" opacity="0.5"/>
          <line x1="300" y1="230" x2="300" y2="370" stroke="#1e293b" strokeWidth="1" opacity="0.5"/>

          {/* ── TREE (left side) ── */}
          <g>
            {/* Trunk */}
            <rect x="44" y="330" width="12" height="48" rx="4" fill="#292524"/>
            <rect x="48" y="330" width="4" height="48" fill="#1c1917" opacity="0.5"/>
            {/* Roots */}
            <path d="M44,375 Q36,380 30,378" stroke="#292524" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M56,376 Q64,382 70,379" stroke="#292524" strokeWidth="3" strokeLinecap="round" fill="none"/>
            {/* Foliage layers */}
            <ellipse cx="50" cy="318" rx="28" ry="20" fill="url(#foliage)"/>
            <ellipse cx="50" cy="305" rx="22" ry="18" fill="#166534"/>
            <ellipse cx="50" cy="293" rx="16" ry="14" fill="#15803d"/>
            <ellipse cx="47" cy="282" rx="11" ry="10" fill="#16a34a"/>
            {/* Foliage highlights */}
            <ellipse cx="44" cy="295" rx="6" ry="5" fill="#22c55e" opacity="0.18"/>
            <ellipse cx="54" cy="302" rx="5" ry="4" fill="#22c55e" opacity="0.14"/>
          </g>

          {/* ── MAILBOX (right side) ── */}
          <g>
            {/* Post */}
            <rect x="334" y="355" width="4" height="24" rx="1" fill="#374151"/>
            {/* Box body */}
            <rect x="322" y="343" width="28" height="16" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            {/* Box top curve */}
            <path d="M322,350 Q336,342 350,350" fill="#253347" stroke="#334155" strokeWidth="0.8"/>
            {/* Mailbox flag */}
            <rect x="349" y="344" width="2" height="10" fill="#dc2626"/>
            <rect x="350" y="344" width="7" height="5" rx="1" fill="#dc2626"/>
            {/* Family name on mailbox */}
            <text x="336" y="355" textAnchor="middle" fontSize="4" fontWeight="700"
              fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>
              {rawName.length > 8 ? rawName.slice(0,7)+"." : rawName}
            </text>
          </g>

          {/* ── Garden flowers (left lawn area) ── */}
          {[
            [72, 358, "#ec4899"], [80, 365, "#f59e0b"], [65, 368, "#8b5cf6"],
            [88, 360, "#10b981"], [76, 372, "#ef4444"],
          ].map(([x,y,c],i)=>(
            <g key={i}>
              {/* Stem */}
              <line x1={x} y1={y} x2={x} y2={y+10} stroke="#166534" strokeWidth="1.2"/>
              {/* Petals */}
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 3.5}
                  cy={y + Math.sin(deg*Math.PI/180) * 3.5}
                  rx="2.5" ry="1.8"
                  fill={c} opacity="0.85"
                  transform={`rotate(${deg} ${x + Math.cos(deg*Math.PI/180)*3.5} ${y + Math.sin(deg*Math.PI/180)*3.5})`}
                />
              ))}
              {/* Center */}
              <circle cx={x} cy={y} r="2" fill="#fde68a" opacity="0.9"/>
            </g>
          ))}

          {/* Garden flowers right side */}
          {[
            [315, 360, "#8b5cf6"], [325, 368, "#ec4899"], [308, 372, "#3b82f6"],
          ].map(([x,y,c],i)=>(
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y+10} stroke="#166534" strokeWidth="1.2"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 3.5}
                  cy={y + Math.sin(deg*Math.PI/180) * 3.5}
                  rx="2.5" ry="1.8"
                  fill={c} opacity="0.85"
                  transform={`rotate(${deg} ${x + Math.cos(deg*Math.PI/180)*3.5} ${y + Math.sin(deg*Math.PI/180)*3.5})`}
                />
              ))}
              <circle cx={x} cy={y} r="2" fill="#fde68a" opacity="0.9"/>
            </g>
          ))}

          {/* ── Grass blades (foreground) ── */}
          {Array.from({length:28},(_,i)=>{
            const x = 5 + i * 14.5;
            const h = 6 + (i%4)*3;
            const lean = (i%3-1)*3;
            return (
              <line key={i}
                x1={x} y1={470}
                x2={x+lean} y2={470-h}
                stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            );
          })}

          {/* ── Hedge / low bushes along house base ── */}
          {[
            [100,362,34,14], [255,362,45,14],
          ].map(([x,y,w,h],i)=>(
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="7" fill="#14532d"/>
              <ellipse cx={x+8} cy={y+4} rx="7" ry="5" fill="#166534"/>
              <ellipse cx={x+w/2} cy={y+3} rx="8" ry="6" fill="#15803d"/>
              <ellipse cx={x+w-8} cy={y+4} rx="6" ry="5" fill="#166534"/>
            </g>
          ))}

          {/* ── Pet egg in left garden — bigger, nestled in grass ── */}
          <motion.g
            style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "50% 100%" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            onClick={e => {
              e.stopPropagation();
              clearTimeout(petBubbleTimer.current);
              setPetBubble(true);
              petBubbleTimer.current = setTimeout(() => setPetBubble(false), 2500);
            }}
          >
            {/* Grass blades behind egg */}
            <line x1="50" y1="375" x2="46" y2="358" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="57" y1="374" x2="55" y2="360" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            <line x1="82" y1="375" x2="86" y2="359" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="76" y1="374" x2="78" y2="361" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            {/* Glow beneath egg */}
            <ellipse cx="68" cy="374" rx="18" ry="5" fill="rgba(139,92,246,0.18)" filter="url(#winGlow)"/>
            {/* Shadow */}
            <ellipse cx="68" cy="376" rx="16" ry="4.5" fill="rgba(0,0,0,0.4)"/>
            {/* Egg body — large */}
            <ellipse cx="68" cy="357" rx="16" ry="19" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5"/>
            {/* Egg shine */}
            <ellipse cx="62" cy="348" rx="5" ry="7" fill="white" opacity="0.22"/>
            {/* Egg crack */}
            <path d="M64,343 L67,349 L63,354" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            <path d="M72,342 L71,347" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            {/* Eyes peeking */}
            <circle cx="62" cy="355" r="2.2" fill="#1e1b4b"/>
            <circle cx="74" cy="355" r="2.2" fill="#1e1b4b"/>
            <circle cx="62.7" cy="354.2" r="0.8" fill="white"/>
            <circle cx="74.7" cy="354.2" r="0.8" fill="white"/>
            {/* Cheek blush */}
            <ellipse cx="58" cy="358" rx="3" ry="2" fill="#fca5a5" opacity="0.5"/>
            <ellipse cx="78" cy="358" rx="3" ry="2" fill="#fca5a5" opacity="0.5"/>
            {/* Grass blades in front of egg */}
            <line x1="52" y1="378" x2="49" y2="365" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
            <line x1="84" y1="378" x2="87" y2="365" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
          </motion.g>

          {/* ── FAMILY CAR ── */}
          <g>
            {/* Car shadow */}
            <ellipse cx="192" cy="462" rx="58" ry="6" fill="rgba(0,0,0,0.4)"/>

            {/* Car body lower */}
            <rect x="134" y="440" width="116" height="24" rx="8" fill="url(#carGrad)"/>

            {/* Car cabin */}
            <path d="M152,440 L160,418 L224,418 L232,440 Z"
              fill={carColor} opacity="0.9"/>
            {/* Cabin darker roof */}
            <path d="M158,438 L164,422 L220,422 L226,438 Z"
              fill={carRoofColor}/>

            {/* Windshields */}
            <path d="M162,438 L168,424 L200,424 L200,438 Z"
              fill="#0d1520" opacity="0.85"/>
            <path d="M200,438 L200,424 L216,424 L222,438 Z"
              fill="#0d1520" opacity="0.85"/>
            {/* Window shine */}
            <path d="M165,436 L170,426 L178,426 L174,436 Z"
              fill="white" opacity="0.08"/>

            {/* Wheels */}
            <circle cx="158" cy="463" r="12" fill="#111827"/>
            <circle cx="158" cy="463" r="8" fill="#1e293b"/>
            <circle cx="158" cy="463" r="4" fill="#374151"/>
            <circle cx="226" cy="463" r="12" fill="#111827"/>
            <circle cx="226" cy="463" r="8" fill="#1e293b"/>
            <circle cx="226" cy="463" r="4" fill="#374151"/>
            {/* Wheel spokes */}
            {[0,90,180,270].map(deg=>(
              <line key={deg}
                x1={158 + Math.cos(deg*Math.PI/180)*4} y1={463 + Math.sin(deg*Math.PI/180)*4}
                x2={158 + Math.cos(deg*Math.PI/180)*7.5} y2={463 + Math.sin(deg*Math.PI/180)*7.5}
                stroke="#4b5563" strokeWidth="1.5"/>
            ))}
            {[0,90,180,270].map(deg=>(
              <line key={deg}
                x1={226 + Math.cos(deg*Math.PI/180)*4} y1={463 + Math.sin(deg*Math.PI/180)*4}
                x2={226 + Math.cos(deg*Math.PI/180)*7.5} y2={463 + Math.sin(deg*Math.PI/180)*7.5}
                stroke="#4b5563" strokeWidth="1.5"/>
            ))}

            {/* Headlights */}
            <rect x="134" y="447" width="10" height="6" rx="2" fill="#fef9c3" opacity="0.9"/>
            <rect x="240" y="447" width="10" height="6" rx="2" fill="#fef3c7" opacity="0.6"/>
            {/* Headlight glow */}
            <ellipse cx="139" cy="450" rx="22" ry="10" fill="url(#headlight)"/>

            {/* Tail lights */}
            <rect x="240" y="447" width="8" height="5" rx="1.5" fill="#ef4444" opacity="0.7"/>

            {/* Door line */}
            <line x1="192" y1="441" x2="192" y2="462" stroke="white" strokeWidth="0.5" opacity="0.15"/>
            {/* Door handles */}
            <rect x="178" y="449" width="8" height="3" rx="1.5" fill="#e2e8f0" opacity="0.3"/>
            <rect x="200" y="449" width="8" height="3" rx="1.5" fill="#e2e8f0" opacity="0.3"/>

            {/* Roof rack (subtle) */}
            <rect x="165" y="418" width="54" height="2" rx="1" fill={carColor} opacity="0.4"/>
          </g>

          {/* ── Lamp post ── */}
          <g>
            <rect x="355" y="322" width="5" height="55" rx="2" fill="#1e293b"/>
            {/* Arm */}
            <path d="M357,324 Q363,318 368,320" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none"/>
            {/* Lamp head */}
            <rect x="361" y="316" width="14" height="7" rx="2" fill="#1e293b"/>
            {/* Light bulb */}
            <ellipse cx="368" cy="323" rx="5" ry="4" fill="#fde68a" opacity="0.85" filter="url(#winGlow)"/>
            {/* Light cone on ground */}
            <polygon points="358,323 378,323 390,370 346,370"
              fill="#fde68a" opacity="0.04"/>
            {/* Base */}
            <rect x="353" y="373" width="9" height="5" rx="2" fill="#1e293b"/>
          </g>

          {/* ── Tap target overlay: door + path (invisible, for accessibility) ── */}
          <rect x="160" y="295" width="80" height="90"
            fill="transparent" style={{ cursor: "pointer" }}/>
        </svg>

        {/* ── Fireflies (HTML layer for animation) ── */}
        {FIREFLIES.map(f => (
          <motion.div
            key={f.id}
            style={{
              position: "absolute",
              left: `${f.x}%`, top: `${f.y}%`,
              width: 4, height: 4, borderRadius: "50%",
              background: "#a3e635",
              boxShadow: "0 0 6px 2px rgba(163,230,53,0.6)",
              pointerEvents: "none",
            }}
            animate={{
              x: [0, 12, -8, 15, 0],
              y: [0, -10, 8, -5, 0],
              opacity: [0, 0.9, 0.4, 0.8, 0],
            }}
            transition={{
              duration: 3.5, repeat: Infinity, delay: f.delay, ease: "easeInOut",
            }}
          />
        ))}

        {/* ── Smoke from chimney ── */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              // chimney is at ~39% from left, ~30% from top of 520-tall SVG
              left: "calc(39.5% + 2px)",
              top: "calc(30% - 4px)",
              width: 6 + i * 4,
              height: 6 + i * 4,
              borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,0.12)",
              pointerEvents: "none",
            }}
            animate={{
              y: [0, -20 - i * 12],
              opacity: [0.35, 0],
              scale: [1, 1.5],
            }}
            transition={{
              duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut",
            }}
          />
        ))}

        {/* ── Pet speech bubble ── */}
        <AnimatePresence>
          {petBubble && (
            <motion.div
              key="petbubble"
              initial={{ opacity: 0, y: 6, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              style={{
                position: "absolute",
                // Pet is in left garden ~x=68/400=17%, y=355/520=68%
                left: "calc(17% + 8px)",
                top: "calc(68% - 60px)",
                zIndex: 6,
                pointerEvents: "none",
              }}
            >
              <div style={{
                background: "#1a1a2e",
                border: "1px solid rgba(167,139,250,0.45)",
                borderRadius: 12,
                padding: "8px 12px",
                color: "rgba(255,255,255,0.92)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                whiteSpace: "nowrap",
                boxShadow: "0 0 12px rgba(139,92,246,0.25)",
              }}>
                {petGreeting.current}
              </div>
              {/* Triangle pointer down toward pet */}
              <div style={{
                position: "absolute", bottom: -7, left: 18,
                width: 0, height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "7px solid #1a1a2e",
              }}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tap hint ── */}
        <AnimatePresence>
          {hintVisible && !zooming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "absolute", bottom: 32, left: 0, right: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                pointerEvents: "none", zIndex: 10,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: 22 }}
              >🚪</motion.div>
              <div style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 999,
                padding: "7px 20px",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.02em",
              }}>
                Tap anywhere to enter
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
