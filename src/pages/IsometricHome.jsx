import { useState, useEffect, useRef, useCallback } from "react";
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

// ─── Camera-parameterized projection ──────────────────────────────────────────
// azimuth: angle around the vertical axis (radians). 0 = standard isometric view.
// elevation: fixed at 30° (tan = 0.5773) — classic isometric.
// The camera orbits the house at fixed elevation, changing only horizontal angle.
//
// Standard isometric: camera at azimuth=π/4 from +x axis, elevation=35.26°
// We parameterize azimuth so dragging left/right changes it.
//
// 3D world coords: ix (right), iy (into screen / depth), iz (up)
// We rotate the world around Z by azimuth, then project with fixed elevation.
//
// Projection after azimuth rotation:
//   rx = ix*cos(az) - iy*sin(az)   (rotated x)
//   ry = ix*sin(az) + iy*cos(az)   (rotated y / depth)
//   screen_x = rx * S
//   screen_y = ry * S * sin(elevation) - iz * S
//   where sin(elevation) ≈ 0.5 for 30° elevation

const S = 42;       // scale px per unit
const OX = 200;     // SVG origin x
const OY = 300;     // SVG origin y
const ELEV = 0.5;   // sin(30°) — elevation factor

// Snap angles in radians (0=front, π/2=right, π=back, -π/2=left)
const SNAP_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

function makeIso(azimuth) {
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  return function iso(ix, iy, iz = 0) {
    const rx = ix * cos - iy * sin;
    const ry = ix * sin + iy * cos;
    return [
      OX + rx * S,
      OY + ry * S * ELEV - iz * S,
    ];
  };
}

// Depth of a point for painter's algorithm sorting (higher ry = further back = draw first)
function makeDepth(azimuth) {
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  return function depth(ix, iy, iz = 0) {
    return ix * sin + iy * cos - iz * 0.01;
  };
}

// ─── House geometry ────────────────────────────────────────────────────────────
const WX = 3, WY = 2, WZ = 2.5, RZ = 4;

// ─── Rooms ────────────────────────────────────────────────────────────────────
const ROOMS = [
  { id: "rasya",   col: [-3,-1], row: [-2, 0], defaultColor: "#8B5CF6", furniture: "bed"  },
  { id: "living",  col: [-1, 1], row: [-2, 0], defaultColor: "#1e3a5f", furniture: "tv"   },
  { id: "dad",     col: [ 1, 3], row: [-2, 0], defaultColor: "#1E40AF", furniture: "desk" },
  { id: "mom",     col: [-3,-1], row: [ 0, 2], defaultColor: "#EC4899", furniture: "bed"  },
  { id: "hallway", col: [-1, 1], row: [ 0, 2], defaultColor: "#131c2e", furniture: "plant"},
  { id: "radif",   col: [ 1, 3], row: [ 0, 2], defaultColor: "#F59E0B", furniture: "bed"  },
];

// TV colors
const TV_COLORS = ["#8B5CF6","#3B82F6","#10B981","#EC4899","#F59E0B"];

// ─── Member mapping ────────────────────────────────────────────────────────────
function getMemberForRoom(roomId, members) {
  if (!members.length) return null;
  switch (roomId) {
    case "rasya":   return members.find(m => m.name?.toLowerCase().includes("rasya")) ?? null;
    case "dad":     return members.find(m => m.role === "Parent" && m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)) ?? null;
    case "mom":     return members.find(m => m.role === "Parent" && !m.name?.toLowerCase().match(/dad|father|ayah|bapak|papa|yusuf|yanwar|husein/)) ?? null;
    case "radif":   return members.find(m => m.name?.toLowerCase().includes("radif")) ?? null;
    case "rania":   return members.find(m => m.name?.toLowerCase().includes("rania")) ?? null;
    default:        return null;
  }
}

// ─── Face visibility (backface culling) ───────────────────────────────────────
// Returns true if a face whose outward normal is in direction (nx, ny) is visible
// from the current camera azimuth
function isFaceVisible(azimuth, nx, ny) {
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  // Camera direction in world space (looking toward origin)
  const camX = cos, camY = sin;
  // Dot product of face normal with camera direction
  const dot = nx * camX + ny * camY;
  return dot < 0; // visible if facing camera
}

