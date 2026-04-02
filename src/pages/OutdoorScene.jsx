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
        style={{
          position: "absolute", inset: 0, transformOrigin: "50% 52%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        animate={zooming ? { scale: 4, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={zooming
          ? { duration: 1.0, ease: [0.4, 0, 0.8, 1] }
          : { duration: 0 }
        }
        onAnimationComplete={() => { if (zooming) navigate("/home"); }}
      >
        {/*
          SVG viewBox is 400×600.
          Sky area (y=0–130): welcome text lives here.
          House rooftop at y=230, chimney top at y=236.
          Ground/lawn at y=450, street at y=556.
          preserveAspectRatio="meet" = full scene always visible, never cropped.
        */}
        <svg
          viewBox="0 0 400 600"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxWidth: "520px",   /* desktop: cap width so scene isn't enormous */
            maxHeight: "100vh",
          }}
          preserveAspectRatio="xMidYMid meet"
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

          {/* ── Background fill ── */}
          <rect x="0" y="0" width="400" height="600" fill="transparent"/>

          {/* ── Welcome text in sky (y=0–130, rooftop at y=230) ── */}
          <motion.g
            style={{ pointerEvents: "none" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: zooming ? 0 : 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glow behind text */}
            <ellipse cx="200" cy="72" rx="110" ry="38"
              fill="rgba(109,40,217,0.13)" filter="url(#winGlow)"/>
            <text x="200" y="60" textAnchor="middle" fontSize="12" fontWeight="400"
              fill="rgba(196,181,253,0.75)"
              style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "2px" }}>
              WELCOME TO
            </text>
            <text x="200" y="95" textAnchor="middle" fontSize="30" fontWeight="700"
              fill="rgba(255,255,255,0.97)"
              style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "-0.5px" }}>
              {rawName} HQ
            </text>
          </motion.g>

          {/* ── Distant city silhouette (shifted +80) ── */}
          {[
            [20,360,18,40],[55,348,14,50],[80,352,20,44],[112,344,12,52],[138,348,16,48],
            [310,350,14,46],[338,344,18,42],[362,352,12,50],[385,348,16,44],
          ].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#080c1a"/>
          ))}
          {/* Tiny windows on buildings */}
          {[[28,364],[58,352],[85,358],[118,350],[143,352],[315,354],[342,348],[366,358],[390,352]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="2.5" height="2" rx="0.5"
              fill="#fde68a" opacity={0.4 + (i % 3) * 0.15}/>
          ))}

          {/* ── Ground / lawn (shifted +80) ── */}
          <rect x="0" y="450" width="400" height="150" fill="url(#grassGrad)"/>
          {Array.from({length:10},(_,i)=>(
            <rect key={i} x={i*40} y="450" width="20" height="150" fill="#052e16" opacity="0.12"/>
          ))}

          {/* ── Sidewalk / street (shifted +80) ── */}
          <rect x="0" y="556" width="400" height="44" fill="#1e2130"/>
          <rect x="0" y="556" width="400" height="2" fill="#2d3354" opacity="0.8"/>
          {Array.from({length:8},(_,i)=>(
            <rect key={i} x={16+i*52} y="574" width="32" height="4" rx="2" fill="#f59e0b" opacity="0.25"/>
          ))}

          {/* ── Driveway (shifted +80) ── */}
          <polygon points="145,556 255,556 235,455 165,455" fill="#1c2035"/>
          <line x1="165" y1="455" x2="145" y2="556" stroke="#252a45" strokeWidth="1"/>
          <line x1="235" y1="455" x2="255" y2="556" stroke="#252a45" strokeWidth="1"/>
          {[475,495,515,535].map((y,i)=>(
            <line key={i} x1={146+i*1.5} y1={y} x2={254-i*1.5} y2={y}
              stroke="#252a45" strokeWidth="0.8" opacity="0.6"/>
          ))}

          {/* ── Front path (shifted +80) ── */}
          <polygon points="180,450 220,450 225,480 175,480" fill="#1e243a"/>
          <polygon points="183,450 217,450 222,478 178,478" fill="#232947" opacity="0.6"/>
          {[[196,453,8,5],[194,461,12,5],[192,469,16,5]].map(([x,y,w,h],i)=>(
            <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#2a3150" opacity="0.8"/>
          ))}

          {/* ── HOUSE facade (shifted +80) ── */}
          <rect x="100" y="300" width="200" height="155" fill="#111827"/>
          <rect x="100" y="300" width="200" height="155" fill="#0d1120" opacity="0.4"/>
          <rect x="96" y="450" width="208" height="8" rx="2" fill="#0a0e1a"/>

          {/* Roof (shifted +80) */}
          <polygon points="88,302 200,230 312,302" fill="#1a1d3a"/>
          <polygon points="88,302 200,230 200,302" fill="#13162e"/>
          <line x1="200" y1="230" x2="200" y2="302" stroke="#4338ca" strokeWidth="1" opacity="0.5"/>
          <polygon points="82,302 318,302 313,312 87,312" fill="#111827"/>
          <line x1="82" y1="302" x2="318" y2="302" stroke="#312e81" strokeWidth="1.2"/>

          {/* Chimney (shifted +80) */}
          <rect x="152" y="238" width="16" height="42" rx="1" fill="#1e1b4b" stroke="#3730a3" strokeWidth="0.8"/>
          <rect x="149" y="236" width="22" height="5" rx="1" fill="#2d2a6e"/>

          {/* ── Windows (shifted +80) ── */}
          {[118,188,258].map((x,i)=>(
            <g key={i}>
              <rect x={x-6} y={322} width={46} height={30} fill="url(#winSpread)" opacity="0.7"/>
              <rect x={x} y={318} width={34} height={26} rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="0.8"/>
              <rect x={x+2} y={320} width={30} height={22} rx="2" fill="#fde68a" opacity="0.18" filter="url(#winGlow)"/>
              <rect x={x+2} y={320} width={30} height={22} rx="2" fill="#fbbf24" opacity="0.09"/>
              <line x1={x+17} y1={320} x2={x+17} y2={342} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
              <line x1={x} y1={331} x2={x+34} y2={331} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
              <rect x={x+2} y={320} width={7} height={22} rx="1" fill="#7c3aed" opacity="0.15"/>
              <rect x={x+21} y={320} width={9} height={22} rx="1" fill="#7c3aed" opacity="0.15"/>
            </g>
          ))}
          {[118,258].map((x,i)=>(
            <g key={i}>
              <rect x={x-4} y={373} width={42} height={28} fill="url(#winSpread)" opacity="0.6"/>
              <rect x={x} y={377} width={34} height={24} rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="0.8"/>
              <rect x={x+2} y={379} width={30} height={20} rx="2" fill="#fde68a" opacity="0.16" filter="url(#winGlow)"/>
              <line x1={x+17} y1={379} x2={x+17} y2={399} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
              <line x1={x} y1={389} x2={x+34} y2={389} stroke="#4338ca" strokeWidth="0.7" opacity="0.5"/>
            </g>
          ))}

          {/* ── Front door (shifted +80) ── */}
          <g>
            <rect x="166" y="400" width="68" height="60" fill="url(#doorSpread)" opacity="0.9"/>
            <rect x="172" y="388" width="56" height="65" rx="2"
              fill={doorGlow ? "#f97316" : "#4338ca"} opacity="0.25" filter="url(#doorGlowF)"/>
            <rect x="176" y="392" width="48" height="62" rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="1.2"/>
            <path d="M176,406 Q200,388 224,406" fill="none" stroke="#4338ca" strokeWidth="0.9" opacity="0.7"/>
            <rect x="180" y="410" width="18" height="20" rx="2" fill="#151c33"/>
            <rect x="202" y="410" width="18" height="20" rx="2" fill="#151c33"/>
            <rect x="180" y="435" width="18" height="14" rx="2" fill="#151c33"/>
            <rect x="202" y="435" width="18" height="14" rx="2" fill="#151c33"/>
            <rect x="184" y="396" width="32" height="10" rx="3"
              fill="#fde68a" opacity={doorGlow ? 0.45 : 0.22} filter="url(#winGlow)"/>
            <circle cx="218" cy="424" r="3" fill={doorGlow ? "#fbbf24" : "#6d28d9"}/>
            <circle cx="218" cy="424" r="1.5" fill={doorGlow ? "#fef3c7" : "#8b5cf6"} opacity="0.8"/>
            <rect x="168" y="453" width="64" height="6" rx="2" fill="#1e243a"/>
            <rect x="164" y="457" width="72" height="4" rx="1" fill="#191f36"/>
          </g>

          {/* ── Porch light (shifted +80) ── */}
          <circle cx="200" cy="388" r="4" fill="#fde68a" opacity="0.9" filter="url(#winGlow)"/>
          <rect x="197" y="385" width="6" height="3" rx="1" fill="#374151"/>
          <polygon points="196,392 204,392 210,408 190,408" fill="#fde68a" opacity="0.06"/>

          {/* ── House number (shifted +80) ── */}
          <rect x="190" y="375" width="20" height="10" rx="2" fill="#1e243a"/>
          <text x="200" y="383" textAnchor="middle" fontSize="6" fontWeight="700"
            fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>HQ</text>

          {/* ── Wall details (shifted +80) ── */}
          <line x1="100" y1="310" x2="100" y2="450" stroke="#1e293b" strokeWidth="1" opacity="0.5"/>
          <line x1="300" y1="310" x2="300" y2="450" stroke="#1e293b" strokeWidth="1" opacity="0.5"/>

          {/* ── TREE (shifted +80) ── */}
          <g>
            <rect x="44" y="410" width="12" height="48" rx="4" fill="#292524"/>
            <rect x="48" y="410" width="4" height="48" fill="#1c1917" opacity="0.5"/>
            <path d="M44,455 Q36,460 30,458" stroke="#292524" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M56,456 Q64,462 70,459" stroke="#292524" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <ellipse cx="50" cy="398" rx="28" ry="20" fill="url(#foliage)"/>
            <ellipse cx="50" cy="385" rx="22" ry="18" fill="#166534"/>
            <ellipse cx="50" cy="373" rx="16" ry="14" fill="#15803d"/>
            <ellipse cx="47" cy="362" rx="11" ry="10" fill="#16a34a"/>
            <ellipse cx="44" cy="375" rx="6" ry="5" fill="#22c55e" opacity="0.18"/>
            <ellipse cx="54" cy="382" rx="5" ry="4" fill="#22c55e" opacity="0.14"/>
          </g>

          {/* ── MAILBOX (shifted +80) ── */}
          <g>
            <rect x="334" y="435" width="4" height="24" rx="1" fill="#374151"/>
            <rect x="322" y="423" width="28" height="16" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <path d="M322,430 Q336,422 350,430" fill="#253347" stroke="#334155" strokeWidth="0.8"/>
            <rect x="349" y="424" width="2" height="10" fill="#dc2626"/>
            <rect x="350" y="424" width="7" height="5" rx="1" fill="#dc2626"/>
            <text x="336" y="435" textAnchor="middle" fontSize="4" fontWeight="700"
              fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>
              {rawName.length > 8 ? rawName.slice(0,7)+"." : rawName}
            </text>
          </g>

          {/* ── Garden flowers left (shifted +80) ── */}
          {[
            [72,438,"#ec4899"],[80,445,"#f59e0b"],[65,448,"#8b5cf6"],
            [88,440,"#10b981"],[76,452,"#ef4444"],
          ].map(([x,y,c],i)=>(
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y+10} stroke="#166534" strokeWidth="1.2"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 3.5}
                  cy={y + Math.sin(deg*Math.PI/180) * 3.5}
                  rx="2.5" ry="1.8" fill={c} opacity="0.85"
                  transform={`rotate(${deg} ${x+Math.cos(deg*Math.PI/180)*3.5} ${y+Math.sin(deg*Math.PI/180)*3.5})`}
                />
              ))}
              <circle cx={x} cy={y} r="2" fill="#fde68a" opacity="0.9"/>
            </g>
          ))}

          {/* Garden flowers right (shifted +80) */}
          {[
            [315,440,"#8b5cf6"],[325,448,"#ec4899"],[308,452,"#3b82f6"],
          ].map(([x,y,c],i)=>(
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y+10} stroke="#166534" strokeWidth="1.2"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 3.5}
                  cy={y + Math.sin(deg*Math.PI/180) * 3.5}
                  rx="2.5" ry="1.8" fill={c} opacity="0.85"
                  transform={`rotate(${deg} ${x+Math.cos(deg*Math.PI/180)*3.5} ${y+Math.sin(deg*Math.PI/180)*3.5})`}
                />
              ))}
              <circle cx={x} cy={y} r="2" fill="#fde68a" opacity="0.9"/>
            </g>
          ))}

          {/* ── Grass blades (shifted +80) ── */}
          {Array.from({length:28},(_,i)=>{
            const x = 5 + i * 14.5;
            const h = 6 + (i%4)*3;
            const lean = (i%3-1)*3;
            return (
              <line key={i} x1={x} y1={550} x2={x+lean} y2={550-h}
                stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            );
          })}

          {/* ── Hedge (shifted +80) ── */}
          {[
            [100,442,34,14],[255,442,45,14],
          ].map(([x,y,w,h],i)=>(
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="7" fill="#14532d"/>
              <ellipse cx={x+8} cy={y+4} rx="7" ry="5" fill="#166534"/>
              <ellipse cx={x+w/2} cy={y+3} rx="8" ry="6" fill="#15803d"/>
              <ellipse cx={x+w-8} cy={y+4} rx="6" ry="5" fill="#166534"/>
            </g>
          ))}

          {/* ── Pet egg — right of driveway, in grass (shifted +80) ── */}
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
            <line x1="262" y1="456" x2="258" y2="438" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="270" y1="455" x2="268" y2="440" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            <line x1="296" y1="456" x2="300" y2="440" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="288" y1="455" x2="291" y2="441" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            {/* Glow beneath egg */}
            <ellipse cx="279" cy="455" rx="20" ry="6" fill="rgba(139,92,246,0.20)" filter="url(#winGlow)"/>
            {/* Shadow */}
            <ellipse cx="279" cy="458" rx="18" ry="5" fill="rgba(0,0,0,0.4)"/>
            {/* Egg body — large (rx16, ry19 = ~80px at full scale) */}
            <ellipse cx="279" cy="438" rx="16" ry="20" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5"/>
            {/* Egg shine */}
            <ellipse cx="273" cy="428" rx="5" ry="7" fill="white" opacity="0.22"/>
            {/* Egg crack */}
            <path d="M275,423 L278,430 L274,435" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            <path d="M283,422 L282,428" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            {/* Eyes peeking */}
            <circle cx="273" cy="436" r="2.2" fill="#1e1b4b"/>
            <circle cx="285" cy="436" r="2.2" fill="#1e1b4b"/>
            <circle cx="273.7" cy="435.2" r="0.8" fill="white"/>
            <circle cx="285.7" cy="435.2" r="0.8" fill="white"/>
            {/* Cheek blush */}
            <ellipse cx="269" cy="439" rx="3" ry="2" fill="#fca5a5" opacity="0.5"/>
            <ellipse cx="289" cy="439" rx="3" ry="2" fill="#fca5a5" opacity="0.5"/>
            {/* Grass blades in front */}
            <line x1="263" y1="460" x2="260" y2="447" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
            <line x1="295" y1="460" x2="298" y2="447" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
          </motion.g>

          {/* ── FAMILY CAR (shifted +80) ── */}
          <g>
            <ellipse cx="192" cy="542" rx="58" ry="6" fill="rgba(0,0,0,0.4)"/>
            <rect x="134" y="520" width="116" height="24" rx="8" fill="url(#carGrad)"/>
            <path d="M152,520 L160,498 L224,498 L232,520 Z" fill={carColor} opacity="0.9"/>
            <path d="M158,518 L164,502 L220,502 L226,518 Z" fill={carRoofColor}/>
            <path d="M162,518 L168,504 L200,504 L200,518 Z" fill="#0d1520" opacity="0.85"/>
            <path d="M200,518 L200,504 L216,504 L222,518 Z" fill="#0d1520" opacity="0.85"/>
            <path d="M165,516 L170,506 L178,506 L174,516 Z" fill="white" opacity="0.08"/>
            <circle cx="158" cy="543" r="12" fill="#111827"/>
            <circle cx="158" cy="543" r="8" fill="#1e293b"/>
            <circle cx="158" cy="543" r="4" fill="#374151"/>
            <circle cx="226" cy="543" r="12" fill="#111827"/>
            <circle cx="226" cy="543" r="8" fill="#1e293b"/>
            <circle cx="226" cy="543" r="4" fill="#374151"/>
            {[0,90,180,270].map(deg=>(
              <line key={deg}
                x1={158+Math.cos(deg*Math.PI/180)*4} y1={543+Math.sin(deg*Math.PI/180)*4}
                x2={158+Math.cos(deg*Math.PI/180)*7.5} y2={543+Math.sin(deg*Math.PI/180)*7.5}
                stroke="#4b5563" strokeWidth="1.5"/>
            ))}
            {[0,90,180,270].map(deg=>(
              <line key={deg}
                x1={226+Math.cos(deg*Math.PI/180)*4} y1={543+Math.sin(deg*Math.PI/180)*4}
                x2={226+Math.cos(deg*Math.PI/180)*7.5} y2={543+Math.sin(deg*Math.PI/180)*7.5}
                stroke="#4b5563" strokeWidth="1.5"/>
            ))}
            <rect x="134" y="527" width="10" height="6" rx="2" fill="#fef9c3" opacity="0.9"/>
            <rect x="240" y="527" width="10" height="6" rx="2" fill="#fef3c7" opacity="0.6"/>
            <ellipse cx="139" cy="530" rx="22" ry="10" fill="url(#headlight)"/>
            <rect x="240" y="527" width="8" height="5" rx="1.5" fill="#ef4444" opacity="0.7"/>
            <line x1="192" y1="521" x2="192" y2="542" stroke="white" strokeWidth="0.5" opacity="0.15"/>
            <rect x="178" y="529" width="8" height="3" rx="1.5" fill="#e2e8f0" opacity="0.3"/>
            <rect x="200" y="529" width="8" height="3" rx="1.5" fill="#e2e8f0" opacity="0.3"/>
            <rect x="165" y="498" width="54" height="2" rx="1" fill={carColor} opacity="0.4"/>
            {/* Family name on car side */}
            <text x="192" y="533" textAnchor="middle" fontSize="5.5" fontWeight="600"
              fill="rgba(255,255,255,0.35)" style={{ fontFamily: "system-ui,sans-serif" }}>
              {rawName}
            </text>
          </g>

          {/* ── Lamp post (shifted +80) ── */}
          <g>
            <rect x="355" y="402" width="5" height="55" rx="2" fill="#1e293b"/>
            <path d="M357,404 Q363,398 368,400" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <rect x="361" y="396" width="14" height="7" rx="2" fill="#1e293b"/>
            <ellipse cx="368" cy="403" rx="5" ry="4" fill="#fde68a" opacity="0.85" filter="url(#winGlow)"/>
            <polygon points="358,403 378,403 390,450 346,450" fill="#fde68a" opacity="0.04"/>
            <rect x="353" y="453" width="9" height="5" rx="2" fill="#1e293b"/>
          </g>

          {/* ── Chimney smoke (shifted +80) ── */}
          {[0,1,2].map(i=>(
            <motion.ellipse key={i}
              cx={160} cy={238 - i*10}
              rx={4 + i*2} ry={3 + i*1.5}
              fill="rgba(255,255,255,0)"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1"
              animate={{ cy: [238 - i*10, 220 - i*14], opacity: [0.35, 0], ry: [3+i*1.5, 5+i*2.5] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i*0.8, ease: "easeOut" }}
            />
          ))}

          {/* ── Tap target overlay (shifted +80) ── */}
          <rect x="160" y="375" width="80" height="90"
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
                // Pet is right of driveway ~x=279/400=70%, y=438/600=73%
                left: "calc(70% - 90px)",
                top: "calc(73% - 60px)",
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
