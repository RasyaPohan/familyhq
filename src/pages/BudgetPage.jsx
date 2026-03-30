import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { motion } from "framer-motion";
import { Plus, Wallet, TrendingDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { isRasya, formatCurrency, inputToCAD, amountPlaceholder, amountLabel, CAD_TO_IDR } from "@/lib/tzCurrency";

const CATEGORIES = [
  { key: "groceries", label: "Groceries", emoji: "🛒", color: "#10B981" },
  { key: "gas", label: "Gas", emoji: "⛽", color: "#F59E0B" },
  { key: "fun", label: "Fun", emoji: "🎮", color: "#8B5CF6" },
  { key: "dining", label: "Dining", emoji: "🍕", color: "#EC4899" },
  { key: "utilities", label: "Utilities", emoji: "💡", color: "#3B82F6" },
  { key: "clothing", label: "Clothing", emoji: "👕", color: "#F97316" },
  { key: "education", label: "Education", emoji: "📚", color: "#06B6D4" },
  { key: "other", label: "Other", emoji: "📦", color: "#6B7280" },
];

export default function BudgetPage() {
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAllowance, setShowAllowance] = useState(false);
  const [selectedKid, setSelectedKid] = useState(null);
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [newTx, setNewTx] = useState({ description: "", amount: "", category: "groceries", type: "expense" });
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [txs, mems] = await Promise.all([
      db.BudgetTransaction.filter({ family_code: familyCode }),
      db.FamilyMember.filter({ family_code: familyCode })
    ]);
    setTransactions(txs);
    setMembers(mems);
  };

  const handleAddTx = async () => {
    if (!newTx.description || !newTx.amount) return;
    const cadAmount = inputToCAD(newTx.amount, member);
    await db.BudgetTransaction.create({
      ...newTx,
      family_code: familyCode,
      amount: cadAmount,
      member_id: member?.id || '',
      member_name: member?.name || '',
      date: new Date().toISOString().split('T')[0],
      status: 'approved',
    });
    setNewTx({ description: "", amount: "", category: "groceries", type: "expense" });
    setShowAdd(false);
    loadData();
  };

  const handleAddAllowance = async () => {
    if (!selectedKid || !allowanceAmount) return;
    const kid = members.find(m => m.id === selectedKid);
    if (!kid) return;
    const cadAmount = inputToCAD(allowanceAmount, member);
    await db.FamilyMember.update(kid.id, {
      allowance_balance: (kid.allowance_balance || 0) + cadAmount
    });
    await db.ActivityLog.create({
      family_code: familyCode,
      message: `received ${formatCurrency(cadAmount, kid)} allowance 💰`,
      member_id: kid.id,
      member_name: kid.name,
      member_color: kid.color,
      type: 'budget'
    });
    setAllowanceAmount("");
    setShowAllowance(false);
    loadData();
  };

  const handleRequest = async (tx, approved) => {
    await db.BudgetTransaction.update(tx.id, { status: approved ? 'approved' : 'denied' });
    loadData();
  };

  // Chart data
  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'approved');
  const byCategory = CATEGORIES.map(cat => ({
    name: cat.label,
    value: expenses.filter(t => t.category === cat.key).reduce((sum, t) => sum + (t.amount || 0), 0),
    color: cat.color,
    emoji: cat.emoji,
  })).filter(c => c.value > 0);

  const totalSpent = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  // amounts stored in CAD; format per viewer
  const fmt = (amountCAD) => formatCurrency(amountCAD, member);
  const kids = members.filter(m => m.role === 'Kid' || m.role === 'Teen');
  const pendingRequests = transactions.filter(t => t.type === 'allowance_request' && t.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:ml-20">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="font-heading text-xl md:text-2xl font-bold">Budget 💸</h1>
        <div className="flex gap-2">
          {member?.role === 'Parent' && (
            <Button variant="outline" size="sm" onClick={() => setShowAllowance(true)} className="gap-1 text-xs md:text-sm">
              <Wallet className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Add </span>Allowance
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-1 text-xs md:text-sm">
            <Plus className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Add </span>Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-heading font-bold mb-2">Spending Breakdown</h3>
          {isRasya(member) && (
            <p className="text-xs text-muted-foreground mb-1">1 CAD = {CAD_TO_IDR.toLocaleString('id-ID')} IDR · fixed rate</p>
          )}
          <p className="text-2xl font-heading font-bold text-primary">{fmt(totalSpent)}</p>
          <div className="h-48 mt-2">
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                    {byCategory.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No expenses yet</div>
            )}
          </div>
          <div className="space-y-1 mt-2">
            {byCategory.map(c => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span>{c.emoji} {c.name}</span>
                <span className="font-medium">{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Allowance Wallets */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-heading font-bold mb-4">Allowance Wallets 💰</h3>
          <div className="space-y-3">
            {kids.map(kid => {
              const color = MEMBER_COLORS[kid.color] || MEMBER_COLORS.purple;
              return (
                <motion.div
                  key={kid.id}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg" style={{ background: color.hex }}>
                    {kid.emoji || kid.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{kid.name}</p>
                    <p className="text-xs text-muted-foreground">{kid.role}</p>
                  </div>
                  <p className="text-lg font-heading font-bold" style={{ color: color.hex }}>
                  {fmt(kid.allowance_balance || 0)}
                  </p>
                </motion.div>
              );
            })}
            {kids.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No kids added yet</p>}
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-heading font-bold mb-4">Purchase Requests 🛍️</h3>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm font-medium">{req.description}</p>
                  <p className="text-xs text-muted-foreground">{req.member_name} • {fmt(req.amount)}</p>
                  {member?.role === 'Parent' && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="gap-1 text-green-600" onClick={() => handleRequest(req, true)}>
                        <Check className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => handleRequest(req, false)}>
                        <X className="w-3 h-3" /> Deny
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm mt-6">
        <h3 className="font-heading font-bold mb-4">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-4xl mb-3">😂</p>
            <p className="font-heading font-bold mb-1">No spending tracked yet.</p>
            <p className="text-muted-foreground text-sm mb-4">Let's keep it that way. (Just kidding — add your first expense!)</p>
            <Button onClick={() => setShowAdd(true)} className="gradient-primary text-white gap-2">
              <Plus className="w-4 h-4" /> Add First Expense
            </Button>
          </motion.div>
        ) : (
        <div className="space-y-2">
          {transactions.slice(0, 15).map(tx => {
            const cat = CATEGORIES.find(c => c.key === tx.category);
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <span className="text-xl">{cat?.emoji || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.member_name || 'Family'} • {tx.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === 'allowance_add' ? 'text-green-500' : 'text-foreground'}`}>
                    {tx.type === 'allowance_add' ? '+' : '-'}{fmt(tx.amount || 0)}
                  </p>
                  {tx.status === 'pending' && <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-1.5 rounded-full">pending</span>}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Add Expense 💸</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What was it for?</Label>
              <Input value={newTx.description} onChange={(e) => setNewTx({ ...newTx, description: e.target.value })} placeholder="Weekly groceries..." />
            </div>
            <div>
              <Label>{amountLabel(member)}</Label>
              <Input type="number" step={isRasya(member) ? '0.01' : '1000'} value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} placeholder={amountPlaceholder(member)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newTx.category} onValueChange={(v) => setNewTx({ ...newTx, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(member?.role === 'Kid' || member?.role === 'Teen') && (
              <div>
                <Label>Type</Label>
                <Select value={newTx.type} onValueChange={(v) => setNewTx({ ...newTx, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="allowance_request">Purchase Request (needs approval)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleAddTx} className="w-full gradient-primary text-white font-heading">
              {newTx.type === 'allowance_request' ? 'Submit Request 🙏' : 'Add Expense 💸'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allowance Dialog */}
      <Dialog open={showAllowance} onOpenChange={setShowAllowance}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Add Allowance 💰</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Who gets the money?</Label>
              <Select value={selectedKid || ''} onValueChange={setSelectedKid}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {kids.map(k => <SelectItem key={k.id} value={k.id}>{k.emoji} {k.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{amountLabel(member)}</Label>
              <Input type="number" step={isRasya(member) ? '0.01' : '1000'} value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} placeholder={amountPlaceholder(member)} />
            </div>
            <Button onClick={handleAddAllowance} className="w-full gradient-primary text-white font-heading">
              Add Funds 💰
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}