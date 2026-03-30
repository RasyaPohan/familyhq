/**
 * db.js — Supabase data layer for Yanwar's HQ
 *
 * Replaces all base44.entities.* calls across the app.
 * Each exported object mirrors the old Base44 entity API shape:
 *   db.FamilyHQ.filter({ family_code })
 *   db.FamilyHQ.create({ ... })
 *   db.FamilyHQ.update(id, { ... })
 *   db.FamilyHQ.delete(id)
 *
 * Supabase returns { data, error }. We throw on error so call-sites
 * behave the same as before (they await and get the array/object back).
 */

import { supabase } from '@/api/supabaseClient';

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** SELECT rows matching all key/value pairs in `filters` */
async function dbFilter(table, filters = {}, { orderBy = 'created_at', ascending = true } = {}) {
  let q = supabase.from(table).select('*');
  for (const [key, value] of Object.entries(filters)) {
    q = q.eq(key, value);
  }
  q = q.order(orderBy, { ascending });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** INSERT a single row, return the created row */
async function dbCreate(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

/** UPDATE row by id, return the updated row */
async function dbUpdate(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

/** DELETE row by id */
async function dbDelete(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/** Build an entity object with the standard 4-method API */
function entity(table, opts = {}) {
  return {
    filter: (filters, options) => dbFilter(table, filters, opts.filterOpts ?? options),
    create: (row) => dbCreate(table, row),
    update: (id, updates) => dbUpdate(table, id, updates),
    delete: (id) => dbDelete(table, id),
  };
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const db = {
  FamilyHQ: entity('family_hq'),

  FamilyMember: entity('family_members'),

  Chore: entity('chores'),

  CalendarEvent: entity('calendar_events'),

  MealPlan: entity('meal_plans'),

  BudgetTransaction: entity('budget_transactions', {
    filterOpts: { orderBy: 'created_at', ascending: false },
  }),

  Notice: entity('notices'),

  FamilyGoal: entity('family_goals'),

  FamilyPhoto: entity('family_photos', {
    filterOpts: { orderBy: 'created_at', ascending: false },
  }),

  PhotoComment: entity('photo_comments'),

  Reward: entity('rewards'),

  RewardRedemption: entity('reward_redemptions', {
    filterOpts: { orderBy: 'created_at', ascending: false },
  }),

  ActivityLog: entity('activity_logs', {
    filterOpts: { orderBy: 'created_at', ascending: false },
  }),
};

// ---------------------------------------------------------------------------
// Supabase Storage helpers for Moments photo uploads
// ---------------------------------------------------------------------------

/**
 * Upload a File object to the "moments" bucket.
 * Returns the public URL string.
 */
export async function uploadMomentPhoto(file, familyCode) {
  const ext = file.name.split('.').pop();
  const path = `${familyCode}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('moments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('moments').getPublicUrl(path);
  return data.publicUrl;
}
