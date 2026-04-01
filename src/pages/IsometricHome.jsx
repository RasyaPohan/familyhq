import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getActiveMember, getFamilyCode, setActiveMember, MEMBER_COLORS } from "@/lib/familyStore";
import { db } from "@/lib/db";

// ─── Stars (more, brighter twinkle) ───────────────────────────────────────────
const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  x: ((Math.sin(i * 137.508 + 0.7) + 1) / 2) * 100,
  y: ((Math.cos(i * 97.31  + 0.3) + 1) / 2) * 100,
  r: i % 5 === 0 ? 2.0 : i % 3 === 0 ? 1.3 : 0.7,
  delay: (i % 7) * 0.55,
  dur: 1.8 + (i % 5) * 0.55,
  minOp: i % 4 === 0 ? 0.1 : 0.04,
  maxOp: i % 4 === 0 ? 0.95 : 0.6,
}));

function StarField() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {STARS.map((s) => (
        <motion.div key={s.id}
          style={{ position: "absolute", borderRadius: "50%", background: "white",
            left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2 }}
          animate={{ opacity: [s.minOp, s.maxOp, s.minOp], scale: [1, 1.3, 1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Moon (top-right corner like OutdoorScene) ─────────────────────────────────
function Moon() {
  return (
    <div style={{ position: "absolute", top: 18, right: 22, zIndex: 1, pointerEvents: "none" }}>
      <motion.div
        animate={{ opacity: [0.82, 1, 0.82], y: [0, -2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "radial-gradient(circle at 38% 38%, #fef3c7 0%, #fcd34d 55%, #f59e0b 100%)",
          boxShadow: "0 0 18px rgba(251,191,36,0.45), 0 0 40px rgba(251,191,36,0.18)",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Crescent shadow */}
        <div style={{
          position: "absolute", top: -4, right: -8, width: 36, height: 36,
          borderRadius: "50%", background: "#0f1a2e", opacity: 0.72,
        }}/>
        {/* Craters */}
        <div style={{ position: "absolute", top: 9, left: 11, width: 6, height: 6, borderRadius: "50%", background: "rgba(180,140,40,0.28)" }}/>
        <div style={{ position: "absolute", top: 20, left: 18, width: 3.5, height: 3.5, borderRadius: "50%", background: "rgba(180,140,40,0.22)" }}/>
      </motion.div>
    </div>
  );
}

// ─── Animated gradient background ─────────────────────────────────────────────
function NightGradient() {
  return (
    <motion.div
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
      animate={{
        background: [
          "radial-gradient(ellipse at 20% 30%, rgba(88,28,220,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(30,58,138,0.22) 0%, transparent 60%), #070b14",
          "radial-gradient(ellipse at 60% 20%, rgba(109,40,217,0.20) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(30,58,138,0.18) 0%, transparent 60%), #070b14",
          "radial-gradient(ellipse at 20% 30%, rgba(88,28,220,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(30,58,138,0.22) 0%, transparent 60%), #070b14",
        ]
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Pulsing portal sparkles ───────────────────────────────────────────────────
const SPARKLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  angle: (i / 6) * Math.PI * 2,
  r: 22 + (i % 3) * 6,
}));

function PortalSparkles({ cx, cy }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {SPARKLES.map((s) => {
        const sx = cx + Math.cos(s.angle) * s.r;
        const sy = cy + Math.sin(s.angle) * s.r;
        return (
          <motion.circle key={s.id} cx={sx} cy={sy} r="2"
            fill="#c4b5fd"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            animate={{
              opacity: [0, 0.9, 0],
              scale: [0.5, 1.4, 0.5],
              cx: [sx, cx + Math.cos(s.angle + 0.3) * (s.r + 6), sx],
              cy: [sy, cy + Math.sin(s.angle + 0.3) * (s.r + 6), sy],
            }}
            transition={{ duration: 2.4, repeat: Infinity, delay: s.id * 0.4, ease: "easeInOut" }}
          />
        );
      })}
    </g>
  );
}

// ─── TV portal widget ──────────────────────────────────────────────────────────
function TVPortal({ cx, cy, tvColor, tvFlash, small = false }) {
  const W = small ? 40 : 50, H = small ? 24 : 32;
  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Outer pulse glow */}
      <motion.rect
        x={cx - W/2 - 8} y={cy - H/2 - 8} width={W + 16} height={H + 16} rx="12"
        fill="#7c3aed"
        animate={{ opacity: [0.08, 0.22, 0.08] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(6px)" }}
      />
      {/* Screen */}
      <rect x={cx - W/2} y={cy - H/2} width={W} height={H} rx="7"
        fill="#0a0520" stroke={tvColor} strokeWidth="2"/>
      {/* Screen inner glow */}
      <rect x={cx - W/2 + 2} y={cy - H/2 + 2} width={W - 4} height={H - 4} rx="5"
        fill={tvColor} opacity={tvFlash ? 0.28 : 0.10}
        style={{ transition: "opacity 0.25s" }}/>
      {/* Label */}
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={small ? 5 : 6.5} fontWeight="900"
        fill="white" opacity="0.95" style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "0.8px" }}>
        ENTER HQ
      </text>
      <text x={cx} y={cy + (small ? 3 : 4) + (small ? 6 : 8)} textAnchor="middle" fontSize={small ? 4 : 5}
        fill={tvColor} opacity="0.8" style={{ fontFamily: "system-ui,sans-serif" }}>
        ✨ tap to go in
      </text>
      {!small && (
        <PortalSparkles cx={cx} cy={cy} />
      )}
      {!small && (
        <>
          <line x1={cx} y1={cy + H/2} x2={cx} y2={cy + H/2 + 7} stroke="#334155" strokeWidth="2"/>
          <rect x={cx - 7} y={cy + H/2 + 5} width="14" height="3" rx="1.5" fill="#334155"/>
        </>
      )}
    </g>
  );
}

// ─── TV color cycling ──────────────────────────────────────────────────────────
const TV_COLORS = ["#8B5CF6", "#7c3aed", "#a78bfa", "#6d28d9", "#8B5CF6"];

function useTVColor() {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % TV_COLORS.length);
      setFlash(true);
      setTimeout(() => setFlash(false), 280);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return { color: TV_COLORS[idx], flash };
}

// ─── Dynamic layout engine ─────────────────────────────────────────────────────
function getSharedType(col, cols) {
  if (col === 0) return "garden";
  if (col === cols - 1) return "garage";
  return "library";
}

function getLayout(memberCount) {
  const count = Math.min(Math.max(memberCount, 0), 6);
  if (count <= 2) {
    const slots = [];
    for (let c = 0; c < 2; c++) {
      const hasM = c < count;
      slots.push({ slotIndex: c, col: c, row: 0,
        type: hasM ? "member" : "shared",
        memberId: hasM ? c : null,
        sharedType: hasM ? null : getSharedType(c, 2) });
    }
    return { cols: 2, rows: 1, tvMode: "external-bottom", slots };
  }
  if (count === 3) return {
    cols: 2, rows: 2, tvMode: "slot",
    slots: [
      { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
      { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
      { slotIndex: 2, col: 0, row: 1, type: "member", memberId: 2, sharedType: null },
      { slotIndex: 3, col: 1, row: 1, type: "tv",     memberId: null, sharedType: null },
    ],
  };
  if (count === 4) return {
    cols: 2, rows: 2, tvMode: "overlay-center",
    slots: [
      { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
      { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
      { slotIndex: 2, col: 0, row: 1, type: "member", memberId: 2, sharedType: null },
      { slotIndex: 3, col: 1, row: 1, type: "member", memberId: 3, sharedType: null },
    ],
  };
  if (count === 5) return {
    cols: 3, rows: 2, tvMode: "door",
    slots: [
      { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
      { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
      { slotIndex: 2, col: 2, row: 0, type: "member", memberId: 2, sharedType: null },
      { slotIndex: 3, col: 0, row: 1, type: "member", memberId: 3, sharedType: null },
      { slotIndex: 4, col: 1, row: 1, type: "door",   memberId: null, sharedType: null },
      { slotIndex: 5, col: 2, row: 1, type: "member", memberId: 4, sharedType: null },
    ],
  };
  return {
    cols: 3, rows: 2, tvMode: "overlay-center",
    slots: [
      { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
      { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
      { slotIndex: 2, col: 2, row: 0, type: "member", memberId: 2, sharedType: null },
      { slotIndex: 3, col: 0, row: 1, type: "member", memberId: 3, sharedType: null },
      { slotIndex: 4, col: 1, row: 1, type: "member", memberId: 4, sharedType: null },
      { slotIndex: 5, col: 2, row: 1, type: "member", memberId: 5, sharedType: null },
    ],
  };
}

function getMemberForSlot(slot, members) {
  if (slot.type !== "member" || slot.memberId == null) return null;
  return members[slot.memberId] ?? null;
}

function getSlotColor(slot, members) {
  if (slot.type === "tv" || slot.type === "door") return "#7c3aed";
  if (slot.type === "shared") {
    return slot.sharedType === "garden" ? "#059669"
         : slot.sharedType === "library" ? "#4338ca"
         : "#b45309";
  }
  const m = getMemberForSlot(slot, members);
  return m ? (MEMBER_COLORS[m.color]?.hex ?? "#8B5CF6") : "#334155";
}

const SHARED_EMOJI = { garden: "🌿", library: "📚", garage: "🚗" };
const SHARED_LABEL = { garden: "Garden", library: "Library", garage: "Garage" };

// ─── Status badge config — bright & colorful ──────────────────────────────────
const STATUS_CONFIG = {
  chores_due: { bg: "rgba(239,68,68,0.25)",   stroke: "#ef4444", text: "#fca5a5", label: "⚠️ Chores" },
  done:       { bg: "rgba(16,185,129,0.25)",   stroke: "#10b981", text: "#6ee7b7", label: "✅ Done"   },
  busy:       { bg: "rgba(59,130,246,0.25)",   stroke: "#3b82f6", text: "#93c5fd", label: "📅 Busy"   },
  active:     { bg: "rgba(167,139,250,0.25)",  stroke: "#a78bfa", text: "#c4b5fd", label: "📸 Active" },
  home:       { bg: "rgba(100,116,139,0.20)",  stroke: "#475569", text: "#94a3b8", label: "🏠 Home"   },
};

// ─── Front View geometry ───────────────────────────────────────────────────────
function getFrontGeom(cols, rows) {
  const COL_W = 110;
  const ROW_H = 110;
  const HW = cols * COL_W;
  const HH = rows * ROW_H;
  const PAD_SIDE = 44;
  const VB_W = HW + PAD_SIDE * 2;
  const HT = 140;
  const HX = PAD_SIDE;
  const HB = HT + HH;
  const CX = HX + HW / 2;
  const ROOF_H = 118;
  const VB_H = HB + 90;
  return { COL_W, ROW_H, HW, HH, HT, HX, HB, CX, ROOF_H, VB_W, VB_H };
}

// ─── VIEW 1: FRONT ELEVATION ───────────────────────────────────────────────────
function FrontView({ members, statuses, layout, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  const { cols, rows, tvMode, slots } = layout;
  const { COL_W, ROW_H, HW, HH, HT, HX, HB, CX, ROOF_H, VB_W, VB_H } = getFrontGeom(cols, rows);
  const PAD = 10;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%"
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="fglow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="ftvGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="10" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="fgroundShadow">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
        <filter id="fwarmGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b"/>
          <stop offset="100%" stopColor="#0f0e25"/>
        </linearGradient>
        <linearGradient id="houseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827"/>
          <stop offset="100%" stopColor="#0d1120"/>
        </linearGradient>
      </defs>

      {/* Ground glow */}
      <ellipse cx={CX} cy={HB + 20} rx={HW * 0.6} ry="14"
        fill="rgba(0,0,0,0.5)" filter="url(#fgroundShadow)"/>

      {/* Roof */}
      <polygon points={`${HX - 2},${HT} ${CX},${HT - ROOF_H} ${HX + HW + 2},${HT}`}
        fill="url(#roofGrad)" stroke="#312e81" strokeWidth="1.5"/>
      <polygon points={`${HX},${HT} ${CX},${HT - ROOF_H} ${CX},${HT}`}
        fill="rgba(255,255,255,0.025)" stroke="none"/>
      {/* Roof ridge */}
      <line x1={CX} y1={HT - ROOF_H} x2={CX} y2={HT}
        stroke="#6d5ce7" strokeWidth="1.2" opacity="0.5"/>
      {/* Eave */}
      <polygon points={`${HX - 10},${HT} ${HX + HW + 10},${HT} ${HX + HW + 6},${HT + 10} ${HX - 6},${HT + 10}`}
        fill="#0d1020" stroke="#1e293b" strokeWidth="0.8"/>

      {/* Chimney */}
      <rect x={CX - 52} y={HT - 100} width="22" height="56" rx="2"
        fill="#1a1730" stroke="#4338ca" strokeWidth="0.8"/>
      <rect x={CX - 55} y={HT - 103} width="28" height="7" rx="2"
        fill="#252065" stroke="#4338ca" strokeWidth="0.7"/>
      {/* Chimney smoke */}
      {[0, 1, 2].map(i => (
        <motion.circle key={i} cx={CX - 41} cy={HT - 104}
          r={3.5 + i * 2.5} fill="none" stroke="rgba(200,180,255,0.12)" strokeWidth="1.5"
          animate={{ cy: [HT - 104 - i * 7, HT - 132 - i * 9], opacity: [0.35, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.75, ease: "easeOut" }}/>
      ))}

      {/* House facade */}
      <rect x={HX} y={HT} width={HW} height={HH} rx="2"
        fill="url(#houseGrad)" stroke="#1e293b" strokeWidth="1.5"/>

      {/* Warm ambient light inside — bleeds out from windows */}
      {slots.filter(s => s.type === "member" && getMemberForSlot(s, members)).map(slot => {
        const m = getMemberForSlot(slot, members);
        const col = getSlotColor(slot, members);
        const pcx = HX + slot.col * COL_W + COL_W / 2;
        const pcy = HT + slot.row * ROW_H + ROW_H / 2;
        return (
          <rect key={`glow-${slot.slotIndex}`}
            x={HX + slot.col * COL_W + PAD} y={HT + slot.row * ROW_H + PAD}
            width={COL_W - PAD * 2} height={ROW_H - PAD * 2} rx="8"
            fill={col} opacity="0.07" filter="url(#fwarmGlow)"
            style={{ pointerEvents: "none" }}
          />
        );
      })}

      {/* Column dividers */}
      {Array.from({ length: cols - 1 }, (_, c) => c + 1).map(c => (
        <line key={c} x1={HX + c * COL_W} y1={HT} x2={HX + c * COL_W} y2={HB}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
      ))}
      {rows > 1 && (
        <line x1={HX} y1={HT + ROW_H} x2={HX + HW} y2={HT + ROW_H}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
      )}

      {/* Room panels */}
      {slots.map(slot => {
        const m = getMemberForSlot(slot, members);
        const col = getSlotColor(slot, members);
        const isHov = hov === slot.slotIndex;
        const isTV = slot.type === "tv";
        const isDoor = slot.type === "door";
        const isShared = slot.type === "shared";
        const st = m ? STATUS_CONFIG[statuses[m.id]] || STATUS_CONFIG.home : null;

        const px = HX + slot.col * COL_W + PAD;
        const py = HT + slot.row * ROW_H + PAD;
        const pw = COL_W - PAD * 2;
        const ph = ROW_H - PAD * 2;
        const pcx = px + pw / 2;
        const pcy = py + ph / 2;

        // ── Door cell: sign on top, archway on bottom, no room card ──────────
        if (isDoor) {
          // Sign area: top of cell + small top padding
          const signH = 16, signW = pw - 4, signPadTop = 6;
          const signX = px + 2, signY = py + signPadTop;
          // Door archway: below sign with gap
          const archGap = 6;
          const archTop = signY + signH + archGap;
          const dw = Math.min(36, pw - 16);
          const dh = py + ph - archTop - 4; // fills remaining height
          const dx = pcx - dw / 2;
          const archRad = dw / 2;
          return (
            <g key={slot.slotIndex} style={{ cursor: "pointer" }} onClick={onTV}>
              {/* Sign glow */}
              <motion.rect x={signX - 3} y={signY - 3} width={signW + 6} height={signH + 6} rx="8"
                fill="#7c3aed"
                animate={{ opacity: [0.10, 0.28, 0.10] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                filter="url(#ftvGlow)"
                style={{ pointerEvents: "none" }}
              />
              {/* Sign plaque */}
              <rect x={signX} y={signY} width={signW} height={signH} rx="5"
                fill="rgba(5,3,20,0.92)" stroke="#7c3aed" strokeWidth="1.2" strokeOpacity="0.85"/>
              <text x={pcx} y={signY + signH - 4} textAnchor="middle"
                fontSize="6.5" fontWeight="900" fill="white" opacity="0.95"
                style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "0.9px", pointerEvents: "none" }}>
                ✨ ENTER HQ
              </text>
              {/* Archway — dark opening with arched top */}
              <rect x={px} y={archTop} width={pw} height={ph - (archTop - py)} rx="0"
                fill="rgba(0,0,0,0)" style={{ pointerEvents: "none" }}/>
              {/* Arch surround */}
              <rect x={dx - 4} y={archTop} width={dw + 8} height={dh + 4} rx="3"
                fill="#0a0818" stroke="#4c1d95" strokeWidth="1" opacity="0.9"
                style={{ pointerEvents: "none" }}/>
              {/* Arch opening */}
              <path d={`M${dx},${archTop + archRad} A${archRad},${archRad} 0 0,1 ${dx + dw},${archTop + archRad} L${dx + dw},${archTop + dh} L${dx},${archTop + dh} Z`}
                fill="#030209" style={{ pointerEvents: "none" }}/>
              {/* Door glow from inside */}
              <path d={`M${dx},${archTop + archRad} A${archRad},${archRad} 0 0,1 ${dx + dw},${archTop + archRad} L${dx + dw},${archTop + dh} L${dx},${archTop + dh} Z`}
                fill="#7c3aed" opacity="0.10" filter="url(#ftvGlow)" style={{ pointerEvents: "none" }}/>
              {/* Door handle */}
              <circle cx={dx + dw - 6} cy={archTop + archRad + (dh - archRad) * 0.55}
                r="2.5" fill="#7c3aed" opacity="0.75" style={{ pointerEvents: "none" }}/>
              {/* Hit area */}
              <rect x={px} y={py} width={pw} height={ph} rx="0"
                fill="transparent" stroke="transparent"/>
            </g>
          );
        }

        return (
          <g key={slot.slotIndex}>
            {/* Warm inner glow for member rooms */}
            {m && !isTV && (
              <rect x={px} y={py} width={pw} height={ph} rx="9"
                fill={col} opacity={isHov ? 0.22 : 0.13}
                filter="url(#fwarmGlow)" style={{ pointerEvents: "none" }}/>
            )}

            {/* Panel */}
            <rect x={px} y={py} width={pw} height={ph} rx="9"
              fill={col}
              fillOpacity={isShared ? 0.07 : isHov ? 0.38 : 0.18}
              stroke={col}
              strokeWidth={isHov ? 2.5 : m ? 1.5 : 1}
              strokeOpacity={isShared ? 0.18 : isHov ? 1 : m ? 0.65 : 0.3}
              filter={isHov && !isTV ? "url(#fglow)" : undefined}
              style={{ transition: "fill-opacity 0.18s, stroke-opacity 0.18s" }}
            />

            {/* Cozy inner highlight strip */}
            {!isTV && !isShared && (
              <rect x={px + 4} y={py + 4} width={pw - 8} height={Math.floor(ph * 0.28)} rx="7"
                fill="rgba(255,255,255,0.05)" style={{ pointerEvents: "none" }}/>
            )}

            {/* TV slot */}
            {isTV && (
              <TVPortal cx={pcx} cy={pcy} tvColor={tvColor} tvFlash={tvFlash}/>
            )}

            {/* Member info */}
            {m && !isTV && (
              <g style={{ pointerEvents: "none" }}>
                <text x={pcx} y={pcy - 10} textAnchor="middle" fontSize="20"
                  style={{ fontFamily: "system-ui" }}>{m.emoji || m.name[0]}</text>
                <text x={pcx} y={pcy + 7} textAnchor="middle" fontSize="7.5" fontWeight="800"
                  fill="white" style={{ fontFamily: "system-ui,sans-serif" }}>{m.name}</text>
                {st && (
                  <>
                    <rect x={pcx - 18} y={pcy + 9} width="36" height="11" rx="5.5"
                      fill={st.bg} stroke={st.stroke} strokeWidth="0.6" opacity="0.95"/>
                    <text x={pcx} y={pcy + 16.5} textAnchor="middle" fontSize="5.2" fontWeight="700"
                      fill={st.text} style={{ fontFamily: "system-ui,sans-serif" }}>
                      {st.label}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Shared space */}
            {isShared && (
              <g style={{ pointerEvents: "none" }}>
                <text x={pcx} y={pcy + 5} textAnchor="middle" fontSize="20"
                  style={{ fontFamily: "system-ui" }}>
                  {SHARED_EMOJI[slot.sharedType]}
                </text>
                <text x={pcx} y={pcy + 18} textAnchor="middle" fontSize="6.5" fontWeight="600"
                  fill="rgba(255,255,255,0.28)" style={{ fontFamily: "system-ui,sans-serif" }}>
                  {SHARED_LABEL[slot.sharedType]}
                </text>
              </g>
            )}

            {/* Hit area */}
            <rect x={px} y={py} width={pw} height={ph} rx="9"
              fill="transparent" stroke="transparent"
              style={{ cursor: (m || isTV) ? "pointer" : "default" }}
              onClick={() => isTV ? onTV() : m && onRoom(m)}
              onMouseEnter={() => setHov(slot.slotIndex)}
              onMouseLeave={() => setHov(null)}
            />
          </g>
        );
      })}

      {/* TV overlay strip (4 or 6 members) */}
      {tvMode === "overlay-center" && (() => {
        const stripY = HT + ROW_H - 15;
        const stripH = 30;
        const stripX = HX + 14;
        const stripW = HW - 28;
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <motion.rect x={stripX - 4} y={stripY - 4} width={stripW + 8} height={stripH + 8} rx="12"
              fill="#7c3aed" opacity="0"
              animate={{ opacity: [0.06, 0.18, 0.06] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              filter="url(#ftvGlow)"
            />
            <rect x={stripX} y={stripY} width={stripW} height={stripH} rx="9"
              fill="rgba(5,3,20,0.9)" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity="0.7"/>
            <TVPortal cx={CX} cy={stripY + stripH / 2} tvColor={tvColor} tvFlash={tvFlash} small/>
          </g>
        );
      })()}

      {/* TV bar below house (2 members) */}
      {tvMode === "external-bottom" && (() => {
        const barY = HB + 20;
        const barH = 38;
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <motion.rect x={HX} y={barY - 4} width={HW} height={barH + 8} rx="13"
              fill="#7c3aed"
              animate={{ opacity: [0.05, 0.16, 0.05] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              filter="url(#ftvGlow)"
            />
            <rect x={HX + 8} y={barY} width={HW - 16} height={barH} rx="10"
              fill="rgba(5,3,20,0.92)" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity="0.7"/>
            <TVPortal cx={CX} cy={barY + barH / 2} tvColor={tvColor} tvFlash={tvFlash} small/>
          </g>
        );
      })()}

      {/* Decorative door at house base — only shown when no door-type cell (≤4 or 6 members) */}
      {tvMode !== "door" && (() => {
        const dw = 30, dh = 44;
        const dx = CX - dw / 2, dy = HB - dh;
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={dx - 2} y={dy - 2} width={dw + 4} height={dh + 2} rx="5"
              fill="#7c3aed" opacity="0.12" filter="url(#ftvGlow)"/>
            <rect x={dx} y={dy} width={dw} height={dh} rx="4"
              fill="#08071a" stroke="#4c1d95" strokeWidth="1.2"/>
            <path d={`M${dx},${dy + 11} Q${CX},${dy - 5} ${dx + dw},${dy + 11}`}
              fill="none" stroke="#7c3aed" strokeWidth="0.9" opacity="0.5"/>
            <circle cx={dx + dw - 7} cy={dy + 24} r="3" fill="#7c3aed" opacity="0.7"/>
          </g>
        );
      })()}

      {/* Ground / foundation */}
      <rect x={HX - 8} y={HB} width={HW + 16} height="9" rx="3"
        fill="#080c18" stroke="#1e293b" strokeWidth="1"/>
      <rect x={HX - 16} y={HB + 8} width={HW + 32} height="6" rx="2"
        fill="#060a14" stroke="#131c2e" strokeWidth="0.8"/>
    </svg>
  );
}

// ─── VIEW 2: TOP DOWN ─────────────────────────────────────────────────────────
function TopDownView({ members, statuses, layout, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  const { cols, rows, tvMode, slots } = layout;

  const U = Math.max(108, Math.floor(340 / cols));
  const CX = 200;
  const gridH = rows * U;
  const CY = 40 + gridH / 2;
  const halfCols = cols / 2;
  const halfRows = rows / 2;
  const VB_H = gridH + 130;

  function slotRect(slot) {
    const ax = CX + (slot.col - halfCols) * U;
    const ay = CY + (slot.row - halfRows) * U;
    const mx = ax + U / 2, my = ay + U / 2;
    return { ax, ay, mx, my, pw: U - 8, ph: U - 8 };
  }

  const borderX = CX - halfCols * U - 4;
  const borderY = CY - halfRows * U - 4;
  const borderW = cols * U + 8;
  const borderH = rows * U + 8;

  const badgeFs = Math.max(7.5, Math.floor(U / 12));
  const nameFs  = Math.max(10, Math.floor(U / 9));
  const emojiFs = Math.max(26, Math.floor(U / 3.8));

  return (
    <svg viewBox={`${CX - halfCols * U - 26} ${CY - halfRows * U - 38} ${cols * U + 52} ${VB_H}`}
      width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="tdglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tdtvGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tdwarmGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* House border */}
      <rect x={borderX} y={borderY} width={borderW} height={borderH} rx="12"
        fill="#07090f" stroke="#1e293b" strokeWidth="2.5"/>

      {/* Room tiles */}
      {slots.map(slot => {
        const m = getMemberForSlot(slot, members);
        const col = getSlotColor(slot, members);
        const isHov = hov === slot.slotIndex;
        const isTV = slot.type === "tv";
        const isShared = slot.type === "shared";
        const { ax, ay, mx, my, pw, ph } = slotRect(slot);
        const st = m ? (STATUS_CONFIG[statuses[m.id]] || STATUS_CONFIG.home) : null;

        return (
          <g key={slot.slotIndex}>
            {/* Warm inner glow */}
            {m && !isTV && (
              <rect x={ax + 4} y={ay + 4} width={pw} height={ph} rx="10"
                fill={col} opacity={isHov ? 0.28 : 0.16}
                filter="url(#tdwarmGlow)" style={{ pointerEvents: "none" }}/>
            )}

            {/* Room tile */}
            <rect x={ax + 4} y={ay + 4} width={pw} height={ph} rx="10"
              fill={col}
              fillOpacity={isShared ? 0.08 : isHov ? 0.70 : 0.48}
              stroke={col}
              strokeWidth={isHov ? 3.5 : m ? 2.2 : 1.5}
              strokeOpacity={isShared ? 0.14 : isHov ? 1 : m ? 0.8 : 0.3}
              filter={isHov ? "url(#tdglow)" : undefined}
              style={{ transition: "fill-opacity 0.18s, stroke-opacity 0.18s" }}/>

            {/* Highlight */}
            {!isShared && !isTV && (
              <rect x={ax + 6} y={ay + 6} width={pw - 4} height={Math.floor(ph * 0.32)} rx="8"
                fill="white" fillOpacity="0.07" style={{ pointerEvents: "none" }}/>
            )}

            {/* TV slot */}
            {isTV && (
              <g style={{ pointerEvents: "none" }}>
                <motion.rect
                  x={mx - U * 0.34} y={my - U * 0.24} width={U * 0.68} height={U * 0.48} rx="10"
                  fill="#7c3aed"
                  animate={{ opacity: [0.10, 0.28, 0.10] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  filter="url(#tdtvGlow)"
                />
                <rect x={mx - U * 0.30} y={my - U * 0.20} width={U * 0.60} height={U * 0.40} rx="8"
                  fill="#05031a" stroke={tvColor} strokeWidth="2.5"/>
                <text x={mx} y={my + 4} textAnchor="middle"
                  fontSize={Math.max(9, Math.floor(U / 8.5))} fontWeight="900"
                  fill="white" opacity="0.97" style={{ fontFamily: "system-ui,sans-serif" }}>
                  ENTER HQ
                </text>
                <text x={mx} y={my + Math.max(9, Math.floor(U / 8.5)) + 8} textAnchor="middle"
                  fontSize={Math.max(7, Math.floor(U / 12))}
                  fill={tvColor} opacity="0.8" style={{ fontFamily: "system-ui,sans-serif" }}>
                  ✨ tap to go in
                </text>
                <PortalSparkles cx={mx} cy={my} />
              </g>
            )}

            {/* Member content */}
            {m && !isTV && (
              <g style={{ pointerEvents: "none" }}>
                <text x={mx} y={my - U * 0.10} textAnchor="middle" fontSize={emojiFs}
                  style={{ fontFamily: "system-ui" }}>{m.emoji || m.name[0]}</text>
                <text x={mx} y={my + U * 0.20} textAnchor="middle" fontSize={nameFs} fontWeight="800"
                  fill="white" style={{ fontFamily: "system-ui,sans-serif" }}>{m.name}</text>
                {st && (
                  <>
                    <rect x={mx - U * 0.36} y={my + U * 0.28} width={U * 0.72} height={badgeFs + 10} rx={badgeFs / 2 + 3}
                      fill={st.bg} stroke={st.stroke} strokeWidth="0.8" opacity="0.95"/>
                    <text x={mx} y={my + U * 0.28 + badgeFs + 3} textAnchor="middle"
                      fontSize={badgeFs} fontWeight="700" fill={st.text}
                      style={{ fontFamily: "system-ui,sans-serif" }}>
                      {st.label}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Shared space */}
            {isShared && (
              <g style={{ pointerEvents: "none" }}>
                <text x={mx} y={my + 8} textAnchor="middle" fontSize={emojiFs}
                  style={{ fontFamily: "system-ui" }}>{SHARED_EMOJI[slot.sharedType]}</text>
                <text x={mx} y={my + U * 0.35} textAnchor="middle" fontSize={nameFs - 1} fontWeight="600"
                  fill="rgba(255,255,255,0.25)" style={{ fontFamily: "system-ui,sans-serif" }}>
                  {SHARED_LABEL[slot.sharedType]}
                </text>
              </g>
            )}

            {/* Hit area */}
            <rect x={ax + 4} y={ay + 4} width={pw} height={ph} rx="10"
              fill="transparent" stroke="transparent"
              style={{ cursor: (m || isTV) ? "pointer" : "default" }}
              onClick={() => isTV ? onTV() : m && onRoom(m)}
              onMouseEnter={() => setHov(slot.slotIndex)}
              onMouseLeave={() => setHov(null)}/>
          </g>
        );
      })}

      {/* TV overlay center (4 or 6 members) */}
      {tvMode === "overlay-center" && (() => {
        const stripY = CY - U * 0.17;
        const stripH = U * 0.34;
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <motion.rect x={borderX} y={stripY - 6} width={borderW} height={stripH + 12} rx="10"
              fill="#7c3aed"
              animate={{ opacity: [0.06, 0.20, 0.06] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              filter="url(#tdtvGlow)"
            />
            <rect x={borderX + 4} y={stripY} width={borderW - 8} height={stripH} rx="9"
              fill="rgba(5,3,20,0.94)" stroke="#7c3aed" strokeWidth="1.8" strokeOpacity="0.75"/>
            <TVPortal cx={CX} cy={stripY + stripH / 2} tvColor={tvColor} tvFlash={tvFlash} small/>
          </g>
        );
      })()}

      {/* TV external bottom (2 members) */}
      {tvMode === "external-bottom" && (() => {
        const barY = CY + halfRows * U + 16;
        const barH = Math.max(40, U * 0.42);
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <motion.rect x={borderX} y={barY - 4} width={borderW} height={barH + 8} rx="13"
              fill="#7c3aed"
              animate={{ opacity: [0.06, 0.20, 0.06] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              filter="url(#tdtvGlow)"
            />
            <rect x={borderX + 4} y={barY} width={borderW - 8} height={barH} rx="11"
              fill="rgba(5,3,20,0.94)" stroke="#7c3aed" strokeWidth="1.8" strokeOpacity="0.75"/>
            <TVPortal cx={CX} cy={barY + barH / 2} tvColor={tvColor} tvFlash={tvFlash} small/>
          </g>
        );
      })()}

      {/* Room dividers */}
      {Array.from({ length: cols - 1 }, (_, c) => c + 1).map(c => {
        const lx = CX + (c - halfCols) * U;
        return (
          <line key={c}
            x1={lx} y1={CY - halfRows * U}
            x2={lx} y2={CY + halfRows * U}
            stroke="rgba(255,255,255,0.07)" strokeWidth="2"/>
        );
      })}
      {rows > 1 && (
        <line x1={CX - halfCols * U} y1={CY} x2={CX + halfCols * U} y2={CY}
          stroke="rgba(255,255,255,0.07)" strokeWidth="2"/>
      )}
    </svg>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function IsometricHome() {
  const navigate = useNavigate();
  const familyCode = getFamilyCode();

  const [members, setMembers] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [view, setView] = useState("front");

  const { color: tvColor, flash: tvFlash } = useTVColor();

  useEffect(() => {
    if (!familyCode) { navigate("/", { replace: true }); return; }
    db.FamilyMember.filter({ family_code: familyCode }).then(list => {
      const sorted = [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      setMembers(sorted);
    });
  }, [familyCode]);

  useEffect(() => {
    if (!members.length || !familyCode) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      db.CalendarEvent.filter({ family_code: familyCode }),
      db.Chore.filter({ family_code: familyCode }),
      db.FamilyPhoto.filter({ family_code: familyCode }),
    ]).then(([events, chores, photos]) => {
      const s = {};
      for (const m of members) {
        const myChores = chores.filter(c => c.assigned_to === m.id);
        const dueToday = myChores.filter(c => {
          const d = (c.due_date || c.date || "").slice(0, 10);
          return d === today || !d;
        });
        const allDone = dueToday.length > 0 && dueToday.every(c => c.completed);
        const hasOverdue = dueToday.some(c => !c.completed);
        const hasEvent = events.some(e => (e.date || e.start_date || "").slice(0, 10) === today);
        const postedToday = photos.some(p =>
          p.uploaded_by === m.id && (p.created_at || "").slice(0, 10) === today
        );
        if (hasOverdue) s[m.id] = "chores_due";
        else if (allDone) s[m.id] = "done";
        else if (hasEvent) s[m.id] = "busy";
        else if (postedToday) s[m.id] = "active";
        else s[m.id] = "home";
      }
      setStatuses(s);
    }).catch(() => {});
  }, [members, familyCode]);

  const handleSelectMember = (m) => {
    setActiveMember(m);
    window.dispatchEvent(new Event("member-changed"));
    navigate("/dashboard");
  };

  const layout = getLayout(members.length);
  const viewProps = {
    members, statuses, layout,
    onRoom: handleSelectMember,
    onTV: () => navigate("/dashboard"),
    tvColor, tvFlash,
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#070b14",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Animated gradient bg */}
      <NightGradient />

      {/* Stars */}
      <StarField />

      {/* Moon — top right */}
      <Moon />

      {/* House — vertically centered between top of screen and toggle bar */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        paddingTop: 16, paddingLeft: 8, paddingRight: 8,
        paddingBottom: 80, // clears the 60px toggle + breathing room
      }}>
        <AnimatePresence mode="wait">
          <motion.div key={view}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}>
              {view === "front"
                ? <FrontView {...viewProps}/>
                : <TopDownView {...viewProps}/>
              }
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Premium frosted toggle — fixed bottom center */}
      <div style={{
        position: "fixed", bottom: 20, left: 0, right: 0, zIndex: 20,
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          display: "flex", gap: 3, padding: "5px 5px",
          borderRadius: 999,
          background: "rgba(15,10,35,0.75)",
          border: "1px solid rgba(139,92,246,0.28)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}>
          {[
            { id: "front", icon: "🏠", label: "Front" },
            { id: "top",   icon: "🗺️", label: "Top"   },
          ].map(v => {
            const active = view === v.id;
            return (
              <motion.button key={v.id} whileTap={{ scale: 0.90 }}
                onClick={() => setView(v.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 20px", borderRadius: 999, border: "none",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  fontFamily: "system-ui,sans-serif",
                  transition: "all 0.22s",
                  background: active
                    ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
                    : "transparent",
                  color: active ? "white" : "rgba(255,255,255,0.4)",
                  boxShadow: active
                    ? "0 0 18px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.3)"
                    : "none",
                }}>
                <span style={{ fontSize: 15 }}>{v.icon}</span>
                {v.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
