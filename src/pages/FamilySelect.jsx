import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { setActiveMember, getActiveMember, getFamilyCode, getFamilyName, clearFamilySession, MEMBER_COLORS } from "@/lib/familyStore";
import { Plus, Pencil } from "lucide-react";
import EditMemberSheet from "@/components/EditMemberSheet";
import EditFamilySheet from "@/components/EditFamilySheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { isOnboarded, startOnboarding } from "@/components/OnboardingWizard";
import AnimatedLogo from "@/components/AnimatedLogo";

const EMOJI_OPTIONS = ["😎","👩","👨","🧑","👧","👦","🦸","🧙","🎮","⚡","🌟","🦊","🐱","🦄","🎨","🎵"];

// Animated gradient orbs for background
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary large orb — top right */}
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)" }}
      />
      {/* Secondary orb — bottom left */}
      <motion.div
        animate={{ x: [0, -25, 15, 0], y: [0, 25, -15, 0], scale: [1, 0.92, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -bottom-48 -left-48 w-[480px] h-[480px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 70%)" }}
      />
      {/* Accent orb — center */}
      <motion.div
        animate={{ x: [0, 20, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.12, 0.9, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 7 }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)" }}
      />
    </div>
  );
}

// Blinking cursor component
function BlinkingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "steps(1)" }}
      className="inline-block ml-0.5 w-0.5 h-5 bg-white/60 align-middle rounded-full"
    />
  );
}

