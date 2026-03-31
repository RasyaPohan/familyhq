import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { getActiveMember, getFamilyCode, setActiveMember, MEMBER_COLORS } from "@/lib/familyStore";
import { db } from "@/lib/db";

// ─── Star field (static seed so no re-render flicker) ─────────────────────────
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
          style={{
            position: "absolute", borderRadius: "50%", background: "white",
            left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r,
          }}
          animate={{ opacity: [0.06, 0.55, 0.06] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Isometric projection ──────────────────────────────────────────────────────
// Origin at screen (200, 300). Scale = 42px per isometric unit.
// iso_x → right-forward, iso_y → left-forward, iso_z → up
const S = 42; // scale
const OX = 200, OY = 300; // origin

function iso(ix, iy, iz = 0) {
  return [
    OX + (ix - iy) * S * Math.cos(Math.PI / 6),
    OY + (ix + iy) * S * Math.sin(Math.PI / 6) - iz * S,
  ];
}

function pt(ix, iy, iz = 0) {
  const [x, y] = iso(ix, iy, iz);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function pts(...coords) {
  return coords.map(([ix, iy, iz]) => pt(ix, iy, iz)).join(" ");
}

// ─── House geometry constants ─────────────────────────────────────────────────
// House footprint: x from -3 to 3, y from -2 to 2, walls z from 0 to 2.5
// Roof ridge at z=4, centered x=0, spanning y -2 to 2
const WX = 3, WY = 2, WZ = 2.5, RZ = 4;

// 8 box corners
// Bottom: BFL(-3,-2,0) BFR(3,-2,0) BBR(3,2,0) BBL(-3,2,0)
// Top:    TFL(-3,-2,WZ) TFR(3,-2,WZ) TBR(3,2,WZ) TBL(-3,2,WZ)
// Ridge:  RF(0,-2,RZ) RB(0,2,RZ)

// ─── Room definitions (6 rooms in a 3×2 grid) ────────────────────────────────
// Grid: x cols [-3,-1], [-1,1], [1,3]; y rows [-2,0], [0,2]
// Layout:
//   Row 0 (front, y -2..0): Rasya(-3→-1), Living(-1→1), Dad(1→3)
//   Row 1 (back,  y 0..2):  Mom(-3→-1),  Hallway(-1→1), Radif(1→3)
//   Rania gets an attic room (roof level) — displayed as a loft label

const ROOMS = [
  {
    id: "rasya",
    nameMatch: "rasya",
    col: [-3, -1], row: [-2, 0],
    defaultColor: "#8B5CF6",
    label: "Rasya",
    furniture: "bed-tl",
  },
  {
    id: "living",
    nameMatch: null,
    col: [-1, 1], row: [-2, 0],
    defaultColor: "#334155",
    label: "Living",
    furniture: "tv",
  },
  {
    id: "dad",
    nameMatch: "dad",
    col: [1, 3], row: [-2, 0],
    defaultColor: "#1E40AF",
    label: "Dad",
    furniture: "desk-tr",
  },
  {
    id: "mom",
    nameMatch: "mom",
    col: [-3, -1], row: [0, 2],
    defaultColor: "#EC4899",
    label: "Mom",
    furniture: "bed-bl",
  },
  {
    id: "hallway",
    nameMatch: null,
    col: [-1, 1], row: [0, 2],
    defaultColor: "#1e293b",
    label: "",
    furniture: "plant",
  },
  {
    id: "radif",
    nameMatch: "radif",
    col: [1, 3], row: [0, 2],
    defaultColor: "#F59E0B",
    label: "Radif",
    furniture: "bed-br",
  },
];

// TV cycling colors
const TV_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#F59E0B"];

// ─── Member mapping helpers ───────────────────────────────────────────────────
function getMemberForRoom(roomId, members) {
  if (!members.length) return null;
  switch (roomId) {
    case "rasya":
      return members.find((m) => m.name?.toLowerCase().includes("rasya")) ?? null;
    case "dad":
      return members.find((m) =>
        m.role === "Parent" &&
        m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)
      ) ?? null;
    case "mom":
      return members.find((m) =>
        m.role === "Parent" &&
        !m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)
      ) ?? null;
    case "radif":
      return members.find((m) => m.name?.toLowerCase().includes("radif")) ?? null;
    case "rania":
      return members.find((m) => m.name?.toLowerCase().includes("rania")) ?? null;
    default:
      return null;
  }
}

// ─── Furniture SVG elements (isometric) ──────────────────────────────────────
function Furniture({ type, x1, y1, x2, y2, color }) {
  // x1,y1 = near corner; x2,y2 = far corner of the room tile
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;

  if (type === "tv") {
    // TV screen on far wall — drawn as a glowing rect in iso space
    // positioned near center of living room
    const [sx, sy] = iso(mx - 0.3, my - 1.6, 1.0);
    const [ex, ey] = iso(mx + 0.3, my - 1.6, 1.0);
    return (
      <g>
        {/* TV stand */}
        <line x1={sx.toFixed(1)} y1={(sy + 14).toFixed(1)}
          x2={sx.toFixed(1)} y2={(sy + 20).toFixed(1)}
          stroke="#334155" strokeWidth="2" />
        {/* Screen body */}
        <rect
          x={(sx - 18).toFixed(1)} y={(sy - 10).toFixed(1)}
          width="36" height="24" rx="2"
          fill="#0a0e1a" stroke="none"
        />
      </g>
    );
  }

  if (type === "bed-tl" || type === "bed-bl" || type === "bed-br") {
    const bx = type === "bed-tl" ? x1 + 0.4 : type === "bed-bl" ? x1 + 0.4 : x2 - 1.6;
    const by = type === "bed-tl" ? y1 + 0.3 : y2 - 1.4;
    // Bed: a flat isometric box
    return (
      <g opacity="0.85">
        {/* Mattress top */}
        <polygon points={pts([bx,by+0.6,0.4],[bx+1.0,by+0.6,0.4],[bx+1.0,by+1.3,0.4],[bx,by+1.3,0.4])}
          fill={color} fillOpacity="0.25" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
        {/* Headboard */}
        <polygon points={pts([bx,by+0.6,0.4],[bx+1.0,by+0.6,0.4],[bx+1.0,by+0.6,0.75],[bx,by+0.6,0.75])}
          fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.5" strokeOpacity="0.5" />
        {/* Pillow */}
        <polygon points={pts([bx+0.15,by+0.7,0.42],[bx+0.55,by+0.7,0.42],[bx+0.55,by+0.92,0.42],[bx+0.15,by+0.92,0.42])}
          fill="white" fillOpacity="0.15" />
      </g>
    );
  }

  if (type === "desk-tr") {
    const dx = x2 - 1.4, dy = y1 + 0.3;
    return (
      <g opacity="0.85">
        {/* Desk top */}
        <polygon points={pts([dx,dy,0.5],[dx+1.0,dy,0.5],[dx+1.0,dy+0.7,0.5],[dx,dy+0.7,0.5])}
          fill={color} fillOpacity="0.25" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" />
        {/* Monitor */}
        <polygon points={pts([dx+0.3,dy+0.05,0.5],[dx+0.8,dy+0.05,0.5],[dx+0.8,dy+0.05,0.85],[dx+0.3,dy+0.05,0.85])}
          fill="#1e3a5f" fillOpacity="0.8" stroke="#3b82f6" strokeWidth="0.5" />
      </g>
    );
  }

  if (type === "plant") {
    const [px, py] = iso(mx, my, 0.05);
    return (
      <g>
        <rect x={(px - 5).toFixed(1)} y={(py - 4).toFixed(1)} width="10" height="8" rx="2"
          fill="#14532d" opacity="0.7" />
        <circle cx={px.toFixed(1)} cy={(py - 8).toFixed(1)} r="8"
          fill="#166534" opacity="0.6" />
        <circle cx={(px - 5).toFixed(1)} cy={(py - 5).toFixed(1)} r="5"
          fill="#15803d" opacity="0.5" />
        <circle cx={(px + 5).toFixed(1)} cy={(py - 5).toFixed(1)} r="5"
          fill="#15803d" opacity="0.5" />
      </g>
    );
  }
  return null;
}

// ─── Room floor tile ──────────────────────────────────────────────────────────
function RoomTile({ room, member, memberColor, isHovered, status, onClick, onEnter, onLeave }) {
  const [x1, x2] = room.col;
  const [y1, y2] = room.row;
  const color = memberColor || room.defaultColor;

  // 4 floor corners (z=0)
  const floorPts = pts([x1,y1,0],[x2,y1,0],[x2,y2,0],[x1,y2,0]);

  // Wall strips — only draw forward-facing walls
  // Left wall (visible if this is a front row room, y1 == -2) → front face
  // Right wall (x2 == 3) → right face
  const isFrontRow = y1 === -2;
  const isRightCol = x2 === 3;
  const isLeftCol = x1 === -3;

  return (
    <g>
      {/* Floor */}
      <polygon
        points={floorPts}
        fill={color}
        fillOpacity={isHovered ? 0.28 : 0.14}
        stroke={color}
        strokeWidth={isHovered ? 1.5 : 0.7}
        strokeOpacity={isHovered ? 0.9 : 0.4}
        style={{ transition: "fill-opacity 0.18s" }}
      />
      {/* Subtle inner wall coloring on front face */}
      {isFrontRow && (
        <polygon
          points={pts([x1,y1,0],[x2,y1,0],[x2,y1,WZ],[x1,y1,WZ])}
          fill={color}
          fillOpacity={isHovered ? 0.15 : 0.07}
          stroke={color}
          strokeWidth="0.4"
          strokeOpacity="0.2"
          style={{ transition: "fill-opacity 0.18s", pointerEvents: "none" }}
        />
      )}
      {/* Furniture */}
      {room.id !== "hallway" && room.id !== "living" && (
        <Furniture type={room.furniture} x1={x1} y1={y1} x2={x2} y2={y2} color={color} />
      )}
      {/* Hit area */}
      <polygon
        points={floorPts}
        fill="transparent"
        stroke="transparent"
        strokeWidth="8"
        style={{ cursor: (member || room.id === "living") ? "pointer" : "default" }}
        onClick={onClick}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onTouchStart={onEnter}
        onTouchEnd={onLeave}
      />
    </g>
  );
}

// ─── Room label (floats above floor) ─────────────────────────────────────────
function RoomLabel({ room, member, memberColor, status }) {
  const [x1, x2] = room.col;
  const [y1, y2] = room.row;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const [lx, ly] = iso(mx, my, 0.05);
  const color = memberColor || room.defaultColor;

  if (!member && room.id !== "living") return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      {member && (
        <>
          {/* Emoji */}
          <text x={lx.toFixed(1)} y={(ly - 10).toFixed(1)}
            textAnchor="middle" fontSize="11" style={{ fontFamily: "system-ui" }}>
            {member.emoji || member.name[0]}
          </text>
          {/* Name */}
          <text x={lx.toFixed(1)} y={(ly + 3).toFixed(1)}
            textAnchor="middle" fontSize="6" fontWeight="700" fill={color}
            style={{ fontFamily: "system-ui,sans-serif" }}>
            {member.name}
          </text>
          {/* Status badge */}
          {status && (
            <>
              <rect x={(lx - 13).toFixed(1)} y={(ly + 5).toFixed(1)} width="26" height="8" rx="4"
                fill={status === "busy" ? "#7f1d1d" : status === "done" ? "#064e3b" : "#1e293b"}
                opacity="0.9" />
              <text x={lx.toFixed(1)} y={(ly + 11).toFixed(1)}
                textAnchor="middle" fontSize="4.5" fontWeight="700"
                fill={status === "busy" ? "#fca5a5" : status === "done" ? "#6ee7b7" : "#64748b"}
                style={{ fontFamily: "system-ui,sans-serif" }}>
                {status === "busy" ? "Busy" : status === "done" ? "✓ Done" : "Home"}
              </text>
            </>
          )}
        </>
      )}
    </g>
  );
}

