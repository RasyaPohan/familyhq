import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode } from "@/lib/familyStore";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function TodayChoresWidget() {
  const [chores, setChores] = useState([]);
  const member = getActiveMember();

  useEffect(() => {
    loadChores();
  }, []);

  const loadChores = async () => {
    const today = new Date().toISOString().split('T')[0];
    const familyCode = getFamilyCode();
    const all = await db.Chore.filter({ assigned_to: member?.id, due_date: today, family_code: familyCode });
    setChores(all);
  };

  const completeChore = async (chore) => {
    await db.Chore.update(chore.id, { completed: true, completed_date: new Date().toISOString() });
    
    // Update XP
    if (member) {
      const newXp = (member.xp || 0) + (chore.points || 10);
      const newLevel = Math.floor(newXp / 100) + 1;
      await db.FamilyMember.update(member.id, { 
        xp: newXp, 
        level: newLevel,
        streak: (member.streak || 0) + 1,
        last_chore_date: new Date().toISOString().split('T')[0]
      });
    }

    // Confetti!
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    
    await db.ActivityLog.create({
      message: `completed "${chore.title}" ✅ +${chore.points || 10} XP`,
      member_id: member?.id,
      member_name: member?.name || 'Someone',
      member_color: member?.color || 'purple',
      type: 'chore'
    });
    
    loadChores();
  };

  const pending = chores.filter(c => !c.completed);
  const done = chores.filter(c => c.completed);

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-lg">Today's Chores ✅</h3>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
          {done.length}/{chores.length}
        </span>
      </div>

      {chores.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No chores today! 🎉</p>
      ) : (
        <div className="space-y-2">
          {pending.map((chore, i) => (
            <motion.div
              key={chore.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <button
                onClick={() => completeChore(chore)}
                className="w-7 h-7 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center group-hover:scale-110"
              >
                <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-50 text-primary" />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium">{chore.emoji || '📋'} {chore.title}</p>
              </div>
              <span className="text-xs font-bold text-primary">+{chore.points || 10} XP</span>
            </motion.div>
          ))}
          {done.map((chore) => (
            <div key={chore.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50">
              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm line-through">{chore.emoji || '📋'} {chore.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}