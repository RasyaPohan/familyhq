import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, Check, X, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { isRasya, formatCurrency, inputToCAD, amountPlaceholder, amountLabel, CAD_TO_IDR } from "@/lib/tzCurrency";

const CATEGORIES = [
  { key: "groceries", label: "Groceries", emoji: "🛒", color: "#10B981" },
  { key: "gas",       label: "Gas",       emoji: "⛽", color: "#F59E0B" },
  { key: "fun",       label: "Fun",       emoji: "🎮", color: "#8B5CF6" },
  { key: "dining",    label: "Dining",    emoji: "🍕", color: "#EC4899" },
  { key: "utilities", label: "Utilities", emoji: "💡", color: "#3B82F6" },
  { key: "clothing",  label: "Clothing",  emoji: "👕", color: "#F97316" },
  { key: "education", label: "Education", emoji: "📚", color: "#06B6D4" },
  { key: "other",     label: "Other",     emoji: "📦", color: "#6B7280" },
];

// ── Bottom sheet component ────────────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 80 }}
            onClick={onClose}
          />
          <motion.div
            key="bs-panel"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 81,
              background: "#0f1120", borderTop: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "20px 20px 0 0",
              maxHeight: "88vh", overflowY: "auto",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 12px" }}>
              <p style={{ fontWeight: 700, fontSize: 17, color: "rgba(255,255,255,0.95)" }}>{title}</p>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ padding: "0 20px 24px" }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Pill button ───────────────────────────────────────────────────────────────
function PillBtn({ onClick, children, accent = false, danger = false, small = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: small ? "6px 14px" : "9px 18px",
        borderRadius: 999,
        background: danger
          ? "rgba(239,68,68,0.15)"
          : accent
          ? "linear-gradient(135deg,#8B5CF6,#EC4899)"
          : "rgba(255,255,255,0.07)",
        border: danger
          ? "1px solid rgba(239,68,68,0.3)"
          : accent
          ? "none"
          : "1px solid rgba(255,255,255,0.12)",
        color: danger ? "#f87171" : "rgba(255,255,255,0.92)",
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >{children}</button>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      {children}
    </div>
  );
}

function StyledInput(props) {
  return (
    <Input
      {...props}
      style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10, color: "white", height: 42, fontSize: 14,
      }}
    />
  );
}

// ── Custom donut centre label ─────────────────────────────────────────────────
function DonutLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize="11" fill="rgba(255,255,255,0.45)" fontWeight="600">SPENT</tspan>
      <tspan x={cx} dy="1.4em" fontSize="13" fill="rgba(255,255,255,0.9)" fontWeight="700">{total}</tspan>
    </text>
  );
}

