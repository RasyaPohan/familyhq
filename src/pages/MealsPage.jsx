import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode } from "@/lib/familyStore";
import { awardXP } from "@/lib/xpEngine";
import { motion } from "framer-motion";
import { Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["Breakfast", "Lunch", "Dinner"];
const MEAL_EMOJIS = ["🍕", "🍝", "🥗", "🍖", "🌮", "🍣", "🍜", "🍔", "🥞", "🧇", "🥪", "🍲"];

export default function MealsPage() {
  const [mealPlans, setMealPlans] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ day: "", meal_type: "" });
  const [newMeal, setNewMeal] = useState({ title: "", emoji: "🍕", recipe: "", ingredients: "" });
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => { loadMeals(); }, []);

  const loadMeals = async () => {
    const data = await db.MealPlan.filter({ family_code: familyCode });
    setMealPlans(data);
  };

  const getMeal = (day, type) => {
    return mealPlans.find(m => m.day === day && m.meal_type === type);
  };

  const handleAdd = async () => {
    if (!newMeal.title) return;
    await db.MealPlan.create({
      ...newMeal,
      ...selectedSlot,
      family_code: familyCode,
      week_of: new Date().toISOString().split('T')[0],
    });
    setNewMeal({ title: "", emoji: "🍕", recipe: "", ingredients: "" });
    setShowAdd(false);
    loadMeals();
  };

  const handleVote = async (meal, isUp) => {
    const votedBy = meal.voted_by || [];
    if (votedBy.includes(member?.id)) return;
    await db.MealPlan.update(meal.id, {
      votes_up: isUp ? (meal.votes_up || 0) + 1 : (meal.votes_up || 0),
      votes_down: !isUp ? (meal.votes_down || 0) + 1 : (meal.votes_down || 0),
      voted_by: [...votedBy, member?.id || 'anon'],
    });
    // Award XP for voting
    if (member?.id) {
      const freshMember = await db.FamilyMember.filter({ id: member.id });
      if (freshMember[0]) await awardXP(freshMember[0], 5, '🍽️ voted on dinner');
    }
    loadMeals();
  };

  const openSlot = (day, meal_type) => {
    setSelectedSlot({ day, meal_type });
    setShowAdd(true);
  };

  const hasAnyMeal = mealPlans.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Meal Planner 🍽️</h1>
      </div>

      {!hasAnyMeal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-card rounded-2xl border border-dashed border-border mb-6"
        >
          <p className="text-5xl mb-4">🍕</p>
          <p className="font-heading text-xl font-bold mb-2">The week is wide open.</p>
          <p className="text-muted-foreground text-sm mb-6">What are we eating? Tap any slot below to start planning.</p>
        </motion.div>
      )}

      {/* Weekly Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div />
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d.slice(0, 3)}
              </div>
            ))}
          </div>

          {/* Rows */}
          {MEALS.map(mealType => (
            <div key={mealType} className="grid grid-cols-8 gap-1 mb-1">
              <div className="flex items-center justify-center text-sm font-heading font-bold text-muted-foreground">
                {mealType === 'Breakfast' ? '🌅' : mealType === 'Lunch' ? '☀️' : '🌙'} {mealType}
              </div>
              {DAYS.map(day => {
                const meal = getMeal(day, mealType);
                return (
                  <motion.button
                    key={`${day}-${mealType}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !meal && openSlot(day, mealType)}
                    className={`min-h-[80px] rounded-xl border p-2 text-left transition-all ${
                      meal ? 'bg-card border-border shadow-sm' : 'border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    {meal ? (
                      <div>
                        <p className="text-lg leading-tight">{meal.emoji || '🍽️'}</p>
                        <p className="text-xs font-medium mt-0.5 line-clamp-2">{meal.title}</p>
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVote(meal, true); }}
                            className="flex items-center gap-0.5 text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full"
                          >
                            <ThumbsUp className="w-2.5 h-2.5" /> {meal.votes_up || 0}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVote(meal, false); }}
                            className="flex items-center gap-0.5 text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full"
                          >
                            <ThumbsDown className="w-2.5 h-2.5" /> {meal.votes_down || 0}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Plus className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add Meal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {selectedSlot.day} {selectedSlot.meal_type} 🍽️
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What are we eating?</Label>
              <Input value={newMeal.title} onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })} placeholder="Spaghetti Bolognese..." />
            </div>
            <div>
              <Label>Food Emoji</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MEAL_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewMeal({ ...newMeal, emoji: e })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newMeal.emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted'}`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Recipe / Notes</Label>
              <Textarea value={newMeal.recipe} onChange={(e) => setNewMeal({ ...newMeal, recipe: e.target.value })} placeholder="How to make it..." />
            </div>
            <div>
              <Label>Ingredients (comma separated)</Label>
              <Input value={newMeal.ingredients} onChange={(e) => setNewMeal({ ...newMeal, ingredients: e.target.value })} placeholder="Pasta, ground beef, tomato sauce..." />
            </div>
            <Button onClick={handleAdd} className="w-full gradient-primary text-white font-heading">
              Add Meal ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}