// ─── TV Screen (living room center) ──────────────────────────────────────────
function TVScreen({ onTVClick, tvColor, tvFlash }) {
  // TV sits on far wall of living room (y ≈ -1, x ≈ 0)
  const [cx, cy] = iso(0, -1.6, 1.1);
  const w = 26, h = 18;
  return (
    <g style={{ cursor: "pointer" }} onClick={onTVClick}>
      <defs>
        <filter id="tvG" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Glow halo */}
      <rect x={(cx - w - 4).toFixed(1)} y={(cy - h - 4).toFixed(1)}
        width={(w * 2 + 8).toFixed(1)} height={(h + 8).toFixed(1)} rx="5"
        fill={tvColor} opacity={tvFlash ? 0.35 : 0.15}
        filter="url(#tvG)"
        style={{ transition: "opacity 0.25s" }}
      />
      {/* Screen */}
      <rect x={(cx - w).toFixed(1)} y={(cy - h).toFixed(1)}
        width={(w * 2).toFixed(1)} height={h.toFixed(1)} rx="3"
        fill="#060a14" stroke={tvColor} strokeWidth="1.8"
      />
      {/* Screen fill */}
      <rect x={(cx - w + 2).toFixed(1)} y={(cy - h + 2).toFixed(1)}
        width={(w * 2 - 4).toFixed(1)} height={(h - 4).toFixed(1)} rx="2"
        fill={tvColor} opacity={tvFlash ? 0.3 : 0.1}
        style={{ transition: "opacity 0.2s" }}
      />
      {/* Label */}
      <text x={cx.toFixed(1)} y={(cy - h / 2 + 2).toFixed(1)}
        textAnchor="middle" fontSize="5.2" fontWeight="800" fill="white" opacity="0.95"
        style={{ fontFamily: "system-ui,sans-serif", letterSpacing: "0.5px" }}>
        ENTER HQ
      </text>
      {/* Stand */}
      <line x1={cx.toFixed(1)} y1={cy.toFixed(1)}
        x2={cx.toFixed(1)} y2={(cy + 10).toFixed(1)}
        stroke="#334155" strokeWidth="2.5" />
      <rect x={(cx - 8).toFixed(1)} y={(cy + 8).toFixed(1)} width="16" height="4" rx="2"
        fill="#334155" />
    </g>
  );
}

