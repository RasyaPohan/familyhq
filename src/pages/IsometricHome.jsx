import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { getActiveMember, getFamilyCode, setActiveMember, MEMBER_COLORS } from "@/lib/familyStore";
import { db } from "@/lib/db";

// ─── Star field background ─────────────────────────────────────────────────────
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
          }}
          animate={{ opacity: [0.1, 0.7, 0.1] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── TV glow cycling colors ────────────────────────────────────────────────────
const TV_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#F59E0B"];

// ─── Room zone config ──────────────────────────────────────────────────────────
// Room zones are defined as SVG polygon clip paths and hit areas on the isometric house.
// The SVG viewBox is 400×320. The house sits centered.
// We define rooms by their polygon points for the SVG fill layer,
// and a center label position for the badge overlay.
const ROOM_ZONES = [
  {
    id: "rasya",
    label: "Rasya's Room",
    nameMatch: "rasya",
    // Top-left roof section
    points: "100,95 200,50 200,140 100,185",
    labelX: 130,
    labelY: 125,
  },
  {
    id: "dad",
    label: "Dad's Room",
    nameMatch: "dad",
    // Top-right roof section
    points: "200,50 300,95 300,185 200,140",
    labelX: 255,
    labelY: 125,
  },
  {
    id: "mom",
    label: "Mom's Room",
    nameMatch: "mom",
    // Left wall
    points: "60,185 100,185 100,270 60,270",
    labelX: 72,
    labelY: 225,
  },
  {
    id: "radif-rania",
    label: "Radif & Rania",
    nameMatch: "radif-rania",
    // Right wall
    points: "300,185 340,185 340,270 300,270",
    labelX: 312,
    labelY: 225,
  },
  {
    id: "living",
    label: "Living Area",
    nameMatch: "living",
    // Central floor area (below the roof ridge, between left/right walls)
    points: "100,185 300,185 300,270 100,270",
    labelX: 200,
    labelY: 225,
  },
];

// ─── Isometric House SVG ───────────────────────────────────────────────────────
function IsometricHouse({ members, memberStatuses, onRoomClick, onTVClick, activeMember }) {
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tvColorIdx, setTvColorIdx] = useState(0);
  const [tvGlow, setTvGlow] = useState(false);

  // TV color cycle
  useEffect(() => {
    const t = setInterval(() => {
      setTvColorIdx((i) => (i + 1) % TV_COLORS.length);
      setTvGlow(true);
      setTimeout(() => setTvGlow(false), 300);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Map members to rooms by role/name
  const getMemberForRoom = (zone) => {
    if (!members.length) return null;
    if (zone.id === "rasya") return members.find((m) => m.name?.toLowerCase().includes("rasya"));
    if (zone.id === "dad") return members.find((m) => m.role === "Parent" && m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/));
    if (zone.id === "mom") return members.find((m) => m.role === "Parent" && !m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/));
    if (zone.id === "radif-rania") return members.filter((m) => m.name?.toLowerCase().match(/radif|rania/));
    if (zone.id === "living") return null;
    return null;
  };

  const tvColor = TV_COLORS[tvColorIdx];

  return (
    <svg
      viewBox="30 30 340 270"
      width="100%"
      style={{ maxWidth: 480, display: "block", margin: "0 auto", overflow: "visible" }}
    >
      <defs>
        {/* Shadow filter */}
        <filter id="houseShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.5" />
        </filter>
        {/* Glow filter */}
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* TV glow */}
        <filter id="tvGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── House base shadow ── */}
      <ellipse cx="200" cy="290" rx="130" ry="14" fill="rgba(0,0,0,0.4)" />

      {/* ── Roof ── */}
      {/* Roof left face */}
      <polygon
        points="100,95 200,50 200,140 100,185"
        fill="#1e1b4b"
        stroke="#312e81"
        strokeWidth="1.5"
      />
      {/* Roof right face */}
      <polygon
        points="200,50 300,95 300,185 200,140"
        fill="#1a1740"
        stroke="#312e81"
        strokeWidth="1.5"
      />
      {/* Roof ridge line */}
      <line x1="200" y1="50" x2="200" y2="140" stroke="#4338ca" strokeWidth="1" opacity="0.6" />

      {/* ── Walls ── */}
      {/* Left wall face */}
      <polygon
        points="60,185 100,185 100,270 60,270"
        fill="#111827"
        stroke="#1f2937"
        strokeWidth="1.5"
      />
      {/* Front-left wall */}
      <polygon
        points="100,185 200,185 200,270 100,270"
        fill="#161b2e"
        stroke="#1f2937"
        strokeWidth="1.5"
      />
      {/* Front-right wall */}
      <polygon
        points="200,185 300,185 300,270 200,270"
        fill="#111827"
        stroke="#1f2937"
        strokeWidth="1.5"
      />
      {/* Right wall face */}
      <polygon
        points="300,185 340,185 340,270 300,270"
        fill="#0f1520"
        stroke="#1f2937"
        strokeWidth="1.5"
      />
      {/* Base/floor strip */}
      <polygon
        points="60,270 340,270 340,278 60,278"
        fill="#0a0e1a"
        stroke="#1f2937"
        strokeWidth="1"
      />

      {/* ── Chimney ── */}
      <rect x="155" y="52" width="18" height="28" fill="#1e1b4b" stroke="#312e81" strokeWidth="1" />
      <rect x="153" y="50" width="22" height="5" fill="#2d2a6e" stroke="#312e81" strokeWidth="1" />
      {/* Smoke puffs */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={164}
          cy={45}
          r={3 + i * 2}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          animate={{ cy: [45 - i * 8, 30 - i * 8], opacity: [0.3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
        />
      ))}

      {/* ── Windows on roof faces ── */}
      {/* Left roof dormer window */}
      <rect x="115" y="108" width="28" height="22" rx="2" fill="#0d1117" stroke="#4338ca" strokeWidth="1" />
      <rect x="115" y="108" width="28" height="22" rx="2" fill="rgba(139,92,246,0.08)" />
      <line x1="129" y1="108" x2="129" y2="130" stroke="#4338ca" strokeWidth="0.8" opacity="0.5" />
      <line x1="115" y1="119" x2="143" y2="119" stroke="#4338ca" strokeWidth="0.8" opacity="0.5" />

      {/* Right roof dormer window */}
      <rect x="257" y="108" width="28" height="22" rx="2" fill="#0d1117" stroke="#4338ca" strokeWidth="1" />
      <rect x="257" y="108" width="28" height="22" rx="2" fill="rgba(139,92,246,0.08)" />
      <line x1="271" y1="108" x2="271" y2="130" stroke="#4338ca" strokeWidth="0.8" opacity="0.5" />
      <line x1="257" y1="119" x2="285" y2="119" stroke="#4338ca" strokeWidth="0.8" opacity="0.5" />

      {/* ── Front windows ── */}
      {/* Left window */}
      <rect x="118" y="205" width="32" height="26" rx="2" fill="#0d1117" stroke="#374151" strokeWidth="1" />
      <line x1="134" y1="205" x2="134" y2="231" stroke="#374151" strokeWidth="0.8" />
      <line x1="118" y1="218" x2="150" y2="218" stroke="#374151" strokeWidth="0.8" />

      {/* Right window */}
      <rect x="250" y="205" width="32" height="26" rx="2" fill="#0d1117" stroke="#374151" strokeWidth="1" />
      <line x1="266" y1="205" x2="266" y2="231" stroke="#374151" strokeWidth="0.8" />
      <line x1="250" y1="218" x2="282" y2="218" stroke="#374151" strokeWidth="0.8" />

      {/* ── Front door ── */}
      <rect x="182" y="235" width="36" height="35" rx="3" fill="#1a1128" stroke="#4338ca" strokeWidth="1.2" />
      <circle cx="213" cy="253" r="2" fill="#6d28d9" />
      {/* Door arch */}
      <path d="M182,247 Q200,237 218,247" fill="none" stroke="#4338ca" strokeWidth="0.8" opacity="0.5" />

      {/* ── TV / Computer screen ── */}
      {/* TV stand */}
      <rect x="191" y="256" width="18" height="4" rx="1" fill="#1f2937" />
      <rect x="188" y="259" width="24" height="3" rx="1" fill="#111827" />

      {/* TV screen */}
      <motion.rect
        x="178"
        y="235"
        width="44"
        height="28"
        rx="3"
        fill="#0a0e1a"
        stroke={tvColor}
        strokeWidth="1.5"
        animate={{ stroke: tvColor }}
        transition={{ duration: 0.4 }}
        filter="url(#tvGlow)"
        style={{ cursor: "pointer" }}
        onClick={onTVClick}
      />
      {/* TV screen glow fill */}
      <motion.rect
        x="179"
        y="236"
        width="42"
        height="26"
        rx="2"
        fill={tvColor}
        fillOpacity={tvGlow ? 0.2 : 0.07}
        animate={{ fillOpacity: tvGlow ? 0.2 : 0.07, fill: tvColor }}
        transition={{ duration: 0.3 }}
        style={{ cursor: "pointer" }}
        onClick={onTVClick}
        pointerEvents="all"
      />
      {/* "Enter HQ" text on TV */}
      <text
        x="200"
        y="252"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="bold"
        fill="white"
        opacity="0.9"
        style={{ cursor: "pointer", fontFamily: "system-ui, sans-serif", letterSpacing: "0.3px" }}
        onClick={onTVClick}
        pointerEvents="all"
      >
        Enter HQ
      </text>

      {/* ── Clickable room zones (transparent overlays) ── */}
      {ROOM_ZONES.map((zone) => {
        const roomMembers = getMemberForRoom(zone);
        const memberArr = Array.isArray(roomMembers) ? roomMembers : roomMembers ? [roomMembers] : [];
        const primaryMember = memberArr[0];
        const color = primaryMember ? (MEMBER_COLORS[primaryMember.color] || MEMBER_COLORS.purple) : null;
        const isHovered = hoveredRoom === zone.id;
        const isLiving = zone.id === "living";

        return (
          <g key={zone.id}>
            {/* Color fill for room with member */}
            {color && (
              <polygon
                points={zone.points}
                fill={color.hex}
                fillOpacity={isHovered ? 0.22 : 0.10}
                stroke={color.hex}
                strokeWidth={isHovered ? 1.5 : 0.5}
                strokeOpacity={isHovered ? 0.8 : 0.3}
                style={{ transition: "fill-opacity 0.2s, stroke-width 0.2s, stroke-opacity 0.2s" }}
              />
            )}
            {/* Invisible hit area */}
            <polygon
              points={zone.points}
              fill="transparent"
              stroke="transparent"
              strokeWidth="4"
              style={{ cursor: primaryMember ? "pointer" : "default" }}
              onClick={() => primaryMember && onRoomClick(primaryMember)}
              onMouseEnter={() => setHoveredRoom(zone.id)}
              onMouseLeave={() => setHoveredRoom(null)}
            />
          </g>
        );
      })}

      {/* ── Room labels and status badges ── */}
      {ROOM_ZONES.filter((z) => z.id !== "living").map((zone) => {
        const roomMembers = getMemberForRoom(zone);
        const memberArr = Array.isArray(roomMembers) ? roomMembers : roomMembers ? [roomMembers] : [];
        const primaryMember = memberArr[0];
        if (!primaryMember) return null;

        const color = MEMBER_COLORS[primaryMember.color] || MEMBER_COLORS.purple;
        const status = memberStatuses[primaryMember.id];
        const isTop = zone.id === "rasya" || zone.id === "dad";

        return (
          <g key={zone.id + "-label"} style={{ pointerEvents: "none" }}>
            {/* Emoji avatar */}
            <text
              x={zone.labelX}
              y={zone.labelY - (isTop ? 8 : 6)}
              textAnchor="middle"
              fontSize={isTop ? "13" : "11"}
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {primaryMember.emoji || primaryMember.name[0]}
              {memberArr[1] ? " " + (memberArr[1].emoji || memberArr[1].name[0]) : ""}
            </text>
            {/* Name */}
            <text
              x={zone.labelX}
              y={zone.labelY + (isTop ? 8 : 7)}
              textAnchor="middle"
              fontSize={isTop ? "6" : "5.5"}
              fontWeight="600"
              fill={color.hex}
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {primaryMember.name}{memberArr[1] ? " & " + memberArr[1].name : ""}
            </text>
            {/* Status badge */}
            {status && (
              <>
                <rect
                  x={zone.labelX - 14}
                  y={zone.labelY + (isTop ? 12 : 10)}
                  width="28"
                  height="9"
                  rx="4.5"
                  fill={status === "busy" ? "#991b1b" : status === "done" ? "#065f46" : "#1f2937"}
                  opacity="0.9"
                />
                <text
                  x={zone.labelX}
                  y={zone.labelY + (isTop ? 18.5 : 16.5)}
                  textAnchor="middle"
                  fontSize="5"
                  fontWeight="700"
                  fill={status === "busy" ? "#fca5a5" : status === "done" ? "#6ee7b7" : "#9ca3af"}
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {status === "busy" ? "Busy" : status === "done" ? "✓ Done" : "Home"}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* ── Left wall small label ── */}
      {(() => {
        const zone = ROOM_ZONES.find((z) => z.id === "mom");
        const m = getMemberForRoom(zone);
        if (!m) return null;
        const color = MEMBER_COLORS[m.color] || MEMBER_COLORS.purple;
        return (
          <g style={{ pointerEvents: "none" }}>
            <text x={72} y={218} textAnchor="middle" fontSize="9" style={{ fontFamily: "system-ui" }}>
              {m.emoji || m.name[0]}
            </text>
            <text x={72} y={228} textAnchor="middle" fontSize="5" fontWeight="600" fill={color.hex}
              style={{ fontFamily: "system-ui, sans-serif" }}>
              {m.name}
            </text>
          </g>
        );
      })()}

      {/* ── Right wall small label ── */}
      {(() => {
        const zone = ROOM_ZONES.find((z) => z.id === "radif-rania");
        const roomMembers = getMemberForRoom(zone);
        const memberArr = Array.isArray(roomMembers) ? roomMembers : roomMembers ? [roomMembers] : [];
        if (!memberArr.length) return null;
        const color = MEMBER_COLORS[memberArr[0].color] || MEMBER_COLORS.purple;
        return (
          <g style={{ pointerEvents: "none" }}>
            <text x={320} y={218} textAnchor="middle" fontSize="9" style={{ fontFamily: "system-ui" }}>
              {memberArr.map((m) => m.emoji || m.name[0]).join("")}
            </text>
            <text x={320} y={228} textAnchor="middle" fontSize="5" fontWeight="600" fill={color.hex}
              style={{ fontFamily: "system-ui, sans-serif" }}>
              {memberArr.map((m) => m.name).join(" & ")}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Main IsometricHome page ───────────────────────────────────────────────────
export default function IsometricHome() {
  const navigate = useNavigate();
  const member = getActiveMember();
  const familyCode = getFamilyCode();
  const memberColor = member ? (MEMBER_COLORS[member.color] || MEMBER_COLORS.purple) : MEMBER_COLORS.purple;

  const [members, setMembers] = useState([]);
  const [memberStatuses, setMemberStatuses] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Redirect if no family code
  useEffect(() => {
    if (!familyCode) navigate("/", { replace: true });
  }, []);

  // Load members
  useEffect(() => {
    if (!familyCode) return;
    db.FamilyMember.filter({ family_code: familyCode }).then(setMembers);
  }, [familyCode]);

  // Load statuses — today's events → "busy", completed chores → "done", else "home"
  useEffect(() => {
    if (!members.length || !familyCode) return;
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      db.CalendarEvent.filter({ family_code: familyCode }),
      db.Chore.filter({ family_code: familyCode }),
    ]).then(([events, chores]) => {
      const statuses = {};
      for (const m of members) {
        const hasTodayEvent = events.some((e) => {
          const d = e.date || e.start_date || e.event_date || "";
          return d.slice(0, 10) === today && (e.assigned_to === m.id || !e.assigned_to);
        });
        const hasDoneChore = chores.some(
          (c) => c.completed && c.assigned_to === m.id
        );
        statuses[m.id] = hasTodayEvent ? "busy" : hasDoneChore ? "done" : "home";
      }
      setMemberStatuses(statuses);
    }).catch(() => {});
  }, [members, familyCode]);

  const handleRoomClick = (roomMember) => {
    setSelectedMember(roomMember);
  };

  const handleTVClick = () => {
    navigate("/dashboard");
  };

  const handleSwitchToMember = (m) => {
    setActiveMember(m);
    window.dispatchEvent(new Event("member-changed"));
    setSelectedMember(null);
    navigate("/dashboard");
  };

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "#0d0d14" }}
    >
      <StarField />

      {/* ── Top bar ── */}
      <header className="relative z-10 flex items-center px-4 py-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <Menu className="w-5 h-5 text-white/70" />
        </motion.button>

        <div className="flex-1 flex items-center justify-center gap-2">
          <span
            className="font-heading font-bold text-base"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            🏠 Family HQ
          </span>
        </div>

        {member ? (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => navigate("/select")}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: memberColor.hex, boxShadow: `0 0 12px ${memberColor.hex}60` }}
          >
            {member.emoji || member.name[0]}
          </motion.button>
        ) : (
          <div className="w-9 h-9 shrink-0" />
        )}
      </header>

      {/* ── House section ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-xs mb-4 tracking-widest uppercase"
        >
          tap a room to peek inside
        </motion.p>

        {/* Floating house */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "100%", maxWidth: 480 }}
        >
          <IsometricHouse
            members={members}
            memberStatuses={memberStatuses}
            onRoomClick={handleRoomClick}
            onTVClick={handleTVClick}
            activeMember={member}
          />
        </motion.div>

        {/* TV hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-4 flex flex-col items-center gap-1"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTVClick}
            className="px-6 py-2.5 rounded-full text-sm font-heading font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            📺 Enter HQ Dashboard
          </motion.button>
          <p className="text-white/25 text-xs mt-1">or tap the TV screen above</p>
        </motion.div>
      </div>

      {/* ── Room member card popup ── */}
      <AnimatePresence>
        {selectedMember && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedMember(null)}
            />
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="fixed z-[61] left-4 right-4 bottom-8"
              style={{ maxWidth: 400, margin: "0 auto", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)" }}
            >
              {(() => {
                const color = MEMBER_COLORS[selectedMember.color] || MEMBER_COLORS.purple;
                const status = memberStatuses[selectedMember.id];
                return (
                  <div
                    className="rounded-3xl p-6"
                    style={{
                      background: "rgba(15,12,30,0.97)",
                      border: `1px solid ${color.hex}40`,
                      boxShadow: `0 0 40px ${color.hex}30`,
                    }}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                        style={{ background: `${color.hex}20`, boxShadow: `0 0 20px ${color.hex}40` }}
                      >
                        {selectedMember.emoji || selectedMember.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-white text-lg leading-tight">{selectedMember.name}</p>
                        <p className="text-sm mt-0.5" style={{ color: color.hex }}>{selectedMember.role}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              background: status === "busy" ? "rgba(153,27,27,0.5)" : status === "done" ? "rgba(6,95,70,0.5)" : "rgba(31,41,55,0.5)",
                              color: status === "busy" ? "#fca5a5" : status === "done" ? "#6ee7b7" : "#9ca3af",
                            }}
                          >
                            {status === "busy" ? "📅 Busy today" : status === "done" ? "✅ Chores done" : "🏠 Home"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-5">
                      <div className="text-center">
                        <p className="text-white font-bold text-lg">{selectedMember.xp ?? 0}</p>
                        <p className="text-white/40 text-xs">XP</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-lg">{selectedMember.streak ?? 0}</p>
                        <p className="text-white/40 text-xs">Streak 🔥</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-lg">{selectedMember.level ?? 1}</p>
                        <p className="text-white/40 text-xs">Level</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedMember(null)}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/50 hover:text-white/80 transition-colors"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        Close
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSwitchToMember(selectedMember)}
                        className="flex-1 py-3 rounded-2xl text-sm font-heading font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${color.hex}, ${color.hex}99)` }}
                      >
                        Switch to {selectedMember.name} →
                      </motion.button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sidebar overlay (minimal — links to Layout sidebar) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="sb-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              key="sb-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 z-[90] flex flex-col w-64"
              style={{
                background: "rgba(10,10,18,0.97)",
                borderRight: `1px solid ${memberColor.hex}30`,
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
                {member && (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ background: memberColor.hex }}
                  >
                    {member.emoji || member.name[0]}
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold text-sm">{member?.name ?? "Family HQ"}</p>
                  <p className="text-white/40 text-xs">{member?.role ?? ""}</p>
                </div>
              </div>
              <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
                {[
                  { label: "🏠 HQ Home", path: "/home" },
                  { label: "📊 Dashboard", path: "/dashboard" },
                  { label: "📅 Calendar", path: "/calendar" },
                  { label: "✅ Chores", path: "/chores" },
                  { label: "🍽️ Meals", path: "/meals" },
                  { label: "💰 Budget", path: "/budget" },
                  { label: "📌 Board", path: "/noticeboard" },
                  { label: "🎯 Goals", path: "/goals" },
                  { label: "🎁 Rewards", path: "/rewards" },
                  { label: "📸 Moments", path: "/moments" },
                  { label: "📖 Guide", path: "/guide" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { setSidebarOpen(false); navigate(item.path); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="border-t border-white/8 px-3 py-3">
                <button
                  onClick={() => { setSidebarOpen(false); navigate("/select"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
                >
                  Switch Member
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
