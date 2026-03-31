import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
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
    case "rasya":  return members.find(m => m.name?.toLowerCase().includes("rasya")) ?? null;
    case "dad":    return members.find(m => m.role === "Parent" && m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)) ?? null;
    case "mom":    return members.find(m => m.role === "Parent" && !m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)) ?? null;
    case "radif":  return members.find(m => m.name?.toLowerCase().includes("radif")) ?? null;
    case "rania":  return members.find(m => m.name?.toLowerCase().includes("rania")) ?? null;
    default: return null;
  }
}

const DEFAULT_COLORS = {
  rasya: "#8B5CF6", dad: "#1E40AF", mom: "#EC4899",
  radif: "#F59E0B", rania: "#EAB308", living: "#334155",
};

// TV cycling
const TV_COLORS = ["#8B5CF6","#3B82F6","#10B981","#EC4899","#F59E0B"];

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

// ─── Room label component ──────────────────────────────────────────────────────
function RoomLabel({ member, color, status, x, y, size = "md" }) {
  if (!member) return null;
  const fs = size === "sm" ? { emoji: 11, name: 5.5, badge: 4.2 } : { emoji: 13, name: 6.5, badge: 5 };
  return (
    <g style={{ pointerEvents: "none" }}>
      <text x={x} y={y - 8} textAnchor="middle" fontSize={fs.emoji} style={{ fontFamily: "system-ui" }}>
        {member.emoji || member.name[0]}
      </text>
      <text x={x} y={y + 4} textAnchor="middle" fontSize={fs.name} fontWeight="700" fill={color}
        style={{ fontFamily: "system-ui,sans-serif" }}>
        {member.name}
      </text>
      {status && (
        <>
          <rect x={x - 14} y={y + 6} width="28" height="9" rx="4.5"
            fill={status === "busy" ? "#7f1d1d" : status === "done" ? "#064e3b" : "#1e293b"} opacity="0.92" />
          <text x={x} y={y + 12.5} textAnchor="middle" fontSize={fs.badge} fontWeight="700"
            fill={status === "busy" ? "#fca5a5" : status === "done" ? "#6ee7b7" : "#64748b"}
            style={{ fontFamily: "system-ui,sans-serif" }}>
            {status === "busy" ? "Busy" : status === "done" ? "✓ Done" : "Home"}
          </text>
        </>
      )}
    </g>
  );
}

