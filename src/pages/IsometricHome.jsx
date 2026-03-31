import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { getActiveMember, getFamilyCode, setActiveMember, MEMBER_COLORS } from "@/lib/familyStore";
import { db } from "@/lib/db";

// ─── Star field ────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x: ((Math.sin(i * 137.508) + 1) / 2) * 100,
  y: ((Math.cos(i * 97.31) + 1) / 2) * 100,
  r: i % 4 === 0 ? 1.4 : 0.7,
  delay: (i % 5) * 0.9,
  dur: 2.2 + (i % 4) * 0.7,
}));

function StarField() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {STARS.map((s) => (
        <motion.div key={s.id}
          style={{ position: "absolute", borderRadius: "50%", background: "white",
            left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r }}
          animate={{ opacity: [0.06, 0.55, 0.06] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Member mapping ────────────────────────────────────────────────────────────
function getMember(id, members) {
  switch (id) {
    case "rasya": return members.find(m => m.name?.toLowerCase().includes("rasya")) ?? null;
    case "dad":   return members.find(m => m.role === "Parent" && m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)) ?? null;
    case "mom":   return members.find(m => m.role === "Parent" && !m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)) ?? null;
    case "radif": return members.find(m => m.name?.toLowerCase().includes("radif")) ?? null;
    case "rania": return members.find(m => m.name?.toLowerCase().includes("rania")) ?? null;
    default: return null;
  }
}

const DEFAULT_COLORS = {
  rasya: "#8B5CF6", dad: "#1E40AF", mom: "#EC4899",
  radif: "#F59E0B", rania: "#EAB308", living: "#1e3a5f",
};

// ─── TV color cycling ──────────────────────────────────────────────────────────
const TV_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#F59E0B"];

function useTVColor() {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % TV_COLORS.length);
      setFlash(true);
      setTimeout(() => setFlash(false), 280);
    }, 2000);
    return () => clearInterval(t);
  }, []);
  return { color: TV_COLORS[idx], flash };
}

