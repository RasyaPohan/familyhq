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
        style={{ position: "absolute", inset: 0, transformOrigin: "50% 52%" }}
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
          style={{ display: "block", position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}
          preserveAspectRatio="xMidYMax meet"
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

          {/*
            Layout (viewBox 0 0 400 600):
            Sky y=0–175  (29%)  — welcome text at y=130–162
            House y=175–450     — rooftop peak y=175, body y=275–450
            Garden y=450–530
            Street y=530–600
          */}

          {/* ── Distant city silhouette ── */}
          {[
            [20,310,18,40],[55,298,14,50],[80,302,20,44],[112,294,12,52],[138,298,16,48],
            [310,300,14,46],[338,294,18,42],[362,302,12,50],[385,298,16,44],
          ].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill="#080c1a"/>
          ))}
          {[[28,314],[58,302],[85,308],[118,300],[143,302],[315,304],[342,298],[366,308],[390,302]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="2.5" height="2" rx="0.5"
              fill="#fde68a" opacity={0.4 + (i % 3) * 0.15}/>
          ))}

          {/* ── Ground / lawn — wide fill ── */}
          <rect x="-400" y="450" width="1200" height="150" fill="url(#grassGrad)"/>
          {Array.from({length:10},(_,i)=>(
            <rect key={i} x={i*40} y="450" width="20" height="150" fill="#052e16" opacity="0.12"/>
          ))}

          {/* ── Street — flush at bottom, wide fill ── */}
          <rect x="-400" y="530" width="1200" height="70" fill="#1e2130"/>
          <rect x="-400" y="530" width="1200" height="2" fill="#2d3354" opacity="0.8"/>
          {/* Road dashes */}
          {Array.from({length:10},(_,i)=>(
            <rect key={i} x={-20+i*52} y="556" width="32" height="4" rx="2" fill="#f59e0b" opacity="0.25"/>
          ))}

          {/* ── Driveway ── */}
          <polygon points="140,530 260,530 238,450 162,450" fill="#1c2035"/>
          <line x1="162" y1="450" x2="140" y2="530" stroke="#252a45" strokeWidth="1"/>
          <line x1="238" y1="450" x2="260" y2="530" stroke="#252a45" strokeWidth="1"/>
          {[462,474,486,498,510,522].map((y,i)=>(
            <line key={i} x1={163+i*1.2} y1={y} x2={237-i*1.2} y2={y}
              stroke="#252a45" strokeWidth="0.8" opacity="0.6"/>
          ))}

          {/* ── Front path ── */}
          <polygon points="178,450 222,450 228,482 172,482" fill="#1e243a"/>
          <polygon points="181,450 219,450 224,480 176,480" fill="#232947" opacity="0.6"/>
          {[[196,453,8,5],[194,462,12,5],[191,471,18,5]].map(([x,y,w,h],i)=>(
            <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#2a3150" opacity="0.8"/>
          ))}

          {/* ── HOUSE — 25% larger (body x=75–325, y=275–450; roof peak y=175) ── */}
          {/* House body */}
          <rect x="75" y="275" width="250" height="178" fill="#111827"/>
          <rect x="75" y="275" width="250" height="178" fill="#0d1120" opacity="0.4"/>
          {/* Foundation */}
          <rect x="70" y="450" width="260" height="8" rx="2" fill="#0a0e1a"/>

          {/* Roof */}
          <polygon points="60,278 200,175 340,278" fill="#1a1d3a"/>
          <polygon points="60,278 200,175 200,278" fill="#13162e"/>
          <line x1="200" y1="175" x2="200" y2="278" stroke="#4338ca" strokeWidth="1.2" opacity="0.5"/>
          {/* Eaves */}
          <polygon points="54,278 346,278 340,290 60,290" fill="#111827"/>
          <line x1="54" y1="278" x2="346" y2="278" stroke="#312e81" strokeWidth="1.5"/>

          {/* Chimney */}
          <rect x="150" y="184" width="20" height="52" rx="1" fill="#1e1b4b" stroke="#3730a3" strokeWidth="0.8"/>
          <rect x="146" y="182" width="28" height="6" rx="1" fill="#2d2a6e"/>

          {/* ── Windows — scaled up ── */}
          {/* Top row: 3 windows */}
          {[90,175,260].map((x,i)=>(
            <g key={i}>
              <rect x={x-6} y={298} width={52} height={34} fill="url(#winSpread)" opacity="0.7"/>
              <rect x={x} y={294} width={40} height={30} rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="0.9"/>
              <rect x={x+2} y={296} width={36} height={26} rx="2" fill="#fde68a" opacity="0.18" filter="url(#winGlow)"/>
              <rect x={x+2} y={296} width={36} height={26} rx="2" fill="#fbbf24" opacity="0.09"/>
              <line x1={x+20} y1={296} x2={x+20} y2={322} stroke="#4338ca" strokeWidth="0.8" opacity="0.5"/>
              <line x1={x} y1={309} x2={x+40} y2={309} stroke="#4338ca" strokeWidth="0.8" opacity="0.5"/>
              <rect x={x+2} y={296} width={8} height={26} rx="1" fill="#7c3aed" opacity="0.15"/>
              <rect x={x+26} y={296} width={10} height={26} rx="1" fill="#7c3aed" opacity="0.15"/>
            </g>
          ))}
          {/* Bottom row: 2 side windows */}
          {[90,260].map((x,i)=>(
            <g key={i}>
              <rect x={x-4} y={353} width={48} height={32} fill="url(#winSpread)" opacity="0.6"/>
              <rect x={x} y={357} width={40} height={28} rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="0.9"/>
              <rect x={x+2} y={359} width={36} height={24} rx="2" fill="#fde68a" opacity="0.16" filter="url(#winGlow)"/>
              <line x1={x+20} y1={359} x2={x+20} y2={383} stroke="#4338ca" strokeWidth="0.8" opacity="0.5"/>
              <line x1={x} y1={371} x2={x+40} y2={371} stroke="#4338ca" strokeWidth="0.8" opacity="0.5"/>
            </g>
          ))}

          {/* ── Front door ── */}
          <g>
            <rect x="162" y="400" width="76" height="60" fill="url(#doorSpread)" opacity="0.9"/>
            <rect x="168" y="386" width="64" height="68" rx="2"
              fill={doorGlow ? "#f97316" : "#4338ca"} opacity="0.25" filter="url(#doorGlowF)"/>
            <rect x="172" y="390" width="56" height="65" rx="3" fill="#0d1120" stroke="#4338ca" strokeWidth="1.4"/>
            <path d="M172,406 Q200,386 228,406" fill="none" stroke="#4338ca" strokeWidth="1" opacity="0.7"/>
            <rect x="177" y="412" width="20" height="22" rx="2" fill="#151c33"/>
            <rect x="203" y="412" width="20" height="22" rx="2" fill="#151c33"/>
            <rect x="177" y="439" width="20" height="14" rx="2" fill="#151c33"/>
            <rect x="203" y="439" width="20" height="14" rx="2" fill="#151c33"/>
            <rect x="180" y="394" width="40" height="11" rx="3"
              fill="#fde68a" opacity={doorGlow ? 0.45 : 0.22} filter="url(#winGlow)"/>
            <circle cx="222" cy="428" r="3.5" fill={doorGlow ? "#fbbf24" : "#6d28d9"}/>
            <circle cx="222" cy="428" r="1.8" fill={doorGlow ? "#fef3c7" : "#8b5cf6"} opacity="0.8"/>
            <rect x="164" y="452" width="72" height="6" rx="2" fill="#1e243a"/>
            <rect x="160" y="456" width="80" height="4" rx="1" fill="#191f36"/>
          </g>

          {/* ── Porch light ── */}
          <circle cx="200" cy="386" r="5" fill="#fde68a" opacity="0.9" filter="url(#winGlow)"/>
          <rect x="197" y="382" width="6" height="4" rx="1" fill="#374151"/>
          <polygon points="194,392 206,392 214,412 186,412" fill="#fde68a" opacity="0.06"/>

          {/* ── House number ── */}
          <rect x="188" y="370" width="24" height="12" rx="2" fill="#1e243a"/>
          <text x="200" y="379" textAnchor="middle" fontSize="7" fontWeight="700"
            fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>HQ</text>

          {/* ── Wall details ── */}
          <line x1="75" y1="285" x2="75" y2="450" stroke="#1e293b" strokeWidth="1" opacity="0.5"/>
          <line x1="325" y1="285" x2="325" y2="450" stroke="#1e293b" strokeWidth="1" opacity="0.5"/>

          {/* ── TREE (left side) ── */}
          <g>
            <rect x="28" y="400" width="14" height="58" rx="4" fill="#292524"/>
            <rect x="32" y="400" width="5" height="58" fill="#1c1917" opacity="0.5"/>
            <path d="M28,450 Q18,456 10,453" stroke="#292524" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M42,452 Q52,458 60,455" stroke="#292524" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <ellipse cx="35" cy="386" rx="30" ry="22" fill="url(#foliage)"/>
            <ellipse cx="35" cy="371" rx="24" ry="20" fill="#166534"/>
            <ellipse cx="35" cy="358" rx="18" ry="16" fill="#15803d"/>
            <ellipse cx="32" cy="344" rx="13" ry="12" fill="#16a34a"/>
            <ellipse cx="28" cy="360" rx="7" ry="6" fill="#22c55e" opacity="0.18"/>
            <ellipse cx="40" cy="367" rx="6" ry="5" fill="#22c55e" opacity="0.14"/>
          </g>

          {/* ── MAILBOX (right side) ── */}
          <g>
            <rect x="342" y="432" width="5" height="26" rx="1" fill="#374151"/>
            <rect x="328" y="419" width="32" height="18" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1"/>
            <path d="M328,428 Q344,419 360,428" fill="#253347" stroke="#334155" strokeWidth="0.9"/>
            <rect x="359" y="420" width="2" height="12" fill="#dc2626"/>
            <rect x="360" y="420" width="8" height="6" rx="1" fill="#dc2626"/>
            <text x="344" y="432" textAnchor="middle" fontSize="4.5" fontWeight="700"
              fill="#94a3b8" style={{ fontFamily: "system-ui,sans-serif" }}>
              {rawName.length > 8 ? rawName.slice(0,7)+"." : rawName}
            </text>
          </g>

          {/* ── Garden flowers left ── */}
          {[
            [62,432,"#ec4899"],[72,439,"#f59e0b"],[54,442,"#8b5cf6"],
            [82,434,"#10b981"],[68,446,"#ef4444"],
          ].map(([x,y,c],i)=>(
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y+11} stroke="#166534" strokeWidth="1.4"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 4}
                  cy={y + Math.sin(deg*Math.PI/180) * 4}
                  rx="2.8" ry="2" fill={c} opacity="0.85"
                  transform={`rotate(${deg} ${x+Math.cos(deg*Math.PI/180)*4} ${y+Math.sin(deg*Math.PI/180)*4})`}
                />
              ))}
              <circle cx={x} cy={y} r="2.2" fill="#fde68a" opacity="0.9"/>
            </g>
          ))}

          {/* Garden flowers right */}
          {[
            [318,432,"#8b5cf6"],[330,440,"#ec4899"],[310,444,"#3b82f6"],
          ].map(([x,y,c],i)=>(
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y+11} stroke="#166534" strokeWidth="1.4"/>
              {[0,60,120,180,240,300].map(deg=>(
                <ellipse key={deg}
                  cx={x + Math.cos(deg*Math.PI/180) * 4}
                  cy={y + Math.sin(deg*Math.PI/180) * 4}
                  rx="2.8" ry="2" fill={c} opacity="0.85"
                  transform={`rotate(${deg} ${x+Math.cos(deg*Math.PI/180)*4} ${y+Math.sin(deg*Math.PI/180)*4})`}
                />
              ))}
              <circle cx={x} cy={y} r="2.2" fill="#fde68a" opacity="0.9"/>
            </g>
          ))}

          {/* ── Grass blades — full width ── */}
          {Array.from({length:56},(_,i)=>{
            const x = -5 + i * 7.5;
            const h = 6 + (i%4)*3;
            const lean = (i%3-1)*3;
            return (
              <line key={i} x1={x} y1={528} x2={x+lean} y2={528-h}
                stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            );
          })}

          {/* ── Hedge along house base ── */}
          {[
            [75,442,40,14],[285,442,50,14],
          ].map(([x,y,w,h],i)=>(
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="7" fill="#14532d"/>
              <ellipse cx={x+9} cy={y+4} rx="8" ry="5" fill="#166534"/>
              <ellipse cx={x+w/2} cy={y+3} rx="9" ry="6" fill="#15803d"/>
              <ellipse cx={x+w-9} cy={y+4} rx="7" ry="5" fill="#166534"/>
            </g>
          ))}

          {/* ── Pet egg — right of driveway, in grass ── */}
          <motion.g
            style={{ cursor: "pointer", transformBox: "fill-box", transformOrigin: "50% 100%" }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            onClick={e => {
              e.stopPropagation();
              clearTimeout(petBubbleTimer.current);
              setPetBubble(true);
              petBubbleTimer.current = setTimeout(() => setPetBubble(false), 2500);
            }}
          >
            <line x1="270" y1="452" x2="266" y2="433" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="279" y1="451" x2="277" y2="435" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            <line x1="306" y1="452" x2="310" y2="435" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="298" y1="451" x2="301" y2="436" stroke="#166534" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            <ellipse cx="288" cy="451" rx="22" ry="6" fill="rgba(139,92,246,0.20)" filter="url(#winGlow)"/>
            <ellipse cx="288" cy="454" rx="19" ry="5" fill="rgba(0,0,0,0.4)"/>
            <ellipse cx="288" cy="433" rx="18" ry="22" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5"/>
            <ellipse cx="281" cy="422" rx="6" ry="8" fill="white" opacity="0.22"/>
            <path d="M284,417 L287,425 L283,430" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
            <path d="M293,416 L292,423" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
            <circle cx="281" cy="431" r="2.5" fill="#1e1b4b"/>
            <circle cx="295" cy="431" r="2.5" fill="#1e1b4b"/>
            <circle cx="281.8" cy="430.1" r="0.9" fill="white"/>
            <circle cx="295.8" cy="430.1" r="0.9" fill="white"/>
            <ellipse cx="276" cy="434" rx="3.5" ry="2.2" fill="#fca5a5" opacity="0.5"/>
            <ellipse cx="300" cy="434" rx="3.5" ry="2.2" fill="#fca5a5" opacity="0.5"/>
            <line x1="271" y1="457" x2="268" y2="443" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
            <line x1="305" y1="457" x2="308" y2="443" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.85"/>
          </motion.g>

          {/* ── FAMILY CAR ── */}
          <g>
            <ellipse cx="192" cy="524" rx="60" ry="6" fill="rgba(0,0,0,0.4)"/>
            <rect x="132" y="502" width="120" height="25" rx="8" fill="url(#carGrad)"/>
            <path d="M150,502 L158,478 L226,478 L234,502 Z" fill={carColor} opacity="0.9"/>
            <path d="M156,500 L163,482 L221,482 L228,500 Z" fill={carRoofColor}/>
            <path d="M160,500 L166,484 L200,484 L200,500 Z" fill="#0d1520" opacity="0.85"/>
            <path d="M200,500 L200,484 L218,484 L224,500 Z" fill="#0d1520" opacity="0.85"/>
            <path d="M163,498 L168,488 L177,488 L173,498 Z" fill="white" opacity="0.08"/>
            <circle cx="157" cy="525" r="13" fill="#111827"/>
            <circle cx="157" cy="525" r="9" fill="#1e293b"/>
            <circle cx="157" cy="525" r="4.5" fill="#374151"/>
            <circle cx="227" cy="525" r="13" fill="#111827"/>
            <circle cx="227" cy="525" r="9" fill="#1e293b"/>
            <circle cx="227" cy="525" r="4.5" fill="#374151"/>
            {[0,90,180,270].map(deg=>(
              <line key={deg}
                x1={157+Math.cos(deg*Math.PI/180)*4.5} y1={525+Math.sin(deg*Math.PI/180)*4.5}
                x2={157+Math.cos(deg*Math.PI/180)*8} y2={525+Math.sin(deg*Math.PI/180)*8}
                stroke="#4b5563" strokeWidth="1.5"/>
            ))}
            {[0,90,180,270].map(deg=>(
              <line key={deg}
                x1={227+Math.cos(deg*Math.PI/180)*4.5} y1={525+Math.sin(deg*Math.PI/180)*4.5}
                x2={227+Math.cos(deg*Math.PI/180)*8} y2={525+Math.sin(deg*Math.PI/180)*8}
                stroke="#4b5563" strokeWidth="1.5"/>
            ))}
            <rect x="132" y="509" width="10" height="6" rx="2" fill="#fef9c3" opacity="0.9"/>
            <rect x="242" y="509" width="10" height="6" rx="2" fill="#fef3c7" opacity="0.6"/>
            <ellipse cx="137" cy="512" rx="24" ry="11" fill="url(#headlight)"/>
            <rect x="242" y="509" width="9" height="5" rx="1.5" fill="#ef4444" opacity="0.7"/>
            <line x1="192" y1="503" x2="192" y2="524" stroke="white" strokeWidth="0.5" opacity="0.15"/>
            <rect x="177" y="511" width="9" height="3" rx="1.5" fill="#e2e8f0" opacity="0.3"/>
            <rect x="200" y="511" width="9" height="3" rx="1.5" fill="#e2e8f0" opacity="0.3"/>
          </g>

          {/* ── Street lamps flanking driveway entrance ── */}
          {/* Left lamp — x=125 at road level */}
          <g>
            <rect x="122" y="492" width="5" height="40" rx="2" fill="#1e293b"/>
            <path d="M124,494 Q130,486 136,488" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <rect x="129" y="484" width="14" height="7" rx="2" fill="#1e293b"/>
            <ellipse cx="136" cy="491" rx="5" ry="4" fill="#fde68a" opacity="0.9" filter="url(#winGlow)"/>
            <ellipse cx="136" cy="491" rx="18" ry="24" fill="#fde68a" opacity="0.07" filter="url(#winGlow)"/>
            <polygon points="128,491 144,491 152,530 120,530" fill="#fde68a" opacity="0.05"/>
            <rect x="120" y="530" width="9" height="4" rx="1" fill="#1e293b"/>
          </g>
          {/* Right lamp — x=275 at road level */}
          <g>
            <rect x="273" y="492" width="5" height="40" rx="2" fill="#1e293b"/>
            <path d="M275,494 Q269,486 263,488" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <rect x="257" y="484" width="14" height="7" rx="2" fill="#1e293b"/>
            <ellipse cx="264" cy="491" rx="5" ry="4" fill="#fde68a" opacity="0.9" filter="url(#winGlow)"/>
            <ellipse cx="264" cy="491" rx="18" ry="24" fill="#fde68a" opacity="0.07" filter="url(#winGlow)"/>
            <polygon points="256,491 272,491 280,530 248,530" fill="#fde68a" opacity="0.05"/>
            <rect x="271" y="530" width="9" height="4" rx="1" fill="#1e293b"/>
          </g>

          {/* ── Welcome text — just above chimney ── */}
          <motion.g
            style={{ pointerEvents: "none" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: zooming ? 0 : 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <text x="200" y="134" textAnchor="middle" fontSize="11" fontWeight="400"
              fill="rgba(196,181,253,0.70)"
              style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "2.5px" }}>
              WELCOME TO
            </text>
            <text x="200" y="166" textAnchor="middle" fontSize="28" fontWeight="700"
              fill="rgba(255,255,255,0.97)"
              style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "-0.5px" }}>
              {rawName} HQ
            </text>
          </motion.g>

          {/* ── Chimney smoke ── */}
          {[0,1,2].map(i=>(
            <motion.ellipse key={i}
              cx={158} cy={184 - i*10}
              rx={4 + i*2} ry={3 + i*1.5}
              fill="rgba(255,255,255,0)"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1"
              animate={{ cy: [184 - i*10, 164 - i*14], opacity: [0.35, 0], ry: [3+i*1.5, 5+i*2.5] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i*0.8, ease: "easeOut" }}
            />
          ))}

          {/* ── Tap target — door area ── */}
          <rect x="158" y="370" width="84" height="88"
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