// ─── VIEW 1: FRONT ISOMETRIC ───────────────────────────────────────────────────
// Classic isometric view from front-right. Rooms on floor visible from above.
function FrontView({ members, statuses, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);

  // Rooms: 3×2 grid projected onto isometric floor
  // Using simplified isometric: x-axis goes right+down, y-axis goes left+down
  // Origin: cx=200, cy=280, scale=44
  const S = 44, CX = 200, CY = 285;
  function iso(ix, iy, iz = 0) {
    return [
      CX + (ix - iy) * S * 0.866,
      CY + (ix + iy) * S * 0.5 - iz * S,
    ];
  }
  function p(coords) {
    return coords.map(([ix,iy,iz=0]) => iso(ix,iy,iz).map(v=>v.toFixed(1)).join(",")).join(" ");
  }

  const rooms = [
    { id:"rasya",  x1:-3,y1:-2,x2:-1,y2:0  },
    { id:"living", x1:-1,y1:-2,x2: 1,y2:0  },
    { id:"dad",    x1: 1,y1:-2,x2: 3,y2:0  },
    { id:"mom",    x1:-3,y1: 0,x2:-1,y2:2  },
    { id:"rania",  x1:-1,y1: 0,x2: 1,y2:2  },
    { id:"radif",  x1: 1,y1: 0,x2: 3,y2:2  },
  ];

  return (
    <svg viewBox="30 80 340 310" width="100%" height="100%" style={{ display:"block", overflow:"visible" }}>
      <defs>
        <filter id="glow1" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tvGlow1" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={CX} cy={CY+8} rx="148" ry="14" fill="rgba(0,0,0,0.4)" />

      {/* Floor */}
      <polygon points={p([[-3,-2],[ 3,-2],[ 3,2],[-3,2]])}
        fill="#0c1520" stroke="#1a2535" strokeWidth="1" />

      {/* Room tiles */}
      {rooms.map(r => {
        const m = getMember(r.id, members);
        const col = m ? (MEMBER_COLORS[m.color]?.hex || DEFAULT_COLORS[r.id]) : DEFAULT_COLORS[r.id] || "#1e293b";
        const isHov = hov === r.id;
        const mx = (r.x1+r.x2)/2, my = (r.y1+r.y2)/2;
        return (
          <g key={r.id}>
            <polygon
              points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill={col} fillOpacity={isHov ? 0.35 : 0.18}
              stroke={col} strokeWidth={isHov ? 1.8 : 0.8} strokeOpacity={isHov ? 1 : 0.5}
              filter={isHov ? "url(#glow1)" : undefined}
              style={{ transition:"fill-opacity 0.15s" }} />
            {/* Grid lines */}
            <polygon points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" style={{pointerEvents:"none"}}/>
            {/* Hit */}
            <polygon points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill="transparent" stroke="transparent" strokeWidth="10"
              style={{ cursor: (m || r.id==="living") ? "pointer" : "default" }}
              onClick={() => r.id==="living" ? onTV() : m && onRoom(m)}
              onMouseEnter={() => setHov(r.id)} onMouseLeave={() => setHov(null)} />
            {/* Simple bed shape */}
            {m && r.id !== "living" && (() => {
              const [bx,by] = iso(r.x1+0.4, r.y1+0.35, 0.38);
              const [ex,ey] = iso(r.x1+1.35, r.y2-0.35, 0.38);
              return (
                <g style={{pointerEvents:"none"}} opacity="0.7">
                  <polygon points={p([[r.x1+0.4,r.y1+0.35,0.38],[r.x1+1.35,r.y1+0.35,0.38],[r.x1+1.35,r.y2-0.35,0.38],[r.x1+0.4,r.y2-0.35,0.38]])}
                    fill={col} fillOpacity="0.25" stroke={col} strokeWidth="0.6" strokeOpacity="0.4"/>
                  <polygon points={p([[r.x1+0.4,r.y1+0.35,0.38],[r.x1+1.35,r.y1+0.35,0.38],[r.x1+1.35,r.y1+0.35,0.7],[r.x1+0.4,r.y1+0.35,0.7]])}
                    fill={col} fillOpacity="0.35" stroke={col} strokeWidth="0.5" strokeOpacity="0.5"/>
                </g>
              );
            })()}
            {/* Label */}
            {(() => {
              const [lx,ly] = iso(mx, my, 0.05);
              const m2 = getMember(r.id, members);
              const col2 = m2 ? (MEMBER_COLORS[m2.color]?.hex || DEFAULT_COLORS[r.id]) : DEFAULT_COLORS[r.id];
              return <RoomLabel member={m2} color={col2} status={m2 ? statuses[m2.id] : null} x={lx} y={ly}/>;
            })()}
          </g>
        );
      })}

      {/* Walls */}
      {/* Front wall */}
      <polygon points={p([[-3,-2,0],[3,-2,0],[3,-2,2.5],[-3,-2,2.5]])}
        fill="#131d2e" stroke="#1e293b" strokeWidth="1" style={{pointerEvents:"none"}}/>
      {/* Left wall */}
      <polygon points={p([[-3,-2,0],[-3,2,0],[-3,2,2.5],[-3,-2,2.5]])}
        fill="#101825" stroke="#1e293b" strokeWidth="1" style={{pointerEvents:"none"}}/>
      {/* Wall top glow */}
      <line x1={iso(-3,-2,2.5)[0]} y1={iso(-3,-2,2.5)[1]} x2={iso(3,-2,2.5)[0]} y2={iso(3,-2,2.5)[1]}
        stroke="#4338ca" strokeWidth="1" opacity="0.5" style={{pointerEvents:"none"}}/>
      <line x1={iso(-3,-2,2.5)[0]} y1={iso(-3,-2,2.5)[1]} x2={iso(-3,2,2.5)[0]} y2={iso(-3,2,2.5)[1]}
        stroke="#4338ca" strokeWidth="1" opacity="0.5" style={{pointerEvents:"none"}}/>

      {/* Front windows */}
      {[-1.8, 1.8].map((wx, i) => {
        const [sx,sy] = iso(wx, -2, 1.4);
        return (
          <g key={i} style={{pointerEvents:"none"}}>
            <rect x={sx-10} y={sy-9} width="20" height="14" rx="2" fill="#090d14" stroke="#4338ca" strokeWidth="0.8"/>
            <rect x={sx-10} y={sy-9} width="20" height="14" rx="2" fill="#8B5CF6" fillOpacity="0.08"/>
            <line x1={sx} y1={sy-9} x2={sx} y2={sy+5} stroke="#4338ca" strokeWidth="0.5" opacity="0.4"/>
            <line x1={sx-10} y1={sy-2} x2={sx+10} y2={sy-2} stroke="#4338ca" strokeWidth="0.5" opacity="0.4"/>
          </g>
        );
      })}

      {/* Side windows */}
      {[[-0.5,1.3],[ 0.8,1.3]].map(([wy,wz],i) => {
        const [sx,sy] = iso(-3, wy, wz);
        return (
          <g key={i} style={{pointerEvents:"none"}}>
            <rect x={sx-8} y={sy-7} width="16" height="11" rx="2" fill="#090d14" stroke="#4338ca" strokeWidth="0.7"/>
          </g>
        );
      })}

      {/* Door */}
      {(() => { const [dx,dy] = iso(0,-2,0); return (
        <g style={{pointerEvents:"none"}}>
          <rect x={dx-9} y={dy-22} width="18" height="22" rx="2" fill="#0e1628" stroke="#4338ca" strokeWidth="0.9"/>
          <circle cx={dx+5} cy={dy-11} r="2" fill="#6d28d9"/>
        </g>
      );})()}

      {/* TV */}
      {(() => {
        const [cx,cy] = iso(0,-1.75,1.15);
        return (
          <g style={{cursor:"pointer"}} onClick={onTV}>
            <rect x={cx-30} y={cy-22} width="60" height="34" rx="5"
              fill={tvColor} opacity={tvFlash?0.35:0.15} filter="url(#tvGlow1)" style={{transition:"opacity 0.22s"}}/>
            <rect x={cx-26} y={cy-19} width="52" height="28" rx="3" fill="#060a14" stroke={tvColor} strokeWidth="1.8"/>
            <rect x={cx-24} y={cy-17} width="48" height="24" rx="2"
              fill={tvColor} opacity={tvFlash?0.28:0.09} style={{transition:"opacity 0.18s"}}/>
            <text x={cx} y={cy-4} textAnchor="middle" fontSize="6" fontWeight="800" fill="white" opacity="0.93"
              style={{fontFamily:"system-ui,sans-serif",letterSpacing:"0.5px"}}>ENTER HQ</text>
            <line x1={cx} y1={cy+9} x2={cx} y2={cy+17} stroke="#334155" strokeWidth="2.5"/>
            <rect x={cx-9} y={cy+15} width="18" height="4" rx="2" fill="#334155"/>
          </g>
        );
      })()}

      {/* Roof */}
      <polygon points={p([[-3,-2,2.5],[3,-2,2.5],[0,-2,4]])}
        fill="#1a1d3a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,2,2.5],[3,2,2.5],[0,2,4],[-3,2,2.5]])}
        fill="#13163a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,-2,2.5],[-3,2,2.5],[0,2,4],[0,-2,4]])}
        fill="#181b3a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <polygon points={p([[3,-2,2.5],[3,2,2.5],[0,2,4],[0,-2,4]])}
        fill="#14173a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      {/* Ridge */}
      <line x1={iso(0,-2,4)[0]} y1={iso(0,-2,4)[1]} x2={iso(0,2,4)[0]} y2={iso(0,2,4)[1]}
        stroke="#6d5ce7" strokeWidth="1.4" opacity="0.8" style={{pointerEvents:"none"}}/>

      {/* Chimney */}
      {(() => {
        const [cx,cy] = iso(-0.8,-0.8,4);
        return (
          <g style={{pointerEvents:"none"}}>
            <polygon points={p([[-0.8,-0.8,3.5],[-0.4,-0.8,3.5],[-0.4,-0.8,4.6],[-0.8,-0.8,4.6]])}
              fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.8"/>
            <polygon points={p([[-0.85,-0.9,4.6],[-0.35,-0.9,4.6],[-0.35,-0.7,4.6],[-0.85,-0.7,4.6]])}
              fill="#2d2a6e"/>
            {[0,1,2].map(i => (
              <motion.circle key={i} cx={cx} cy={cy - i*6} r={2+i*1.5}
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"
                animate={{ cy:[cy-i*4, cy-18-i*5], opacity:[0.3,0] }}
                transition={{ duration:2, repeat:Infinity, delay:i*0.6, ease:"easeOut" }}/>
            ))}
          </g>
        );
      })()}

    </svg>
  );
}