// ─── VIEW 1: FRONT ELEVATION ───────────────────────────────────────────────────
// True flat front-facing view. The house is shown as if standing directly in
// front of it — symmetrical, orthographic. You see the facade, roof triangle,
// and room windows arranged in a 3×2 grid behind the front wall.
function FrontView({ members, statuses, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);

  // Layout: house facade is 300px wide, 200px tall walls + 110px roof
  // viewBox: 0 0 400 420
  const HX = 50;   // house left edge
  const HW = 300;  // house width
  const HT = 130;  // house top (wall start)
  const HH = 200;  // wall height
  const HB = HT + HH; // house bottom (= 330)
  const CX = HX + HW / 2; // center x = 200

  // 6 rooms as windows/panels in a 3×2 grid inside the facade
  // Row 0 (top): Rasya | Living | Dad
  // Row 1 (bot): Mom   | Rania  | Radif
  const COL_W = HW / 3; // 100px each
  const ROW_H = HH / 2; // 100px each
  const PAD = 10;       // padding inside each cell

  const roomGrid = [
    { id:"rasya",  col:0, row:0 },
    { id:"living", col:1, row:0 },
    { id:"dad",    col:2, row:0 },
    { id:"mom",    col:0, row:1 },
    { id:"rania",  col:1, row:1 },
    { id:"radif",  col:2, row:1 },
  ];

  return (
    <svg viewBox="0 0 400 420" width="100%" height="100%" style={{ display:"block", overflow:"visible" }}>
      <defs>
        <filter id="fglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="ftvGlow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="fgroundShadow">
          <feGaussianBlur stdDeviation="6"/>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={CX} cy={HB + 16} rx="155" ry="12"
        fill="rgba(0,0,0,0.45)" filter="url(#fgroundShadow)"/>

      {/* ── Roof triangle ── */}
      {/* Main roof fill */}
      <polygon points={`${HX},${HT} ${CX},${HT - 110} ${HX + HW},${HT}`}
        fill="#1a1d3a" stroke="#312e81" strokeWidth="1.5"/>
      {/* Roof left shading */}
      <polygon points={`${HX},${HT} ${CX},${HT - 110} ${CX},${HT}`}
        fill="#16193a" stroke="none"/>
      {/* Roof ridge highlight */}
      <line x1={CX} y1={HT - 110} x2={CX} y2={HT}
        stroke="#6d5ce7" strokeWidth="1" opacity="0.6"/>
      {/* Roof bottom edge */}
      <line x1={HX - 8} y1={HT} x2={HX + HW + 8} y2={HT}
        stroke="#4338ca" strokeWidth="1.5" opacity="0.7"/>
      {/* Eaves overhang */}
      <polygon points={`${HX - 8},${HT} ${HX + HW + 8},${HT} ${HX + HW + 4},${HT + 8} ${HX - 4},${HT + 8}`}
        fill="#111827" stroke="#1e293b" strokeWidth="0.8"/>

      {/* Chimney */}
      <rect x={CX - 48} y={HT - 95} width="20" height="50" rx="1"
        fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8"/>
      <rect x={CX - 51} y={HT - 97} width="26" height="6" rx="1"
        fill="#2d2a6e" stroke="#4338ca" strokeWidth="0.7"/>
      {/* Smoke */}
      {[0,1,2].map(i => (
        <motion.circle key={i} cx={CX - 38} cy={HT - 98}
          r={3 + i * 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"
          animate={{ cy: [HT - 98 - i*6, HT - 125 - i*8], opacity: [0.3, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}/>
      ))}

      {/* ── House facade (wall) ── */}
      <rect x={HX} y={HT} width={HW} height={HH}
        fill="#111827" stroke="#1e293b" strokeWidth="1.5"/>
      {/* Subtle gradient overlay */}
      <defs>
        <linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0f1a" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>
        <linearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent"/>
          <stop offset="100%" stopColor="#0a0f1a" stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      <rect x={HX} y={HT} width={HW/3} height={HH} fill="url(#fadeL)"/>
      <rect x={HX + HW*2/3} y={HT} width={HW/3} height={HH} fill="url(#fadeR)"/>

      {/* Column dividers */}
      {[1, 2].map(c => (
        <line key={c} x1={HX + c * COL_W} y1={HT} x2={HX + c * COL_W} y2={HB}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      ))}
      {/* Row divider */}
      <line x1={HX} y1={HT + ROW_H} x2={HX + HW} y2={HT + ROW_H}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>

      {/* ── Room panels (windows) ── */}
      {roomGrid.map(r => {
        const m = getMember(r.id, members);
        const col = m ? (MEMBER_COLORS[m.color]?.hex || DEFAULT_COLORS[r.id]) : DEFAULT_COLORS[r.id];
        const isHov = hov === r.id;
        const isTV = r.id === "living";

        // Panel bounds
        const px = HX + r.col * COL_W + PAD;
        const py = HT + r.row * ROW_H + PAD;
        const pw = COL_W - PAD * 2;
        const ph = ROW_H - PAD * 2;
        const pcx = px + pw / 2;
        const pcy = py + ph / 2;

        return (
          <g key={r.id}>
            {/* Panel background */}
            <rect x={px} y={py} width={pw} height={ph} rx="6"
              fill={col}
              fillOpacity={isHov ? 0.32 : 0.14}
              stroke={col}
              strokeWidth={isHov ? 2 : 1}
              strokeOpacity={isHov ? 1 : 0.45}
              filter={isHov ? "url(#fglow)" : undefined}
              style={{ transition: "fill-opacity 0.15s, stroke-width 0.15s" }}
            />
            {/* Window cross (decorative) */}
            {!isTV && (
              <g opacity="0.18" style={{ pointerEvents: "none" }}>
                <line x1={pcx} y1={py + 4} x2={pcx} y2={py + ph - 4} stroke={col} strokeWidth="1"/>
                <line x1={px + 4} y1={pcy} x2={px + pw - 4} y2={pcy} stroke={col} strokeWidth="1"/>
              </g>
            )}

            {/* TV screen in living room */}
            {isTV && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={pcx - 22} y={pcy - 14} width="44" height="28" rx="4"
                  fill={tvColor} opacity={tvFlash ? 0.32 : 0.12}
                  filter="url(#ftvGlow)" style={{ transition: "opacity 0.2s" }}/>
                <rect x={pcx - 18} y={pcy - 11} width="36" height="22" rx="3"
                  fill="#050810" stroke={tvColor} strokeWidth="1.5"/>
                <rect x={pcx - 16} y={pcy - 9} width="32" height="18" rx="2"
                  fill={tvColor} opacity={tvFlash ? 0.25 : 0.08}/>
                <text x={pcx} y={pcy + 1} textAnchor="middle" fontSize="5" fontWeight="800"
                  fill="white" opacity="0.9" style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "0.5px" }}>
                  ENTER HQ
                </text>
                {/* TV stand */}
                <line x1={pcx} y1={pcy + 11} x2={pcx} y2={pcy + 17} stroke="#334155" strokeWidth="2"/>
                <rect x={pcx - 7} y={pcy + 15} width="14" height="3" rx="1.5" fill="#334155"/>
              </g>
            )}

            {/* Member info */}
            {m && !isTV && (
              <g style={{ pointerEvents: "none" }}>
                <text x={pcx} y={pcy - 8} textAnchor="middle" fontSize="14"
                  style={{ fontFamily: "system-ui" }}>{m.emoji || m.name[0]}</text>
                <text x={pcx} y={pcy + 5} textAnchor="middle" fontSize="6.5" fontWeight="700"
                  fill={col} style={{ fontFamily: "system-ui,sans-serif" }}>{m.name}</text>
                {statuses[m.id] && (
                  <>
                    <rect x={pcx - 15} y={pcy + 7} width="30" height="9" rx="4.5"
                      fill={statuses[m.id]==="busy"?"#7f1d1d":statuses[m.id]==="done"?"#064e3b":"#1e293b"}
                      opacity="0.92"/>
                    <text x={pcx} y={pcy + 13.5} textAnchor="middle" fontSize="4.8" fontWeight="700"
                      fill={statuses[m.id]==="busy"?"#fca5a5":statuses[m.id]==="done"?"#6ee7b7":"#64748b"}
                      style={{ fontFamily: "system-ui,sans-serif" }}>
                      {statuses[m.id]==="busy"?"Busy":statuses[m.id]==="done"?"✓ Done":"Home"}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Hit area */}
            <rect x={px} y={py} width={pw} height={ph} rx="6"
              fill="transparent" stroke="transparent"
              style={{ cursor: (m || isTV) ? "pointer" : "default" }}
              onClick={() => isTV ? onTV() : m && onRoom(m)}
              onMouseEnter={() => setHov(r.id)}
              onMouseLeave={() => setHov(null)}
            />
          </g>
        );
      })}

      {/* ── Front door (bottom center, overlaps facade bottom) ── */}
      {(() => {
        const dw = 28, dh = 40;
        const dx = CX - dw / 2, dy = HB - dh;
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={dx} y={dy} width={dw} height={dh} rx="3"
              fill="#0d1220" stroke="#4338ca" strokeWidth="1"/>
            {/* Arch */}
            <path d={`M${dx},${dy + 10} Q${CX},${dy - 4} ${dx + dw},${dy + 10}`}
              fill="none" stroke="#4338ca" strokeWidth="0.8" opacity="0.6"/>
            {/* Knob */}
            <circle cx={dx + dw - 6} cy={dy + 22} r="2.5" fill="#6d28d9"/>
          </g>
        );
      })()}

      {/* ── Ground / foundation ── */}
      <rect x={HX - 6} y={HB} width={HW + 12} height="8" rx="2"
        fill="#0a0e1a" stroke="#1e293b" strokeWidth="1"/>
      <rect x={HX - 12} y={HB + 7} width={HW + 24} height="5" rx="1"
        fill="#090c18" stroke="#1a2535" strokeWidth="0.8"/>
    </svg>
  );
}

// ─── VIEW 2: TOP DOWN ─────────────────────────────────────────────────────────
function TopDownView({ members, statuses, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);

  const U = 40, CX = 200, CY = 230;
  function s(ix, iy) { return [CX + ix * U, CY + iy * U]; }

  const rooms = [
    { id:"rasya",  x1:-3,y1:-2,x2:-1,y2:0 },
    { id:"living", x1:-1,y1:-2,x2: 1,y2:0 },
    { id:"dad",    x1: 1,y1:-2,x2: 3,y2:0 },
    { id:"mom",    x1:-3,y1: 0,x2:-1,y2:2 },
    { id:"rania",  x1:-1,y1: 0,x2: 1,y2:2 },
    { id:"radif",  x1: 1,y1: 0,x2: 3,y2:2 },
  ];

  return (
    <svg viewBox="20 50 360 360" width="100%" height="100%" style={{ display:"block", overflow:"visible" }}>
      <defs>
        <filter id="tdglow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tdtvGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer house border */}
      <rect x={s(-3,-2)[0] - 2} y={s(-3,-2)[1] - 2}
        width={U * 6 + 4} height={U * 4 + 4} rx="6"
        fill="#090c14" stroke="#1e293b" strokeWidth="2"/>

      {/* Room tiles */}
      {rooms.map(r => {
        const m = getMember(r.id, members);
        const col = m ? (MEMBER_COLORS[m.color]?.hex || DEFAULT_COLORS[r.id]) : DEFAULT_COLORS[r.id];
        const isHov = hov === r.id;
        const isTV = r.id === "living";
        const [ax, ay] = s(r.x1, r.y1);
        const [bx, by] = s(r.x2, r.y2);
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const pw = bx - ax - 4, ph = by - ay - 4;

        return (
          <g key={r.id}>
            <rect x={ax + 2} y={ay + 2} width={pw} height={ph} rx="4"
              fill={col}
              fillOpacity={isHov ? 0.42 : 0.20}
              stroke={col}
              strokeWidth={isHov ? 2.5 : 1.2}
              strokeOpacity={isHov ? 1 : 0.55}
              filter={isHov ? "url(#tdglow)" : undefined}
              style={{ transition: "fill-opacity 0.15s" }}/>

            {/* TV */}
            {isTV && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={mx - 22} y={my - 14} width="44" height="28" rx="4"
                  fill={tvColor} opacity={tvFlash ? 0.35 : 0.15}
                  filter="url(#tdtvGlow)" style={{ transition: "opacity 0.22s" }}/>
                <rect x={mx - 18} y={my - 11} width="36" height="22" rx="3"
                  fill="#050810" stroke={tvColor} strokeWidth="1.5"/>
                <text x={mx} y={my + 2} textAnchor="middle" fontSize="5.5" fontWeight="800"
                  fill="white" opacity="0.92" style={{ fontFamily:"system-ui,sans-serif" }}>
                  ENTER HQ
                </text>
              </g>
            )}

            {/* Member label */}
            {m && !isTV && (
              <g style={{ pointerEvents: "none" }}>
                <text x={mx} y={my - 10} textAnchor="middle" fontSize="18"
                  style={{ fontFamily: "system-ui" }}>{m.emoji || m.name[0]}</text>
                <text x={mx} y={my + 8} textAnchor="middle" fontSize="8" fontWeight="700"
                  fill={col} style={{ fontFamily: "system-ui,sans-serif" }}>{m.name}</text>
                {statuses[m.id] && (
                  <>
                    <rect x={mx - 17} y={my + 11} width="34" height="11" rx="5.5"
                      fill={statuses[m.id]==="busy"?"#7f1d1d":statuses[m.id]==="done"?"#064e3b":"#1e293b"}
                      opacity="0.92"/>
                    <text x={mx} y={my + 19} textAnchor="middle" fontSize="5.5" fontWeight="700"
                      fill={statuses[m.id]==="busy"?"#fca5a5":statuses[m.id]==="done"?"#6ee7b7":"#64748b"}
                      style={{ fontFamily: "system-ui,sans-serif" }}>
                      {statuses[m.id]==="busy"?"Busy":statuses[m.id]==="done"?"✓ Done":"Home"}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Hit */}
            <rect x={ax + 2} y={ay + 2} width={pw} height={ph} rx="4"
              fill="transparent" stroke="transparent"
              style={{ cursor: (m || isTV) ? "pointer" : "default" }}
              onClick={() => isTV ? onTV() : m && onRoom(m)}
              onMouseEnter={() => setHov(r.id)}
              onMouseLeave={() => setHov(null)}/>
          </g>
        );
      })}

      {/* Room divider lines */}
      {[-1, 1].map(x => {
        const [x1,y1] = s(x,-2), [x2,y2] = s(x,2);
        return <line key={x} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1.5"/>;
      })}
      <line x1={s(-3,0)[0]} y1={s(-3,0)[1]} x2={s(3,0)[0]} y2={s(3,0)[1]}
        stroke="rgba(255,255,255,0.07)" strokeWidth="1.5"/>

      {/* N compass */}
      <text x="358" y="75" textAnchor="middle" fontSize="9" fontWeight="600"
        fill="rgba(255,255,255,0.25)" style={{ fontFamily:"system-ui,sans-serif" }}>N ↑</text>
    </svg>
  );
}

// ─── Centered popup ────────────────────────────────────────────────────────────
function CenteredPopup({ children, onClose }) {
  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:60, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
        onClick={onClose}/>
      <div style={{ position:"fixed", inset:0, zIndex:61, display:"flex", alignItems:"flex-end",
        justifyContent:"center", paddingBottom:28, pointerEvents:"none" }}>
        <div style={{ pointerEvents:"auto", width:"85vw", maxWidth:340 }}>{children}</div>
      </div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function IsometricHome() {
  const navigate = useNavigate();
  const member = getActiveMember();
  const familyCode = getFamilyCode();
  const memberColor = member ? (MEMBER_COLORS[member.color] || MEMBER_COLORS.purple) : MEMBER_COLORS.purple;

  const [members, setMembers] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [view, setView] = useState("front"); // "front" | "top"

  const { color: tvColor, flash: tvFlash } = useTVColor();

  useEffect(() => {
    if (!familyCode) { navigate("/", { replace: true }); return; }
    db.FamilyMember.filter({ family_code: familyCode }).then(setMembers);
  }, [familyCode]);

  useEffect(() => {
    if (!members.length || !familyCode) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      db.CalendarEvent.filter({ family_code: familyCode }),
      db.Chore.filter({ family_code: familyCode }),
    ]).then(([events, chores]) => {
      const s = {};
      for (const m of members) {
        const busy = events.some(e => (e.date || e.start_date || "").slice(0,10) === today);
        const done = chores.some(c => c.completed && c.assigned_to === m.id);
        s[m.id] = busy ? "busy" : done ? "done" : "home";
      }
      setStatuses(s);
    }).catch(() => {});
  }, [members, familyCode]);

  const handleSwitchToMember = (m) => {
    setActiveMember(m);
    window.dispatchEvent(new Event("member-changed"));
    setSelectedMember(null);
    navigate("/dashboard");
  };

  const viewProps = {
    members, statuses,
    onRoom: setSelectedMember,
    onTV: () => navigate("/dashboard"),
    tvColor, tvFlash,
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#0d0d14", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <StarField />

      {/* Top bar */}
      <header style={{ position:"relative", zIndex:10, flexShrink:0, display:"flex",
        alignItems:"center", padding:"10px 14px" }}>
        <motion.button whileTap={{ scale:0.85 }} onClick={() => setSidebarOpen(true)}
          style={{ width:36, height:36, borderRadius:10, border:"none",
            background:"rgba(255,255,255,0.07)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Menu style={{ width:18, height:18, color:"rgba(255,255,255,0.65)" }}/>
        </motion.button>

        <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
          <span style={{ fontWeight:700, fontSize:15,
            background:"linear-gradient(135deg,#fff 0%,#c4b5fd 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            🏠 Family HQ
          </span>
        </div>

        {member ? (
          <motion.button whileTap={{ scale:0.85 }} onClick={() => navigate("/select")}
            style={{ width:36, height:36, borderRadius:"50%", border:"none", flexShrink:0,
              background:memberColor.hex, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"white", fontSize:15, fontWeight:700,
              boxShadow:`0 0 14px ${memberColor.hex}55` }}>
            {member.emoji || member.name[0]}
          </motion.button>
        ) : <div style={{ width:36, height:36, flexShrink:0 }}/>}
      </header>

      {/* House — fills remaining space */}
      <div style={{ position:"relative", zIndex:10, flex:1, minHeight:0,
        display:"flex", alignItems:"center", justifyContent:"center", padding:"0 8px 70px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={view}
            initial={{ opacity:0, scale:0.96 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:0.96 }}
            transition={{ duration:0.25, ease:[0.22,1,0.36,1] }}
            style={{ width:"100%", height:"100%", display:"flex", alignItems:"center" }}>
            <motion.div
              animate={{ y:[0,-4,0] }}
              transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }}
              style={{ width:"100%", height:"100%" }}>
              {view === "front"
                ? <FrontView {...viewProps}/>
                : <TopDownView {...viewProps}/>
              }
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* View toggle — fixed bottom center */}
      <div style={{
        position:"fixed", bottom:16, left:0, right:0, zIndex:20,
        display:"flex", justifyContent:"center",
      }}>
        <div style={{
          display:"flex", gap:4, padding:"5px",
          borderRadius:999,
          background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.1)",
          backdropFilter:"blur(12px)",
        }}>
          {[
            { id:"front", icon:"🏠", label:"Front" },
            { id:"top",   icon:"🗺️", label:"Top" },
          ].map(v => {
            const active = view === v.id;
            return (
              <motion.button key={v.id} whileTap={{ scale:0.92 }}
                onClick={() => setView(v.id)}
                style={{
                  display:"flex", alignItems:"center", gap:5,
                  padding:"7px 16px", borderRadius:999, border:"none",
                  cursor:"pointer", fontSize:12, fontWeight:700,
                  transition:"all 0.2s",
                  background: active ? memberColor.hex : "transparent",
                  color: active ? "white" : "rgba(255,255,255,0.45)",
                  boxShadow: active ? `0 0 14px ${memberColor.hex}55` : "none",
                }}>
                <span style={{ fontSize:14 }}>{v.icon}</span>
                {v.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Member popup */}
      <AnimatePresence>
        {selectedMember && (
          <CenteredPopup onClose={() => setSelectedMember(null)}>
            <motion.div
              initial={{ opacity:0, y:28, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:28, scale:0.94 }}
              transition={{ type:"spring", stiffness:400, damping:32 }}>
              {(() => {
                const col = MEMBER_COLORS[selectedMember.color] || MEMBER_COLORS.purple;
                const st = statuses[selectedMember.id];
                return (
                  <div style={{ borderRadius:22, padding:"18px 18px 16px",
                    background:"rgba(10,8,24,0.98)", border:`1px solid ${col.hex}45`,
                    boxShadow:`0 0 40px ${col.hex}20, 0 20px 60px rgba(0,0,0,0.7)` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                        background:`${col.hex}20`, boxShadow:`0 0 16px ${col.hex}35`,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                        {selectedMember.emoji || selectedMember.name[0]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:"white", fontWeight:700, fontSize:16, margin:"0 0 2px" }}>{selectedMember.name}</p>
                        <p style={{ color:col.hex, fontSize:11, margin:"0 0 6px" }}>{selectedMember.role}</p>
                        <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:999,
                          fontSize:10, fontWeight:700,
                          background:st==="busy"?"rgba(127,29,29,0.55)":st==="done"?"rgba(6,78,59,0.55)":"rgba(30,37,51,0.55)",
                          color:st==="busy"?"#fca5a5":st==="done"?"#6ee7b7":"#94a3b8" }}>
                          {st==="busy"?"📅 Busy":st==="done"?"✅ Done":"🏠 Home"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-around", marginBottom:14 }}>
                      {[["XP",selectedMember.xp??0],["Streak 🔥",selectedMember.streak??0],["Level",selectedMember.level??1]].map(([l,v]) => (
                        <div key={l} style={{ textAlign:"center" }}>
                          <p style={{ color:"white", fontWeight:700, fontSize:17, margin:0 }}>{v}</p>
                          <p style={{ color:"rgba(255,255,255,0.3)", fontSize:10, margin:0 }}>{l}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:9 }}>
                      <button onClick={() => setSelectedMember(null)} style={{ flex:1, padding:"10px 0",
                        borderRadius:14, border:"1px solid rgba(255,255,255,0.07)",
                        background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.45)",
                        fontSize:12, fontWeight:600, cursor:"pointer" }}>Close</button>
                      <motion.button whileTap={{ scale:0.96 }}
                        onClick={() => handleSwitchToMember(selectedMember)}
                        style={{ flex:1, padding:"10px 0", borderRadius:14, border:"none",
                          background:`linear-gradient(135deg,${col.hex},${col.hex}aa)`,
                          color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        Switch →
                      </motion.button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </CenteredPopup>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div key="sb-bd" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:"fixed", inset:0, zIndex:80, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }}
              onClick={() => setSidebarOpen(false)}/>
            <motion.aside key="sb" initial={{ x:"-100%" }} animate={{ x:0 }} exit={{ x:"-100%" }}
              transition={{ type:"spring", stiffness:350, damping:35 }}
              style={{ position:"fixed", left:0, top:0, bottom:0, zIndex:90, width:256,
                display:"flex", flexDirection:"column", background:"rgba(10,10,18,0.97)",
                borderRight:`1px solid ${memberColor.hex}28`,
                paddingTop:"env(safe-area-inset-top)", paddingBottom:"env(safe-area-inset-bottom)" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)",
                display:"flex", alignItems:"center", gap:11 }}>
                {member && <div style={{ width:38, height:38, borderRadius:"50%", background:memberColor.hex,
                  flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                  color:"white", fontWeight:700, fontSize:15 }}>{member.emoji||member.name[0]}</div>}
                <div>
                  <p style={{ color:"white", fontWeight:600, fontSize:13, margin:0 }}>{member?.name??"Family HQ"}</p>
                  <p style={{ color:"rgba(255,255,255,0.32)", fontSize:11, margin:0 }}>{member?.role??""}</p>
                </div>
              </div>
              <nav style={{ flex:1, padding:10, overflowY:"auto" }}>
                {[["🏠 HQ Home","/home"],["📊 Dashboard","/dashboard"],["📅 Calendar","/calendar"],
                  ["✅ Chores","/chores"],["🍽️ Meals","/meals"],["💰 Budget","/budget"],
                  ["📌 Board","/noticeboard"],["🎯 Goals","/goals"],["🎁 Rewards","/rewards"],
                  ["📸 Moments","/moments"],["📖 Guide","/guide"]].map(([label,path]) => (
                  <button key={path} onClick={() => { setSidebarOpen(false); navigate(path); }}
                    style={{ width:"100%", display:"block", padding:"10px 14px", borderRadius:10,
                      border:"none", background:"transparent", color:"rgba(255,255,255,0.52)",
                      fontSize:13, fontWeight:500, cursor:"pointer", textAlign:"left", marginBottom:1 }}>
                    {label}
                  </button>
                ))}
              </nav>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:10 }}>
                <button onClick={() => { setSidebarOpen(false); navigate("/select"); }}
                  style={{ width:"100%", padding:"9px 14px", borderRadius:10, border:"none",
                    background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:12,
                    cursor:"pointer", textAlign:"left" }}>Switch Member</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
