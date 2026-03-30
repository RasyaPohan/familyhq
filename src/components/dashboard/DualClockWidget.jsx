import { useState, useEffect } from "react";

function formatClock(date, offsetHours) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const local = new Date(utcMs + offsetHours * 3600000);
  let h = local.getHours();
  const m = local.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function DualClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const vancouver = formatClock(now, -7); // PDT UTC-7
  const jakarta = formatClock(now, 7);    // WIB UTC+7

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center justify-around gap-2">
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">🇨🇦 Vancouver</p>
        <p className="font-heading font-bold text-lg tabular-nums">{vancouver}</p>
        <p className="text-[10px] text-muted-foreground">PDT (UTC-7)</p>
      </div>
      <div className="w-px h-10 bg-border" />
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">🇮🇩 Jakarta</p>
        <p className="font-heading font-bold text-lg tabular-nums">{jakarta}</p>
        <p className="text-[10px] text-muted-foreground">WIB (UTC+7)</p>
      </div>
    </div>
  );
}