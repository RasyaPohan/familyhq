import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { awardXP } from "@/lib/xpEngine";
import { motion } from "framer-motion";
import { Plus, Trophy, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";

const GOAL_EMOJIS = ["🌴", "🎮", "📚", "🏋️", "🎸", "✈️", "🏠", "🚗", "💰", "🎉", "🏆", "⭐"];

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showContribute, setShowContribute] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [newGoal, setNewGoal] = useState({ title: "", emoji: "🌴", target_amount: "", deadline: "", is_shared: true });
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    const data = await db.FamilyGoal.filter({ family_code: familyCode });
    setGoals(data);
  };

  const handleAdd = async () => {
    if (!newGoal.title || !newGoal.target_amount) return;
    await db.FamilyGoal.create({
      ...newGoal,
      family_code: familyCode,
      target_amount: parseFloat(newGoal.target_amount),
      owner_id: member?.id || '',
      owner_name: member?.name || '',
    });
    setNewGoal({ title: "", emoji: "🌴", target_amount: "", deadline: "", is_shared: true });
    setShowAdd(false);
    loadGoals();
  };

  const handleContribute = async () => {
    if (!showContribute || !contributeAmount) return;
    const goal = showContribute;
    const newAmount = (goal.current_amount || 0) + parseFloat(contributeAmount);
    const completed = newAmount >= goal.target_amount;
    
    await db.FamilyGoal.update(goal.id, {
      current_amount: newAmount,
      completed
    });

    await db.ActivityLog.create({
      family_code: familyCode,
      message: `contributed $${contributeAmount} to "${goal.title}" ${goal.emoji || '🎯'}`,
      member_id: member?.id || '',
      member_name: member?.name || 'Someone',
      member_color: member?.color || 'purple',
      type: 'goal'
    });

    if (completed && goal.is_shared) {
      // Award all family members 100 XP for shared goal
      const allMembers = await db.FamilyMember.filter({ family_code: familyCode });
      for (const m of allMembers) {
        await awardXP(m, 100, `🎯 family goal completed: "${goal.title}"`);
      }
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 250);
      setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    } else if (completed) {
      // Personal goal
      if (member?.id) {
        const freshMember = await db.FamilyMember.filter({ id: member.id });
        if (freshMember[0]) await awardXP(freshMember[0], 100, `🎯 goal completed: "${goal.title}"`);
      }
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }

    setContributeAmount("");
    setShowContribute(null);
    loadGoals();
  };

  const sharedGoals = goals.filter(g => g.is_shared);
  const personalGoals = goals.filter(g => !g.is_shared);

  const renderGoalCard = (goal, i) => {
    const progress = goal.target_amount > 0 ? Math.min(((goal.current_amount || 0) / goal.target_amount) * 100, 100) : 0;
    const color = MEMBER_COLORS.purple;

    return (
      <motion.div
        key={goal.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        whileHover={{ scale: 1.02 }}
        className={`bg-card rounded-2xl p-5 border shadow-sm relative overflow-hidden ${
          goal.completed ? 'border-green-300 dark:border-green-700' : 'border-border'
        }`}
      >
        {goal.completed && (
          <div className="absolute top-3 right-3">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Trophy className="w-6 h-6 text-yellow-500" />
            </motion.div>
          </div>
        )}
        
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{goal.emoji || '🎯'}</span>
          <div>
            <h3 className="font-heading font-bold">{goal.title}</h3>
            {goal.owner_name && <p className="text-xs text-muted-foreground">{goal.owner_name}</p>}
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">${(goal.current_amount || 0).toFixed(2)}</span>
            <span className="text-muted-foreground">${(goal.target_amount || 0).toFixed(2)}</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3" />
            <span className="absolute right-2 top-0 text-[10px] font-bold leading-3">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {goal.deadline && (
          <p className="text-xs text-muted-foreground mb-3">⏰ Deadline: {goal.deadline}</p>
        )}

        {!goal.completed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowContribute(goal)}
            className="w-full"
          >
            Contribute 💰
          </Button>
        )}

        {goal.completed && (
          <p className="text-center text-sm font-heading font-bold text-green-600">🎉 Goal Achieved!</p>
        )}
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Goals 🎯</h1>
        <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {/* Shared Goals */}
      <div className="mb-8">
        <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" /> Family Goals
        </h2>
        {sharedGoals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-card rounded-2xl border border-dashed border-border"
          >
            <p className="text-5xl mb-4">🌴</p>
            <p className="font-heading text-xl font-bold mb-2">Dream big.</p>
            <p className="text-muted-foreground text-sm mb-6">Add your first family goal — a trip, a gadget, anything you're all saving toward.</p>
            <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
              <Plus className="w-4 h-4" /> Add Family Goal
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedGoals.map((g, i) => renderGoalCard(g, i))}
          </div>
        )}
      </div>

      {/* Personal Goals */}
      <div>
        <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" /> Personal Goals
        </h2>
        {personalGoals.length === 0 ? (
          <div className="text-center py-8 bg-card rounded-2xl border border-border">
            <p className="text-3xl mb-2">⭐</p>
            <p className="text-muted-foreground text-sm">No personal goals yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalGoals.map((g, i) => renderGoalCard(g, i))}
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">New Goal 🎯</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What's the goal?</Label>
              <Input value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} placeholder="Save for vacation..." />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GOAL_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewGoal({ ...newGoal, emoji: e })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newGoal.emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted'}`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Amount ($)</Label>
                <Input type="number" value={newGoal.target_amount} onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} placeholder="500" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newGoal.is_shared} onCheckedChange={(v) => setNewGoal({ ...newGoal, is_shared: v })} />
              <Label>Shared family goal 👨‍👩‍👧‍👦</Label>
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary text-white font-heading">
              Create Goal 🎯
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!showContribute} onOpenChange={() => setShowContribute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Contribute to {showContribute?.emoji} {showContribute?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Current: ${(showContribute?.current_amount || 0).toFixed(2)} / ${(showContribute?.target_amount || 0).toFixed(2)}
            </p>
            <Button onClick={handleContribute} className="w-full gradient-primary text-white font-heading">
              Add Contribution 💰
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}