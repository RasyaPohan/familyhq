import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { getActiveMember, getFamilyCode, setActiveMember, MEMBER_COLORS } from "@/lib/familyStore";
import { db } from "@/lib/db";

// ─── Star field ────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  x: (Math.sin(i * 137.5) * 0.5 + 0.5) * 100,
  y: (Math.cos(i * 97.3) * 0.5 + 0.5) * 100,
  size: (i % 3 === 0 ? 1.5 : 0.8),
  delay: (i % 5) * 0.8,
  duration: 2.5 + (i % 3),
}));

function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.08, 0.6, 0.08] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── TV cycling colors ─────────────────────────────────────────────────────────
const TV_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#F59E0B"];

// ─── Room zones (SVG coords, viewBox 0 0 400 310) ─────────────────────────────
const ROOM_ZONES = [
  { id: "rasya",       points: "100,90 200,45 200,140 100,185", labelX: 132, labelY: 120 },
  { id: "dad",         points: "200,45 300,90 300,185 200,140",  labelX: 262, labelY: 120 },
  { id: "mom",         points: "60,185 100,185 100,275 60,275",  labelX: 72,  labelY: 228 },
  { id: "radif-rania", points: "300,185 340,185 340,275 300,275",labelX: 316, labelY: 228 },
  { id: "living",      points: "100,185 300,185 300,275 100,275",labelX: 200, labelY: 228 },
];

// ─── Member → room mapping ─────────────────────────────────────────────────────
function getMemberForRoom(zoneId, members) {
  if (!members.length) return null;
  if (zoneId === "rasya")
    return members.find((m) => m.name?.toLowerCase().includes("rasya")) ?? null;
  if (zoneId === "dad")
    return members.find((m) =>
      m.role === "Parent" && m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)
    ) ?? null;
  if (zoneId === "mom")
    return members.find((m) =>
      m.role === "Parent" && !m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)
    ) ?? null;
  if (zoneId === "radif-rania")
    return members.filter((m) => m.name?.toLowerCase().match(/radif|rania/));
  return null;
}