export default function FamilySelect() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", emoji: "😎", color: "purple", role: "Kid" });
  const [editingMember, setEditingMember] = useState(null);
  const [showEditFamily, setShowEditFamily] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentActiveMember, setCurrentActiveMember] = useState(null);
  const familyCode = getFamilyCode();
  const [displayFamilyName, setDisplayFamilyName] = useState(getFamilyName());

  useEffect(() => {
    if (!familyCode) { navigate('/', { replace: true }); return; }
    setCurrentActiveMember(getActiveMember());
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const data = await db.FamilyMember.filter({ family_code: familyCode });
    setMembers(data);
    setLoading(false);
  };

  const handleSelect = (member) => {
    setActiveMember(member);
    window.dispatchEvent(new Event('member-changed'));
    if (!isOnboarded(member.id)) startOnboarding(member);
    navigate('/dashboard');
  };

  const handleAddMember = async () => {
    if (!newMember.name) return;
    await db.FamilyMember.create({ ...newMember, family_code: familyCode });
    setNewMember({ name: "", emoji: "😎", color: "purple", role: "Kid" });
    setShowAdd(false);
    loadMembers();
  };

  const handleMemberSaved = (updated) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
  };

  const handleMemberDeleted = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const hour = new Date().getHours();
  const timeEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : hour < 21 ? "🌅" : "🌙";

  // Stagger layout: rows of 2, then center the last card if odd count
  const renderCards = () => {
    if (loading) {
      return (
        <div className="flex flex-wrap justify-center gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-32 h-44 rounded-3xl bg-white/5 animate-pulse" />
          ))}
        </div>
      );
    }

    const isOdd = members.length % 2 !== 0;

    return (
      <div className="flex flex-col items-center gap-5">
        {/* Pair up members into rows of 2, centering the last if odd */}
        {Array.from({ length: Math.ceil(members.length / 2) }, (_, rowIdx) => {
          const start = rowIdx * 2;
          const rowMembers = members.slice(start, start + 2);
          const isLastRow = start + 2 >= members.length;
          const isSingleInRow = isLastRow && isOdd;

          return (
            <div
              key={rowIdx}
              className="flex gap-5 justify-center"
            >
              {rowMembers.map((member, colIdx) => {
                const globalIdx = start + colIdx;
                const color = MEMBER_COLORS[member.color] || MEMBER_COLORS.purple;
                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    color={color}
                    index={globalIdx}
                    onSelect={handleSelect}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0a0a14 0%, #0d0b1a 50%, #0a0f1a 100%)" }}
    >
      <BackgroundOrbs />

      {/* Top right edit button */}
      <div className="absolute top-4 right-4 z-20">
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shadow-md text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
          >
            Done ✅
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Pencil className="w-4 h-4 text-white/60" />
          </button>
        )}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center mb-10 relative z-10"
      >
        {/* Logo with persistent soft glow */}
        <div className="flex justify-center mb-5 relative">
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.12, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: "-16px",
              background: "radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)",
            }}
          />
          <AnimatedLogo size={76} />
        </div>

        {/* Family name with gradient text */}
        <h1
          className="font-heading text-3xl md:text-4xl font-bold mb-2"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {displayFamilyName}
        </h1>

        {/* Tagline */}
        <p className="text-xs italic mb-4" style={{ color: "rgba(255,255,255,0.28)" }}>
          "One house. One HQ. All of us."
        </p>

        {/* Who's checking in */}
        <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
          {timeEmoji}{" "}
          {editMode
            ? "Tap to edit a profile"
            : <span>Who's checking in?<BlinkingCursor /></span>
          }
        </p>
      </motion.div>

      {/* Edit mode list */}
      {editMode ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm relative z-10 space-y-2"
        >
          <button
            onClick={() => setShowEditFamily(true)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: "rgba(139,92,246,0.2)" }}>🏠</div>
            <div className="flex-1">
              <p className="font-heading font-bold text-sm text-white">Family Name & Emoji</p>
              <p className="text-xs text-white/40">{displayFamilyName}</p>
            </div>
            <Pencil className="w-4 h-4 text-white/40" />
          </button>

          {members.map((member) => {
            const color = MEMBER_COLORS[member.color] || MEMBER_COLORS.purple;
            const canEdit = !currentActiveMember || currentActiveMember.id === member.id || currentActiveMember.role === 'Parent';
            if (!canEdit) return null;
            return (
              <button
                key={member.id}
                onClick={() => setEditingMember(member)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: `${color.hex}25` }}>
                  {member.emoji || member.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-heading font-bold text-sm text-white">{member.name}</p>
                  <p className="text-xs text-white/40">{member.role}</p>
                </div>
                <Pencil className="w-4 h-4 text-white/40" />
              </button>
            );
          })}

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <button
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-colors text-left"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <Plus className="w-5 h-5 text-white/50" />
                </div>
                <p className="text-sm font-medium text-white/50">Add a new member</p>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Add Family Member ✨</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Enter name..." />
                </div>
                <div>
                  <Label>Avatar Emoji</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} onClick={() => setNewMember({ ...newMember, emoji: e })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${newMember.emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-3 mt-2">
                    {Object.entries(MEMBER_COLORS).map(([key, val]) => (
                      <button key={key} onClick={() => setNewMember({ ...newMember, color: key })}
                        className={`w-10 h-10 rounded-full transition-all ${newMember.color === key ? 'ring-4 ring-offset-2 scale-110' : ''}`}
                        style={{ background: val.hex }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={newMember.role} onValueChange={v => setNewMember({ ...newMember, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Parent">Parent 👩‍👦</SelectItem>
                      <SelectItem value="Teen">Teen 🧑</SelectItem>
                      <SelectItem value="Kid">Kid 🧒</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMember} className="w-full gradient-primary text-white font-heading">
                  Add to Family ✨
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      ) : (
        <div className="relative z-10 w-full max-w-sm">
          {renderCards()}
        </div>
      )}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => { clearFamilySession(); navigate('/'); }}
        className="mt-12 text-xs transition-colors relative z-10"
        style={{ color: "rgba(255,255,255,0.2)" }}
        onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
      >
        Switch Family HQ
      </motion.button>

      <EditMemberSheet
        member={editingMember}
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        onSaved={handleMemberSaved}
        onDeleted={handleMemberDeleted}
        canEdit={!currentActiveMember || currentActiveMember.id === editingMember?.id || currentActiveMember?.role === 'Parent'}
        canDelete={currentActiveMember?.role === 'Parent' && currentActiveMember?.id !== editingMember?.id}
      />

      <EditFamilySheet
        open={showEditFamily}
        onClose={() => setShowEditFamily(false)}
        familyName={displayFamilyName}
        familyEmoji="🏠"
        onSaved={(newName) => setDisplayFamilyName(newName)}
      />
    </div>
  );
}

function MemberCard({ member, color, index, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.07, y: -6 }}
      whileTap={{ scale: 0.94 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onSelect(member)}
      className="relative flex flex-col items-center gap-3 p-5 rounded-3xl w-36 overflow-hidden"
      style={{
        background: hovered
          ? `linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)`
          : `rgba(255,255,255,0.05)`,
        border: `1px solid ${hovered ? color.hex + "70" : color.hex + "25"}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: hovered
          ? `0 0 24px ${color.hex}40, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)`
          : `0 0 0px transparent, 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
        transition: "box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease",
      }}
    >
      {/* Glow spot behind avatar */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${color.hex}50 0%, transparent 70%)` }}
          />
        )}
      </AnimatePresence>

      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl relative z-10"
        style={{
          background: `${color.hex}20`,
          boxShadow: `inset 0 0 0 1px ${color.hex}30`,
        }}
      >
        {member.emoji || member.name[0]}
      </div>

      {/* Name + role */}
      <div className="text-center relative z-10">
        <p className="font-heading font-bold text-sm text-white leading-tight">{member.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: color.hex + "cc" }}>{member.role}</p>
      </div>
    </motion.button>
  );
}