export default function BudgetPage() {
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers]           = useState([]);

  // Sheet visibility
  const [showAddExpense, setShowAddExpense]     = useState(false);
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showEditSpending, setShowEditSpending] = useState(false);

  // Quick allowance state (per member)
  const [inlineAllowance, setInlineAllowance] = useState({}); // { [memberId]: "" }

  // New expense form
  const [newTx, setNewTx] = useState({ description: "", amount: "", category: "groceries", type: "expense" });

  // Edit transaction state
  const [editingTx, setEditingTx]   = useState(null);
  const [editFields, setEditFields] = useState({});

  const member     = getActiveMember();
  const familyCode = getFamilyCode();
  const memberColor = member ? (MEMBER_COLORS[member.color] || MEMBER_COLORS.purple) : MEMBER_COLORS.purple;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [txs, mems] = await Promise.all([
      db.BudgetTransaction.filter({ family_code: familyCode }, { orderBy: "created_at", ascending: false }),
      db.FamilyMember.filter({ family_code: familyCode }),
    ]);
    setTransactions(txs);
    setMembers(mems);
  };

  // ── Add expense ─────────────────────────────────────────────────────────────
  const handleAddExpense = async () => {
    if (!newTx.description || !newTx.amount) return;
    await db.BudgetTransaction.create({
      ...newTx,
      family_code: familyCode,
      amount: inputToCAD(newTx.amount, member),
      member_id:   member?.id   || "",
      member_name: member?.name || "",
      date:  new Date().toISOString().split("T")[0],
      status: "approved",
    });
    setNewTx({ description: "", amount: "", category: "groceries", type: "expense" });
    setShowAddExpense(false);
    loadData();
  };

  // ── Inline allowance per member ─────────────────────────────────────────────
  const handleAddAllowanceFor = async (kid) => {
    const raw = inlineAllowance[kid.id];
    if (!raw) return;
    const cadAmount = inputToCAD(raw, member);
    await db.FamilyMember.update(kid.id, {
      allowance_balance: (kid.allowance_balance || 0) + cadAmount,
    });
    await db.ActivityLog.create({
      family_code: familyCode,
      message: `received ${formatCurrency(cadAmount, kid)} allowance 💰`,
      member_id:    kid.id,
      member_name:  kid.name,
      member_color: kid.color,
      type: "budget",
    });
    setInlineAllowance(prev => ({ ...prev, [kid.id]: "" }));
    loadData();
  };

  // ── Edit transaction ────────────────────────────────────────────────────────
  const startEdit = (tx) => {
    setEditingTx(tx.id);
    setEditFields({ description: tx.description, amount: String(tx.amount), category: tx.category });
  };
  const saveEdit = async () => {
    if (!editingTx) return;
    await db.BudgetTransaction.update(editingTx, {
      description: editFields.description,
      amount: parseFloat(editFields.amount) || 0,
      category: editFields.category,
    });
    setEditingTx(null);
    loadData();
  };
  const deleteTx = async (id) => {
    await db.BudgetTransaction.delete(id);
    loadData();
  };

  // ── Approve/deny allowance requests ────────────────────────────────────────
  const handleRequest = async (tx, approved) => {
    await db.BudgetTransaction.update(tx.id, { status: approved ? "approved" : "denied" });
    loadData();
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const fmt = (cad) => formatCurrency(cad, member);
  const expenses = transactions.filter(t => t.type === "expense" && t.status === "approved");
  const totalSpent = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const byCategory = CATEGORIES.map(cat => ({
    name: cat.label, emoji: cat.emoji, color: cat.color,
    value: expenses.filter(t => t.category === cat.key).reduce((s, t) => s + (t.amount || 0), 0),
  })).filter(c => c.value > 0);

  const kids            = members.filter(m => m.role === "Kid" || m.role === "Teen");
  const pendingRequests = transactions.filter(t => t.type === "allowance_request" && t.status === "pending");
  const expenseTxs      = transactions.filter(t => t.type === "expense");
  const isParent        = member?.role === "Parent";

  // ── Card style ──────────────────────────────────────────────────────────────
  const card = {
    background: "#0d1020",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "20px",
    marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 100px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.96)", margin: 0 }}>Budget 💸</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
            {isRasya(member) ? "CAD · Vancouver" : "IDR · Jakarta"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isParent && (
            <PillBtn onClick={() => setShowAddAllowance(true)}>
              <Wallet style={{ width: 14, height: 14 }}/> Allowance
            </PillBtn>
          )}
          <PillBtn accent onClick={() => setShowAddExpense(true)}>
            <Plus style={{ width: 14, height: 14 }}/> Expense
          </PillBtn>
        </div>
      </div>

      {/* ── Spending Breakdown ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.9)", margin: 0 }}>Spending Breakdown</p>
          {isParent && (
            <PillBtn small onClick={() => setShowEditSpending(true)}>
              <Pencil style={{ width: 11, height: 11 }}/> Edit ✏️
            </PillBtn>
          )}
        </div>

        {byCategory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            No expenses tracked yet
          </div>
        ) : (
          <>
            {/* Donut */}
            <div style={{ height: 200, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory} dataKey="value"
                    innerRadius={62} outerRadius={90}
                    paddingAngle={3} startAngle={90} endAngle={-270}
                  >
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent"/>
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                    itemStyle={{ color: "rgba(255,255,255,0.9)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre label overlay */}
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", margin: 0 }}>SPENT</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.92)", margin: "3px 0 0", textAlign: "center", lineHeight: 1.2, maxWidth: 80 }}>{fmt(totalSpent)}</p>
              </div>
            </div>

            {/* Legend */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {byCategory.map(c => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0, boxShadow: `0 0 8px ${c.color}80` }}/>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", flex: 1 }}>{c.emoji} {c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Allowance Wallets ── */}
      <div style={card}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.9)", margin: "0 0 16px" }}>Allowance Wallets 💰</p>
        {kids.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "20px 0" }}>No kids added yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {kids.map(kid => {
              const kColor = MEMBER_COLORS[kid.color] || MEMBER_COLORS.purple;
              // Format in that kid's currency (Rasya → CAD, others → IDR)
              const kidFmt = (cad) => formatCurrency(cad, kid);
              return (
                <div key={kid.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: kColor.hex, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 20, flexShrink: 0,
                      boxShadow: `0 0 16px ${kColor.hex}50`,
                    }}>
                      {kid.emoji || kid.name[0]}
                    </div>
                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.92)" }}>{kid.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{kid.role} · {isRasya(kid) ? "🇨🇦 CAD" : "🇮🇩 IDR"}</p>
                    </div>
                    {/* Balance */}
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: kColor.hex, textAlign: "right" }}>
                      {kidFmt(kid.allowance_balance || 0)}
                    </p>
                  </div>

                  {/* Inline add allowance (parents only) */}
                  {isParent && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        placeholder={amountPlaceholder(member)}
                        value={inlineAllowance[kid.id] || ""}
                        onChange={e => setInlineAllowance(prev => ({ ...prev, [kid.id]: e.target.value }))}
                        style={{
                          flex: 1, background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
                          color: "white", fontSize: 13, padding: "6px 10px",
                        }}
                      />
                      <PillBtn small accent onClick={() => handleAddAllowanceFor(kid)}>
                        + Add
                      </PillBtn>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pending Requests ── */}
      {pendingRequests.length > 0 && (
        <div style={card}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.9)", margin: "0 0 16px" }}>Purchase Requests 🛍️</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingRequests.map(req => (
              <div key={req.id} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.9)" }}>{req.description}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{req.member_name} · {fmt(req.amount)}</p>
                {isParent && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <PillBtn small onClick={() => handleRequest(req, true)}>
                      <Check style={{ width: 11, height: 11, color: "#4ade80" }}/> Approve
                    </PillBtn>
                    <PillBtn small danger onClick={() => handleRequest(req, false)}>
                      <X style={{ width: 11, height: 11 }}/> Deny
                    </PillBtn>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Transactions ── */}
      <div style={card}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.9)", margin: "0 0 16px" }}>Recent Transactions</p>
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: 36, margin: "0 0 10px" }}>😂</p>
            <p style={{ fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 6px" }}>No spending tracked yet.</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 18px" }}>Add your first expense to get started.</p>
            <PillBtn accent onClick={() => setShowAddExpense(true)}>
              <Plus style={{ width: 14, height: 14 }}/> Add Expense
            </PillBtn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {transactions.slice(0, 20).map(tx => {
              const cat = CATEGORIES.find(c => c.key === tx.category);
              const isIncome = tx.type === "allowance_add";
              return (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "11px 14px" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat?.color || "#6B7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {cat?.emoji || "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{tx.member_name || "Family"} · {tx.date}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: isIncome ? "#4ade80" : "rgba(255,255,255,0.9)" }}>
                      {isIncome ? "+" : "-"}{fmt(tx.amount || 0)}
                    </p>
                    {tx.status === "pending" && (
                      <span style={{ fontSize: 10, background: "rgba(245,158,11,0.15)", color: "#fbbf24", padding: "2px 7px", borderRadius: 99 }}>pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────
          BOTTOM SHEETS
      ────────────────────────────────────────────────────── */}

      {/* Add Expense sheet */}
      <BottomSheet open={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense 💸">
        <Field label="What was it for?">
          <StyledInput
            value={newTx.description}
            onChange={e => setNewTx({ ...newTx, description: e.target.value })}
            placeholder="Weekly groceries..."
          />
        </Field>
        <Field label={amountLabel(member)}>
          <StyledInput
            type="number"
            step={isRasya(member) ? "0.01" : "1000"}
            value={newTx.amount}
            onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
            placeholder={amountPlaceholder(member)}
          />
        </Field>
        <Field label="Category">
          <Select value={newTx.category} onValueChange={v => setNewTx({ ...newTx, category: v })}>
            <SelectTrigger style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "white", height: 42 }}>
              <SelectValue/>
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {(member?.role === "Kid" || member?.role === "Teen") && (
          <Field label="Type">
            <Select value={newTx.type} onValueChange={v => setNewTx({ ...newTx, type: v })}>
              <SelectTrigger style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "white", height: 42 }}>
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="allowance_request">Purchase Request (needs approval)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <button
          onClick={handleAddExpense}
          style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#8B5CF6,#EC4899)", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
        >
          {newTx.type === "allowance_request" ? "Submit Request 🙏" : "Add Expense 💸"}
        </button>
      </BottomSheet>

      {/* Add Allowance sheet (legacy fallback for non-inline) */}
      <BottomSheet open={showAddAllowance} onClose={() => setShowAddAllowance(false)} title="Add Allowance 💰">
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
          You can also add allowance directly from the wallet cards below.
        </p>
        {kids.map(kid => {
          const kColor = MEMBER_COLORS[kid.color] || MEMBER_COLORS.purple;
          return (
            <div key={kid.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: kColor.hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {kid.emoji || kid.name[0]}
              </div>
              <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{kid.name}</p>
              <input
                type="number"
                placeholder={amountPlaceholder(member)}
                value={inlineAllowance[kid.id] || ""}
                onChange={e => setInlineAllowance(prev => ({ ...prev, [kid.id]: e.target.value }))}
                style={{ width: 110, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, color: "white", fontSize: 13, padding: "6px 10px" }}
              />
              <PillBtn small accent onClick={() => handleAddAllowanceFor(kid)}>Add</PillBtn>
            </div>
          );
        })}
      </BottomSheet>

      {/* Edit Spending sheet */}
      <BottomSheet open={showEditSpending} onClose={() => { setShowEditSpending(false); setEditingTx(null); }} title="Edit Spending ✏️">
        {expenseTxs.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "24px 0" }}>No expense transactions yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {expenseTxs.slice(0, 20).map(tx => {
              const cat = CATEGORIES.find(c => c.key === tx.category);
              const isEditing = editingTx === tx.id;
              return (
                <div key={tx.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px" }}>
                  {isEditing ? (
                    <div>
                      <StyledInput
                        value={editFields.description}
                        onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))}
                        style={{ marginBottom: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 8, color: "white", height: 38, fontSize: 13 }}
                        placeholder="Description"
                      />
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                          type="number"
                          value={editFields.amount}
                          onChange={e => setEditFields(p => ({ ...p, amount: e.target.value }))}
                          style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 8, color: "white", fontSize: 13, padding: "6px 10px" }}
                          placeholder="Amount (CAD)"
                        />
                        <select
                          value={editFields.category}
                          onChange={e => setEditFields(p => ({ ...p, category: e.target.value }))}
                          style={{ flex: 1, background: "#0d1020", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 8, color: "white", fontSize: 13, padding: "6px 10px" }}
                        >
                          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <PillBtn small accent onClick={saveEdit}>Save</PillBtn>
                        <PillBtn small onClick={() => setEditingTx(null)}>Cancel</PillBtn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{cat?.emoji || "📦"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{tx.date} · {fmt(tx.amount)}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEdit(tx)} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(139,92,246,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Pencil style={{ width: 13, height: 13, color: "#a78bfa" }}/>
                        </button>
                        <button onClick={() => deleteTx(tx.id)} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Trash2 style={{ width: 13, height: 13, color: "#f87171" }}/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
