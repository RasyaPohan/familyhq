import { useState, useEffect } from "react";

function formatClock(date, ianaTimezone) {
  return date.toLocaleTimeString("en-US", {
    timeZone: ianaTimezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function tzLabel(ianaTimezone) {
  // Extract a short abbreviation from the IANA zone name for display
  const parts = ianaTimezone.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

// Props: homeTimezone, awayTimezone, awayMemberName, awayMemberEmoji
export default function DualClockWidget({ homeTimezone, awayTimezone, awayMemberName, awayMemberEmoji }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const homeTime = formatClock(now, homeTimezone);
  const awayTime = formatClock(now, awayTimezone);
  const homeLabel = tzLabel(homeTimezone);
  const awayLabel = tzLabel(awayTimezone);

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center justify-around gap-2">
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">🏠 Home</p>
        <p className="font-heading font-bold text-lg tabular-nums">{homeTime}</p>
        <p className="text-[10px] text-muted-foreground">{homeLabel}</p>
      </div>
      <div className="w-px h-10 bg-border" />
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">
          {awayMemberEmoji || "✈️"} {awayMemberName}
        </p>
        <p className="font-heading font-bold text-lg tabular-nums">{awayTime}</p>
        <p className="text-[10px] text-muted-foreground">{awayLabel}</p>
      </div>
    </div>
  );
}
