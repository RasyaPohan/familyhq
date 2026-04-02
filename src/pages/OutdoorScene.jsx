import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveMember, getFamilyCode, getFamilyName, MEMBER_COLORS } from "@/lib/familyStore";

// ─── Deterministic star field ─────────────────────────────────────────────────
const STARS = Array.from({ length: 110 }, (_, i) => ({
  id: i,
  x: ((Math.sin(i * 137.508 + 1.2) + 1) / 2) * 100,
  y: ((Math.cos(i * 97.31 + 0.5) + 1) / 2) * 38,
  r: i % 11 === 0 ? 2.4 : i % 7 === 0 ? 1.9 : i % 4 === 0 ? 1.3 : i % 3 === 0 ? 0.9 : 0.55,
  delay: (i % 9) * 0.48,
  dur: 1.8 + (i % 7) * 0.65,
  blink: i % 5 < 2,
}));

// ─── Firefly particles ────────────────────────────────────────────────────────
const FIREFLIES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: 12 + (i * 28.7) % 70,
  y: 50 + (i * 13.3) % 22,
  delay: i * 0.7,
}));

export default function OutdoorScene() {
  const navigate = useNavigate();
  const member = getActiveMember();
  const familyCode = getFamilyCode();
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
    const t = setTimeout(() => setHintVisible(true), 2000);
    return () => clearTimeout(t);
  }, [familyCode]);

  const handleEnter = () => {
    if (zooming) return;
    setDoorGlow(true);
    setZooming(true);
  };

  const carColor = memberColor.hex;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(180deg, #020510 0%, #050b1a 30%, #080e22 60%, #0b1230 80%, #0f1840 100%)",
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
              background: s.r > 1.8 ? "rgba(255,250,230,0.95)" : s.r > 1.2 ? "rgba(255,255,255,0.85)" : "rgba(200,215,255,0.75)",
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.r * 2,
              height: s.r * 2,
              boxShadow: s.r > 1.5 ? `0 0 ${s.r * 3}px ${s.r}px rgba(255,255,220,0.4)` : "none",
            }}
            animate={{ opacity: s.blink ? [0.15, 1.0, 0.15] : [0.4, 0.95, 0.4] }}
            transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Moon */}
        <div style={{
          position: "absolute", top: "5%", right: "10%",
          width: 52, height: 52, borderRadius: "50%",
          background: "radial-gradient(circle at 38% 38%, #fffde7, #fef08a 40%, #fde047 100%)",
          boxShadow: "0 0 30px 12px rgba(253,224,71,0.22), 0 0 80px 30px rgba(253,224,71,0.10), 0 0 140px 60px rgba(253,224,71,0.05)",
        }}>
          <div style={{ position: "absolute", top: 11, left: 13, width: 9, height: 9, borderRadius: "50%", background: "rgba(161,120,20,0.22)" }}/>
          <div style={{ position: "absolute", top: 24, left: 26, width: 5, height: 5, borderRadius: "50%", background: "rgba(161,120,20,0.17)" }}/>
          <div style={{ position: "absolute", top: 16, left: 32, width: 7, height: 7, borderRadius: "50%", background: "rgba(161,120,20,0.15)" }}/>
        </div>
      </div>

      {/* ── Single zoom container ── */}
      <motion.div
        style={{ position: "absolute", inset: 0, transformOrigin: "50% 52%" }}
        animate={zooming ? { scale: 4, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={zooming
          ? { duration: 1.0, ease: [0.4, 0, 0.8, 1] }
          : { duration: 0 }
        }
        onAnimationComplete={() => { if (zooming) navigate("/home"); }}
      >
        {/*
          viewBox 0 0 400 620
          Sky y=0–160 (26%) — welcome text y=110–148
          House y=148–448 (big hero, body x=50–350, 300px wide)
          Garden y=448–540
          Street y=540–620
          preserveAspectRatio xMidYMax meet — bottom flush
        */}
        <svg
          viewBox="0 0 400 620"
          style={{ display: "block", position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            {/* Window warm inner glow */}
            <filter id="winGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            {/* Large soft ambient */}
            <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="12"/>
            </filter>
            {/* Medium glow */}
            <filter id="medGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            {/* Door glow */}
            <filter id="doorGlowF" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            {/* Lamp cone glow */}
            <filter id="lampGlow" x="-80%" y="-40%" width="260%" height="180%">
              <feGaussianBlur stdDeviation="6"/>
            </filter>
            {/* Tree foliage */}
            <radialGradient id="foliage" cx="45%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#16a34a"/>
              <stop offset="55%" stopColor="#166534"/>
              <stop offset="100%" stopColor="#052e16"/>
            </radialGradient>
            <radialGradient id="foliageMid" cx="50%" cy="30%" r="55%">
              <stop offset="0%" stopColor="#22c55e"/>
              <stop offset="60%" stopColor="#15803d"/>
              <stop offset="100%" stopColor="#052e16"/>
            </radialGradient>
            <radialGradient id="foliageTop" cx="50%" cy="25%" r="55%">
              <stop offset="0%" stopColor="#4ade80"/>
              <stop offset="50%" stopColor="#16a34a"/>
              <stop offset="100%" stopColor="#14532d"/>
            </radialGradient>
            {/* Grass gradient */}
            <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a"/>
              <stop offset="40%" stopColor="#15803d"/>
              <stop offset="100%" stopColor="#052e16"/>
            </linearGradient>
            {/* Sky horizon glow (warm light from house spilling) */}
            <radialGradient id="horizonGlow" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="rgba(251,146,60,0.08)"/>
              <stop offset="100%" stopColor="rgba(251,146,60,0)"/>
            </radialGradient>
            {/* Car gradient */}
            <linearGradient id="carGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={carColor + "ff"}/>
              <stop offset="60%" stopColor={carColor + "cc"}/>
              <stop offset="100%" stopColor={carColor + "88"}/>
            </linearGradient>
            <linearGradient id="carReflect" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </linearGradient>
            {/* Headlight */}
            <radialGradient id="headlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fffde7" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#fffde7" stopOpacity="0"/>
            </radialGradient>
            {/* Window light spill onto wall */}
            <radialGradient id="winWallSpill" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="rgba(253,186,116,0.25)"/>
              <stop offset="100%" stopColor="rgba(253,186,116,0)"/>
            </radialGradient>
            {/* Window floor ray */}
            <linearGradient id="winRayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(253,186,116,0.14)"/>
              <stop offset="100%" stopColor="rgba(253,186,116,0)"/>
            </linearGradient>
            {/* Door wall spill */}
            <radialGradient id="doorWallSpill" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(139,92,246,0.20)"/>
              <stop offset="100%" stopColor="rgba(139,92,246,0)"/>
            </radialGradient>
            {/* Pet glow */}
            <radialGradient id="petGlow" cx="50%" cy="60%" r="60%">
              <stop offset="0%" stopColor="rgba(253,230,138,0.5)"/>
              <stop offset="100%" stopColor="rgba(253,230,138,0)"/>
            </radialGradient>
          </defs>

          {/* ── Horizon warm spill from house lights ── */}
          <rect x="-400" y="380" width="1200" height="200" fill="url(#horizonGlow)" opacity="0.7"/>

          {/* ── Distant city silhouette ── */}
          {[
            [15,328,16,38],[42,316,13,50],[65,320,18,44],[95,312,11,52],[120,316,15,46],[148,320,10,36],
            [252,318,10,40],[278,312,16,44],[306,320,13,42],[330,316,14,48],[355,322,11,36],[375,314,15,44],
          ].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#060a18"/>
          ))}
          {/* City windows */}
          {[
            [20,330],[48,320],[70,326],[100,318],[125,322],
            [258,322],[282,318],[310,326],[336,320],[358,328],[380,318],
          ].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="2.5" height="2" rx="0.5"
              fill="#fde68a" opacity={0.3 + (i % 4) * 0.12}/>
          ))}

          {/* ── Wide grass + street base fills ── */}
          <rect x="-400" y="448" width="1200" height="172" fill="url(#grassGrad)"/>
          {/* Subtle depth stripes */}
          {Array.from({length:14},(_,i)=>(
            <rect key={i} x={-400+i*60} y="448" width="30" height="92" fill="#052e16" opacity="0.10"/>
          ))}
          {/* Street */}
          <rect x="-400" y="540" width="1200" height="80" fill="#161b2e"/>
          <rect x="-400" y="540" width="1200" height="2.5" fill="#252d4a" opacity="0.9"/>
          {/* Road center dashes */}
          {Array.from({length:12},(_,i)=>(
            <rect key={i} x={-30+i*48} y="564" width="28" height="4.5" rx="2.2" fill="#d97706" opacity="0.20"/>
          ))}

          {/* ── Driveway ── */}
          <polygon points="148,540 252,540 228,448 172,448" fill="#1a1f38"/>
          {/* Driveway edge lines */}
          <line x1="172" y1="448" x2="148" y2="540" stroke="#242b48" strokeWidth="1.2" opacity="0.8"/>
          <line x1="228" y1="448" x2="252" y2="540" stroke="#242b48" strokeWidth="1.2" opacity="0.8"/>
          {/* Driveway texture lines */}
          {[462,476,490,504,518,530].map((y,i)=>(
            <line key={i} x1={173+i*1.5} y1={y} x2={227-i*1.5} y2={y}
              stroke="#242b48" strokeWidth="0.9" opacity="0.55"/>
          ))}

          {/* ── Front path ── */}
          <polygon points="180,448 220,448 226,484 174,484" fill="#1c2238"/>
          {[[196,451,8,5],[194,461,12,5],[191,471,18,5]].map(([x,y,w,h],i)=>(
            <rect key={i} x={x} y={y} width={w} height={h} rx="2.5" fill="#252d48" opacity="0.85"/>
          ))}

          {/* ══════════════════════════════════════════════════════════════
              HOUSE — hero element, 300px wide (x=50–350), rooftop y=148
          ══════════════════════════════════════════════════════════════ */}

          {/* ── Warm ambient light pool beneath house ── */}
          <ellipse cx="200" cy="450" rx="175" ry="30" fill="rgba(251,146,60,0.08)" filter="url(#softGlow)"/>

          {/* ── House body ── */}
          <rect x="50" y="275" width="300" height="178" fill="#0f1520"/>
          {/* Subtle wall texture gradient — left darker, center slightly lighter */}
          <rect x="50" y="275" width="150" height="178" fill="#0c1118" opacity="0.5"/>
          <rect x="200" y="275" width="150" height="178" fill="#131c28" opacity="0.3"/>
          {/* Foundation */}
          <rect x="44" y="448" width="312" height="10" rx="3" fill="#080c18"/>

          {/* ── Roof ── */}
          <polygon points="34,278 200,148 366,278" fill="#131628"/>
          <polygon points="34,278 200,148 200,278" fill="#0e1220"/>
          {/* Ridge highlight */}
          <line x1="200" y1="148" x2="200" y2="278" stroke="#3730a3" strokeWidth="1.5" opacity="0.6"/>
          {/* Eaves */}
          <polygon points="26,278 374,278 366,294 34,294" fill="#0f1320"/>
          <line x1="26" y1="278" x2="374" y2="278" stroke="#2e2b7a" strokeWidth="2"/>
          {/* Eave bottom edge */}
          <line x1="34" y1="294" x2="366" y2="294" stroke="#1e1b4b" strokeWidth="1" opacity="0.8"/>

          {/* ── Chimney ── */}
          <rect x="148" y="156" width="24" height="62" rx="2" fill="#1a1740" stroke="#312e81" strokeWidth="1"/>
          <rect x="143" y="153" width="34" height="8" rx="2" fill="#252266"/>
          {/* Chimney smoke */}
          {[0,1,2].map(i=>(
            <motion.ellipse key={i}
              cx={159} cy={153 - i*11}
              rx={4 + i*2.5} ry={3 + i*1.8}
              fill="rgba(255,255,255,0)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
              animate={{ cy: [153 - i*11, 130 - i*15], opacity: [0.4, 0], ry: [3+i*1.8, 6+i*2.8] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: i*0.9, ease: "easeOut" }}
            />
          ))}

          {/* ── WINDOWS — warm amber glow ── */}

          {/* Top row: 3 windows */}
          {[65, 165, 265].map((x, i) => (
            <g key={i}>
              {/* Wall spill around window */}
              <ellipse cx={x+24} cy={312} rx={36} ry={28} fill="url(#winWallSpill)"/>
              {/* Light ray onto ground */}
              <polygon
                points={`${x+4},342 ${x+44},342 ${x+56},448 ${x-8},448`}
                fill="url(#winRayGrad)" opacity="0.7"
              />
              {/* Window frame */}
              <rect x={x} y={296} width={48} height={36} rx="4" fill="#0a0f1c" stroke="#3730a3" strokeWidth="1.2"/>
              {/* Warm inner glow layer */}
              <rect x={x+2} y={298} width={44} height={32} rx="3" fill="#fb923c" opacity="0.22" filter="url(#winGlow)"/>
              {/* Bright warm center */}
              <rect x={x+4} y={300} width={40} height={28} rx="2" fill="#fde68a" opacity="0.28" filter="url(#winGlow)"/>
              {/* Pane reflections */}
              <rect x={x+4} y={300} width={19} height={28} rx="2" fill="#fbbf24" opacity="0.12"/>
              <rect x={x+25} y={300} width={19} height={28} rx="2" fill="#fbbf24" opacity="0.09"/>
              {/* Frame dividers */}
              <line x1={x+24} y1={298} x2={x+24} y2={330} stroke="#4338ca" strokeWidth="1" opacity="0.6"/>
              <line x1={x} y1={314} x2={x+48} y2={314} stroke="#4338ca" strokeWidth="1" opacity="0.6"/>
              {/* Top curtain hint */}
              <rect x={x+4} y={300} width={40} height={8} rx="2" fill="#7c3aed" opacity="0.18"/>
              {/* Shine */}
              <rect x={x+5} y={301} width={10} height={28} rx="1" fill="white" opacity="0.05"/>
            </g>
          ))}

          {/* Lower row: 2 side windows */}
          {[65, 265].map((x, i) => (
            <g key={i}>
              <ellipse cx={x+24} cy={370} rx={34} ry={24} fill="url(#winWallSpill)"/>
              <polygon
                points={`${x+4},396 ${x+44},396 ${x+52},448 ${x-4},448`}
                fill="url(#winRayGrad)" opacity="0.55"
              />
              <rect x={x} y={354} width={48} height={34} rx="4" fill="#0a0f1c" stroke="#3730a3" strokeWidth="1.2"/>
              <rect x={x+2} y={356} width={44} height={30} rx="3" fill="#fb923c" opacity="0.20" filter="url(#winGlow)"/>
              <rect x={x+4} y={358} width={40} height={26} rx="2" fill="#fde68a" opacity="0.24" filter="url(#winGlow)"/>
              <rect x={x+4} y={358} width={19} height={26} rx="2" fill="#fbbf24" opacity="0.10"/>
              <rect x={x+25} y={358} width={19} height={26} rx="2" fill="#fbbf24" opacity="0.08"/>
              <line x1={x+24} y1={356} x2={x+24} y2={384} stroke="#4338ca" strokeWidth="1" opacity="0.6"/>
              <line x1={x} y1={371} x2={x+48} y2={371} stroke="#4338ca" strokeWidth="1" opacity="0.6"/>
              <rect x={x+4} y={358} width={40} height={7} rx="2" fill="#7c3aed" opacity="0.15"/>
            </g>
          ))}

          {/* ── FRONT DOOR — purple HQ glow ── */}
          <g>
            {/* Door wall spill */}
            <ellipse cx="200" cy="420" rx="60" ry="50" fill="url(#doorWallSpill)"/>
            {/* Glow aura when door active */}
            <rect x="170" y="388" width="60" height="72"
              fill={doorGlow ? "#f97316" : "#6d28d9"} opacity={doorGlow ? 0.30 : 0.18} filter="url(#doorGlowF)"/>
            {/* Door surround */}
            <rect x="174" y="390" width="52" height="64" rx="3" fill="#0a0f1c" stroke="#4338ca" strokeWidth="1.6"/>
            {/* Fanlight arch */}
            <path d="M174,406 Q200,385 226,406" fill="none" stroke="#4338ca" strokeWidth="1.2" opacity="0.8"/>
            {/* Fanlight glow */}
            <path d="M176,406 Q200,388 224,406 Z" fill="#7c3aed" opacity={doorGlow ? 0.5 : 0.22} filter="url(#winGlow)"/>
            {/* Door panels */}
            <rect x="179" y="414" width="18" height="22" rx="2.5" fill="#121828"/>
            <rect x="203" y="414" width="18" height="22" rx="2.5" fill="#121828"/>
            <rect x="179" y="442" width="18" height="10" rx="2.5" fill="#121828"/>
            <rect x="203" y="442" width="18" height="10" rx="2.5" fill="#121828"/>
            {/* Door knob */}
            <circle cx="219" cy="430" r="4" fill={doorGlow ? "#fbbf24" : "#6d28d9"}/>
            <circle cx="219" cy="430" r="2.2" fill={doorGlow ? "#fef9c3" : "#a78bfa"} opacity="0.9"/>
            {/* Step */}
            <rect x="166" y="452" width="68" height="7" rx="2.5" fill="#1a2040"/>
            <rect x="162" y="457" width="76" height="4" rx="2" fill="#141a35"/>
          </g>

          {/* ── Porch light above door ── */}
          <rect x="195" y="381" width="10" height="6" rx="1.5" fill="#2d3748"/>
          <circle cx="200" cy="387" r="6.5" fill="#fde68a" opacity="0.95" filter="url(#winGlow)"/>
          <ellipse cx="200" cy="387" rx="22" ry="32" fill="#fde68a" opacity="0.08" filter="url(#softGlow)"/>
          <polygon points="192,394 208,394 220,430 180,430" fill="#fde68a" opacity="0.05"/>

          {/* ── House number ── */}
          <rect x="187" y="370" width="26" height="14" rx="3" fill="#1a2040"/>
          <text x="200" y="381" textAnchor="middle" fontSize="8" fontWeight="700"
            fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>HQ</text>

          {/* ── Wall corner details ── */}
          <line x1="50" y1="290" x2="50" y2="448" stroke="#1a2235" strokeWidth="1.5" opacity="0.6"/>
          <line x1="350" y1="290" x2="350" y2="448" stroke="#1a2235" strokeWidth="1.5" opacity="0.6"/>

          {/* ══════════════════════════════════════════════════════════════
              TREE — left side, big and full
          ══════════════════════════════════════════════════════════════ */}
          <g>
            {/* Trunk */}
            <rect x="18" y="390" width="16" height="70" rx="5" fill="#292524"/>
            <rect x="23" y="390" width="6" height="70" fill="#1c1917" opacity="0.55"/>
            {/* Roots/branches out */}
            <path d="M18,445 Q6,454 -2,449" stroke="#292524" strokeWidth="5" strokeLinecap="round" fill="none"/>
            <path d="M34,447 Q46,456 55,452" stroke="#292524" strokeWidth="4" strokeLinecap="round" fill="none"/>
            {/* Foliage layers — dark base to bright top */}
            <ellipse cx="26" cy="390" rx="36" ry="26" fill="url(#foliage)"/>
            <ellipse cx="26" cy="374" rx="30" ry="24" fill="#166534"/>
            <ellipse cx="26" cy="358" rx="25" ry="22" fill="url(#foliageMid)"/>
            <ellipse cx="24" cy="342" rx="20" ry="18" fill="#16a34a"/>
            <ellipse cx="22" cy="328" rx="15" ry="14" fill="url(#foliageTop)"/>
            <ellipse cx="20" cy="318" rx="10" ry="9" fill="#4ade80" opacity="0.5"/>
            {/* Highlights */}
            <ellipse cx="18" cy="340" rx="8" ry="7" fill="#86efac" opacity="0.18"/>
            <ellipse cx="32" cy="355" rx="7" ry="6" fill="#4ade80" opacity="0.15"/>
            <ellipse cx="14" cy="360" rx="6" ry="5" fill="#86efac" opacity="0.14"/>
          </g>

          {/* ══════════════════════════════════════════════════════════════
              MAILBOX — right side
          ══════════════════════════════════════════════════════════════ */}
          <g>
            {/* Post */}
            <rect x="354" y="424" width="6" height="32" rx="2" fill="#334155"/>
            <rect x="355" y="424" width="2" height="32" fill="#1e293b" opacity="0.5"/>
            {/* Box body */}
            <rect x="336" y="408" width="36" height="22" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
            {/* Box arch top */}
            <path d="M336,420 Q354,408 372,420" fill="#253347" stroke="#334155" strokeWidth="1.1"/>
            {/* Flag */}
            <rect x="372" y="409" width="2.5" height="14" fill="#ef4444"/>
            <rect x="374.5" y="409" width="9" height="7" rx="1.5" fill="#ef4444"/>
            {/* Name */}
            <text x="354" y="424" textAnchor="middle" fontSize="4.5" fontWeight="700"
              fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>
              {rawName.length > 9 ? rawName.slice(0,8)+"." : rawName}
            </text>
            {/* Base stone */}
            <rect x="350" y="454" width="14" height="4" rx="2" fill="#1e293b"/>
          </g>

          {/* ══════════════════════════════════════════════════════════════
              GARDEN — flowers, hedges, grass blades
          ══════════════════════════════════════════════════════════════ */}

          {/* Hedge along house base — left & right */}
          {[
            [50, 438, 52, 16],
            [298, 438, 52, 16],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="8" fill="#14532d"/>
              <ellipse cx={x+10} cy={y+5} rx={10} ry={7} fill="#166534"/>
              <ellipse cx={x+w/2} cy={y+4} rx={12} ry={8} fill="#15803d"/>
              <ellipse cx={x+w-10} cy={y+5} rx={9} ry={7} fill="#166534"/>
              {/* Highlights */}
              <ellipse cx={x+w/2} cy={y+2} rx={8} ry={4} fill="#22c55e" opacity="0.25"/>
            </g>
          ))}

          {/* Garden flowers left */}
          {[
            [42, 428, "#ec4899", 1.0],
            [54, 436, "#f59e0b", 1.1],
            [36, 440, "#8b5cf6", 0.9],
            [66, 431, "#10b981", 1.0],
            [58, 442, "#ef4444", 0.95],
            [46, 444, "#a78bfa", 1.05],
          ].map(([x, y, c, scale], i) => (
            <g key={i} transform={`scale(${scale}) translate(${x*(1-scale)},${y*(1-scale)})`}>
              <line x1={x} y1={y} x2={x} y2={y+13} stroke="#166534" strokeWidth="1.5"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 4.5}
                  cy={y + Math.sin(deg*Math.PI/180) * 4.5}
                  rx="3.2" ry="2.2" fill={c} opacity="0.9"
                  transform={`rotate(${deg} ${x+Math.cos(deg*Math.PI/180)*4.5} ${y+Math.sin(deg*Math.PI/180)*4.5})`}
                />
              ))}
              <circle cx={x} cy={y} r="2.6" fill="#fef9c3" opacity="0.95"/>
            </g>
          ))}

          {/* Garden flowers right */}
          {[
            [334, 428, "#8b5cf6", 1.0],
            [346, 435, "#ec4899", 1.1],
            [328, 440, "#3b82f6", 0.95],
            [356, 431, "#f59e0b", 1.0],
            [340, 444, "#ef4444", 0.9],
          ].map(([x, y, c, scale], i) => (
            <g key={i} transform={`scale(${scale}) translate(${x*(1-scale)},${y*(1-scale)})`}>
              <line x1={x} y1={y} x2={x} y2={y+13} stroke="#166534" strokeWidth="1.5"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 4.5}
                  cy={y + Math.sin(deg*Math.PI/180) * 4.5}
                  rx="3.2" ry="2.2" fill={c} opacity="0.9"
                  transform={`rotate(${deg} ${x+Math.cos(deg*Math.PI/180)*4.5} ${y+Math.sin(deg*Math.PI/180)*4.5})`}
                />
              ))}
              <circle cx={x} cy={y} r="2.6" fill="#fef9c3" opacity="0.95"/>
            </g>
          ))}

          {/* Grass blade pattern — full width, edge to edge */}
          {Array.from({length: 68}, (_, i) => {
            const x = -10 + i * 6.5;
            const h = 7 + (i % 5) * 2.8;
            const lean = (i % 4 - 1.5) * 2.8;
            const bright = i % 3 === 0 ? 0.9 : 0.65;
            return (
              <line key={i} x1={x} y1={538} x2={x+lean} y2={538-h}
                stroke={i % 4 === 0 ? "#22c55e" : "#15803d"}
                strokeWidth="1.6" strokeLinecap="round" opacity={bright}/>
            );
          })}
          {/* Second grass layer — back row, shorter, darker */}
          {Array.from({length: 54}, (_, i) => {
            const x = -5 + i * 8.0;
            const h = 4 + (i % 4) * 2;
            return (
              <line key={i} x1={x} y1={450} x2={x+(i%3-1)*2} y2={450-h}
                stroke="#166534" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
            );
          })}

          {/* ══════════════════════════════════════════════════════════════
              STREET LAMPS — flanking driveway on road
          ══════════════════════════════════════════════════════════════ */}

          {/* Left lamp */}
          <g>
            {/* Light cone on road */}
            <polygon points="112,510 128,510 148,560 92,560" fill="rgba(253,230,138,0.06)" filter="url(#lampGlow)"/>
            <polygon points="112,510 128,510 140,540 100,540" fill="rgba(253,230,138,0.05)"/>
            {/* Post */}
            <rect x="117" y="492" width="6" height="52" rx="3" fill="#1e293b"/>
            <rect x="118" y="492" width="2" height="52" fill="#0f172a" opacity="0.4"/>
            {/* Arm */}
            <path d="M120,494 Q128,484 136,486" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            {/* Lamp head */}
            <rect x="128" y="481" width="16" height="9" rx="3" fill="#1e293b"/>
            {/* Bulb */}
            <ellipse cx="136" cy="490" rx="6" ry="5" fill="#fde68a" opacity="0.95" filter="url(#medGlow)"/>
            {/* Halo */}
            <ellipse cx="136" cy="490" rx="22" ry="28" fill="#fde68a" opacity="0.08" filter="url(#softGlow)"/>
            {/* Base */}
            <rect x="113" y="540" width="12" height="5" rx="2" fill="#1e293b"/>
          </g>

          {/* Right lamp */}
          <g>
            <polygon points="272,510 288,510 308,560 252,560" fill="rgba(253,230,138,0.06)" filter="url(#lampGlow)"/>
            <polygon points="272,510 288,510 300,540 260,540" fill="rgba(253,230,138,0.05)"/>
            <rect x="277" y="492" width="6" height="52" rx="3" fill="#1e293b"/>
            <rect x="278" y="492" width="2" height="52" fill="#0f172a" opacity="0.4"/>
            <path d="M280,494 Q272,484 264,486" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <rect x="256" y="481" width="16" height="9" rx="3" fill="#1e293b"/>
            <ellipse cx="264" cy="490" rx="6" ry="5" fill="#fde68a" opacity="0.95" filter="url(#medGlow)"/>
            <ellipse cx="264" cy="490" rx="22" ry="28" fill="#fde68a" opacity="0.08" filter="url(#softGlow)"/>
            <rect x="275" y="540" width="12" height="5" rx="2" fill="#1e293b"/>
          </g>

          {/* ══════════════════════════════════════════════════════════════
              FAMILY CAR — bigger, shinier
          ══════════════════════════════════════════════════════════════ */}
          <g>
            {/* Shadow */}
            <ellipse cx="194" cy="528" rx="72" ry="7" fill="rgba(0,0,0,0.5)"/>
            {/* Body */}
            <rect x="126" y="504" width="136" height="26" rx="10" fill="url(#carGrad)"/>
            {/* Cabin */}
            <path d="M148,504 L158,478 L230,478 L240,504 Z" fill={carColor} opacity="0.92"/>
            {/* Cabin roof */}
            <path d="M155,502 L164,482 L224,482 L233,502 Z" fill={carColor + "dd"}/>
            {/* Windows */}
            <path d="M160,500 L168,485 L196,485 L196,500 Z" fill="#0d1828" opacity="0.88"/>
            <path d="M196,500 L196,485 L220,485 L228,500 Z" fill="#0d1828" opacity="0.88"/>
            {/* Window frame */}
            <path d="M159,501 L167,484 L228,484 L237,501" fill="none" stroke={carColor + "aa"} strokeWidth="1.2"/>
            {/* Reflection on car body */}
            <rect x="128" y="506" width="132" height="10" rx="8" fill="url(#carReflect)"/>
            {/* Windshield glint */}
            <path d="M163,498 L169,488 L178,488 L172,498 Z" fill="white" opacity="0.12"/>
            {/* Wheels */}
            {[153, 235].map((cx, i) => (
              <g key={i}>
                <circle cx={cx} cy={528} r="15" fill="#0f1520"/>
                <circle cx={cx} cy={528} r="11" fill="#1a2235"/>
                <circle cx={cx} cy={528} r="5.5" fill="#2d3748"/>
                {[0, 72, 144, 216, 288].map(deg => (
                  <line key={deg}
                    x1={cx + Math.cos(deg*Math.PI/180) * 5.5} y1={528 + Math.sin(deg*Math.PI/180) * 5.5}
                    x2={cx + Math.cos(deg*Math.PI/180) * 10} y2={528 + Math.sin(deg*Math.PI/180) * 10}
                    stroke="#4b5563" strokeWidth="2"/>
                ))}
                {/* Rim shine */}
                <arc/>
                <ellipse cx={cx-3} cy={524} rx="3" ry="2" fill="white" opacity="0.08"/>
              </g>
            ))}
            {/* Headlights */}
            <rect x="126" y="510" width="13" height="8" rx="3" fill="#fffde7" opacity="0.92"/>
            <ellipse cx="129" cy="514" rx="28" ry="13" fill="url(#headlight)"/>
            {/* Tail lights */}
            <rect x="249" y="510" width="13" height="8" rx="3" fill="#ef4444" opacity="0.8"/>
            <rect x="251" y="511" width="9" height="6" rx="2" fill="#fca5a5" opacity="0.5"/>
            {/* Door line */}
            <line x1="194" y1="505" x2="194" y2="527" stroke="white" strokeWidth="0.6" opacity="0.12"/>
            {/* Door handles */}
            <rect x="177" y="513" width="10" height="3.5" rx="1.8" fill="#e2e8f0" opacity="0.35"/>
            <rect x="203" y="513" width="10" height="3.5" rx="1.8" fill="#e2e8f0" opacity="0.35"/>
          </g>

          {/* ══════════════════════════════════════════════════════════════
              PET EGG — right of driveway, in grass, 90×90px
          ══════════════════════════════════════════════════════════════ */}
          <motion.g
            style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "50% 100%" }}
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
            onClick={e => {
              e.stopPropagation();
              clearTimeout(petBubbleTimer.current);
              setPetBubble(true);
              petBubbleTimer.current = setTimeout(() => setPetBubble(false), 2800);
            }}
          >
            {/* Grass blades behind pet */}
            <line x1="285" y1="450" x2="282" y2="432" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="294" y1="449" x2="292" y2="433" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            <line x1="320" y1="450" x2="323" y2="434" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="312" y1="449" x2="315" y2="435" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            {/* Pet glow aura */}
            <ellipse cx="303" cy="442" rx="36" ry="28" fill="url(#petGlow)" filter="url(#softGlow)"/>
            {/* Shadow */}
            <ellipse cx="303" cy="455" rx="24" ry="6" fill="rgba(0,0,0,0.5)"/>
            {/* Egg body — 90px nominal = rx~21 ry~26 */}
            <ellipse cx="303" cy="434" rx="21" ry="26" fill="#fef3c7" stroke="#fcd34d" strokeWidth="2"/>
            {/* Egg highlights */}
            <ellipse cx="295" cy="420" rx="7" ry="10" fill="white" opacity="0.28"/>
            <ellipse cx="292" cy="418" rx="3" ry="4" fill="white" opacity="0.18"/>
            {/* Crack */}
            <path d="M300,418 L303,427 L299,433" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M309,417 L308,426" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
            {/* Eyes */}
            <circle cx="296" cy="432" r="3" fill="#1e1b4b"/>
            <circle cx="310" cy="432" r="3" fill="#1e1b4b"/>
            <circle cx="297" cy="431" r="1.1" fill="white"/>
            <circle cx="311" cy="431" r="1.1" fill="white"/>
            {/* Blush */}
            <ellipse cx="290" cy="437" rx="4.5" ry="2.8" fill="#fca5a5" opacity="0.55"/>
            <ellipse cx="316" cy="437" rx="4.5" ry="2.8" fill="#fca5a5" opacity="0.55"/>
            {/* Grass blades in front of pet */}
            <line x1="286" y1="457" x2="283" y2="442" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
            <line x1="320" y1="457" x2="323" y2="443" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
          </motion.g>

          {/* ══════════════════════════════════════════════════════════════
              WELCOME TEXT — upper sky
          ══════════════════════════════════════════════════════════════ */}
          <motion.g
            style={{ pointerEvents: "none" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: zooming ? 0 : 1, y: zooming ? -8 : 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Subtle glow behind text */}
            <ellipse cx="200" cy="114" rx="120" ry="38" fill="rgba(88,28,235,0.08)" filter="url(#softGlow)"/>
            <text x="200" y="100" textAnchor="middle" fontSize="11" fontWeight="400"
              fill="rgba(196,181,253,0.65)"
              style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "3.5px" }}>
              WELCOME TO
            </text>
            <text x="200" y="140" textAnchor="middle" fontSize="38" fontWeight="700"
              fill="rgba(255,255,255,0.97)"
              style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "-1px" }}>
              {rawName} HQ
            </text>
          </motion.g>

          {/* ── Tap target — door ── */}
          <rect x="160" y="372" width="80" height="90" fill="transparent" style={{ cursor: "pointer" }}/>
        </svg>

        {/* ── Fireflies ── */}
        {FIREFLIES.map(f => (
          <motion.div
            key={f.id}
            style={{
              position: "absolute",
              left: `${f.x}%`, top: `${f.y}%`,
              width: 5, height: 5, borderRadius: "50%",
              background: "#a3e635",
              boxShadow: "0 0 8px 3px rgba(163,230,53,0.7)",
              pointerEvents: "none",
            }}
            animate={{
              x: [0, 14, -10, 18, 0],
              y: [0, -12, 9, -6, 0],
              opacity: [0, 1.0, 0.45, 0.85, 0],
            }}
            transition={{ duration: 4.0, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
          />
        ))}

        {/* ── Pet speech bubble ── */}
        <AnimatePresence>
          {petBubble && (
            <motion.div
              key="petbubble"
              initial={{ opacity: 0, y: 8, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              style={{
                position: "absolute",
                left: "calc(75% - 90px)",
                top: "calc(72% - 64px)",
                zIndex: 6,
                pointerEvents: "none",
              }}
            >
              <div style={{
                background: "rgba(20,20,48,0.95)",
                border: "1px solid rgba(167,139,250,0.5)",
                borderRadius: 14,
                padding: "9px 14px",
                color: "rgba(255,255,255,0.95)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                whiteSpace: "nowrap",
                boxShadow: "0 0 16px rgba(139,92,246,0.3)",
              }}>
                {petGreeting.current}
              </div>
              <div style={{
                position: "absolute", bottom: -8, left: 20,
                width: 0, height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid rgba(20,20,48,0.95)",
              }}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tap hint ── */}
        <AnimatePresence>
          {hintVisible && !zooming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                position: "absolute", bottom: 36, left: 0, right: 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                pointerEvents: "none", zIndex: 10,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.14, 1] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: 24 }}
              >🚪</motion.div>
              <div style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: 999,
                padding: "8px 22px",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.04em",
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
