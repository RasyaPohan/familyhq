// ─── Family Session (which HQ is loaded on this device) ──────────────────────
const FAMILY_CODE_KEY = 'hq_family_code';
const FAMILY_NAME_KEY = 'hq_family_name';
const PIN_UNLOCK_PREFIX = 'hq_pin_unlocked_';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getFamilyCode() {
  return localStorage.getItem(FAMILY_CODE_KEY) || null;
}

export function getFamilyName() {
  return localStorage.getItem(FAMILY_NAME_KEY) || 'Family';
}

export function setFamilySession(code, name) {
  localStorage.setItem(FAMILY_CODE_KEY, code);
  localStorage.setItem(FAMILY_NAME_KEY, name || 'Family HQ');
}

export function clearFamilySession() {
  localStorage.removeItem(FAMILY_CODE_KEY);
  localStorage.removeItem(FAMILY_NAME_KEY);
  localStorage.removeItem('family_active_member');
}

export function setPinUnlocked(familyCode) {
  localStorage.setItem(`${PIN_UNLOCK_PREFIX}${familyCode}`, Date.now().toString());
}

export function isPinValid(familyCode) {
  if (!familyCode) return false;
  const ts = localStorage.getItem(`${PIN_UNLOCK_PREFIX}${familyCode}`);
  if (!ts) return false;
  return Date.now() - parseInt(ts) < SESSION_DURATION;
}

// ─── Active member within a family ───────────────────────────────────────────
const STORAGE_KEY = 'family_active_member';

export function getActiveMember() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setActiveMember(member) {
  if (member) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(member));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export function getThemeMode() {
  return localStorage.getItem('family_theme') || 'dark';
}

export function setThemeMode(mode) {
  localStorage.setItem('family_theme', mode);
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Initialize theme on load
const savedTheme = getThemeMode();
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

// ─── Colors ───────────────────────────────────────────────────────────────────
export const MEMBER_COLORS = {
  purple: { bg: 'bg-family-purple', text: 'text-family-purple', border: 'border-family-purple', hex: '#8B5CF6', from: 'from-family-purple' },
  pink:   { bg: 'bg-family-pink',   text: 'text-family-pink',   border: 'border-family-pink',   hex: '#EC4899', from: 'from-family-pink'   },
  blue:   { bg: 'bg-family-blue',   text: 'text-family-blue',   border: 'border-family-blue',   hex: '#1E40AF', from: 'from-family-blue'   },
  green:  { bg: 'bg-family-green',  text: 'text-family-green',  border: 'border-family-green',  hex: '#10B981', from: 'from-family-green'  },
  orange: { bg: 'bg-family-orange', text: 'text-family-orange', border: 'border-family-orange', hex: '#F59E0B', from: 'from-family-orange' },
  yellow: { bg: 'bg-family-yellow', text: 'text-family-yellow', border: 'border-family-yellow', hex: '#EAB308', from: 'from-family-yellow' },
};

// ─── Levels ───────────────────────────────────────────────────────────────────
export const LEVELS = [
  { min: 0,    title: 'New Member',    emoji: '🐣' },
  { min: 100,  title: 'Getting There', emoji: '🌱' },
  { min: 300,  title: 'Active Member', emoji: '⚡' },
  { min: 600,  title: 'Family Star',   emoji: '🌟' },
  { min: 1000, title: 'HQ Legend',     emoji: '👑' },
];

export const LEVEL_TITLES = [
  '🐣 New Member',
  '🌱 Getting There',
  '⚡ Active Member',
  '🌟 Family Star',
  '👑 HQ Legend',
];

export function getLevelFromXp(xp) {
  let lvl = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if ((xp || 0) >= LEVELS[i].min) lvl = i + 1;
  }
  return lvl;
}

export function getLevelTitle(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || LEVEL_TITLES[0];
}

export function getXpForNextLevel(xp) {
  for (let i = 0; i < LEVELS.length; i++) {
    if ((xp || 0) < LEVELS[i].min) return LEVELS[i].min;
  }
  return null;
}

export function getLevelProgress(xp) {
  const currentLevel = getLevelFromXp(xp) - 1;
  const currentMin = LEVELS[currentLevel]?.min || 0;
  const nextMin = LEVELS[currentLevel + 1]?.min || null;
  if (nextMin === null) return 100;
  return Math.min(100, Math.round(((xp - currentMin) / (nextMin - currentMin)) * 100));
}

export function getXpForLevel(level) {
  return LEVELS[Math.min(level - 1, LEVELS.length - 1)]?.min || 0;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}