import { db } from "@/lib/db";
import { getLevelFromXp, getLevelTitle, getFamilyCode } from "@/lib/familyStore";

export function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Award XP to a member.
 * Handles: level detection, weekly XP tracking, activity log, global UI events.
 * @param {object} member  - Current member data object (from DB/state)
 * @param {number} amount  - XP to award (positive)
 * @param {string} reason  - Short description for the activity log
 * @param {object} extraFields - Extra fields to merge into FamilyMember update (e.g. streak)
 */
export async function awardXP(member, amount, reason, extraFields = {}) {
  if (!member?.id || !amount || amount <= 0) return { leveled_up: false };

  const currentXp = member.xp || 0;
  const newXp = currentXp + amount;
  const oldLevel = getLevelFromXp(currentXp);
  const newLevel = getLevelFromXp(newXp);
  const leveled_up = newLevel > oldLevel;

  // Weekly XP — reset if it's a new week
  const weekStart = getWeekStart();
  const weeklyXp =
    member.week_start === weekStart ? (member.weekly_xp || 0) + amount : amount;

  await db.FamilyMember.update(member.id, {
    xp: newXp,
    level: newLevel,
    weekly_xp: weeklyXp,
    week_start: weekStart,
    ...extraFields,
  });

  await db.ActivityLog.create({
    family_code: member.family_code || getFamilyCode(),
    message: `${reason} +${amount} XP`,
    member_id: member.id,
    member_name: member.name,
    member_color: member.color || "purple",
    type: "chore",
  });

  // Fire global events so Layout can show popups
  window.dispatchEvent(
    new CustomEvent("xp-earned", { detail: { amount, memberName: member.name } })
  );

  if (leveled_up) {
    window.dispatchEvent(
      new CustomEvent("level-up", {
        detail: { level: newLevel, title: getLevelTitle(newLevel) },
      })
    );
  }

  return { leveled_up, old_level: oldLevel, new_level: newLevel, xp_gained: amount };
}