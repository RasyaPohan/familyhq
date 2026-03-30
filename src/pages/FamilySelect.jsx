import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
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
    if (!isOnboarded(member.id)) {
      startOnboarding(member);
    }
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Top right edit button */}
      <div className="absolute top-4 right-4 z-20">
        {editMode ? (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-md"
          >
            <span>Done</span> ✅
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="w-9 h-9 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 relative z-10"
      >
        <div className="flex justify-center mb-3">
          <AnimatedLogo size={60} />
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">
          {displayFamilyName}
        </h1>
        <p className="text-muted-foreground text-sm italic mb-1">"One house. One HQ. All of us."</p>
        <p className="text-muted-foreground text-base">
          {timeEmoji} {editMode ? "Tap to edit a profile" : "Who's checking in?"}
        </p>
      </motion.div>

      {/* Edit mode list */}
      {editMode ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm relative z-10 space-y-2"
        >
          {/* Family name row */}
          <button
            onClick={() => setShowEditFamily(true)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🏠</div>
            <div className="flex-1">
              <p className="font-heading font-bold text-sm">Family Name & Emoji</p>
              <p className="text-xs text-muted-foreground">{displayFamilyName}</p>
            </div>
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Members */}
          {members.map((member) => {
            const color = MEMBER_COLORS[member.color] || MEMBER_COLORS.purple;
            const canEdit = !currentActiveMember || currentActiveMember.id === member.id || currentActiveMember.role === 'Parent';
            if (!canEdit) return null;
            return (
              <button
                key={member.id}
                onClick={() => setEditingMember(member)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: `${color.hex}25` }}>
                  {member.emoji || member.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-heading font-bold text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}

          {/* Add member */}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Add a new member</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 max-w-4xl relative z-10">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-32 h-40 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : (
          members.map((member, i) => {
            const color = MEMBER_COLORS[member.color] || MEMBER_COLORS.purple;
            return (
              <motion.button
                key={member.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.08, y: -8 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(member)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border-2 border-transparent hover:border-current shadow-lg hover:shadow-xl transition-shadow"
                style={{ color: color.hex }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner"
                  style={{ background: `${color.hex}20` }}
                >
                  {member.emoji || member.name[0]}
                </div>
                <div className="text-center">
                  <p className="font-heading font-bold text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
      )}

      <button
        onClick={() => { clearFamilySession(); navigate('/'); }}
        className="mt-10 text-muted-foreground/40 hover:text-muted-foreground text-xs transition-colors"
      >
        Switch Family HQ
      </button>

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