// ─── Full isometric house SVG ─────────────────────────────────────────────────
function IsometricHouse({ members, memberStatuses, onRoomClick, onTVClick }) {
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tvColorIdx, setTvColorIdx] = useState(0);
  const [tvFlash, setTvFlash] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTvColorIdx((i) => (i + 1) % TV_COLORS.length);
      setTvFlash(true);
      setTimeout(() => setTvFlash(false), 280);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const tvColor = TV_COLORS[tvColorIdx];

  return (
    <svg
      viewBox="30 90 340 310"
      width="100%" height="100%"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter id="wallShadow" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="roofGlow" x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Ground shadow ── */}
      <ellipse cx={OX} cy={OY + 5} rx="145" ry="16"
        fill="rgba(0,0,0,0.45)" />

      {/* ── Floor / base slab ── */}
      <polygon
        points={pts([-WX,-WY,0],[WX,-WY,0],[WX,WY,0],[-WX,WY,0])}
        fill="#0f1623" stroke="#1e293b" strokeWidth="1"
      />

      {/* ── Room tiles (back row first for correct z-order) ── */}
      {[...ROOMS].reverse().map((room) => {
        const member = getMemberForRoom(room.id, members);
        const color = member ? (MEMBER_COLORS[member.color]?.hex || room.defaultColor) : room.defaultColor;
        const status = member ? memberStatuses[member.id] : null;
        return (
          <RoomTile
            key={room.id}
            room={room}
            member={member}
            memberColor={color}
            isHovered={hoveredRoom === room.id}
            status={status}
            onClick={() => {
              if (room.id === "living") onTVClick();
              else if (member) onRoomClick(member);
            }}
            onEnter={() => setHoveredRoom(room.id)}
            onLeave={() => setHoveredRoom(null)}
          />
        );
      })}

      {/* ── Room divider lines on floor ── */}
      {/* Vertical dividers (x = -1 and x = 1) */}
      {[-1, 1].map((x) => (
        <line key={`vd-${x}`}
          x1={iso(x, -WY)[0].toFixed(1)} y1={iso(x, -WY)[1].toFixed(1)}
          x2={iso(x, WY)[0].toFixed(1)} y2={iso(x, WY)[1].toFixed(1)}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"
        />
      ))}
      {/* Horizontal divider (y = 0) */}
      <line
        x1={iso(-WX, 0)[0].toFixed(1)} y1={iso(-WX, 0)[1].toFixed(1)}
        x2={iso(WX, 0)[0].toFixed(1)} y2={iso(WX, 0)[1].toFixed(1)}
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"
      />

      {/* ── Left wall (x = -3, faces viewer-left) ── */}
      <polygon
        points={pts([-WX,-WY,0],[-WX,WY,0],[-WX,WY,WZ],[-WX,-WY,WZ])}
        fill="#101825" stroke="#1e293b" strokeWidth="1"
        filter="url(#wallShadow)"
      />
      {/* Left wall top edge glow */}
      <line
        x1={iso(-WX,-WY,WZ)[0].toFixed(1)} y1={iso(-WX,-WY,WZ)[1].toFixed(1)}
        x2={iso(-WX,WY,WZ)[0].toFixed(1)} y2={iso(-WX,WY,WZ)[1].toFixed(1)}
        stroke="#4338ca" strokeWidth="0.8" opacity="0.4"
      />

      {/* ── Right wall (x = 3, faces viewer-right) ── */}
      <polygon
        points={pts([WX,-WY,0],[WX,WY,0],[WX,WY,WZ],[WX,-WY,WZ])}
        fill="#0c1220" stroke="#1e293b" strokeWidth="1"
        filter="url(#wallShadow)"
      />
      <line
        x1={iso(WX,-WY,WZ)[0].toFixed(1)} y1={iso(WX,-WY,WZ)[1].toFixed(1)}
        x2={iso(WX,WY,WZ)[0].toFixed(1)} y2={iso(WX,WY,WZ)[1].toFixed(1)}
        stroke="#4338ca" strokeWidth="0.8" opacity="0.4"
      />

      {/* ── Front wall (y = -2, faces viewer-front) ── */}
      <polygon
        points={pts([-WX,-WY,0],[WX,-WY,0],[WX,-WY,WZ],[-WX,-WY,WZ])}
        fill="#131d2e" stroke="#1e293b" strokeWidth="1"
      />

      {/* Front wall windows */}
      {[-1.8, 1.8].map((wx, i) => {
        const [sx, sy] = iso(wx, -WY, 1.4);
        return (
          <g key={`fw-${i}`}>
            <rect x={(sx - 10).toFixed(1)} y={(sy - 9).toFixed(1)} width="20" height="15" rx="2"
              fill="#090d14" stroke="#4338ca" strokeWidth="0.8" />
            <rect x={(sx - 10).toFixed(1)} y={(sy - 9).toFixed(1)} width="20" height="15" rx="2"
              fill="#8B5CF6" opacity="0.06" />
            <line x1={sx.toFixed(1)} y1={(sy - 9).toFixed(1)} x2={sx.toFixed(1)} y2={(sy + 6).toFixed(1)}
              stroke="#4338ca" strokeWidth="0.5" opacity="0.4" />
            <line x1={(sx - 10).toFixed(1)} y1={(sy - 2).toFixed(1)} x2={(sx + 10).toFixed(1)} y2={(sy - 2).toFixed(1)}
              stroke="#4338ca" strokeWidth="0.5" opacity="0.4" />
          </g>
        );
      })}

      {/* Front wall door */}
      {(() => {
        const [dx, dy] = iso(0, -WY, 0);
        return (
          <g>
            <rect x={(dx - 9).toFixed(1)} y={(dy - 22).toFixed(1)} width="18" height="22" rx="2"
              fill="#0e1628" stroke="#4338ca" strokeWidth="1" />
            <circle cx={(dx + 5).toFixed(1)} cy={(dy - 11).toFixed(1)} r="2" fill="#6d28d9" />
          </g>
        );
      })()}

      {/* ── Back wall top edge (visible above roof) ── */}
      <line
        x1={iso(-WX,WY,WZ)[0].toFixed(1)} y1={iso(-WX,WY,WZ)[1].toFixed(1)}
        x2={iso(WX,WY,WZ)[0].toFixed(1)} y2={iso(WX,WY,WZ)[1].toFixed(1)}
        stroke="#1e293b" strokeWidth="1"
      />

      {/* ── Roof ── */}
      {/* Left face (viewer-left) */}
      <polygon
        points={pts([-WX,-WY,WZ],[-WX,WY,WZ],[0,WY,RZ],[0,-WY,RZ])}
        fill="#1a1d3a" stroke="#312e81" strokeWidth="1.2"
        filter="url(#roofGlow)"
      />
      {/* Right face (viewer-right) */}
      <polygon
        points={pts([WX,-WY,WZ],[WX,WY,WZ],[0,WY,RZ],[0,-WY,RZ])}
        fill="#15183a" stroke="#312e81" strokeWidth="1.2"
      />
      {/* Ridge line */}
      <line
        x1={iso(0,-WY,RZ)[0].toFixed(1)} y1={iso(0,-WY,RZ)[1].toFixed(1)}
        x2={iso(0,WY,RZ)[0].toFixed(1)} y2={iso(0,WY,RZ)[1].toFixed(1)}
        stroke="#6d5ce7" strokeWidth="1.2" opacity="0.7"
      />

      {/* Roof accent lines */}
      {[-WX, WX].map((rx, i) => (
        <line key={`ra-${i}`}
          x1={iso(rx,-WY,WZ)[0].toFixed(1)} y1={iso(rx,-WY,WZ)[1].toFixed(1)}
          x2={iso(0,-WY,RZ)[0].toFixed(1)} y2={iso(0,-WY,RZ)[1].toFixed(1)}
          stroke="#4338ca" strokeWidth="0.6" opacity="0.35"
        />
      ))}

      {/* ── Chimney ── */}
      {(() => {
        const cx1 = -0.8, cy1 = -1.0;
        return (
          <g>
            <polygon points={pts([cx1,cy1,RZ-0.5],[cx1+0.4,cy1,RZ-0.5],[cx1+0.4,cy1,RZ+0.5],[cx1,cy1,RZ+0.5])}
              fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.7" />
            <polygon points={pts([cx1-0.05,cy1-0.1,RZ+0.5],[cx1+0.45,cy1-0.1,RZ+0.5],[cx1+0.45,cy1+0.1,RZ+0.5],[cx1-0.05,cy1+0.1,RZ+0.5])}
              fill="#2d2a6e" />
            {[0,1,2].map((i) => {
              const [smx, smy] = iso(cx1 + 0.2, cy1, RZ + 0.6 + i * 0.2);
              return (
                <motion.circle key={i} cx={smx.toFixed(1)} cy={smy.toFixed(1)} r={2 + i * 1.5}
                  fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"
                  animate={{ cy: [smy, smy - 14 - i * 5], opacity: [0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                />
              );
            })}
          </g>
        );
      })()}

      {/* ── Rania: attic loft label on roof ── */}
      {(() => {
        const rania = getMemberForRoom("rania", members);
        if (!rania) return null;
        const color = MEMBER_COLORS[rania.color]?.hex || "#EAB308";
        const [lx, ly] = iso(1.5, 0.5, WZ + 0.3);
        return (
          <g style={{ pointerEvents: "none" }}>
            {/* Attic window on right roof face */}
            {(() => {
              const [wx, wy] = iso(1.8, 0.5, WZ + 0.8);
              return (
                <g>
                  <rect x={(wx - 8).toFixed(1)} y={(wy - 7).toFixed(1)} width="16" height="12" rx="2"
                    fill="#090d14" stroke={color} strokeWidth="0.8" />
                  <rect x={(wx - 8).toFixed(1)} y={(wy - 7).toFixed(1)} width="16" height="12" rx="2"
                    fill={color} fillOpacity="0.1" />
                </g>
              );
            })()}
            {/* Label */}
            <text x={lx.toFixed(1)} y={(ly - 8).toFixed(1)}
              textAnchor="middle" fontSize="9" style={{ fontFamily: "system-ui" }}>
              {rania.emoji || "🌙"}
            </text>
            <text x={lx.toFixed(1)} y={(ly + 2).toFixed(1)}
              textAnchor="middle" fontSize="5" fontWeight="700" fill={color}
              style={{ fontFamily: "system-ui,sans-serif" }}>
              {rania.name}
            </text>
            <text x={lx.toFixed(1)} y={(ly + 9).toFixed(1)}
              textAnchor="middle" fontSize="4" fill={color} opacity="0.6"
              style={{ fontFamily: "system-ui,sans-serif" }}>
              Attic loft
            </text>
          </g>
        );
      })()}

      {/* ── Room labels ── */}
      {ROOMS.map((room) => {
        const member = getMemberForRoom(room.id, members);
        const color = member ? (MEMBER_COLORS[member.color]?.hex || room.defaultColor) : room.defaultColor;
        const status = member ? memberStatuses[member.id] : null;
        return (
          <RoomLabel key={room.id + "-lbl"}
            room={room} member={member} memberColor={color} status={status} />
        );
      })}

      {/* ── TV screen in living room ── */}
      <TVScreen onTVClick={onTVClick} tvColor={tvColor} tvFlash={tvFlash} />
    </svg>
  );
}

// ─── Centered popup helper (flex-centering, immune to Framer transform) ────────
function CenteredPopup({ children, onClose }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      }} onClick={onClose} />
      <div style={{
        position: "fixed", inset: 0, zIndex: 61,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: 28, pointerEvents: "none",
      }}>
        <div style={{ pointerEvents: "auto", width: "85vw", maxWidth: 340 }}>
          {children}
        </div>
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
  const [memberStatuses, setMemberStatuses] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

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
      const statuses = {};
      for (const m of members) {
        const hasBusy = events.some((e) => (e.date || e.start_date || "").slice(0, 10) === today);
        const hasDone = chores.some((c) => c.completed && c.assigned_to === m.id);
        statuses[m.id] = hasBusy ? "busy" : hasDone ? "done" : "home";
      }
      setMemberStatuses(statuses);
    }).catch(() => {});
  }, [members, familyCode]);

  const handleSwitchToMember = (m) => {
    setActiveMember(m);
    window.dispatchEvent(new Event("member-changed"));
    setSelectedMember(null);
    navigate("/dashboard");
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#0d0d14",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <StarField />

      {/* Top bar */}
      <header style={{
        position: "relative", zIndex: 10, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "10px 14px",
      }}>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSidebarOpen(true)}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: "rgba(255,255,255,0.07)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
          <Menu style={{ width: 18, height: 18, color: "rgba(255,255,255,0.65)" }} />
        </motion.button>

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{
            fontWeight: 700, fontSize: 15,
            background: "linear-gradient(135deg,#fff 0%,#c4b5fd 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            🏠 Family HQ
          </span>
        </div>

        {member ? (
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate("/select")}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
              background: memberColor.hex, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 15, fontWeight: 700,
              boxShadow: `0 0 14px ${memberColor.hex}55`,
            }}>
            {member.emoji || member.name[0]}
          </motion.button>
        ) : <div style={{ width: 36, height: 36, flexShrink: 0 }} />}
      </header>

      {/* Hint */}
      <p style={{
        position: "relative", zIndex: 10, flexShrink: 0,
        textAlign: "center", fontSize: 9, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.22)",
        margin: "0 0 2px",
      }}>
        tap a room · tap tv to enter
      </p>

      {/* House — fills remaining space */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 4px 4px",
      }}>
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}
        >
          <IsometricHouse
            members={members}
            memberStatuses={memberStatuses}
            onRoomClick={setSelectedMember}
            onTVClick={() => navigate("/dashboard")}
          />
        </motion.div>
      </div>

      {/* Member popup */}
      <AnimatePresence>
        {selectedMember && (
          <CenteredPopup onClose={() => setSelectedMember(null)}>
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            >
              {(() => {
                const color = MEMBER_COLORS[selectedMember.color] || MEMBER_COLORS.purple;
                const status = memberStatuses[selectedMember.id];
                return (
                  <div style={{
                    borderRadius: 22, padding: "18px 18px 16px",
                    background: "rgba(10,8,24,0.98)",
                    border: `1px solid ${color.hex}45`,
                    boxShadow: `0 0 40px ${color.hex}20, 0 20px 60px rgba(0,0,0,0.7)`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: `${color.hex}20`, boxShadow: `0 0 16px ${color.hex}35`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                      }}>
                        {selectedMember.emoji || selectedMember.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "white", fontWeight: 700, fontSize: 16, margin: "0 0 2px" }}>
                          {selectedMember.name}
                        </p>
                        <p style={{ color: color.hex, fontSize: 11, margin: "0 0 6px" }}>{selectedMember.role}</p>
                        <span style={{
                          display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: status === "busy" ? "rgba(127,29,29,0.55)" : status === "done" ? "rgba(6,78,59,0.55)" : "rgba(30,37,51,0.55)",
                          color: status === "busy" ? "#fca5a5" : status === "done" ? "#6ee7b7" : "#94a3b8",
                        }}>
                          {status === "busy" ? "📅 Busy" : status === "done" ? "✅ Done" : "🏠 Home"}
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
                      <button onClick={() => setSelectedMember(null)} style={{
                        flex: 1, padding: "10px 0", borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.07)",
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>Close</button>
                      <motion.button whileTap={{ scale: 0.96 }}
                        onClick={() => handleSwitchToMember(selectedMember)} style={{
                          flex: 1, padding: "10px 0", borderRadius: 14, border: "none",
                          background: `linear-gradient(135deg,${color.hex},${color.hex}aa)`,
                          color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}>Switch →</motion.button>
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
            <motion.div key="sb-bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside key="sb"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              style={{
                position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 90,
                width: 256, display: "flex", flexDirection: "column",
                background: "rgba(10,10,18,0.97)",
                borderRight: `1px solid ${memberColor.hex}28`,
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 11 }}>
                {member && (
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", background: memberColor.hex, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 15,
                  }}>{member.emoji || member.name[0]}</div>
                )}
                <div>
                  <p style={{ color: "white", fontWeight: 600, fontSize: 13, margin: 0 }}>{member?.name ?? "Family HQ"}</p>
                  <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 11, margin: 0 }}>{member?.role ?? ""}</p>
                </div>
              </div>
              <nav style={{ flex: 1, padding: 10, overflowY: "auto" }}>
                {[
                  ["🏠 HQ Home", "/home"], ["📊 Dashboard", "/dashboard"],
                  ["📅 Calendar", "/calendar"], ["✅ Chores", "/chores"],
                  ["🍽️ Meals", "/meals"], ["💰 Budget", "/budget"],
                  ["📌 Board", "/noticeboard"], ["🎯 Goals", "/goals"],
                  ["🎁 Rewards", "/rewards"], ["📸 Moments", "/moments"],
                  ["📖 Guide", "/guide"],
                ].map(([label, path]) => (
                  <button key={path}
                    onClick={() => { setSidebarOpen(false); navigate(path); }}
                    style={{
                      width: "100%", display: "block", padding: "10px 14px",
                      borderRadius: 10, border: "none", background: "transparent",
                      color: "rgba(255,255,255,0.52)", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", textAlign: "left", marginBottom: 1,
                    }}>
                    {label}
                  </button>
                ))}
              </nav>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
                <button onClick={() => { setSidebarOpen(false); navigate("/select"); }}
                  style={{
                    width: "100%", padding: "9px 14px", borderRadius: 10, border: "none",
                    background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", textAlign: "left",
                  }}>Switch Member</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
