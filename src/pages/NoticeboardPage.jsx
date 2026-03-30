import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { awardXP } from "@/lib/xpEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pin, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import moment from "moment";

const NOTE_COLORS = {
  yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-300 dark:border-yellow-700" },
  pink: { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-300 dark:border-pink-700" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700" },
  green: { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700" },
};

export default function NoticeboardPage() {
  const [notices, setNotices] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newNote, setNewNote] = useState({ content: "", color: "yellow", pinned: false, urgent: false });
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => { loadNotices(); }, []);

  const loadNotices = async () => {
    const data = await db.Notice.filter({ family_code: familyCode });
    setNotices(data);
  };

  const handleAdd = async () => {
    if (!newNote.content) return;
    await db.Notice.create({
      ...newNote,
      family_code: familyCode,
      author_id: member?.id || '',
      author_name: member?.name || 'Anonymous',
      author_color: member?.color || 'purple',
    });
    // Award XP for posting
    if (member?.id) {
      const freshMember = await db.FamilyMember.filter({ id: member.id });
      if (freshMember[0]) await awardXP(freshMember[0], 5, '📢 posted on noticeboard');
    }
    setNewNote({ content: "", color: "yellow", pinned: false, urgent: false });
    setShowAdd(false);
    loadNotices();
  };

  const handleReact = async (notice, emoji) => {
    const reactions = notice.reactions || { heart: 0, laugh: 0, thumbs_up: 0 };
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    await db.Notice.update(notice.id, { reactions });
    loadNotices();
  };

  const deleteNotice = async (id) => {
    await db.Notice.delete(id);
    loadNotices();
  };

  const pinned = notices.filter(n => n.pinned);
  const urgent = notices.filter(n => n.urgent && !n.pinned);
  const regular = notices.filter(n => !n.pinned && !n.urgent);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:ml-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Noticeboard 📢</h1>
        <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Post Note
        </Button>
      </div>

      {/* Urgent Notes */}
      <AnimatePresence>
        {urgent.map(note => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.3)', '0 0 0 rgba(239,68,68,0)'] }}
            transition={{ boxShadow: { repeat: Infinity, duration: 2 } }}
            className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1">— {note.author_name} • {moment(note.created_date).fromNow()}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...pinned, ...regular].map((note, i) => {
          const noteColor = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
          const authorColor = MEMBER_COLORS[note.author_color] || MEMBER_COLORS.purple;
          const reactions = note.reactions || { heart: 0, laugh: 0, thumbs_up: 0 };

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: (i % 3 - 1) * 1.5 }}
              whileHover={{ scale: 1.03, rotate: 0 }}
              className={`p-4 rounded-2xl border ${noteColor.bg} ${noteColor.border} shadow-sm relative group`}
            >
              {note.pinned && (
                <div className="absolute -top-2 -right-2">
                  <Pin className="w-5 h-5 text-red-500 rotate-45" />
                </div>
              )}
              
              <p className="text-sm whitespace-pre-wrap mb-3">{note.content}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center text-white" style={{ background: authorColor.hex }}>
                    {note.author_name?.[0]}
                  </div>
                  <span className="text-xs text-muted-foreground">{note.author_name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{moment(note.created_date).fromNow()}</span>
              </div>

              {/* Reactions */}
              <div className="flex gap-1 mt-3">
                {[
                  { key: 'heart', emoji: '❤️' },
                  { key: 'laugh', emoji: '😂' },
                  { key: 'thumbs_up', emoji: '👍' },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => handleReact(note, r.key)}
                    className="flex items-center gap-0.5 text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full hover:scale-110 transition-transform"
                  >
                    {r.emoji} {reactions[r.key] > 0 && <span className="font-medium">{reactions[r.key]}</span>}
                  </button>
                ))}
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteNotice(note.id)}
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white/50 dark:bg-black/30"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {notices.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <p className="text-6xl mb-4">📌</p>
          <p className="font-heading text-xl font-bold mb-2">So quiet in here...</p>
          <p className="text-muted-foreground text-sm mb-6">Be the first to post something. A note, a reminder, a joke — anything counts.</p>
          <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
            <Plus className="w-4 h-4" /> Post First Note
          </Button>
        </motion.div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Post a Note 📝</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Your message</Label>
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Remember to..."
                rows={4}
              />
            </div>
            <div>
              <Label>Note Color</Label>
              <div className="flex gap-2 mt-2">
                {Object.entries(NOTE_COLORS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setNewNote({ ...newNote, color: key })}
                    className={`w-10 h-10 rounded-lg transition-all ${val.bg} ${val.border} border-2 ${
                      newNote.color === key ? 'ring-2 ring-primary scale-110' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={newNote.pinned} onCheckedChange={(v) => setNewNote({ ...newNote, pinned: v })} />
                <Label>📌 Pin to top</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newNote.urgent} onCheckedChange={(v) => setNewNote({ ...newNote, urgent: v })} />
                <Label>🚨 Urgent</Label>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary text-white font-heading">
              Post Note 📝
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}