// ─── Isometric House SVG ───────────────────────────────────────────────────────
function IsometricHouse({ members, memberStatuses, onRoomClick, onTVClick }) {
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tvColorIdx, setTvColorIdx] = useState(0);
  const [tvFlash, setTvFlash] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTvColorIdx((i) => (i + 1) % TV_COLORS.length);
      setTvFlash(true);
      setTimeout(() => setTvFlash(false), 280);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const tvColor = TV_COLORS[tvColorIdx];

  return (
    <svg
      viewBox="40 30 320 280"
      width="100%"
      height="100%"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter id="tvGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="roomGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="200" cy="290" rx="125" ry="11" fill="rgba(0,0,0,0.35)" />

      {/* ── Roof ── */}
      <polygon points="100,90 200,45 200,140 100,185"
        fill="#1e1b4b" stroke="#4338ca" strokeWidth="1.2" />
      <polygon points="200,45 300,90 300,185 200,140"
        fill="#17144a" stroke="#4338ca" strokeWidth="1.2" />
      <line x1="200" y1="45" x2="200" y2="140" stroke="#6d5ce7" strokeWidth="0.8" opacity="0.5" />

      {/* ── Walls ── */}
      {/* Side left */}
      <polygon points="60,185 100,185 100,275 60,275"
        fill="#101520" stroke="#1f2937" strokeWidth="1.2" />
      {/* Front left */}
      <polygon points="100,185 200,185 200,275 100,275"
        fill="#141928" stroke="#1f2937" strokeWidth="1.2" />
      {/* Front right */}
      <polygon points="200,185 300,185 300,275 200,275"
        fill="#101520" stroke="#1f2937" strokeWidth="1.2" />
      {/* Side right */}
      <polygon points="300,185 340,185 340,275 300,275"
        fill="#0c1018" stroke="#1f2937" strokeWidth="1.2" />
      {/* Base */}
      <rect x="60" y="275" width="280" height="7" rx="1"
        fill="#090c14" stroke="#1f2937" strokeWidth="0.8" />

      {/* ── Chimney ── */}
      <rect x="157" y="52" width="16" height="26" fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8" />
      <rect x="154" y="50" width="22" height="5" rx="1" fill="#2d2a6e" stroke="#4338ca" strokeWidth="0.8" />
      {[0,1,2].map((i) => (
        <motion.circle key={i} cx={165} cy={47} r={2.5 + i * 1.8}
          fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8"
          animate={{ cy: [47 - i*6, 33 - i*6], opacity: [0.25, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.75, ease: "easeOut" }} />
      ))}

      {/* ── Roof windows ── */}
      <rect x="116" y="108" width="26" height="20" rx="2" fill="#090d14" stroke="#4338ca" strokeWidth="0.9" />
      <rect x="116" y="108" width="26" height="20" rx="2" fill="rgba(139,92,246,0.12)" />
      <line x1="129" y1="108" x2="129" y2="128" stroke="#4338ca" strokeWidth="0.6" opacity="0.5" />
      <line x1="116" y1="118" x2="142" y2="118" stroke="#4338ca" strokeWidth="0.6" opacity="0.5" />

      <rect x="258" y="108" width="26" height="20" rx="2" fill="#090d14" stroke="#4338ca" strokeWidth="0.9" />
      <rect x="258" y="108" width="26" height="20" rx="2" fill="rgba(139,92,246,0.12)" />
      <line x1="271" y1="108" x2="271" y2="128" stroke="#4338ca" strokeWidth="0.6" opacity="0.5" />
      <line x1="258" y1="118" x2="284" y2="118" stroke="#4338ca" strokeWidth="0.6" opacity="0.5" />

      {/* ── Front windows ── */}
      <rect x="116" y="205" width="30" height="24" rx="2" fill="#090d14" stroke="#2d3748" strokeWidth="0.9" />
      <line x1="131" y1="205" x2="131" y2="229" stroke="#2d3748" strokeWidth="0.7" />
      <line x1="116" y1="217" x2="146" y2="217" stroke="#2d3748" strokeWidth="0.7" />

      <rect x="254" y="205" width="30" height="24" rx="2" fill="#090d14" stroke="#2d3748" strokeWidth="0.9" />
      <line x1="269" y1="205" x2="269" y2="229" stroke="#2d3748" strokeWidth="0.7" />
      <line x1="254" y1="217" x2="284" y2="217" stroke="#2d3748" strokeWidth="0.7" />

      {/* ── Door ── */}
      <rect x="184" y="238" width="32" height="37" rx="3"
        fill="#140e24" stroke="#4338ca" strokeWidth="1" />
      <circle cx="211" cy="257" r="2" fill="#6d28d9" />
      <path d="M184,250 Q200,241 216,250" fill="none" stroke="#4338ca" strokeWidth="0.7" opacity="0.4" />

      {/* ── TV ── */}
      {/* Stand */}
      <rect x="193" y="260" width="14" height="3" rx="1" fill="#1f2937" />
      <rect x="190" y="263" width="20" height="3" rx="1" fill="#111827" />
      {/* Screen border glow */}
      <motion.rect x="178" y="236" width="44" height="28" rx="3"
        fill="#080c18"
        stroke={tvColor} strokeWidth="1.8"
        animate={{ stroke: tvColor }}
        transition={{ duration: 0.35 }}
        filter="url(#tvGlow)"
        style={{ cursor: "pointer" }} onClick={onTVClick}
      />
      {/* Screen fill */}
      <motion.rect x="179" y="237" width="42" height="26" rx="2"
        fill={tvColor}
        animate={{ fillOpacity: tvFlash ? 0.28 : 0.1, fill: tvColor }}
        transition={{ duration: 0.25 }}
        style={{ cursor: "pointer" }} onClick={onTVClick} pointerEvents="all"
      />
      {/* Label */}
      <text x="200" y="253" textAnchor="middle" fontSize="5.8" fontWeight="bold"
        fill="white" opacity="0.92"
        style={{ cursor: "pointer", fontFamily: "system-ui,sans-serif", letterSpacing: "0.4px" }}
        onClick={onTVClick} pointerEvents="all">
        Enter HQ
      </text>

      {/* ── Room color overlays ── */}
      {ROOM_ZONES.map((zone) => {
        const raw = getMemberForRoom(zone.id, members);
        const memberArr = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const pm = memberArr[0];
        if (!pm) return null;
        const color = MEMBER_COLORS[pm.color] || MEMBER_COLORS.purple;
        const isHovered = hoveredRoom === zone.id;
        return (
          <polygon key={zone.id + "-fill"}
            points={zone.points}
            fill={color.hex}
            fillOpacity={isHovered ? 0.38 : 0.22}
            stroke={color.hex}
            strokeWidth={isHovered ? 2 : 1}
            strokeOpacity={isHovered ? 1 : 0.5}
            filter={isHovered ? "url(#roomGlow)" : undefined}
            style={{ transition: "fill-opacity 0.18s, stroke-width 0.18s", pointerEvents: "none" }}
          />
        );
      })}

      {/* ── Hit zones ── */}
      {ROOM_ZONES.map((zone) => {
        const raw = getMemberForRoom(zone.id, members);
        const memberArr = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const pm = memberArr[0];
        return (
          <polygon key={zone.id + "-hit"}
            points={zone.points}
            fill="transparent" stroke="transparent" strokeWidth="6"
            style={{ cursor: pm ? "pointer" : "default" }}
            onClick={() => pm && onRoomClick(memberArr[0])}
            onMouseEnter={() => pm && setHoveredRoom(zone.id)}
            onMouseLeave={() => setHoveredRoom(null)}
          />
        );
      })}

      {/* ── Room labels ── */}
      {ROOM_ZONES.map((zone) => {
        const raw = getMemberForRoom(zone.id, members);
        const memberArr = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const pm = memberArr[0];
        if (!pm) return null;

        const color = MEMBER_COLORS[pm.color] || MEMBER_COLORS.purple;
        const status = memberStatuses[pm.id];
        const isTop = zone.id === "rasya" || zone.id === "dad";
        const isSide = zone.id === "mom" || zone.id === "radif-rania";
        const emojiSize = isTop ? "14" : isSide ? "10" : "12";
        const nameSize = isTop ? "6.5" : isSide ? "5" : "6";
        const emojiY = zone.labelY - (isTop ? 10 : isSide ? 8 : 9);
        const nameY = zone.labelY + (isTop ? 6 : isSide ? 4 : 5);
        const badgeY = nameY + (isTop ? 5 : 4);

        return (
          <g key={zone.id + "-label"} style={{ pointerEvents: "none" }}>
            <text x={zone.labelX} y={emojiY} textAnchor="middle"
              fontSize={emojiSize} style={{ fontFamily: "system-ui" }}>
              {pm.emoji || pm.name[0]}
              {memberArr[1] ? (isSide ? "" : " " + (memberArr[1].emoji || memberArr[1].name[0])) : ""}
            </text>
            <text x={zone.labelX} y={nameY} textAnchor="middle"
              fontSize={nameSize} fontWeight="700" fill={color.hex}
              style={{ fontFamily: "system-ui,sans-serif" }}>
              {pm.name}{memberArr[1] ? " & " + memberArr[1].name : ""}
            </text>
            {status && (
              <>
                <rect
                  x={zone.labelX - 15} y={badgeY}
                  width="30" height="9" rx="4.5"
                  fill={status === "busy" ? "#7f1d1d" : status === "done" ? "#064e3b" : "#1e2533"}
                  opacity="0.95" />
                <text x={zone.labelX} y={badgeY + 6.5} textAnchor="middle"
                  fontSize="4.8" fontWeight="700"
                  fill={status === "busy" ? "#fca5a5" : status === "done" ? "#6ee7b7" : "#94a3b8"}
                  style={{ fontFamily: "system-ui,sans-serif" }}>
                  {status === "busy" ? "Busy" : status === "done" ? "✓ Done" : "Home"}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Centered popup wrapper (immune to Framer transform conflicts) ─────────────
function CenteredPopup({ children, onClose }) {
  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", inset: 0, zIndex: 61,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 32px",
        pointerEvents: "none",
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
        const hasTodayEvent = events.some((e) => {
          const d = e.date || e.start_date || e.event_date || "";
          return d.slice(0, 10) === today;
        });
        const hasDoneChore = chores.some((c) => c.completed && c.assigned_to === m.id);
        statuses[m.id] = hasTodayEvent ? "busy" : hasDoneChore ? "done" : "home";
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
    <div
      style={{
        position: "fixed", inset: 0,
        background: "#0d0d14",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <StarField />

      {/* Top bar */}
      <header style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center",
        padding: "10px 16px",
        flexShrink: 0,
      }}>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSidebarOpen(true)}
          style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: "rgba(255,255,255,0.08)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <Menu style={{ width: 18, height: 18, color: "rgba(255,255,255,0.7)" }} />
        </motion.button>

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span style={{
            fontWeight: 700, fontSize: 15,
            background: "linear-gradient(135deg,#fff 0%,#c4b5fd 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            🏠 Family HQ
          </span>
        </div>

        {member ? (
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate("/select")}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: memberColor.hex, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 14, fontWeight: 700,
              boxShadow: `0 0 12px ${memberColor.hex}60`,
            }}>
            {member.emoji || member.name[0]}
          </motion.button>
        ) : <div style={{ width: 36, height: 36 }} />}
      </header>

      {/* House — fills all remaining space */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 8px 8px",
        minHeight: 0,
      }}>
        <p style={{
          color: "rgba(255,255,255,0.3)", fontSize: 10,
          letterSpacing: "0.15em", textTransform: "uppercase",
          marginBottom: 6, flexShrink: 0,
        }}>
          tap a room · TV enters dashboard
        </p>

        {/* Floating wrapper — takes all remaining height */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", alignItems: "center" }}
        >
          <IsometricHouse
            members={members}
            memberStatuses={memberStatuses}
            onRoomClick={setSelectedMember}
            onTVClick={() => navigate("/dashboard")}
          />
        </motion.div>

        {/* Enter HQ button below house */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/dashboard")}
          style={{
            flexShrink: 0,
            marginTop: 8,
            padding: "10px 28px",
            borderRadius: 999, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
            color: "white", fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
          }}>
          📺 Enter HQ Dashboard
        </motion.button>
      </div>

      {/* Member popup */}
      <AnimatePresence>
        {selectedMember && (
          <CenteredPopup onClose={() => setSelectedMember(null)}>
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {(() => {
                const color = MEMBER_COLORS[selectedMember.color] || MEMBER_COLORS.purple;
                const status = memberStatuses[selectedMember.id];
                return (
                  <div style={{
                    borderRadius: 24, padding: 20,
                    background: "rgba(12,10,28,0.98)",
                    border: `1px solid ${color.hex}50`,
                    boxShadow: `0 0 40px ${color.hex}25, 0 20px 60px rgba(0,0,0,0.6)`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                        background: `${color.hex}22`,
                        boxShadow: `0 0 18px ${color.hex}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 26,
                      }}>
                        {selectedMember.emoji || selectedMember.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "white", fontWeight: 700, fontSize: 16, margin: 0 }}>
                          {selectedMember.name}
                        </p>
                        <p style={{ color: color.hex, fontSize: 12, margin: "2px 0 6px" }}>
                          {selectedMember.role}
                        </p>
                        <span style={{
                          display: "inline-block", padding: "2px 10px", borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                          background: status === "busy" ? "rgba(127,29,29,0.6)"
                            : status === "done" ? "rgba(6,78,59,0.6)" : "rgba(30,37,51,0.6)",
                          color: status === "busy" ? "#fca5a5"
                            : status === "done" ? "#6ee7b7" : "#94a3b8",
                        }}>
                          {status === "busy" ? "📅 Busy today" : status === "done" ? "✅ Chores done" : "🏠 Home"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
                      {[
                        { label: "XP", value: selectedMember.xp ?? 0 },
                        { label: "Streak 🔥", value: selectedMember.streak ?? 0 },
                        { label: "Level", value: selectedMember.level ?? 1 },
                      ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: "center" }}>
                          <p style={{ color: "white", fontWeight: 700, fontSize: 18, margin: 0 }}>{stat.value}</p>
                          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0 }}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setSelectedMember(null)} style={{
                        flex: 1, padding: "11px 0", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>
                        Close
                      </button>
                      <motion.button whileTap={{ scale: 0.96 }}
                        onClick={() => handleSwitchToMember(selectedMember)}
                        style={{
                          flex: 1, padding: "11px 0", borderRadius: 16, border: "none",
                          background: `linear-gradient(135deg,${color.hex},${color.hex}bb)`,
                          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}>
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
                width: 264, display: "flex", flexDirection: "column",
                background: "rgba(10,10,18,0.97)",
                borderRight: `1px solid ${memberColor.hex}30`,
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                {member && (
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: memberColor.hex, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 700, fontSize: 16,
                  }}>
                    {member.emoji || member.name[0]}
                  </div>
                )}
                <div>
                  <p style={{ color: "white", fontWeight: 600, fontSize: 13, margin: 0 }}>{member?.name ?? "Family HQ"}</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0 }}>{member?.role ?? ""}</p>
                </div>
              </div>
              <nav style={{ flex: 1, padding: "12px", overflowY: "auto" }}>
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
                  <button key={item.path}
                    onClick={() => { setSidebarOpen(false); navigate(item.path); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      padding: "11px 16px", borderRadius: 12, border: "none",
                      background: "transparent", color: "rgba(255,255,255,0.55)",
                      fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left",
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: 12 }}>
                <button onClick={() => { setSidebarOpen(false); navigate("/select"); }}
                  style={{
                    width: "100%", padding: "10px 16px", borderRadius: 12, border: "none",
                    background: "transparent", color: "rgba(255,255,255,0.4)",
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                  }}>
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