// ─── VIEW 2: LEFT SIDE ────────────────────────────────────────────────────────
// Looking from the left: y-axis of the house runs left-right on screen.
// We see the left wall face-on, and the floor from above-left.
function LeftSideView({ members, statuses, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  // Project as if camera is on the left side: swap x,y role
  const S = 44, CX = 200, CY = 280;
  function iso(ix, iy, iz = 0) {
    // Rotate camera 90° left: x→-y, y→x
    return [
      CX + (iy - ix) * S * 0.866,
      CY + (iy + ix) * S * 0.5 - iz * S,
    ];
  }
  function p(coords) {
    return coords.map(([ix,iy,iz=0]) => iso(ix,iy,iz).map(v=>v.toFixed(1)).join(",")).join(" ");
  }

  const leftRooms = [
    { id:"rasya", x1:-3,y1:-2,x2:-1,y2:0 },
    { id:"mom",   x1:-3,y1: 0,x2:-1,y2:2 },
  ];
  const rightRooms = [
    { id:"dad",   x1: 1,y1:-2,x2: 3,y2:0 },
    { id:"radif", x1: 1,y1: 0,x2: 3,y2:2 },
  ];
  const centerRooms = [
    { id:"living", x1:-1,y1:-2,x2:1,y2:0 },
    { id:"rania",  x1:-1,y1: 0,x2:1,y2:2 },
  ];
  const allRooms = [...leftRooms, ...centerRooms, ...rightRooms];

  return (
    <svg viewBox="30 80 340 310" width="100%" height="100%" style={{ display:"block", overflow:"visible" }}>
      <defs>
        <filter id="glow2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tvGlow2" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx={CX} cy={CY+8} rx="148" ry="14" fill="rgba(0,0,0,0.4)" />
      <polygon points={p([[-3,-2],[3,-2],[3,2],[-3,2]])} fill="#0c1520" stroke="#1a2535" strokeWidth="1"/>

      {allRooms.map(r => {
        const m = getMember(r.id, members);
        const col = m ? (MEMBER_COLORS[m.color]?.hex||DEFAULT_COLORS[r.id]) : DEFAULT_COLORS[r.id]||"#1e293b";
        const isHov = hov === r.id;
        const mx=(r.x1+r.x2)/2, my=(r.y1+r.y2)/2;
        const [lx,ly] = iso(mx,my,0.05);
        return (
          <g key={r.id}>
            <polygon points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill={col} fillOpacity={isHov?0.35:0.18} stroke={col}
              strokeWidth={isHov?1.8:0.8} strokeOpacity={isHov?1:0.5}
              filter={isHov?"url(#glow2)":undefined} style={{transition:"fill-opacity 0.15s"}}/>
            <polygon points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill="transparent" stroke="transparent" strokeWidth="10"
              style={{cursor:(m||r.id==="living")?"pointer":"default"}}
              onClick={() => r.id==="living"?onTV():m&&onRoom(m)}
              onMouseEnter={() => setHov(r.id)} onMouseLeave={() => setHov(null)}/>
            <RoomLabel member={m} color={col} status={m?statuses[m.id]:null} x={lx} y={ly} size="sm"/>
          </g>
        );
      })}

      {/* Left wall (now facing us) */}
      <polygon points={p([[-3,-2,0],[-3,2,0],[-3,2,2.5],[-3,-2,2.5]])}
        fill="#131d2e" stroke="#1e293b" strokeWidth="1" style={{pointerEvents:"none"}}/>
      {/* Right wall */}
      <polygon points={p([[3,-2,0],[3,2,0],[3,2,2.5],[3,-2,2.5]])}
        fill="#0f1520" stroke="#1e293b" strokeWidth="1" style={{pointerEvents:"none"}}/>
      {/* Wall glows */}
      <line x1={iso(-3,-2,2.5)[0]} y1={iso(-3,-2,2.5)[1]} x2={iso(-3,2,2.5)[0]} y2={iso(-3,2,2.5)[1]}
        stroke="#4338ca" strokeWidth="1" opacity="0.5"/>
      <line x1={iso(3,-2,2.5)[0]} y1={iso(3,-2,2.5)[1]} x2={iso(3,2,2.5)[0]} y2={iso(3,2,2.5)[1]}
        stroke="#4338ca" strokeWidth="1" opacity="0.3"/>

      {/* Left wall windows */}
      {[[-1, 1.35],[1, 1.35]].map(([wy,wz],i) => {
        const [sx,sy] = iso(-3,wy,wz);
        return <g key={i} style={{pointerEvents:"none"}}>
          <rect x={sx-9} y={sy-8} width="18" height="12" rx="2" fill="#090d14" stroke="#4338ca" strokeWidth="0.7"/>
          <rect x={sx-9} y={sy-8} width="18" height="12" rx="2" fill="#8B5CF6" fillOpacity="0.07"/>
        </g>;
      })}

      {/* TV */}
      {(() => {
        const [cx,cy] = iso(-1.75,0,1.15);
        return (
          <g style={{cursor:"pointer"}} onClick={onTV}>
            <rect x={cx-26} y={cy-19} width="52" height="28" rx="3" fill="#060a14" stroke={tvColor} strokeWidth="1.8"/>
            <rect x={cx-26} y={cy-19} width="52" height="28" rx="3"
              fill={tvColor} opacity={tvFlash?0.28:0.09} filter="url(#tvGlow2)" style={{transition:"opacity 0.18s"}}/>
            <text x={cx} y={cy-4} textAnchor="middle" fontSize="6" fontWeight="800" fill="white" opacity="0.93"
              style={{fontFamily:"system-ui,sans-serif"}}>ENTER HQ</text>
            <line x1={cx} y1={cy+9} x2={cx} y2={cy+17} stroke="#334155" strokeWidth="2.5"/>
            <rect x={cx-9} y={cy+15} width="18" height="4" rx="2" fill="#334155"/>
          </g>
        );
      })()}

      {/* Roof */}
      <polygon points={p([[-3,-2,2.5],[3,-2,2.5],[0,-2,4]])} fill="#1a1d3a" stroke="#312e81" strokeWidth="1.1" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,2,2.5],[3,2,2.5],[0,2,4]])} fill="#13163a" stroke="#312e81" strokeWidth="1.1" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,-2,2.5],[-3,2,2.5],[0,2,4],[0,-2,4]])} fill="#181b3a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <polygon points={p([[3,-2,2.5],[3,2,2.5],[0,2,4],[0,-2,4]])} fill="#14173a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <line x1={iso(0,-2,4)[0]} y1={iso(0,-2,4)[1]} x2={iso(0,2,4)[0]} y2={iso(0,2,4)[1]}
        stroke="#6d5ce7" strokeWidth="1.4" opacity="0.8" style={{pointerEvents:"none"}}/>

    </svg>
  );
}

