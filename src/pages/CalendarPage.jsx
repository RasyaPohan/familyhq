import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { AnimatePresence, motion as m } from "framer-motion";
import { isRasya, getMemberTz, formatTimeWithTz, getViewerDate } from "@/lib/tzCurrency";
import { awardXP } from "@/lib/xpEngine";

const EVENT_EMOJIS = ["📅", "🎉", "🏥", "⚽", "🎮", "📚", "🎵", "🍕", "✈️", "🎂", "💼", "🏋️"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [daySheet, setDaySheet] = useState(null); // date object for bottom sheet
  const [selectedEvent, setSelectedEvent] = useState(null); // event for detail view
  const [newEvent, setNewEvent] = useState({ title: "", emoji: "📅", time: "", member_id: "", is_big_event: false });
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    const [evts, mems] = await Promise.all([
      db.CalendarEvent.filter({ family_code: familyCode }),
      db.FamilyMember.filter({ family_code: familyCode })
    ]);
    setEvents(evts);
    setMembers(mems);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDate) return;
    const selectedMember = members.find(m => m.id === newEvent.member_id);
    const creatorTz = getMemberTz(member);
    await db.CalendarEvent.create({
      ...newEvent,
      family_code: familyCode,
      date: format(selectedDate, 'yyyy-MM-dd'),
      stored_tz: creatorTz,
      member_name: selectedMember?.name || member?.name || '',
      member_color: selectedMember?.color || member?.color || 'purple',
      member_id: newEvent.member_id || member?.id || '',
    });
    // Award XP for adding event
    if (member?.id) {
      const freshMember = await db.FamilyMember.filter({ id: member.id });
      if (freshMember[0]) await awardXP(freshMember[0], 5, '📅 added a calendar event');
    }
    setNewEvent({ title: "", emoji: "📅", time: "", member_id: "", is_big_event: false });
    setShowAdd(false);
    loadData();
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setDaySheet(day);
  };

  const handleDeleteEvent = async (evt) => {
    await db.CalendarEvent.delete(evt.id);
    setSelectedEvent(null);
    loadData();
  };

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return events.filter(e => {
      const viewerDate = getViewerDate(e.date, e.time, e.stored_tz, member);
      return viewerDate === dateStr;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:ml-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Calendar 📅</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}>
            {viewMode === "month" ? "Week View" : "Month View"}
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-heading text-xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dayEvents = getEventsForDay(d);
          const isToday = isSameDay(d, new Date());
          const isCurrentMonth = isSameMonth(d, currentMonth);

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDayClick(d)}
              className={`min-h-[80px] md:min-h-[100px] p-1.5 rounded-xl border transition-all text-left flex flex-col ${
                isToday ? 'border-primary bg-primary/5 ring-2 ring-primary/30' :
                isCurrentMonth ? 'border-border hover:border-primary/30 bg-card' :
                'border-transparent opacity-40'
              }`}
            >
              <span className={`text-xs font-medium mb-1 ${isToday ? 'text-primary font-bold' : ''}`}>
                {format(d, 'd')}
              </span>
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((evt) => {
                  const color = MEMBER_COLORS[evt.member_color] || MEMBER_COLORS.purple;
                  return (
                    <div
                      key={evt.id}
                      className="text-[10px] px-1 py-0.5 rounded truncate text-white"
                      style={{ background: color.hex }}
                    >
                      {evt.emoji || ''} {evt.title}
                      {evt.time ? ` · ${formatTimeWithTz(evt.time, evt.stored_tz, member).split(' ')[0]}` : ''}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {events.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center py-16 bg-card rounded-2xl border border-dashed border-border"
        >
          <p className="text-5xl mb-4">👀</p>
          <p className="font-heading text-xl font-bold mb-2">Nothing here yet...</p>
          <p className="text-muted-foreground text-sm mb-6">Someone's gotta add the first event. Be that person.</p>
          <Button onClick={() => { setSelectedDate(new Date()); setShowAdd(true); }} className="gradient-primary text-white gap-2">
            <Plus className="w-4 h-4" /> Add First Event
          </Button>
        </motion.div>
      )}

      {/* Day Bottom Sheet */}
      <AnimatePresence>
        {daySheet && (
          <>
            {/* Backdrop */}
            <m.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => { setDaySheet(null); setSelectedEvent(null); }}
            />
            {/* Sheet */}
            <m.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-16 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col md:max-w-lg md:left-1/2 md:-translate-x-1/2"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {selectedEvent ? (
                /* ── Event Detail ── */
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                    <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground text-sm">← Back</button>
                    <h2 className="font-heading font-bold flex-1">{selectedEvent.emoji} {selectedEvent.title}</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {selectedEvent.time && (
                      <p className="text-sm text-muted-foreground">🕐 {formatTimeWithTz(selectedEvent.time, selectedEvent.stored_tz, member)}</p>
                    )}
                    {selectedEvent.member_name && (
                      <p className="text-sm text-muted-foreground">👤 {selectedEvent.member_name}</p>
                    )}
                    {selectedEvent.description && (
                      <p className="text-sm">{selectedEvent.description}</p>
                    )}
                    {selectedEvent.is_big_event && (
                      <p className="text-sm font-medium text-primary">🎉 Big event — countdown shown on dashboard</p>
                    )}
                  </div>
                  <div className="px-5 py-4 border-t border-border">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleDeleteEvent(selectedEvent)}
                    >
                      Delete Event
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Events List ── */
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h2 className="font-heading font-bold text-lg">
                      {format(daySheet, 'EEEE, MMMM d')} 📅
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
                    {getEventsForDay(daySheet).length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-3xl mb-2">👀</p>
                        <p className="text-muted-foreground text-sm">Nothing planned yet for this day</p>
                      </div>
                    ) : (
                      getEventsForDay(daySheet).map(evt => {
                        const color = MEMBER_COLORS[evt.member_color] || MEMBER_COLORS.purple;
                        return (
                          <button
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                          >
                            <div className="w-2 h-10 rounded-full shrink-0" style={{ background: color.hex }} />
                            <span className="text-2xl">{evt.emoji || '📌'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{evt.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {evt.time ? formatTimeWithTz(evt.time, evt.stored_tz, member) : 'All day'}
                                {evt.member_name ? ` · ${evt.member_name}` : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="px-5 py-4 border-t border-border shrink-0">
                    <Button
                      className="w-full gradient-primary text-white gap-2"
                      onClick={() => { setDaySheet(null); setShowAdd(true); }}
                    >
                      <Plus className="w-4 h-4" /> Add Event
                    </Button>
                  </div>
                </div>
              )}
            </m.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Event Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Add Event {selectedDate ? `— ${format(selectedDate, 'MMMM d')}` : ''}  ✨
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What's happening?</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Birthday party, Soccer game..."
              />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EVENT_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewEvent({ ...newEvent, emoji: e })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      newEvent.emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted'
                    }`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Time — {isRasya(member) ? 'your time (PDT 🇨🇦)' : 'your time (WIB 🇮🇩)'}</Label>
              <Input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} />
            </div>
            <div>
              <Label>Who's event?</Label>
              <Select value={newEvent.member_id} onValueChange={(v) => setNewEvent({ ...newEvent, member_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.emoji || '👤'} {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newEvent.is_big_event}
                onCheckedChange={(v) => setNewEvent({ ...newEvent, is_big_event: v })}
              />
              <Label>Big event (show countdown) 🎉</Label>
            </div>
            <Button onClick={handleAddEvent} className="w-full gradient-primary text-white font-heading">
              Add Event ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}