// ─── SVG House renderer ────────────────────────────────────────────────────────
function IsometricHouse({ members, memberStatuses, onRoomClick, onTVClick, azimuth, onDragStart, onDragMove, onDragEnd }) {
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [tvIdx, setTvIdx] = useState(0);
  const [tvFlash, setTvFlash] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTvIdx(i => (i + 1) % TV_COLORS.length);
      setTvFlash(true);
      setTimeout(() => setTvFlash(false), 280);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const tvColor = TV_COLORS[tvIdx];
  const iso = makeIso(azimuth);
  const depth = makeDepth(azimuth);

  // Helper: polygon point string from world coords
  function p(...coords) {
    return coords.map(([ix,iy,iz]) => {
      const [x,y] = iso(ix, iy, iz ?? 0);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  // ── Faces to render — we'll sort by depth and cull backfaces ──
  // Each face: { type, key, element, depthVal }
  const faces = [];

  // ── Floor ──
  {
    const d = depth(0,0,0);
    faces.push({ key:"floor", depthVal: d, el: (
      <polygon key="floor"
        points={p([-WX,-WY,0],[WX,-WY,0],[WX,WY,0],[-WX,WY,0])}
        fill="#0c1520" stroke="#1a2535" strokeWidth="0.8" />
    )});
  }

  // ── Room tiles ──
  ROOMS.forEach(room => {
    const [x1,x2] = room.col;
    const [y1,y2] = room.row;
    const mx = (x1+x2)/2, my = (y1+y2)/2;
    const member = getMemberForRoom(room.id, members);
    const color = member ? (MEMBER_COLORS[member.color]?.hex || room.defaultColor) : room.defaultColor;
    const isHov = hoveredRoom === room.id;
    const d = depth(mx, my, 0);

    faces.push({ key: room.id+"-tile", depthVal: d, el: (
      <g key={room.id+"-tile"}>
        <polygon
          points={p([x1,y1,0],[x2,y1,0],[x2,y2,0],[x1,y2,0])}
          fill={color} fillOpacity={isHov ? 0.32 : 0.16}
          stroke={color} strokeWidth={isHov ? 1.5 : 0.7} strokeOpacity={isHov ? 1 : 0.4}
          style={{ transition: "fill-opacity 0.15s" }}
        />
        {/* Hit area */}
        <polygon
          points={p([x1,y1,0],[x2,y1,0],[x2,y2,0],[x1,y2,0])}
          fill="transparent" stroke="transparent" strokeWidth="10"
          style={{ cursor: (member || room.id === "living") ? "pointer" : "default" }}
          onClick={() => { if (room.id === "living") onTVClick(); else if (member) onRoomClick(member); }}
          onMouseEnter={() => setHoveredRoom(room.id)}
          onMouseLeave={() => setHoveredRoom(null)}
          onTouchStart={(e) => { setHoveredRoom(room.id); onDragStart(e); }}
          onTouchEnd={(e) => { setHoveredRoom(null); onDragEnd(e); }}
        />
        {/* Simple furniture */}
        <FurnitureSVG type={room.furniture} x1={x1} y1={y1} x2={x2} y2={y2} color={color} iso={iso} />
      </g>
    )});
  });

  // ── Grid lines ──
  {
    const d = depth(0,0,0.01);
    faces.push({ key:"grid", depthVal: d, el: (
      <g key="grid" style={{pointerEvents:"none"}}>
        {[-1,1].map(x => {
          const [ax,ay] = iso(x,-WY,0), [bx,by] = iso(x,WY,0);
          return <line key={x} x1={ax.toFixed(1)} y1={ay.toFixed(1)} x2={bx.toFixed(1)} y2={by.toFixed(1)}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />;
        })}
        {[0].map(y => {
          const [ax,ay] = iso(-WX,y,0), [bx,by] = iso(WX,y,0);
          return <line key={y} x1={ax.toFixed(1)} y1={ay.toFixed(1)} x2={bx.toFixed(1)} y2={by.toFixed(1)}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />;
        })}
      </g>
    )});
  }

  // ── 4 walls — only render visible ones ──
  const walls = [
    // Front wall (y = -WY), normal = (0, -1)
    { key:"wall-front", nx:0, ny:-1, corners:[[-WX,-WY,0],[WX,-WY,0],[WX,-WY,WZ],[-WX,-WY,WZ]], fill:"#131d2e", ix:0, iy:-WY },
    // Back wall (y = WY), normal = (0, 1)
    { key:"wall-back",  nx:0, ny:1,  corners:[[-WX,WY,0],[WX,WY,0],[WX,WY,WZ],[-WX,WY,WZ]],    fill:"#0f1825", ix:0, iy:WY  },
    // Left wall (x = -WX), normal = (-1, 0)
    { key:"wall-left",  nx:-1, ny:0, corners:[[-WX,-WY,0],[-WX,WY,0],[-WX,WY,WZ],[-WX,-WY,WZ]], fill:"#101826", ix:-WX, iy:0 },
    // Right wall (x = WX), normal = (1, 0)
    { key:"wall-right", nx:1,  ny:0, corners:[[WX,-WY,0],[WX,WY,0],[WX,WY,WZ],[WX,-WY,WZ]],     fill:"#0c1220", ix:WX, iy:0  },
  ];

  walls.forEach(w => {
    if (!isFaceVisible(azimuth, w.nx, w.ny)) return;
    const d = depth(w.ix, w.iy, WZ/2);
    faces.push({ key: w.key, depthVal: d, el: (
      <g key={w.key} style={{pointerEvents:"none"}}>
        <polygon points={p(...w.corners)} fill={w.fill} stroke="#1e293b" strokeWidth="1" />
        {/* Wall top edge glow */}
        {(() => {
          const top = w.corners.filter(c => c[2] === WZ);
          if (top.length < 2) return null;
          const [ax,ay] = iso(...top[0]), [bx,by] = iso(...top[1]);
          return <line x1={ax.toFixed(1)} y1={ay.toFixed(1)} x2={bx.toFixed(1)} y2={by.toFixed(1)}
            stroke="#4338ca" strokeWidth="0.9" opacity="0.45" />;
        })()}
        {/* Windows on front/back walls */}
        {(w.key === "wall-front" || w.key === "wall-back") && [-1.8, 1.8].map((wx, i) => {
          const [sx,sy] = iso(wx, w.iy, 1.4);
          return (
            <g key={i}>
              <rect x={(sx-10).toFixed(1)} y={(sy-9).toFixed(1)} width="20" height="14" rx="2"
                fill="#090d14" stroke="#4338ca" strokeWidth="0.7" />
              <rect x={(sx-10).toFixed(1)} y={(sy-9).toFixed(1)} width="20" height="14" rx="2"
                fill="#8B5CF6" fillOpacity="0.07" />
              <line x1={sx.toFixed(1)} y1={(sy-9).toFixed(1)} x2={sx.toFixed(1)} y2={(sy+5).toFixed(1)}
                stroke="#4338ca" strokeWidth="0.5" opacity="0.4"/>
              <line x1={(sx-10).toFixed(1)} y1={(sy-2).toFixed(1)} x2={(sx+10).toFixed(1)} y2={(sy-2).toFixed(1)}
                stroke="#4338ca" strokeWidth="0.5" opacity="0.4"/>
            </g>
          );
        })}
        {/* Door on front wall only */}
        {w.key === "wall-front" && (() => {
          const [dx,dy] = iso(0, -WY, 0);
          return (
            <g>
              <rect x={(dx-9).toFixed(1)} y={(dy-22).toFixed(1)} width="18" height="22" rx="2"
                fill="#0e1628" stroke="#4338ca" strokeWidth="0.9"/>
              <circle cx={(dx+5).toFixed(1)} cy={(dy-11).toFixed(1)} r="2" fill="#6d28d9"/>
            </g>
          );
        })()}
        {/* Side windows on left/right walls */}
        {(w.key === "wall-left" || w.key === "wall-right") && [[-0.5, 1.2], [0.8, 1.2]].map(([wy, wz], i) => {
          const [sx,sy] = iso(w.ix, wy, wz);
          return (
            <g key={i}>
              <rect x={(sx-8).toFixed(1)} y={(sy-7).toFixed(1)} width="16" height="11" rx="2"
                fill="#090d14" stroke="#4338ca" strokeWidth="0.7"/>
              <rect x={(sx-8).toFixed(1)} y={(sy-7).toFixed(1)} width="16" height="11" rx="2"
                fill="#8B5CF6" fillOpacity="0.06"/>
            </g>
          );
        })}
      </g>
    )});
  });

  // ── TV screen (living room) ──
  {
    const [cx,cy] = iso(0, -1.7, 1.15);
    const w2 = 26, h = 18;
    const d = depth(0, -1.7, 1.15);
    faces.push({ key:"tv", depthVal: d, el: (
      <g key="tv" style={{cursor:"pointer"}} onClick={onTVClick}>
        <defs>
          <filter id="tvG2" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x={(cx-w2-4).toFixed(1)} y={(cy-h-4).toFixed(1)} width={(w2*2+8).toFixed(1)} height={(h+8).toFixed(1)} rx="5"
          fill={tvColor} opacity={tvFlash ? 0.35 : 0.18} filter="url(#tvG2)"
          style={{transition:"opacity 0.22s"}}/>
        <rect x={(cx-w2).toFixed(1)} y={(cy-h).toFixed(1)} width={(w2*2).toFixed(1)} height={h.toFixed(1)} rx="3"
          fill="#060a14" stroke={tvColor} strokeWidth="1.8"/>
        <rect x={(cx-w2+2).toFixed(1)} y={(cy-h+2).toFixed(1)} width={(w2*2-4).toFixed(1)} height={(h-4).toFixed(1)} rx="2"
          fill={tvColor} opacity={tvFlash ? 0.28 : 0.1} style={{transition:"opacity 0.18s"}}/>
        <text x={cx.toFixed(1)} y={(cy-h/2+2).toFixed(1)} textAnchor="middle"
          fontSize="5" fontWeight="800" fill="white" opacity="0.93"
          style={{fontFamily:"system-ui,sans-serif",letterSpacing:"0.6px"}}>
          ENTER HQ
        </text>
        <line x1={cx.toFixed(1)} y1={cy.toFixed(1)} x2={cx.toFixed(1)} y2={(cy+10).toFixed(1)}
          stroke="#334155" strokeWidth="2.5"/>
        <rect x={(cx-8).toFixed(1)} y={(cy+8).toFixed(1)} width="16" height="4" rx="2" fill="#334155"/>
      </g>
    )});
  }

  // ── Chimney ──
  {
    const cx=-0.8, cy=-0.8;
    const d = depth(cx, cy, RZ);
    faces.push({ key:"chimney", depthVal: d, el: (
      <g key="chimney" style={{pointerEvents:"none"}}>
        <polygon points={p([cx,cy,RZ-0.4],[cx+0.4,cy,RZ-0.4],[cx+0.4,cy,RZ+0.6],[cx,cy,RZ+0.6])}
          fill="#1e1b4b" stroke="#4338ca" strokeWidth="0.7"/>
        <polygon points={p([cx-0.05,cy-0.12,RZ+0.6],[cx+0.45,cy-0.12,RZ+0.6],[cx+0.45,cy+0.12,RZ+0.6],[cx-0.05,cy+0.12,RZ+0.6])}
          fill="#2d2a6e"/>
        {[0,1,2].map(i => {
          const [smx,smy] = iso(cx+0.2, cy, RZ+0.7+i*0.2);
          return (
            <motion.circle key={i} cx={smx.toFixed(1)} cy={smy.toFixed(1)} r={2+i*1.5}
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"
              animate={{ cy:[smy, smy-14-i*5], opacity:[0.3,0] }}
              transition={{ duration:2, repeat:Infinity, delay:i*0.6, ease:"easeOut" }}/>
          );
        })}
      </g>
    )});
  }

  // ── Roof faces ──
  const roofFaces = [
    // Left face normal approx (-1, 0) tilted — visible when camera is on left side
    { key:"roof-left",  normal:[-1,0], corners:[[-WX,-WY,WZ],[-WX,WY,WZ],[0,WY,RZ],[0,-WY,RZ]], fill:"#1a1d3a" },
    // Right face normal approx (1, 0) tilted
    { key:"roof-right", normal:[1,0],  corners:[[WX,-WY,WZ],[WX,WY,WZ],[0,WY,RZ],[0,-WY,RZ]],  fill:"#15183a" },
    // Front gable (y=-WY) normal (0,-1)
    { key:"roof-gable-front", normal:[0,-1], corners:[[-WX,-WY,WZ],[WX,-WY,WZ],[0,-WY,RZ]], fill:"#1d2142" },
    // Back gable (y=WY) normal (0,1)
    { key:"roof-gable-back",  normal:[0,1],  corners:[[-WX,WY,WZ],[WX,WY,WZ],[0,WY,RZ]],   fill:"#181c38" },
  ];

  roofFaces.forEach(rf => {
    const [cx,cy] = rf.corners.reduce(([ax,ay],c) => [ax+c[0]/rf.corners.length, ay+c[1]/rf.corners.length], [0,0]);
    const d = depth(cx, cy, (WZ+RZ)/2);
    faces.push({ key: rf.key, depthVal: d, el: (
      <g key={rf.key} style={{pointerEvents:"none"}}>
        <polygon points={p(...rf.corners)} fill={rf.fill} stroke="#312e81" strokeWidth="1.1"/>
        {/* Rania's dormer window on right roof face */}
        {rf.key === "roof-right" && (() => {
          const rania = getMemberForRoom("rania", members);
          if (!rania) return null;
          const rc = MEMBER_COLORS[rania.color]?.hex || "#EAB308";
          const [wx,wy] = iso(2.0, 0.5, WZ+1.0);
          return (
            <g>
              <rect x={(wx-9).toFixed(1)} y={(wy-8).toFixed(1)} width="18" height="13" rx="2"
                fill="#090d14" stroke={rc} strokeWidth="0.9"/>
              <rect x={(wx-9).toFixed(1)} y={(wy-8).toFixed(1)} width="18" height="13" rx="2"
                fill={rc} fillOpacity="0.12"/>
              <text x={wx.toFixed(1)} y={(wy-12).toFixed(1)} textAnchor="middle"
                fontSize="9" style={{fontFamily:"system-ui"}}>{rania.emoji || "🌙"}</text>
              <text x={wx.toFixed(1)} y={(wy+9).toFixed(1)} textAnchor="middle"
                fontSize="4.5" fontWeight="700" fill={rc}
                style={{fontFamily:"system-ui,sans-serif"}}>{rania.name}</text>
            </g>
          );
        })()}
      </g>
    )});
  });

  // Ridge line
  {
    const [ax,ay] = iso(0,-WY,RZ), [bx,by] = iso(0,WY,RZ);
    const d = depth(0,0,RZ);
    faces.push({ key:"ridge", depthVal: d, el:(
      <line key="ridge" x1={ax.toFixed(1)} y1={ay.toFixed(1)} x2={bx.toFixed(1)} y2={by.toFixed(1)}
        stroke="#6d5ce7" strokeWidth="1.3" opacity="0.8" style={{pointerEvents:"none"}}/>
    )});
  }

  // ── Sort all faces back-to-front (painter's algorithm) ──
  faces.sort((a, b) => b.depthVal - a.depthVal);

  // ── Room labels — always drawn on top, not sorted ──
  const labels = ROOMS.map(room => {
    const [x1,x2] = room.col, [y1,y2] = room.row;
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    const [lx,ly] = iso(mx, my, 0.08);
    const member = getMemberForRoom(room.id, members);
    if (!member && room.id !== "living") return null;
    const color = member ? (MEMBER_COLORS[member.color]?.hex || room.defaultColor) : room.defaultColor;
    const status = member ? memberStatuses[member.id] : null;

    return (
      <g key={room.id+"-lbl"} style={{pointerEvents:"none"}}>
        {member && (<>
          <text x={lx.toFixed(1)} y={(ly-10).toFixed(1)} textAnchor="middle"
            fontSize="11" style={{fontFamily:"system-ui"}}>{member.emoji||member.name[0]}</text>
          <text x={lx.toFixed(1)} y={(ly+2).toFixed(1)} textAnchor="middle"
            fontSize="6" fontWeight="700" fill={color}
            style={{fontFamily:"system-ui,sans-serif"}}>{member.name}</text>
          {status && (<>
            <rect x={(lx-13).toFixed(1)} y={(ly+4).toFixed(1)} width="26" height="8" rx="4"
              fill={status==="busy"?"#7f1d1d":status==="done"?"#064e3b":"#1e293b"} opacity="0.9"/>
            <text x={lx.toFixed(1)} y={(ly+10).toFixed(1)} textAnchor="middle"
              fontSize="4.5" fontWeight="700"
              fill={status==="busy"?"#fca5a5":status==="done"?"#6ee7b7":"#64748b"}
              style={{fontFamily:"system-ui,sans-serif"}}>
              {status==="busy"?"Busy":status==="done"?"✓ Done":"Home"}
            </text>
          </>)}
        </>)}
      </g>
    );
  });

  return (
    <svg
      viewBox="30 90 340 310"
      width="100%" height="100%"
      style={{ display:"block", overflow:"visible", touchAction:"none" }}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchStart={onDragStart}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
    >
      <defs>
        <filter id="groundBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={OX} cy={OY+6} rx="145" ry="14" fill="rgba(0,0,0,0.4)" filter="url(#groundBlur)"/>

      {/* Painter's-sorted faces */}
      {faces.map(f => f.el)}

      {/* Labels always on top, facing camera (not rotated) */}
      {labels}
    </svg>
  );
}

// ─── Furniture SVG ─────────────────────────────────────────────────────────────
function FurnitureSVG({ type, x1, y1, x2, y2, color, iso }) {
  if (type === "bed") {
    const bx = x1 + 0.4, by = y1 + 0.3;
    function p(...coords) {
      return coords.map(([ix,iy,iz]) => {
        const [x,y] = iso(ix, iy, iz ?? 0);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
    }
    return (
      <g opacity="0.8" style={{pointerEvents:"none"}}>
        <polygon points={p([bx,by+0.5,0.38],[bx+1.0,by+0.5,0.38],[bx+1.0,by+1.3,0.38],[bx,by+1.3,0.38])}
          fill={color} fillOpacity="0.22" stroke={color} strokeWidth="0.5" strokeOpacity="0.4"/>
        <polygon points={p([bx,by+0.5,0.38],[bx+1.0,by+0.5,0.38],[bx+1.0,by+0.5,0.72],[bx,by+0.5,0.72])}
          fill={color} fillOpacity="0.32" stroke={color} strokeWidth="0.5" strokeOpacity="0.5"/>
        <polygon points={p([bx+0.1,by+0.62,0.4],[bx+0.55,by+0.62,0.4],[bx+0.55,by+0.85,0.4],[bx+0.1,by+0.85,0.4])}
          fill="white" fillOpacity="0.12"/>
      </g>
    );
  }
  if (type === "desk") {
    const dx = x2 - 1.4, dy = y1 + 0.3;
    function p(...coords) {
      return coords.map(([ix,iy,iz]) => {
        const [x,y] = iso(ix, iy, iz ?? 0);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
    }
    return (
      <g opacity="0.8" style={{pointerEvents:"none"}}>
        <polygon points={p([dx,dy,0.45],[dx+1.0,dy,0.45],[dx+1.0,dy+0.7,0.45],[dx,dy+0.7,0.45])}
          fill={color} fillOpacity="0.22" stroke={color} strokeWidth="0.5" strokeOpacity="0.4"/>
        <polygon points={p([dx+0.25,dy+0.05,0.45],[dx+0.8,dy+0.05,0.45],[dx+0.8,dy+0.05,0.82],[dx+0.25,dy+0.05,0.82])}
          fill="#1e3a5f" fillOpacity="0.8" stroke="#3b82f6" strokeWidth="0.5"/>
      </g>
    );
  }
  if (type === "plant") {
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    const [px,py] = iso(mx, my, 0.05);
    return (
      <g style={{pointerEvents:"none"}}>
        <rect x={(px-4).toFixed(1)} y={(py-3).toFixed(1)} width="8" height="7" rx="2"
          fill="#14532d" opacity="0.65"/>
        <circle cx={px.toFixed(1)} cy={(py-8).toFixed(1)} r="7" fill="#166534" opacity="0.55"/>
        <circle cx={(px-5).toFixed(1)} cy={(py-5).toFixed(1)} r="5" fill="#15803d" opacity="0.45"/>
        <circle cx={(px+5).toFixed(1)} cy={(py-5).toFixed(1)} r="5" fill="#15803d" opacity="0.45"/>
      </g>
    );
  }
  return null;
}

// ─── Orbit controller hook ─────────────────────────────────────────────────────
const SNAP_ANGLES_RAD = [0, Math.PI/2, Math.PI, -Math.PI/2];
const MIN_AZ = -Math.PI * 0.9;
const MAX_AZ =  Math.PI * 0.9;
const DRAG_SENSITIVITY = 0.008; // radians per pixel
const MOMENTUM_DECAY = 0.88;    // per frame multiplier
const SNAP_THRESHOLD = 0.008;   // velocity below which we snap

function useOrbitControl() {
  const [azimuth, setAzimuth] = useState(0);
  const azRef = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const rafRef = useRef(null);
  const lastTime = useRef(0);

  const stopMomentum = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const snapToNearest = useCallback((az, vel) => {
    // Find nearest snap angle
    let best = SNAP_ANGLES_RAD[0], bestDist = Infinity;
    for (const s of SNAP_ANGLES_RAD) {
      // Normalize difference to [-π, π]
      let d = az - s;
      while (d > Math.PI) d -= Math.PI*2;
      while (d < -Math.PI) d += Math.PI*2;
      if (Math.abs(d) < bestDist) { bestDist = Math.abs(d); best = s; }
    }

    // Animate spring toward best snap
    const target = best;
    const springStep = () => {
      const cur = azRef.current;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI*2;
      while (diff < -Math.PI) diff += Math.PI*2;
      if (Math.abs(diff) < 0.001) {
        azRef.current = target;
        setAzimuth(target);
        return;
      }
      const next = cur + diff * 0.12;
      azRef.current = next;
      setAzimuth(next);
      rafRef.current = requestAnimationFrame(springStep);
    };
    stopMomentum();
    rafRef.current = requestAnimationFrame(springStep);
  }, []);

  const momentumStep = useCallback(() => {
    velocity.current *= MOMENTUM_DECAY;
    if (Math.abs(velocity.current) < SNAP_THRESHOLD) {
      snapToNearest(azRef.current, velocity.current);
      return;
    }
    const next = Math.max(MIN_AZ, Math.min(MAX_AZ, azRef.current + velocity.current));
    azRef.current = next;
    setAzimuth(next);
    rafRef.current = requestAnimationFrame(momentumStep);
  }, [snapToNearest]);

  const onDragStart = useCallback((e) => {
    stopMomentum();
    dragging.current = true;
    velocity.current = 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    lastX.current = clientX;
    lastTime.current = Date.now();
  }, []);

  const onDragMove = useCallback((e) => {
    if (!dragging.current) return;
    e.preventDefault?.();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = clientX - lastX.current;
    const dt = Math.max(1, Date.now() - lastTime.current);
    const delta = dx * DRAG_SENSITIVITY;
    velocity.current = delta / (dt / 16); // normalize to ~60fps
    lastX.current = clientX;
    lastTime.current = Date.now();
    const next = Math.max(MIN_AZ, Math.min(MAX_AZ, azRef.current - delta)); // inverted: drag right = rotate right
    azRef.current = next;
    setAzimuth(next);
  }, []);

  const onDragEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    // If fast enough, coast with momentum; else snap immediately
    if (Math.abs(velocity.current) > SNAP_THRESHOLD * 3) {
      rafRef.current = requestAnimationFrame(momentumStep);
    } else {
      snapToNearest(azRef.current, velocity.current);
    }
  }, [momentumStep, snapToNearest]);

  useEffect(() => () => stopMomentum(), []);

  return { azimuth, onDragStart, onDragMove, onDragEnd };
}

// ─── Swipe hint overlay ────────────────────────────────────────────────────────
function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 2800); return () => clearTimeout(t); }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "absolute", bottom: 56, left: 0, right: 0,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            pointerEvents: "none", zIndex: 5,
          }}
        >
          <motion.div
            animate={{ x: [-18, 18, -18] }}
            transition={{ duration: 1.4, repeat: 1, ease: "easeInOut" }}
            style={{ fontSize: 22 }}
          >
            👆
          </motion.div>
          <p style={{
            color: "rgba(255,255,255,0.35)", fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase",
            margin: 0,
          }}>drag to orbit</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Centered popup ────────────────────────────────────────────────────────────
function CenteredPopup({ children, onClose }) {
  return (
    <>
      <div style={{
        position:"fixed", inset:0, zIndex:60,
        background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
      }} onClick={onClose}/>
      <div style={{
        position:"fixed", inset:0, zIndex:61,
        display:"flex", alignItems:"flex-end", justifyContent:"center",
        paddingBottom:28, pointerEvents:"none",
      }}>
        <div style={{ pointerEvents:"auto", width:"85vw", maxWidth:340 }}>
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

  const { azimuth, onDragStart, onDragMove, onDragEnd } = useOrbitControl();

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
        const hasBusy = events.some(e => (e.date || e.start_date || "").slice(0,10) === today);
        const hasDone = chores.some(c => c.completed && c.assigned_to === m.id);
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
      position:"fixed", inset:0,
      background:"#0d0d14",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>
      <StarField />

      {/* Top bar */}
      <header style={{
        position:"relative", zIndex:10, flexShrink:0,
        display:"flex", alignItems:"center",
        padding:"10px 14px",
      }}>
        <motion.button whileTap={{ scale:0.85 }} onClick={() => setSidebarOpen(true)}
          style={{
            width:36, height:36, borderRadius:10, border:"none",
            background:"rgba(255,255,255,0.07)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
          <Menu style={{ width:18, height:18, color:"rgba(255,255,255,0.65)" }}/>
        </motion.button>

        <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
          <span style={{
            fontWeight:700, fontSize:15,
            background:"linear-gradient(135deg,#fff 0%,#c4b5fd 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
          }}>🏠 Family HQ</span>
        </div>

        {member ? (
          <motion.button whileTap={{ scale:0.85 }} onClick={() => navigate("/select")}
            style={{
              width:36, height:36, borderRadius:"50%", border:"none", flexShrink:0,
              background:memberColor.hex, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"white", fontSize:15, fontWeight:700,
              boxShadow:`0 0 14px ${memberColor.hex}55`,
            }}>
            {member.emoji || member.name[0]}
          </motion.button>
        ) : <div style={{ width:36, height:36, flexShrink:0 }}/>}
      </header>

      <p style={{
        position:"relative", zIndex:10, flexShrink:0,
        textAlign:"center", fontSize:9, letterSpacing:"0.14em",
        textTransform:"uppercase", color:"rgba(255,255,255,0.2)",
        margin:"0 0 2px",
      }}>tap a room · tap tv to enter</p>

      {/* House */}
      <div style={{
        position:"relative", zIndex:10,
        flex:1, minHeight:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"0 4px 4px",
        userSelect:"none",
      }}>
        <SwipeHint />
        <motion.div
          animate={{ y:[0,-4,0] }}
          transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }}
          style={{ width:"100%", height:"100%", display:"flex", alignItems:"center" }}
        >
          <IsometricHouse
            members={members}
            memberStatuses={memberStatuses}
            onRoomClick={setSelectedMember}
            onTVClick={() => navigate("/dashboard")}
            azimuth={azimuth}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        </motion.div>
      </div>

      {/* Member popup */}
      <AnimatePresence>
        {selectedMember && (
          <CenteredPopup onClose={() => setSelectedMember(null)}>
            <motion.div
              initial={{ opacity:0, y:28, scale:0.94 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:28, scale:0.94 }}
              transition={{ type:"spring", stiffness:400, damping:32 }}
            >
              {(() => {
                const color = MEMBER_COLORS[selectedMember.color] || MEMBER_COLORS.purple;
                const status = memberStatuses[selectedMember.id];
                return (
                  <div style={{
                    borderRadius:22, padding:"18px 18px 16px",
                    background:"rgba(10,8,24,0.98)",
                    border:`1px solid ${color.hex}45`,
                    boxShadow:`0 0 40px ${color.hex}20, 0 20px 60px rgba(0,0,0,0.7)`,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <div style={{
                        width:52, height:52, borderRadius:14, flexShrink:0,
                        background:`${color.hex}20`, boxShadow:`0 0 16px ${color.hex}35`,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:24,
                      }}>{selectedMember.emoji || selectedMember.name[0]}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:"white", fontWeight:700, fontSize:16, margin:"0 0 2px" }}>{selectedMember.name}</p>
                        <p style={{ color:color.hex, fontSize:11, margin:"0 0 6px" }}>{selectedMember.role}</p>
                        <span style={{
                          display:"inline-block", padding:"2px 9px", borderRadius:999, fontSize:10, fontWeight:700,
                          background:status==="busy"?"rgba(127,29,29,0.55)":status==="done"?"rgba(6,78,59,0.55)":"rgba(30,37,51,0.55)",
                          color:status==="busy"?"#fca5a5":status==="done"?"#6ee7b7":"#94a3b8",
                        }}>
                          {status==="busy"?"📅 Busy":status==="done"?"✅ Done":"🏠 Home"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-around", marginBottom:14 }}>
                      {[["XP", selectedMember.xp??0],["Streak 🔥",selectedMember.streak??0],["Level",selectedMember.level??1]].map(([l,v]) => (
                        <div key={l} style={{ textAlign:"center" }}>
                          <p style={{ color:"white", fontWeight:700, fontSize:17, margin:0 }}>{v}</p>
                          <p style={{ color:"rgba(255,255,255,0.3)", fontSize:10, margin:0 }}>{l}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:9 }}>
                      <button onClick={() => setSelectedMember(null)} style={{
                        flex:1, padding:"10px 0", borderRadius:14,
                        border:"1px solid rgba(255,255,255,0.07)",
                        background:"rgba(255,255,255,0.04)",
                        color:"rgba(255,255,255,0.45)", fontSize:12, fontWeight:600, cursor:"pointer",
                      }}>Close</button>
                      <motion.button whileTap={{ scale:0.96 }}
                        onClick={() => handleSwitchToMember(selectedMember)} style={{
                          flex:1, padding:"10px 0", borderRadius:14, border:"none",
                          background:`linear-gradient(135deg,${color.hex},${color.hex}aa)`,
                          color:"white", fontSize:12, fontWeight:700, cursor:"pointer",
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
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:"fixed", inset:0, zIndex:80, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }}
              onClick={() => setSidebarOpen(false)}/>
            <motion.aside key="sb"
              initial={{ x:"-100%" }} animate={{ x:0 }} exit={{ x:"-100%" }}
              transition={{ type:"spring", stiffness:350, damping:35 }}
              style={{
                position:"fixed", left:0, top:0, bottom:0, zIndex:90,
                width:256, display:"flex", flexDirection:"column",
                background:"rgba(10,10,18,0.97)",
                borderRight:`1px solid ${memberColor.hex}28`,
                paddingTop:"env(safe-area-inset-top)",
                paddingBottom:"env(safe-area-inset-bottom)",
              }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:11 }}>
                {member && (
                  <div style={{ width:38, height:38, borderRadius:"50%", background:memberColor.hex, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:15 }}>
                    {member.emoji || member.name[0]}
                  </div>
                )}
                <div>
                  <p style={{ color:"white", fontWeight:600, fontSize:13, margin:0 }}>{member?.name ?? "Family HQ"}</p>
                  <p style={{ color:"rgba(255,255,255,0.32)", fontSize:11, margin:0 }}>{member?.role ?? ""}</p>
                </div>
              </div>
              <nav style={{ flex:1, padding:10, overflowY:"auto" }}>
                {[["🏠 HQ Home","/home"],["📊 Dashboard","/dashboard"],["📅 Calendar","/calendar"],
                  ["✅ Chores","/chores"],["🍽️ Meals","/meals"],["💰 Budget","/budget"],
                  ["📌 Board","/noticeboard"],["🎯 Goals","/goals"],["🎁 Rewards","/rewards"],
                  ["📸 Moments","/moments"],["📖 Guide","/guide"],
                ].map(([label, path]) => (
                  <button key={path} onClick={() => { setSidebarOpen(false); navigate(path); }}
                    style={{
                      width:"100%", display:"block", padding:"10px 14px", borderRadius:10, border:"none",
                      background:"transparent", color:"rgba(255,255,255,0.52)", fontSize:13,
                      fontWeight:500, cursor:"pointer", textAlign:"left", marginBottom:1,
                    }}>{label}</button>
                ))}
              </nav>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:10 }}>
                <button onClick={() => { setSidebarOpen(false); navigate("/select"); }}
                  style={{ width:"100%", padding:"9px 14px", borderRadius:10, border:"none",
                    background:"transparent", color:"rgba(255,255,255,0.35)", fontSize:12, cursor:"pointer", textAlign:"left" }}>
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
