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

// ─── Dynamic layout engine ─────────────────────────────────────────────────────
// Returns a layout descriptor based on member count.
// Slots are ordered left-to-right, top-to-bottom.
// tvMode: "slot" = TV occupies a grid cell
//         "external-bottom" = TV bar rendered below the house (2-member)
//         "overlay-center" = TV overlay strip between rows (4 and 6 member)

const SHARED_TYPES = ["garage", "library", "garden"]; // left-to-right

function getSharedType(col, cols) {
  if (col === 0) return "garden";
  if (col === cols - 1) return "garage";
  return "library";
}

function getLayout(memberCount) {
  const count = Math.min(Math.max(memberCount, 0), 6);

  // 2 members (or 0-1 with shared spaces)
  if (count <= 2) {
    const slots = [];
    for (let c = 0; c < 2; c++) {
      const hasM = c < count;
      slots.push({
        slotIndex: c, col: c, row: 0,
        type: hasM ? "member" : "shared",
        memberId: hasM ? c : null,
        sharedType: hasM ? null : getSharedType(c, 2),
      });
    }
    return { cols: 2, rows: 1, tvMode: "external-bottom", slots };
  }

  // 3 members: 2x2 grid, TV occupies bottom-right slot
  if (count === 3) {
    return {
      cols: 2, rows: 2, tvMode: "slot", tvSlot: 3,
      slots: [
        { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
        { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
        { slotIndex: 2, col: 0, row: 1, type: "member", memberId: 2, sharedType: null },
        { slotIndex: 3, col: 1, row: 1, type: "tv",     memberId: null, sharedType: null },
      ],
    };
  }

  // 4 members: 2x2 grid, TV as center overlay
  if (count === 4) {
    return {
      cols: 2, rows: 2, tvMode: "overlay-center",
      slots: [
        { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
        { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
        { slotIndex: 2, col: 0, row: 1, type: "member", memberId: 2, sharedType: null },
        { slotIndex: 3, col: 1, row: 1, type: "member", memberId: 3, sharedType: null },
      ],
    };
  }

  // 5 members: 3x2, TV center-bottom
  if (count === 5) {
    return {
      cols: 3, rows: 2, tvMode: "slot", tvSlot: 4,
      slots: [
        { slotIndex: 0, col: 0, row: 0, type: "member", memberId: 0, sharedType: null },
        { slotIndex: 1, col: 1, row: 0, type: "member", memberId: 1, sharedType: null },
        { slotIndex: 2, col: 2, row: 0, type: "member", memberId: 2, sharedType: null },
        { slotIndex: 3, col: 0, row: 1, type: "member", memberId: 3, sharedType: null },
        { slotIndex: 4, col: 1, row: 1, type: "tv",     memberId: null, sharedType: null },
        { slotIndex: 5, col: 2, row: 1, type: "member", memberId: 4, sharedType: null },
      ],
    };
  }

  // 6 members: 3x2, TV as center overlay
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

// ─── Layout helpers ────────────────────────────────────────────────────────────
function getMemberForSlot(slot, members) {
  if (slot.type !== "member" || slot.memberId == null) return null;
  return members[slot.memberId] ?? null;
}

function getSlotColor(slot, members) {
  if (slot.type === "tv") return "#1e3a5f";
  if (slot.type === "shared") {
    return slot.sharedType === "garden" ? "#064e3b"
         : slot.sharedType === "library" ? "#1e1b4b"
         : "#292524"; // garage
  }
  const m = getMemberForSlot(slot, members);
  return m ? (MEMBER_COLORS[m.color]?.hex ?? "#8B5CF6") : "#334155";
}

const SHARED_EMOJI = { garden: "🌿", library: "📚", garage: "🚗" };
const SHARED_LABEL = { garden: "Garden", library: "Library", garage: "Garage" };

// ─── Front View geometry ───────────────────────────────────────────────────────
function getFrontGeom(cols, rows) {
  const COL_W = 100;
  const ROW_H = 100;
  const HW = cols * COL_W;
  const HH = rows * ROW_H;
  const PAD_SIDE = 50;
  const VB_W = HW + PAD_SIDE * 2;
  const HT = 130;
  const HX = PAD_SIDE;
  const HB = HT + HH;
  const CX = HX + HW / 2;
  const ROOF_H = 110;
  const VB_H = HB + 95;
  return { COL_W, ROW_H, HW, HH, HT, HX, HB, CX, ROOF_H, VB_W, VB_H };
}

// ─── Shared TV widget (used by both views) ─────────────────────────────────────
function TVWidget({ cx, cy, tvColor, tvFlash, small = false }) {
  const W = small ? 36 : 44, H = small ? 22 : 28;
  const fs = small ? 4.5 : 5;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={cx - W/2 - 3} y={cy - H/2 - 3} width={W + 6} height={H + 6} rx="5"
        fill={tvColor} opacity={tvFlash ? 0.28 : 0.10}
        filter="url(#ftvGlow)" style={{ transition: "opacity 0.2s" }}/>
      <rect x={cx - W/2} y={cy - H/2} width={W} height={H} rx="4"
        fill="#050810" stroke={tvColor} strokeWidth="1.5"/>
      <rect x={cx - W/2 + 2} y={cy - H/2 + 2} width={W - 4} height={H - 4} rx="2"
        fill={tvColor} opacity={tvFlash ? 0.22 : 0.07}/>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize={fs} fontWeight="800"
        fill="white" opacity="0.9" style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "0.5px" }}>
        ENTER HQ
      </text>
      {!small && <>
        <line x1={cx} y1={cy + H/2} x2={cx} y2={cy + H/2 + 7} stroke="#334155" strokeWidth="2"/>
        <rect x={cx - 7} y={cy + H/2 + 5} width="14" height="3" rx="1.5" fill="#334155"/>
      </>}
    </g>
  );
}

// ─── VIEW 1: FRONT ELEVATION ───────────────────────────────────────────────────
function FrontView({ members, statuses, layout, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  const { cols, rows, tvMode, slots } = layout;
  const { COL_W, ROW_H, HW, HH, HT, HX, HB, CX, ROOF_H, VB_W, VB_H } = getFrontGeom(cols, rows);
  const PAD = 10;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
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
        <linearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0f1a" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="transparent"/>
        </linearGradient>
        <linearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent"/>
          <stop offset="100%" stopColor="#0a0f1a" stopOpacity="0.4"/>
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={CX} cy={HB + 16} rx={HW * 0.55} ry="12"
        fill="rgba(0,0,0,0.45)" filter="url(#fgroundShadow)"/>

      {/* Roof triangle */}
      <polygon points={`${HX},${HT} ${CX},${HT - ROOF_H} ${HX + HW},${HT}`}
        fill="#1a1d3a" stroke="#312e81" strokeWidth="1.5"/>
      <polygon points={`${HX},${HT} ${CX},${HT - ROOF_H} ${CX},${HT}`}
        fill="#16193a" stroke="none"/>
      <line x1={CX} y1={HT - ROOF_H} x2={CX} y2={HT}
        stroke="#6d5ce7" strokeWidth="1" opacity="0.6"/>
      <line x1={HX - 8} y1={HT} x2={HX + HW + 8} y2={HT}
        stroke="#4338ca" strokeWidth="1.5" opacity="0.7"/>
      <polygon points={`${HX - 8},${HT} ${HX + HW + 8},${HT} ${HX + HW + 4},${HT + 8} ${HX - 4},${HT + 8}`}
        fill="#111827" stroke="#1e293b" strokeWidth="0.8"/>

      {/* Chimney */}
      <rect x={CX - 48} y={HT - 95} width="20" height="50" rx="1"
        fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8"/>
      <rect x={CX - 51} y={HT - 97} width="26" height="6" rx="1"
        fill="#2d2a6e" stroke="#4338ca" strokeWidth="0.7"/>
      {[0, 1, 2].map(i => (
        <motion.circle key={i} cx={CX - 38} cy={HT - 98}
          r={3 + i * 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"
          animate={{ cy: [HT - 98 - i * 6, HT - 125 - i * 8], opacity: [0.3, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}/>
      ))}

      {/* House facade */}
      <rect x={HX} y={HT} width={HW} height={HH}
        fill="#111827" stroke="#1e293b" strokeWidth="1.5"/>
      <rect x={HX} y={HT} width={HW / 3} height={HH} fill="url(#fadeL)"/>
      <rect x={HX + HW * 2 / 3} y={HT} width={HW / 3} height={HH} fill="url(#fadeR)"/>

      {/* Column dividers */}
      {Array.from({ length: cols - 1 }, (_, c) => c + 1).map(c => (
        <line key={c} x1={HX + c * COL_W} y1={HT} x2={HX + c * COL_W} y2={HB}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      ))}
      {/* Row divider */}
      {rows > 1 && (
        <line x1={HX} y1={HT + ROW_H} x2={HX + HW} y2={HT + ROW_H}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      )}

      {/* Room panels */}
      {slots.map(slot => {
        const m = getMemberForSlot(slot, members);
        const col = getSlotColor(slot, members);
        const isHov = hov === slot.slotIndex;
        const isTV = slot.type === "tv";
        const isShared = slot.type === "shared";

        const px = HX + slot.col * COL_W + PAD;
        const py = HT + slot.row * ROW_H + PAD;
        const pw = COL_W - PAD * 2;
        const ph = ROW_H - PAD * 2;
        const pcx = px + pw / 2;
        const pcy = py + ph / 2;

        return (
          <g key={slot.slotIndex}>
            {/* Panel background */}
            <rect x={px} y={py} width={pw} height={ph} rx="6"
              fill={col}
              fillOpacity={isShared ? 0.08 : isHov ? 0.32 : 0.14}
              stroke={col}
              strokeWidth={isHov ? 2 : 1}
              strokeOpacity={isShared ? 0.2 : isHov ? 1 : 0.45}
              filter={isHov ? "url(#fglow)" : undefined}
              style={{ transition: "fill-opacity 0.15s, stroke-width 0.15s" }}
            />

            {/* Window cross */}
            {!isTV && !isShared && (
              <g opacity="0.18" style={{ pointerEvents: "none" }}>
                <line x1={pcx} y1={py + 4} x2={pcx} y2={py + ph - 4} stroke={col} strokeWidth="1"/>
                <line x1={px + 4} y1={pcy} x2={px + pw - 4} y2={pcy} stroke={col} strokeWidth="1"/>
              </g>
            )}

            {/* TV slot */}
            {isTV && (
              <TVWidget cx={pcx} cy={pcy} tvColor={tvColor} tvFlash={tvFlash}/>
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
                      fill={statuses[m.id] === "busy" ? "#7f1d1d" : statuses[m.id] === "done" ? "#064e3b" : "#1e293b"}
                      opacity="0.92"/>
                    <text x={pcx} y={pcy + 13.5} textAnchor="middle" fontSize="4.8" fontWeight="700"
                      fill={statuses[m.id] === "busy" ? "#fca5a5" : statuses[m.id] === "done" ? "#6ee7b7" : "#64748b"}
                      style={{ fontFamily: "system-ui,sans-serif" }}>
                      {statuses[m.id] === "busy" ? "Busy" : statuses[m.id] === "done" ? "✓ Done" : "Home"}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Shared space content */}
            {isShared && (
              <g style={{ pointerEvents: "none" }}>
                <text x={pcx} y={pcy + 5} textAnchor="middle" fontSize="18"
                  style={{ fontFamily: "system-ui" }}>
                  {SHARED_EMOJI[slot.sharedType]}
                </text>
                <text x={pcx} y={pcy + 18} textAnchor="middle" fontSize="6" fontWeight="600"
                  fill="rgba(255,255,255,0.25)" style={{ fontFamily: "system-ui,sans-serif" }}>
                  {SHARED_LABEL[slot.sharedType]}
                </text>
              </g>
            )}

            {/* Hit area */}
            <rect x={px} y={py} width={pw} height={ph} rx="6"
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
        const stripY = HT + ROW_H - 14;
        const stripH = 28;
        const stripX = HX + 12;
        const stripW = HW - 24;
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <rect x={stripX} y={stripY} width={stripW} height={stripH} rx="8"
              fill="rgba(5,8,16,0.85)" stroke={tvColor} strokeWidth="1.2" strokeOpacity="0.55"/>
            <TVWidget cx={CX} cy={stripY + stripH / 2} tvColor={tvColor} tvFlash={tvFlash} small/>
          </g>
        );
      })()}

      {/* TV bar below house (2 members) */}
      {tvMode === "external-bottom" && (() => {
        const barY = HB + 18;
        const barH = 34;
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <rect x={HX + 10} y={barY} width={HW - 20} height={barH} rx="8"
              fill="rgba(5,8,16,0.9)" stroke={tvColor} strokeWidth="1.2" strokeOpacity="0.6"/>
            <TVWidget cx={CX} cy={barY + barH / 2} tvColor={tvColor} tvFlash={tvFlash} small/>
          </g>
        );
      })()}

      {/* Front door */}
      {(() => {
        const dw = 28, dh = 40;
        const dx = CX - dw / 2, dy = HB - dh;
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={dx} y={dy} width={dw} height={dh} rx="3"
              fill="#0d1220" stroke="#4338ca" strokeWidth="1"/>
            <path d={`M${dx},${dy + 10} Q${CX},${dy - 4} ${dx + dw},${dy + 10}`}
              fill="none" stroke="#4338ca" strokeWidth="0.8" opacity="0.6"/>
            <circle cx={dx + dw - 6} cy={dy + 22} r="2.5" fill="#6d28d9"/>
          </g>
        );
      })()}

      {/* Ground / foundation */}
      <rect x={HX - 6} y={HB} width={HW + 12} height="8" rx="2"
        fill="#0a0e1a" stroke="#1e293b" strokeWidth="1"/>
      <rect x={HX - 12} y={HB + 7} width={HW + 24} height="5" rx="1"
        fill="#090c18" stroke="#1a2535" strokeWidth="0.8"/>
    </svg>
  );
}

// ─── VIEW 2: TOP DOWN ─────────────────────────────────────────────────────────
// Status badge config
const STATUS_CONFIG = {
  chores_due: { bg: "#7f1d1d", text: "#fca5a5", label: "⚠️ Chores due" },
  done:       { bg: "#064e3b", text: "#6ee7b7", label: "✅ Done"       },
  busy:       { bg: "#1e3a5f", text: "#93c5fd", label: "📅 Busy"       },
  active:     { bg: "#3b1f5e", text: "#c4b5fd", label: "📸 Active"     },
  home:       { bg: "#1e293b", text: "#64748b", label: "🏠 Home"       },
};

function TopDownView({ members, statuses, layout, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  const { cols, rows, tvMode, slots } = layout;

  // U = cell size. We want the grid to fill ~85% of a 400-wide canvas.
  // Max grid width = cols * U = 0.85 * 400 → U = 340 / cols, min 100
  const U = Math.max(100, Math.floor(340 / cols));
  const CX = 200;
  // Center the grid vertically in a 460-tall viewBox with some top/bottom padding
  const gridH = rows * U;
  const CY = 40 + gridH / 2;  // 40px top padding
  const halfCols = cols / 2;
  const halfRows = rows / 2;

  const VB_H = gridH + 120; // viewBox height: grid + 60px top + 60px bottom for TV bar

  function slotRect(slot) {
    const ax = CX + (slot.col - halfCols) * U;
    const ay = CY + (slot.row - halfRows) * U;
    const mx = ax + U / 2, my = ay + U / 2;
    return { ax, ay, mx, my, pw: U - 6, ph: U - 6 };
  }

  const borderX = CX - halfCols * U - 3;
  const borderY = CY - halfRows * U - 3;
  const borderW = cols * U + 6;
  const borderH = rows * U + 6;

  // Badge font scales with cell size
  const badgeFs = Math.max(7, Math.floor(U / 13));
  const nameFs  = Math.max(9, Math.floor(U / 10));
  const emojiFs = Math.max(22, Math.floor(U / 4));

  return (
    <svg viewBox={`${CX - halfCols * U - 24} ${CY - halfRows * U - 36} ${cols * U + 48} ${VB_H}`}
      width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="tdglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tdtvGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="10" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer house border */}
      <rect x={borderX} y={borderY} width={borderW} height={borderH} rx="10"
        fill="#090c14" stroke="#1e293b" strokeWidth="2.5"/>

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
            {/* Room background — vibrant fill */}
            <rect x={ax + 3} y={ay + 3} width={pw} height={ph} rx="8"
              fill={col}
              fillOpacity={isShared ? 0.08 : isHov ? 0.65 : 0.45}
              stroke={col}
              strokeWidth={isHov ? 3 : 1.8}
              strokeOpacity={isShared ? 0.15 : isHov ? 1 : 0.7}
              filter={isHov ? "url(#tdglow)" : undefined}
              style={{ transition: "fill-opacity 0.15s, stroke-opacity 0.15s" }}/>
            {/* Subtle inner highlight */}
            {!isShared && !isTV && (
              <rect x={ax + 5} y={ay + 5} width={pw - 4} height={Math.floor(ph * 0.35)} rx="6"
                fill="white" fillOpacity="0.06"/>
            )}

            {/* TV slot */}
            {isTV && (
              <g style={{ pointerEvents: "none" }}>
                {/* Outer glow */}
                <rect x={mx - U * 0.32} y={my - U * 0.22} width={U * 0.64} height={U * 0.44} rx="8"
                  fill={tvColor} opacity={tvFlash ? 0.50 : 0.22}
                  filter="url(#tdtvGlow)" style={{ transition: "opacity 0.22s" }}/>
                {/* Screen */}
                <rect x={mx - U * 0.28} y={my - U * 0.18} width={U * 0.56} height={U * 0.36} rx="6"
                  fill="#050810" stroke={tvColor} strokeWidth="2"/>
                <text x={mx} y={my + 4} textAnchor="middle"
                  fontSize={Math.max(8, Math.floor(U / 9))} fontWeight="800"
                  fill="white" opacity="0.97" style={{ fontFamily: "system-ui,sans-serif" }}>
                  ENTER HQ
                </text>
              </g>
            )}

            {/* Member content */}
            {m && !isTV && (
              <g style={{ pointerEvents: "none" }}>
                <text x={mx} y={my - U * 0.12} textAnchor="middle" fontSize={emojiFs}
                  style={{ fontFamily: "system-ui" }}>{m.emoji || m.name[0]}</text>
                <text x={mx} y={my + U * 0.18} textAnchor="middle" fontSize={nameFs} fontWeight="700"
                  fill={col} style={{ fontFamily: "system-ui,sans-serif" }}>{m.name}</text>
                {st && (
                  <>
                    <rect x={mx - U * 0.38} y={my + U * 0.26} width={U * 0.76} height={badgeFs + 8} rx={badgeFs / 2 + 2}
                      fill={st.bg} opacity="0.95"/>
                    <text x={mx} y={my + U * 0.26 + badgeFs + 2} textAnchor="middle"
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
                <text x={mx} y={my + 6} textAnchor="middle" fontSize={emojiFs}
                  style={{ fontFamily: "system-ui" }}>{SHARED_EMOJI[slot.sharedType]}</text>
                <text x={mx} y={my + U * 0.32} textAnchor="middle" fontSize={nameFs - 1} fontWeight="600"
                  fill="rgba(255,255,255,0.22)" style={{ fontFamily: "system-ui,sans-serif" }}>
                  {SHARED_LABEL[slot.sharedType]}
                </text>
              </g>
            )}

            {/* Hit area */}
            <rect x={ax + 3} y={ay + 3} width={pw} height={ph} rx="8"
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
        const stripY = CY - U * 0.16;
        const stripH = U * 0.32;
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <rect x={borderX + 4} y={stripY} width={borderW - 8} height={stripH} rx="8"
              fill="rgba(5,8,16,0.92)" stroke={tvColor} strokeWidth="1.5" strokeOpacity="0.6"/>
            <g style={{ pointerEvents: "none" }}>
              <rect x={CX - U * 0.22} y={stripY + 4} width={U * 0.44} height={stripH - 8} rx="5"
                fill={tvColor} opacity={tvFlash ? 0.35 : 0.15} filter="url(#tdtvGlow)"/>
              <rect x={CX - U * 0.20} y={stripY + 6} width={U * 0.40} height={stripH - 12} rx="4"
                fill="#050810" stroke={tvColor} strokeWidth="1.2"/>
              <text x={CX} y={stripY + stripH / 2 + 4} textAnchor="middle"
                fontSize={Math.max(7, Math.floor(U / 10))} fontWeight="800"
                fill="white" opacity="0.95" style={{ fontFamily: "system-ui,sans-serif" }}>
                ENTER HQ
              </text>
            </g>
          </g>
        );
      })()}

      {/* TV external bottom (2 members) */}
      {tvMode === "external-bottom" && (() => {
        const barY = CY + halfRows * U + 14;
        const barH = Math.max(36, U * 0.4);
        return (
          <g style={{ cursor: "pointer" }} onClick={onTV}>
            <rect x={borderX + 4} y={barY} width={borderW - 8} height={barH} rx="9"
              fill="rgba(5,8,16,0.92)" stroke={tvColor} strokeWidth="1.5" strokeOpacity="0.6"/>
            <g style={{ pointerEvents: "none" }}>
              <rect x={CX - U * 0.22} y={barY + 5} width={U * 0.44} height={barH - 10} rx="5"
                fill={tvColor} opacity={tvFlash ? 0.35 : 0.15} filter="url(#tdtvGlow)"/>
              <rect x={CX - U * 0.20} y={barY + 7} width={U * 0.40} height={barH - 14} rx="4"
                fill="#050810" stroke={tvColor} strokeWidth="1.2"/>
              <text x={CX} y={barY + barH / 2 + 5} textAnchor="middle"
                fontSize={Math.max(7, Math.floor(U / 10))} fontWeight="800"
                fill="white" opacity="0.95" style={{ fontFamily: "system-ui,sans-serif" }}>
                ENTER HQ
              </text>
            </g>
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
            stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
        );
      })}
      {rows > 1 && (
        <line x1={CX - halfCols * U} y1={CY} x2={CX + halfCols * U} y2={CY}
          stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
      )}
    </svg>
  );
}

// ─── Centered popup ────────────────────────────────────────────────────────────
function CenteredPopup({ children, onClose }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}/>
      <div style={{ position: "fixed", inset: 0, zIndex: 61, display: "flex", alignItems: "flex-end",
        justifyContent: "center", paddingBottom: 28, pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", width: "85vw", maxWidth: 340 }}>{children}</div>
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
    db.FamilyMember.filter({ family_code: familyCode }).then(list => {
      // Sort by id for stable slot assignment
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
        const hasEvent = events.some(e => (e.date || e.start_date || "").slice(0, 10) === today);
        const myChores = chores.filter(c => c.assigned_to === m.id);
        const dueToday = myChores.filter(c => {
          const d = (c.due_date || c.date || "").slice(0, 10);
          return d === today || !d;
        });
        const allDone = dueToday.length > 0 && dueToday.every(c => c.completed);
        const hasOverdue = dueToday.some(c => !c.completed);
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

  const handleSwitchToMember = (m) => {
    setActiveMember(m);
    window.dispatchEvent(new Event("member-changed"));
    setSelectedMember(null);
    navigate("/dashboard");
  };

  const layout = getLayout(members.length);

  const viewProps = {
    members, statuses, layout,
    onRoom: setSelectedMember,
    onTV: () => navigate("/dashboard"),
    tvColor, tvFlash,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0d14", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <StarField />

      {/* Top bar */}
      <header style={{ position: "relative", zIndex: 10, flexShrink: 0, display: "flex",
        alignItems: "center", padding: "10px 14px" }}>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSidebarOpen(true)}
          style={{ width: 36, height: 36, borderRadius: 10, border: "none",
            background: "rgba(255,255,255,0.07)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Menu style={{ width: 18, height: 18, color: "rgba(255,255,255,0.65)" }}/>
        </motion.button>

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15,
            background: "linear-gradient(135deg,#fff 0%,#c4b5fd 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            🏠 Family HQ
          </span>
        </div>

        {member ? (
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate("/select")}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
              background: memberColor.hex, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 15, fontWeight: 700,
              boxShadow: `0 0 14px ${memberColor.hex}55` }}>
            {member.emoji || member.name[0]}
          </motion.button>
        ) : <div style={{ width: 36, height: 36, flexShrink: 0 }}/>}
      </header>

      {/* House — fills remaining space */}
      <div style={{ position: "relative", zIndex: 10, flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px 70px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={view}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}>
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
        position: "fixed", bottom: 16, left: 0, right: 0, zIndex: 20,
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          display: "flex", gap: 4, padding: "5px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
        }}>
          {[
            { id: "front", icon: "🏠", label: "Front" },
            { id: "top",   icon: "🗺️", label: "Top" },
          ].map(v => {
            const active = view === v.id;
            return (
              <motion.button key={v.id} whileTap={{ scale: 0.92 }}
                onClick={() => setView(v.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 16px", borderRadius: 999, border: "none",
                  cursor: "pointer", fontSize: 12, fontWeight: 700,
                  transition: "all 0.2s",
                  background: active ? memberColor.hex : "transparent",
                  color: active ? "white" : "rgba(255,255,255,0.45)",
                  boxShadow: active ? `0 0 14px ${memberColor.hex}55` : "none",
                }}>
                <span style={{ fontSize: 14 }}>{v.icon}</span>
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
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}>
              {(() => {
                const col = MEMBER_COLORS[selectedMember.color] || MEMBER_COLORS.purple;
                const st = statuses[selectedMember.id];
                return (
                  <div style={{ borderRadius: 22, padding: "18px 18px 16px",
                    background: "rgba(10,8,24,0.98)", border: `1px solid ${col.hex}45`,
                    boxShadow: `0 0 40px ${col.hex}20, 0 20px 60px rgba(0,0,0,0.7)` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: `${col.hex}20`, boxShadow: `0 0 16px ${col.hex}35`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                        {selectedMember.emoji || selectedMember.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "white", fontWeight: 700, fontSize: 16, margin: "0 0 2px" }}>{selectedMember.name}</p>
                        <p style={{ color: col.hex, fontSize: 11, margin: "0 0 6px" }}>{selectedMember.role}</p>
                        <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999,
                          fontSize: 10, fontWeight: 700,
                          background: st === "busy" ? "rgba(127,29,29,0.55)" : st === "done" ? "rgba(6,78,59,0.55)" : "rgba(30,37,51,0.55)",
                          color: st === "busy" ? "#fca5a5" : st === "done" ? "#6ee7b7" : "#94a3b8" }}>
                          {st === "busy" ? "📅 Busy" : st === "done" ? "✅ Done" : "🏠 Home"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 14 }}>
                      {[["XP", selectedMember.xp ?? 0], ["Streak 🔥", selectedMember.streak ?? 0], ["Level", selectedMember.level ?? 1]].map(([l, v]) => (
                        <div key={l} style={{ textAlign: "center" }}>
                          <p style={{ color: "white", fontWeight: 700, fontSize: 17, margin: 0 }}>{v}</p>
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0 }}>{l}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 9 }}>
                      <button onClick={() => setSelectedMember(null)} style={{ flex: 1, padding: "10px 0",
                        borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Close</button>
                      <motion.button whileTap={{ scale: 0.96 }}
                        onClick={() => handleSwitchToMember(selectedMember)}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 14, border: "none",
                          background: `linear-gradient(135deg,${col.hex},${col.hex}aa)`,
                          color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
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
            <motion.div key="sb-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
              onClick={() => setSidebarOpen(false)}/>
            <motion.aside key="sb" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 90, width: 256,
                display: "flex", flexDirection: "column", background: "rgba(10,10,18,0.97)",
                borderRight: `1px solid ${memberColor.hex}28`,
                paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 11 }}>
                {member && <div style={{ width: 38, height: 38, borderRadius: "50%", background: memberColor.hex,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: 15 }}>{member.emoji || member.name[0]}</div>}
                <div>
                  <p style={{ color: "white", fontWeight: 600, fontSize: 13, margin: 0 }}>{member?.name ?? "Family HQ"}</p>
                  <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 11, margin: 0 }}>{member?.role ?? ""}</p>
                </div>
              </div>
              <nav style={{ flex: 1, padding: 10, overflowY: "auto" }}>
                {[["🏠 HQ Home", "/outdoor"], ["📊 Dashboard", "/dashboard"], ["📅 Calendar", "/calendar"],
                  ["✅ Chores", "/chores"], ["🍽️ Meals", "/meals"], ["💰 Budget", "/budget"],
                  ["📌 Board", "/noticeboard"], ["🎯 Goals", "/goals"], ["🎁 Rewards", "/rewards"],
                  ["📸 Moments", "/moments"], ["📖 Guide", "/guide"]].map(([label, path]) => (
                  <button key={path} onClick={() => { setSidebarOpen(false); navigate(path); }}
                    style={{ width: "100%", display: "block", padding: "10px 14px", borderRadius: 10,
                      border: "none", background: "transparent", color: "rgba(255,255,255,0.52)",
                      fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", marginBottom: 1 }}>
                    {label}
                  </button>
                ))}
              </nav>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
                <button onClick={() => { setSidebarOpen(false); navigate("/select"); }}
                  style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "none",
                    background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 12,
                    cursor: "pointer", textAlign: "left" }}>Switch Member</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
