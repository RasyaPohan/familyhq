import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getFamilyCode } from "@/lib/familyStore";
import { motion } from "framer-motion";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DinnerWidget() {
  const [dinner, setDinner] = useState(null);

  useEffect(() => {
    loadDinner();
  }, []);

  const loadDinner = async () => {
    const today = DAYS[new Date().getDay()];
    const familyCode = getFamilyCode();
    const meals = await db.MealPlan.filter({ day: today, meal_type: "Dinner", family_code: familyCode });
    if (meals.length > 0) setDinner(meals[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 text-8xl opacity-10 -translate-y-4 translate-x-4">
        🍽️
      </div>
      <h3 className="font-heading font-bold text-lg mb-3">Tonight's Dinner 🍽️</h3>
      
      {dinner ? (
        <div className="relative z-10">
          <p className="text-3xl font-heading font-bold">
            {dinner.emoji || '🍕'} {dinner.title}
          </p>
          {dinner.recipe && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{dinner.recipe}</p>
          )}
        </div>
      ) : (
        <div className="relative z-10 text-center py-4">
          <p className="text-2xl mb-2">🤔</p>
          <p className="text-muted-foreground text-sm">No dinner planned yet!</p>
        </div>
      )}
    </motion.div>
  );
}