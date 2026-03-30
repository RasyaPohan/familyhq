import { useState } from "react";
import { db } from "@/lib/db";
import { setFamilySession, getFamilyCode } from "@/lib/familyStore";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const FAMILY_EMOJIS = ["🏠","🏡","🏰","🌟","👨‍👩‍👧‍👦","🎪","🌈","🦁","🐉","🎉","🌴","🏆","❤️","🔥","⭐"];

export default function EditFamilySheet({ open, onClose, familyName, familyEmoji, onSaved }) {
  const [name, setName] = useState(familyName || "");
  const [emoji, setEmoji] = useState(familyEmoji || "🏠");
  const [saving, setSaving] = useState(false);
  const familyCode = getFamilyCode();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    // Update the FamilyHQ record
    const hqs = await db.FamilyHQ.filter({ family_code: familyCode });
    if (hqs[0]) {
      await db.FamilyHQ.update(hqs[0].id, {
        family_name: name.trim(),
        family_emoji: emoji,
      });
    }
    // Update local storage
    setFamilySession(familyCode, `${emoji} ${name.trim()}`);
    setSaving(false);
    onSaved(`${emoji} ${name.trim()}`);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-heading">Edit Family Name 🏠</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-5">
          <div>
            <Label>Family Name ✏️</Label>
            <Input
              className="mt-1 bg-background text-foreground"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="The Smiths..."
            />
          </div>

          <div>
            <Label>Family Emoji 😀</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {FAMILY_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'}`}
                >{e}</button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-white font-heading">
            {saving ? "Saving..." : "Save 🏠"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}