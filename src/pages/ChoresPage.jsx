import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS, getLevelTitle, getLevelProgress, getLevelFromXp, LEVELS } from "@/lib/familyStore";
import { awardXP } from "@/lib/xpEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trophy, Flame, Star, CheckCircle2, Trash2, BookOpen, Gift } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";

const CHORE_EMOJIS = ["🧹", "🍽️", "🗑️", "🐕", "📚", "🛏️", "🧺", "🌿", "🚗", "🧼", "📦", "🐱"];

export default function ChoresPage() {
  const navigate = useNavigate();
  const [chores, setChores] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newChore, setNewChore] = useState({ title: "", emoji: "🧹", assigned_to: "", points: 10, due_date: "", recurring: "none" });
  const [tab, setTab] = useState("all");
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [ch, mems] = await Promise.all([
      db.Chore.filter({ family_code: familyCode }),
      db.FamilyMember.filter({ family_code: familyCode })
    ]);
    setChores(ch);
    setMembers(mems);
  };

  const handleAdd = async () => {
    if (!newChore.title || !newChore.assigned_to) return;
    const assignedMember = members.find(m => m.id === newChore.assigned_to);
    await db.Chore.create({
      ...newChore,
      family_code: familyCode,
      assigned_name: assignedMember?.name || '',
      assigned_color: assignedMember?.color || 'purple',
    });
    setNewChore({ title: "", emoji: "🧹", assigned_to: "", points: 10, due_date: "", recurring: "none" });
    setShowAdd(false);
    loadData();
  };

  const completeChore = async (chore) => {
    const today = new Date().toISOString().split('T')[0];
    await db.Chore.update(chore.id, { completed: true, completed_date: new Date().toISOString() });
    const assignedMem = members.find(m => m.id === chore.assigned_to);
    if (assignedMem) {
      // Determine XP: early (+20), on-time (+10)
      const isEarly = chore.due_date && today < chore.due_date;
      const xpAmount = isEarly ? 20 : 10;
      // Streak
      const lastDate = assignedMem.last_chore_date;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      const newStreak = lastDate === yStr || lastDate === today ? (assignedMem.streak || 0) + 1 : 1;
      // Streak milestone bonus
      let streakBonus = 0;
      if ([3,7,14,30].includes(newStreak)) {
        const bonuses = { 3: 25, 7: 50, 14: 75, 30: 150 };
        streakBonus = bonuses[newStreak];
      }
      await awardXP(assignedMem, xpAmount, `completed "${chore.title}" ${isEarly ? '(early!) 🚀' : '✅'}`, {
        streak: newStreak,
        last_chore_date: today,
      });
      if (streakBonus) {
        const refreshed = await db.FamilyMember.filter({ id: assignedMem.id });
        if (refreshed[0]) await awardXP(refreshed[0], streakBonus, `🔥 ${newStreak}-day streak bonus!`);
      }
    }
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    loadData();
  };

  const deleteChore = async (id) => {
    await db.Chore.delete(id);
    loadData();
  };

  const filtered = tab === "mine" ? chores.filter(c => c.assigned_to === member?.id) : chores;
  const pending = filtered.filter(c => !c.completed);
  const completed = filtered.filter(c => c.completed);

  const leaderboard = members
    .map(m => ({ ...m, xp: m.xp || 0 }))
    .sort((a, b) => b.xp - a.xp);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Chores ✅</h1>
          <Link to="/guide" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5">
            <BookOpen className="w-3 h-3" /> How does XP work?
          </Link>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/rewards')} variant="outline" className="gap-2">
            <Gift className="w-4 h-4" /> Rewards
          </Button>
          {(member?.role === 'Parent' || member?.role === 'Teen') && (
            <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
              <Plus className="w-4 h-4" /> Add Chore
            </Button>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm mb-6">
        <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {leaderboard.map((m, i) => {
            const color = MEMBER_COLORS[m.color] || MEMBER_COLORS.purple;

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center min-w-[100px] p-3 rounded-xl bg-muted/50"
              >
                {i === 0 && <span className="text-xl mb-1">👑</span>}
                {i === 1 && <span className="text-xl mb-1">🥈</span>}
                {i === 2 && <span className="text-xl mb-1">🥉</span>}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                  style={{ background: color.hex }}
                >
                  {m.emoji || m.name[0]}
                </div>
                <p className="text-sm font-semibold mt-1">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.xp || 0} XP</p>
                <p className="text-[10px] text-muted-foreground">{getLevelTitle(getLevelFromXp(m.xp || 0))}</p>
                <div className="w-full mt-1">
                  <Progress value={getLevelProgress(m.xp || 0)} className="h-1.5" />
                </div>
                {(m.streak || 0) > 0 && (
                  <p className="text-xs mt-1 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" /> {m.streak}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "mine"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === "all" ? "All Chores" : "My Chores"}
          </button>
        ))}
      </div>

      {/* Chore List */}
      <div className="space-y-2">
        {pending.length === 0 && completed.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-card rounded-2xl border border-dashed border-border"
          >
            <p className="text-5xl mb-4">😅</p>
            <p className="font-heading text-xl font-bold mb-2">No chores here...</p>
            <p className="text-muted-foreground text-sm mb-6">Either you're all perfect or nobody set this up yet. One of those.</p>
            {(member?.role === 'Parent' || member?.role === 'Teen') && (
              <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
                <Plus className="w-4 h-4" /> Create First Chore
              </Button>
            )}
          </motion.div>
        )}
        {pending.map((chore, i) => {
          const color = MEMBER_COLORS[chore.assigned_color] || MEMBER_COLORS.purple;
          return (
            <motion.div
              key={chore.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border shadow-sm group"
            >
              <button
                onClick={() => completeChore(chore)}
                className="w-8 h-8 rounded-full border-2 shrink-0 hover:scale-110 transition-all flex items-center justify-center"
                style={{ borderColor: color.hex }}
              >
                <CheckCircle2 className="w-5 h-5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: color.hex }} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{chore.emoji || '📋'} {chore.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span style={{ color: color.hex }}>{chore.assigned_name}</span>
                  {chore.due_date && <span>• Due {chore.due_date}</span>}
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <Star className="w-3 h-3" /> {chore.points || 10}
              </span>
              {member?.role === 'Parent' && (
                <button onClick={() => deleteChore(chore.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              )}
            </motion.div>
          );
        })}
        {completed.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground font-medium mb-2">Completed ✅</p>
            {completed.slice(0, 5).map(chore => (
              <div key={chore.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm line-through">{chore.emoji} {chore.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Chore Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">New Chore ✨</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What needs doing?</Label>
              <Input value={newChore.title} onChange={(e) => setNewChore({ ...newChore, title: e.target.value })} placeholder="Take out trash..." />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CHORE_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewChore({ ...newChore, emoji: e })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newChore.emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted'}`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Assign to</Label>
              <Select value={newChore.assigned_to} onValueChange={(v) => setNewChore({ ...newChore, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Choose family member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>XP Points</Label>
                <Input type="number" value={newChore.points} onChange={(e) => setNewChore({ ...newChore, points: parseInt(e.target.value) || 10 })} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newChore.due_date} onChange={(e) => setNewChore({ ...newChore, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Recurring</Label>
              <Select value={newChore.recurring} onValueChange={(v) => setNewChore({ ...newChore, recurring: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary text-white font-heading">
              Create Chore ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}