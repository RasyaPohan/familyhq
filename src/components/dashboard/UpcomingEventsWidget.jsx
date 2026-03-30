import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { MEMBER_COLORS, getActiveMember, getFamilyCode } from "@/lib/familyStore";
import { motion } from "framer-motion";
import { differenceInDays, format, parseISO } from "date-fns";
import { formatTimeWithTz } from "@/lib/tzCurrency";

export default function UpcomingEventsWidget() {
  const [events, setEvents] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const member = getActiveMember();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const today = new Date().toISOString().split('T')[0];
    const familyCode = getFamilyCode();
    const all = await db.CalendarEvent.filter({ family_code: familyCode });
    const upcoming = all.filter(e => e.date >= today).slice(0, 5);
    const bigEvents = all.filter(e => e.is_big_event && e.date >= today).slice(0, 3);
    setEvents(upcoming);
    setCountdowns(bigEvents);
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-heading font-bold text-lg mb-4">Coming Up 📅</h3>

      {/* Countdown timers for big events */}
      {countdowns.length > 0 && (
        <div className="space-y-2 mb-4">
          {countdowns.map((event) => {
            const days = differenceInDays(parseISO(event.date), new Date());
            const color = MEMBER_COLORS[event.member_color] || MEMBER_COLORS.purple;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl text-white text-center font-heading"
                style={{ background: `linear-gradient(135deg, ${color.hex}, ${color.hex}88)` }}
              >
                <p className="text-lg font-bold">{event.emoji || '🎉'} {event.title}</p>
                <p className="text-white/80 text-sm">
                  {days === 0 ? "TODAY! 🎊" : days === 1 ? "Tomorrow!" : `in ${days} days!`}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No upcoming events</p>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => {
            const color = MEMBER_COLORS[event.member_color] || MEMBER_COLORS.purple;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
              >
                <div className="w-2 h-8 rounded-full" style={{ background: color.hex }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.emoji || '📌'} {event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(event.date), 'EEE, MMM d')}
                    {event.time ? ` · ${formatTimeWithTz(event.time, event.stored_tz, member)}` : ''}
                  </p>
                </div>
                {event.member_name && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color.hex}20`, color: color.hex }}>
                    {event.member_name}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}