// ─── VIEW 3: RIGHT SIDE ────────────────────────────────────────────────────────
function RightSideView({ members, statuses, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  const S = 44, CX = 200, CY = 280;
  function iso(ix, iy, iz = 0) {
    // Camera rotated 90° right: negate previous rotation
    return [
      CX + (-iy + ix) * S * 0.866,
      CY + (iy + ix) * S * 0.5 - iz * S,
    ];
  }
  function p(coords) {
    return coords.map(([ix,iy,iz=0]) => iso(ix,iy,iz).map(v=>v.toFixed(1)).join(",")).join(" ");
  }
  const allRooms = [
    { id:"rasya",  x1:-3,y1:-2,x2:-1,y2:0 },
    { id:"living", x1:-1,y1:-2,x2: 1,y2:0 },
    { id:"dad",    x1: 1,y1:-2,x2: 3,y2:0 },
    { id:"mom",   x1:-3,y1: 0,x2:-1,y2:2 },
    { id:"rania", x1:-1,y1: 0,x2: 1,y2:2 },
    { id:"radif", x1: 1,y1: 0,x2: 3,y2:2 },
  ];
  return (
    <svg viewBox="30 80 340 310" width="100%" height="100%" style={{ display:"block", overflow:"visible" }}>
      <defs>
        <filter id="glow3" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tvGlow3" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx={CX} cy={CY+8} rx="148" ry="14" fill="rgba(0,0,0,0.4)"/>
      <polygon points={p([[-3,-2],[3,-2],[3,2],[-3,2]])} fill="#0c1520" stroke="#1a2535" strokeWidth="1"/>
      {allRooms.map(r => {
        const m = getMember(r.id,members);
        const col = m?(MEMBER_COLORS[m.color]?.hex||DEFAULT_COLORS[r.id]):DEFAULT_COLORS[r.id]||"#1e293b";
        const isHov=hov===r.id;
        const [lx,ly]=iso((r.x1+r.x2)/2,(r.y1+r.y2)/2,0.05);
        return (
          <g key={r.id}>
            <polygon points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill={col} fillOpacity={isHov?0.35:0.18} stroke={col}
              strokeWidth={isHov?1.8:0.8} strokeOpacity={isHov?1:0.5}
              filter={isHov?"url(#glow3)":undefined} style={{transition:"fill-opacity 0.15s"}}/>
            <polygon points={p([[r.x1,r.y1],[r.x2,r.y1],[r.x2,r.y2],[r.x1,r.y2]])}
              fill="transparent" stroke="transparent" strokeWidth="10"
              style={{cursor:(m||r.id==="living")?"pointer":"default"}}
              onClick={() => r.id==="living"?onTV():m&&onRoom(m)}
              onMouseEnter={() => setHov(r.id)} onMouseLeave={() => setHov(null)}/>
            <RoomLabel member={m} color={col} status={m?statuses[m.id]:null} x={lx} y={ly} size="sm"/>
          </g>
        );
      })}
      {/* Right wall facing us */}
      <polygon points={p([[3,-2,0],[3,2,0],[3,2,2.5],[3,-2,2.5]])}
        fill="#131d2e" stroke="#1e293b" strokeWidth="1" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,-2,0],[-3,2,0],[-3,2,2.5],[-3,-2,2.5]])}
        fill="#0f1520" stroke="#1e293b" strokeWidth="1" style={{pointerEvents:"none"}}/>
      <line x1={iso(3,-2,2.5)[0]} y1={iso(3,-2,2.5)[1]} x2={iso(3,2,2.5)[0]} y2={iso(3,2,2.5)[1]}
        stroke="#4338ca" strokeWidth="1" opacity="0.5"/>
      <line x1={iso(-3,-2,2.5)[0]} y1={iso(-3,-2,2.5)[1]} x2={iso(-3,2,2.5)[0]} y2={iso(-3,2,2.5)[1]}
        stroke="#4338ca" strokeWidth="1" opacity="0.3"/>
      {/* Right wall windows */}
      {[[-1,1.35],[1,1.35]].map(([wy,wz],i) => {
        const [sx,sy]=iso(3,wy,wz);
        return <g key={i} style={{pointerEvents:"none"}}>
          <rect x={sx-9} y={sy-8} width="18" height="12" rx="2" fill="#090d14" stroke="#4338ca" strokeWidth="0.7"/>
        </g>;
      })}
      {/* TV */}
      {(() => {
        const [cx,cy]=iso(1.75,0,1.15);
        return (
          <g style={{cursor:"pointer"}} onClick={onTV}>
            <rect x={cx-26} y={cy-19} width="52" height="28" rx="3" fill="#060a14" stroke={tvColor} strokeWidth="1.8"/>
            <rect x={cx-26} y={cy-19} width="52" height="28" rx="3"
              fill={tvColor} opacity={tvFlash?0.28:0.09} filter="url(#tvGlow3)" style={{transition:"opacity 0.18s"}}/>
            <text x={cx} y={cy-4} textAnchor="middle" fontSize="6" fontWeight="800" fill="white" opacity="0.93"
              style={{fontFamily:"system-ui,sans-serif"}}>ENTER HQ</text>
            <line x1={cx} y1={cy+9} x2={cx} y2={cy+17} stroke="#334155" strokeWidth="2.5"/>
            <rect x={cx-9} y={cy+15} width="18" height="4" rx="2" fill="#334155"/>
          </g>
        );
      })()}
      <polygon points={p([[-3,-2,2.5],[3,-2,2.5],[0,-2,4]])} fill="#1a1d3a" stroke="#312e81" strokeWidth="1.1" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,2,2.5],[3,2,2.5],[0,2,4]])} fill="#13163a" stroke="#312e81" strokeWidth="1.1" style={{pointerEvents:"none"}}/>
      <polygon points={p([[-3,-2,2.5],[-3,2,2.5],[0,2,4],[0,-2,4]])} fill="#181b3a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <polygon points={p([[3,-2,2.5],[3,2,2.5],[0,2,4],[0,-2,4]])} fill="#14173a" stroke="#312e81" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <line x1={iso(0,-2,4)[0]} y1={iso(0,-2,4)[1]} x2={iso(0,2,4)[0]} y2={iso(0,2,4)[1]}
        stroke="#6d5ce7" strokeWidth="1.4" opacity="0.8" style={{pointerEvents:"none"}}/>
    </svg>
  );
}

