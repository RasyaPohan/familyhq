import { useState } from "react";
import { db } from "@/lib/db";
import { MEMBER_COLORS } from "@/lib/familyStore";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

const EMOJI_OPTIONS = ["😎","👩","👨","🧑","👧","👦","🦸","🧙","🎮","⚡","🌟","🦊","🐱","🦄","🎨","🎵","🍕","🎸","🏋️","🌴"];

export default function EditMemberSheet({ member, open, onClose, onSaved, onDeleted, canEdit, canDelete }) {
  const [form, setForm] = useState({
    name: member?.name || "",
    emoji: member?.emoji || "😎",
    color: member?.color || "purple",
    role: member?.role || "Kid",
    birthday: member?.birthday || "",
    timezone: member?.timezone || "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form when member changes
  const currentMember = member;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await db.FamilyMember.update(currentMember.id, {
      name: form.name.trim(),
      emoji: form.emoji,
      color: form.color,
      role: form.role,
      birthday: form.birthday || null,
      timezone: form.timezone || null,
    });
    setSaving(false);
    onSaved({ ...currentMember, ...form });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await db.FamilyMember.delete(currentMember.id);
    onDeleted(currentMember.id);
    onClose();
  };

  if (!member) return null;

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) { setConfirmDelete(false); onClose(); } }}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle className="font-heading">Edit Profile ✏️</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-5">
          {/* Name */}
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1 bg-background text-foreground"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Name..."
              disabled={!canEdit}
            />
          </div>

          {/* Avatar Emoji */}
          <div>
            <Label>Avatar Emoji 😀</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  disabled={!canEdit}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${form.emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'}`}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <Label>Color 🎨</Label>
            <div className="flex gap-3 mt-2">
              {Object.entries(MEMBER_COLORS).map(([key, val]) => (
                <button
                  key={key}
                  disabled={!canEdit}
                  onClick={() => setForm({ ...form, color: key })}
                  className={`w-10 h-10 rounded-full transition-all ${form.color === key ? 'ring-4 ring-offset-2 ring-primary scale-110' : ''}`}
                  style={{ background: val.hex }}
                />
              ))}
            </div>
          </div>

          {/* Role */}
          <div>
            <Label>Role 👤</Label>
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })} disabled={!canEdit}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Parent">Parent 👩‍👦</SelectItem>
                <SelectItem value="Teen">Teen 🧑</SelectItem>
                <SelectItem value="Kid">Kid 🧒</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Birthday */}
          <div>
            <Label>Birthday 🎂</Label>
            <Input
              className="mt-1 bg-background text-foreground"
              type="date"
              value={form.birthday}
              onChange={e => setForm({ ...form, birthday: e.target.value })}
              disabled={!canEdit}
            />
          </div>

          {/* Timezone */}
          <div>
            <Label>Timezone 🌍</Label>
            <Select value={form.timezone} onValueChange={v => setForm({ ...form, timezone: v })} disabled={!canEdit}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select timezone..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pacific/Auckland">🇳🇿 Auckland (NZST, UTC+13)</SelectItem>
                <SelectItem value="Pacific/Auckland_DST">🇳🇿 Auckland (NZDT, UTC+13)</SelectItem>
                <SelectItem value="Asia/Tokyo">🇯🇵 Tokyo (JST, UTC+9)</SelectItem>
                <SelectItem value="Asia/Shanghai">🇨🇳 Beijing / Shanghai (CST, UTC+8)</SelectItem>
                <SelectItem value="Asia/Jakarta">🇮🇩 Jakarta (WIB, UTC+7)</SelectItem>
                <SelectItem value="Asia/Bangkok">🇹🇭 Bangkok (ICT, UTC+7)</SelectItem>
                <SelectItem value="Asia/Kolkata">🇮🇳 Mumbai / Delhi (IST, UTC+5:30)</SelectItem>
                <SelectItem value="Asia/Dubai">🇦🇪 Dubai (GST, UTC+4)</SelectItem>
                <SelectItem value="Europe/London">🇬🇧 London (GMT/BST, UTC+0/+1)</SelectItem>
                <SelectItem value="Europe/Paris">🇫🇷 Paris / Berlin (CET, UTC+1)</SelectItem>
                <SelectItem value="America/Sao_Paulo">🇧🇷 São Paulo (BRT, UTC-3)</SelectItem>
                <SelectItem value="America/New_York">🇺🇸 New York (ET, UTC-5/-4)</SelectItem>
                <SelectItem value="America/Chicago">🇺🇸 Chicago (CT, UTC-6/-5)</SelectItem>
                <SelectItem value="America/Denver">🇺🇸 Denver (MT, UTC-7/-6)</SelectItem>
                <SelectItem value="America/Los_Angeles">🇺🇸 Los Angeles (PT, UTC-8/-7)</SelectItem>
                <SelectItem value="America/Vancouver">🇨🇦 Vancouver (PT, UTC-8/-7)</SelectItem>
                <SelectItem value="America/Toronto">🇨🇦 Toronto (ET, UTC-5/-4)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-white font-heading">
              {saving ? "Saving..." : "Save Changes ✅"}
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className={`w-full gap-2 ${confirmDelete ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-950' : 'text-destructive'}`}
            >
              <Trash2 className="w-4 h-4" />
              {confirmDelete ? "Tap again to confirm removal" : "Remove Member 🗑️"}
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}