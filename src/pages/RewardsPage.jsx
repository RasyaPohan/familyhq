import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gift, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";

const REWARD_EMOJIS = ["🎮", "🍕", "🎬", "🏖️", "🎁", "🛍️", "🍦", "🎠", "🎯", "🎵", "💻", "⭐"];

export default function RewardsPage() {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [members, setMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("shop");
  const [newReward, setNewReward] = useState({ title: "", emoji: "🎁", description: "", xp_cost: 100 });
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [rw, rd, mem] = await Promise.all([
      db.Reward.filter({ is_active: true, family_code: familyCode }),
      db.RewardRedemption.filter({ family_code: familyCode }),
      db.FamilyMember.filter({ family_code: familyCode }),
    ]);
    setRewards(rw);
    setRedemptions(rd);
    setMembers(mem);
  };

  const myXP = members.find((m) => m.id === member?.id)?.xp || 0;

  const handleCreateReward = async () => {
    if (!newReward.title || !newReward.xp_cost) return;
    await db.Reward.create({
      ...newReward,
      family_code: familyCode,
      created_by_id: member?.id || "",
      created_by_name: member?.name || "",
    });
    setNewReward({ title: "", emoji: "🎁", description: "", xp_cost: 100 });
    setShowCreate(false);
    loadAll();
  };

  const handleRedeem = async (reward) => {
    if (myXP < reward.xp_cost) return;
    // Check if already pending
    const existing = redemptions.find(
      (r) => r.reward_id === reward.id && r.member_id === member?.id && r.status === "pending"
    );
    if (existing) return;
    await db.RewardRedemption.create({
      family_code: familyCode,
      reward_id: reward.id,
      reward_title: reward.title,
      reward_emoji: reward.emoji || "🎁",
      xp_cost: reward.xp_cost,
      member_id: member?.id || "",
      member_name: member?.name || "",
      member_color: member?.color || "purple",
    });
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    loadAll();
  };

  const handleApprove = async (redemption) => {
    await db.RewardRedemption.update(redemption.id, { status: "approved" });
    // Deduct XP from kid
    const kid = members.find((m) => m.id === redemption.member_id);
    if (kid) {
      const newXp = Math.max(0, (kid.xp || 0) - redemption.xp_cost);
      await db.FamilyMember.update(kid.id, { xp: newXp });
      await db.ActivityLog.create({
        family_code: familyCode,
        message: `redeemed "${redemption.reward_title}" ${redemption.reward_emoji} -${redemption.xp_cost} XP`,
        member_id: kid.id,
        member_name: kid.name,
        member_color: kid.color || "purple",
        type: "goal",
      });
    }
    loadAll();
  };

  const handleDeny = async (redemption) => {
    await db.RewardRedemption.update(redemption.id, { status: "denied" });
    loadAll();
  };

  const handleDeleteReward = async (id) => {
    await db.Reward.update(id, { is_active: false });
    loadAll();
  };

  const pendingRedemptions = redemptions.filter((r) => r.status === "pending");
  const myRedemptions = redemptions.filter((r) => r.member_id === member?.id);
  const memberColor = member ? MEMBER_COLORS[member.color] || MEMBER_COLORS.purple : MEMBER_COLORS.purple;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:ml-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Rewards Shop 🎁</h1>
        {member?.role === "Parent" && (
          <Button onClick={() => setShowCreate(true)} className="gradient-primary text-white gap-2">
            <Plus className="w-4 h-4" /> Add Reward
          </Button>
        )}
      </div>

      {/* XP Balance Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${memberColor.hex}, ${memberColor.hex}99)` }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <p className="text-white/80 text-sm">Your XP Balance</p>
        <p className="font-heading text-4xl font-bold mt-1">⚡ {myXP} XP</p>
        <p className="text-white/70 text-sm mt-1">Spend it wisely in the shop below</p>
      </motion.div>

      {/* Tabs */}
      {member?.role === "Parent" && (
        <div className="flex gap-2 mb-5">
          {["shop", "pending", "manage"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "pending" ? `Pending (${pendingRedemptions.length})` : t}
            </button>
          ))}
        </div>
      )}

      {/* SHOP TAB */}
      {(tab === "shop" || member?.role !== "Parent") && (
        <>
          {rewards.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="text-6xl mb-4">🎁</p>
              <p className="font-heading text-xl font-bold mb-2">No rewards yet</p>
              <p className="text-muted-foreground text-sm">Ask a parent to add some rewards to the shop!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward, i) => {
                const canAfford = myXP >= reward.xp_cost;
                const alreadyPending = redemptions.some(
                  (r) => r.reward_id === reward.id && r.member_id === member?.id && r.status === "pending"
                );
                const alreadyApproved = redemptions.some(
                  (r) => r.reward_id === reward.id && r.member_id === member?.id && r.status === "approved"
                );
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-card border rounded-2xl p-5 shadow-sm flex flex-col gap-3 transition-all ${
                      canAfford ? "border-border hover:border-primary/40" : "border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{reward.emoji || "🎁"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-base">{reward.title}</p>
                        {reward.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-lg text-primary flex items-center gap-1">
                        ⚡ {reward.xp_cost} XP
                      </span>
                      {member?.role !== "Parent" && (
                        <Button
                          size="sm"
                          disabled={!canAfford || alreadyPending || alreadyApproved}
                          onClick={() => handleRedeem(reward)}
                          className={`gap-1 ${canAfford && !alreadyPending && !alreadyApproved ? "gradient-primary text-white" : ""}`}
                        >
                          {alreadyApproved ? (
                            <><Check className="w-3 h-3" /> Claimed!</>
                          ) : alreadyPending ? (
                            "Pending..."
                          ) : canAfford ? (
                            <><Sparkles className="w-3 h-3" /> Redeem</>
                          ) : (
                            "Not enough XP"
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* My Redemptions */}
          {member?.role !== "Parent" && myRedemptions.length > 0 && (
            <div className="mt-8">
              <h3 className="font-heading font-bold mb-3">My Redemption History</h3>
              <div className="space-y-2">
                {myRedemptions.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    <span className="text-2xl">{r.reward_emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.reward_title}</p>
                      <p className="text-xs text-muted-foreground">⚡ {r.xp_cost} XP</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        r.status === "approved"
                          ? "bg-green-500/10 text-green-600"
                          : r.status === "denied"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}
                    >
                      {r.status === "approved" ? "✅ Approved" : r.status === "denied" ? "❌ Denied" : "⏳ Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* PENDING TAB (parent only) */}
      {tab === "pending" && member?.role === "Parent" && (
        <div className="space-y-3">
          {pendingRedemptions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-heading font-bold">No pending requests!</p>
              <p className="text-muted-foreground text-sm mt-1">Everyone's happy for now.</p>
            </div>
          ) : (
            pendingRedemptions.map((r) => {
              const kid = members.find((m) => m.id === r.member_id);
              const kidColor = MEMBER_COLORS[r.member_color] || MEMBER_COLORS.purple;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm"
                >
                  <span className="text-3xl">{r.reward_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.reward_title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span
                        className="inline-block w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center"
                        style={{ background: kidColor.hex }}
                      >
                        {r.member_name[0]}
                      </span>
                      {r.member_name} · ⚡ {r.xp_cost} XP · Balance: {kid?.xp || 0} XP
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green-600 border-green-200"
                      onClick={() => handleApprove(r)}
                      disabled={!kid || (kid.xp || 0) < r.xp_cost}
                    >
                      <Check className="w-3 h-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 border-red-200"
                      onClick={() => handleDeny(r)}
                    >
                      <X className="w-3 h-3" /> Deny
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* MANAGE TAB (parent only) */}
      {tab === "manage" && member?.role === "Parent" && (
        <div className="space-y-3">
          {rewards.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🎁</p>
              <p className="font-heading font-bold mb-2">No rewards created yet</p>
              <Button onClick={() => setShowCreate(true)} className="gradient-primary text-white gap-2">
                <Plus className="w-4 h-4" /> Create First Reward
              </Button>
            </div>
          )}
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
            >
              <span className="text-3xl">{reward.emoji}</span>
              <div className="flex-1">
                <p className="font-medium">{reward.title}</p>
                <p className="text-xs text-muted-foreground">⚡ {reward.xp_cost} XP</p>
              </div>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteReward(reward.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Reward Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Create a Reward 🎁</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Reward name</Label>
              <Input
                value={newReward.title}
                onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                placeholder="Pick Friday dinner, Extra screen time..."
              />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {REWARD_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewReward({ ...newReward, emoji: e })}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      newReward.emoji === e ? "bg-primary/20 ring-2 ring-primary scale-110" : "bg-muted"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={newReward.description}
                onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                placeholder="What do they get exactly?"
                rows={2}
              />
            </div>
            <div>
              <Label>XP Cost</Label>
              <Input
                type="number"
                value={newReward.xp_cost}
                onChange={(e) => setNewReward({ ...newReward, xp_cost: parseInt(e.target.value) || 100 })}
                min={10}
                step={10}
              />
            </div>
            <Button onClick={handleCreateReward} className="w-full gradient-primary text-white font-heading">
              Create Reward ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}