// ─── VIEW 4: TOP DOWN ─────────────────────────────────────────────────────────
// Pure top-down floor plan view. All 6 rooms visible as a grid.
function TopDownView({ members, statuses, onRoom, onTV, tvColor, tvFlash }) {
  const [hov, setHov] = useState(null);
  // Simple screen mapping: house is 6×4 units, each unit = 38px
  const U = 38, CX = 200, CY = 235;
  function s(ix,iy) { return [CX + ix*U, CY + iy*U]; }
  function rect(x1,y1,x2,y2) {
    const [ax,ay]=s(x1,y1),[bx,by]=s(x2,y2);
    return `${ax},${ay} ${bx},${ay} ${bx},${by} ${ax},${by}`;
  }

  const rooms = [
    { id:"rasya",   x1:-3,y1:-2,x2:-1,y2:0 },
    { id:"living",  x1:-1,y1:-2,x2: 1,y2:0 },
    { id:"dad",     x1: 1,y1:-2,x2: 3,y2:0 },
    { id:"mom",   x1:-3,y1: 0,x2:-1,y2:2 },
    { id:"rania", x1:-1,y1: 0,x2: 1,y2:2 },
    { id:"radif", x1: 1,y1: 0,x2: 3,y2:2 },
  ];

  return (
    <svg viewBox="30 60 340 340" width="100%" height="100%" style={{ display:"block", overflow:"visible" }}>
      <defs>
        <filter id="glow4" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="tvGlow4" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* House outline */}
      <rect x={s(-3,-2)[0]} y={s(-3,-2)[1]} width={U*6} height={U*4} rx="4"
        fill="#0a1018" stroke="#1e293b" strokeWidth="1.5"/>

      {rooms.map(r => {
        const m = getMember(r.id,members);
        const col = m?(MEMBER_COLORS[m.color]?.hex||DEFAULT_COLORS[r.id]):DEFAULT_COLORS[r.id]||"#1a2535";
        const isHov=hov===r.id;
        const [ax,ay]=s(r.x1,r.y1),[bx,by]=s(r.x2,r.y2);
        const mx=(ax+bx)/2, my=(ay+by)/2;
        return (
          <g key={r.id}>
            <rect x={ax+1} y={ay+1} width={bx-ax-2} height={by-ay-2} rx="3"
              fill={col} fillOpacity={isHov?0.42:0.22}
              stroke={col} strokeWidth={isHov?2:1} strokeOpacity={isHov?1:0.55}
              filter={isHov?"url(#glow4)":undefined} style={{transition:"fill-opacity 0.15s"}}/>
            {/* Room name label */}
            <rect x={ax+1} y={ay+1} width={bx-ax-2} height={by-ay-2} rx="3"
              fill="transparent" stroke="transparent"
              style={{cursor:(m||r.id==="living")?"pointer":"default"}}
              onClick={() => r.id==="living"?onTV():m&&onRoom(m)}
              onMouseEnter={() => setHov(r.id)} onMouseLeave={() => setHov(null)}/>
            {m && (
              <g style={{pointerEvents:"none"}}>
                <text x={mx} y={my-8} textAnchor="middle" fontSize="16" style={{fontFamily:"system-ui"}}>{m.emoji||m.name[0]}</text>
                <text x={mx} y={my+8} textAnchor="middle" fontSize="8" fontWeight="700" fill={col}
                  style={{fontFamily:"system-ui,sans-serif"}}>{m.name}</text>
                {statuses[m.id] && (
                  <>
                    <rect x={mx-16} y={my+11} width="32" height="10" rx="5"
                      fill={statuses[m.id]==="busy"?"#7f1d1d":statuses[m.id]==="done"?"#064e3b":"#1e293b"} opacity="0.9"/>
                    <text x={mx} y={my+18} textAnchor="middle" fontSize="5.5" fontWeight="700"
                      fill={statuses[m.id]==="busy"?"#fca5a5":statuses[m.id]==="done"?"#6ee7b7":"#64748b"}
                      style={{fontFamily:"system-ui,sans-serif"}}>
                      {statuses[m.id]==="busy"?"Busy":statuses[m.id]==="done"?"✓ Done":"Home"}
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        );
      })}

      {/* Wall lines */}
      {[-1,1].map(x => {
        const [x1,y1]=s(x,-2),[x2,y2]=s(x,2);
        return <line key={x} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>;
      })}
      <line x1={s(-3,0)[0]} y1={s(-3,0)[1]} x2={s(3,0)[0]} y2={s(3,0)[1]}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>

      {/* TV in living room */}
      {(() => {
        const [cx,cy]=s(0,-1);
        return (
          <g style={{cursor:"pointer"}} onClick={onTV}>
            <rect x={cx-22} y={cy-14} width="44" height="28" rx="3"
              fill={tvColor} opacity={tvFlash?0.35:0.18} filter="url(#tvGlow4)" style={{transition:"opacity 0.22s"}}/>
            <rect x={cx-18} y={cy-11} width="36" height="22" rx="2" fill="#060a14" stroke={tvColor} strokeWidth="1.5"/>
            <text x={cx} y={cy+2} textAnchor="middle" fontSize="5.5" fontWeight="800" fill="white" opacity="0.92"
              style={{fontFamily:"system-ui,sans-serif"}}>ENTER HQ</text>
          </g>
        );
      })()}

      {/* Compass */}
      <text x="350" y="90" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)"
        style={{fontFamily:"system-ui,sans-serif"}}>N↑</text>
    </svg>
  );
}

// ─── View config ───────────────────────────────────────────────────────────────
const VIEWS = [
  { id:"front",  label:"Front",      Component: FrontView  },
  { id:"left",   label:"Left Side",  Component: LeftSideView },
  { id:"right",  label:"Right Side", Component: RightSideView },
  { id:"top",    label:"Top Down",   Component: TopDownView },
];

// ─── Centered popup ────────────────────────────────────────────────────────────
function CenteredPopup({ children, onClose }) {
  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:60, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }} onClick={onClose}/>
      <div style={{ position:"fixed", inset:0, zIndex:61, display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:28, pointerEvents:"none" }}>
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
  const [viewIdx, setViewIdx] = useState(0);
  const [direction, setDirection] = useState(1); // 1=right, -1=left

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
        const busy = events.some(e => (e.date||e.start_date||"").slice(0,10) === today);
        const done = chores.some(c => c.completed && c.assigned_to === m.id);
        s[m.id] = busy ? "busy" : done ? "done" : "home";
      }
      setStatuses(s);
    }).catch(() => {});
  }, [members, familyCode]);

  const goLeft = () => {
    setDirection(-1);
    setViewIdx(i => (i - 1 + VIEWS.length) % VIEWS.length);
  };
  const goRight = () => {
    setDirection(1);
    setViewIdx(i => (i + 1) % VIEWS.length);
  };

  const handleSwitchToMember = (m) => {
    setActiveMember(m);
    window.dispatchEvent(new Event("member-changed"));
    setSelectedMember(null);
    navigate("/dashboard");
  };

  const { Component: ActiveView } = VIEWS[viewIdx];

  return (
    <div style={{ position:"fixed", inset:0, background:"#0d0d14", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <StarField />

      {/* Top bar */}
      <header style={{ position:"relative", zIndex:10, flexShrink:0, display:"flex", alignItems:"center", padding:"10px 14px" }}>
        <motion.button whileTap={{ scale:0.85 }} onClick={() => setSidebarOpen(true)}
          style={{ width:36, height:36, borderRadius:10, border:"none", background:"rgba(255,255,255,0.07)",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
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
              background:memberColor.hex, cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", color:"white", fontSize:15, fontWeight:700,
              boxShadow:`0 0 14px ${memberColor.hex}55` }}>
            {member.emoji || member.name[0]}
          </motion.button>
        ) : <div style={{ width:36, height:36, flexShrink:0 }}/>}
      </header>

      {/* View label + dots */}
      <div style={{ position:"relative", zIndex:10, flexShrink:0, textAlign:"center", padding:"2px 0 4px" }}>
        <p style={{ margin:0, fontSize:10, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase",
          color:"rgba(255,255,255,0.35)" }}>
          {VIEWS[viewIdx].label}
        </p>
        <div style={{ display:"flex", justifyContent:"center", gap:5, marginTop:4 }}>
          {VIEWS.map((v,i) => (
            <button key={v.id} onClick={() => { setDirection(i>viewIdx?1:-1); setViewIdx(i); }}
              style={{ width: i===viewIdx?16:6, height:6, borderRadius:3, border:"none", cursor:"pointer",
                background: i===viewIdx ? memberColor.hex : "rgba(255,255,255,0.18)",
                transition:"all 0.25s", padding:0 }}/>
          ))}
        </div>
      </div>

      {/* House + arrow buttons */}
      <div style={{ position:"relative", zIndex:10, flex:1, minHeight:0,
        display:"flex", alignItems:"center", justifyContent:"center", padding:"0 2px 4px" }}>

        {/* Left arrow */}
        <motion.button whileTap={{ scale:0.85 }} onClick={goLeft}
          style={{ flexShrink:0, width:36, height:36, borderRadius:"50%", border:"none",
            background:"rgba(255,255,255,0.07)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)", zIndex:2 }}>
          <ChevronLeft style={{ width:20, height:20, color:"rgba(255,255,255,0.6)" }}/>
        </motion.button>

        {/* House */}
        <div style={{ flex:1, minWidth:0, height:"100%", display:"flex", alignItems:"center", position:"relative", overflow:"hidden" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={viewIdx}
              custom={direction}
              initial={{ opacity:0, x: direction * 60 }}
              animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x: direction * -60 }}
              transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
              style={{ position:"absolute", inset:0, display:"flex", alignItems:"center" }}>
              <motion.div
                animate={{ y:[0,-4,0] }}
                transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }}
                style={{ width:"100%", height:"100%" }}>
                <ActiveView
                  members={members}
                  statuses={statuses}
                  onRoom={setSelectedMember}
                  onTV={() => navigate("/dashboard")}
                  tvColor={tvColor}
                  tvFlash={tvFlash}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        <motion.button whileTap={{ scale:0.85 }} onClick={goRight}
          style={{ flexShrink:0, width:36, height:36, borderRadius:"50%", border:"none",
            background:"rgba(255,255,255,0.07)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)", zIndex:2 }}>
          <ChevronRight style={{ width:20, height:20, color:"rgba(255,255,255,0.6)" }}/>
        </motion.button>
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
                        <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:999, fontSize:10, fontWeight:700,
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
