import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Receipt,
  Users,
  X,
  TrendingDown,
  TrendingUp,
  Stamp,
  Check,
  AlertTriangle,
  Trash2,
  UserMinus,
  RotateCcw,
  Share2,
  Download,
  Search,
  Filter,
  ArrowRight,
  HelpCircle,
  Copy,
  DollarSign
} from "lucide-react";

const STORAGE_KEY = "splittruth-state-v1";
const CURRENCIES = ["₹", "$", "€", "£", "A$"];

const CATEGORIES = [
  { id: "general", label: "General", icon: "🏷️", color: "#8A93A3" },
  { id: "food", label: "Food & Dining", icon: "🍕", color: "#FF6B6B" },
  { id: "travel", label: "Fuel & Travel", icon: "⛽", color: "#4D96FF" },
  { id: "stay", label: "Rent & Stay", icon: "🏠", color: "#6BCB77" },
  { id: "groceries", label: "Groceries", icon: "🛒", color: "#FFD93D" },
  { id: "fun", label: "Entertainment", icon: "🍿", color: "#9B51E0" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultState = () => ({
  currency: "₹",
  groups: [],
  expenses: [],
});

function loadState(setState, setLoading) {
  if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
    window.storage
      .get(STORAGE_KEY, false)
      .then((res) => {
        if (res && res.value) {
          try {
            const parsed = JSON.parse(res.value);
            setState({ currency: "₹", groups: [], expenses: [], ...parsed });
          } catch {
            setState(defaultState());
          }
        } else {
          setState(defaultState());
        }
      })
      .catch(() => setState(defaultState()))
      .finally(() => setLoading(false));
  } else {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ currency: "₹", groups: [], expenses: [], ...parsed });
      } else {
        setState(defaultState());
      }
    } catch (e) {
      setState(defaultState());
    } finally {
      setLoading(false);
    }
  }
}

async function saveState(state) {
  try {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
      await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.error("save failed", e);
  }
}

export default function SplitTruth() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTrustHelp, setShowTrustHelp] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");

  useEffect(() => {
    loadState(setState, setLoading);
  }, []);

  useEffect(() => {
    if (state && !loading) saveState(state);
  }, [state, loading]);

  useEffect(() => {
    if (state && (!activeGroupId || !state.groups.some((g) => g.id === activeGroupId)) && state.groups.length) {
      setActiveGroupId(state.groups[0].id);
    }
  }, [state, activeGroupId]);

  const currency = state?.currency || "₹";

  const activeGroup = useMemo(
    () => state?.groups.find((g) => g.id === activeGroupId) || null,
    [state, activeGroupId]
  );

  const groupExpenses = useMemo(
    () =>
      state && activeGroup
        ? state.expenses
            .filter((e) => e.groupId === activeGroup.id)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [state, activeGroup]
  );

  const filteredExpenses = useMemo(() => {
    return groupExpenses.filter((exp) => {
      const matchesSearch =
        exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (activeGroup?.members.find((m) => m.id === exp.paidBy)?.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesCat = selectedCatFilter === "all" || exp.category === selectedCatFilter;
      return matchesSearch && matchesCat;
    });
  }, [groupExpenses, searchQuery, selectedCatFilter, activeGroup]);

  // ---- Balance & Trust Score calculations ----
  const stats = useMemo(() => {
    if (!activeGroup) return {};
    const map = {};
    activeGroup.members.forEach((m) => {
      map[m.id] = {
        id: m.id,
        name: m.name,
        paidCount: 0,
        involvedCount: 0,
        totalPaid: 0,
        totalShare: 0,
        settledCount: 0,
        unsettledCount: 0,
      };
    });

    groupExpenses.forEach((exp) => {
      if (exp.splitType === "exact" && exp.exactShares) {
        if (map[exp.paidBy]) {
          map[exp.paidBy].paidCount += 1;
          map[exp.paidBy].totalPaid += exp.amount;
        }
        Object.entries(exp.exactShares).forEach(([mid, shareVal]) => {
          if (!map[mid]) return;
          const share = Number(shareVal) || 0;
          map[mid].involvedCount += 1;
          map[mid].totalShare += share;
          if (mid !== exp.paidBy) {
            if (exp.settled?.[mid]) map[mid].settledCount += 1;
            else map[mid].unsettledCount += 1;
          }
        });
      } else {
        const splitCount = exp.splitBetween.length || 1;
        const share = exp.amount / splitCount;
        if (map[exp.paidBy]) {
          map[exp.paidBy].paidCount += 1;
          map[exp.paidBy].totalPaid += exp.amount;
        }
        exp.splitBetween.forEach((mid) => {
          if (!map[mid]) return;
          map[mid].involvedCount += 1;
          map[mid].totalShare += share;
          if (mid !== exp.paidBy) {
            if (exp.settled?.[mid]) map[mid].settledCount += 1;
            else map[mid].unsettledCount += 1;
          }
        });
      }
    });

    Object.values(map).forEach((m) => {
      const balance = m.totalPaid - m.totalShare;
      m.balance = balance;
      const totalDebts = m.unsettledCount + m.settledCount;
      const reliability = totalDebts > 0 ? m.settledCount / totalDebts : 1;
      m.trustScore = Math.round(reliability * 100);
      m.isGhost = m.unsettledCount >= 2 && m.trustScore < 60;
    });

    return map;
  }, [activeGroup, groupExpenses]);

  // Net Debt Minimization algorithm ("Who owes Whom")
  const simplifiedDebts = useMemo(() => {
    if (!activeGroup || !stats) return [];
    const debtors = [];
    const creditors = [];

    Object.values(stats).forEach((s) => {
      const roundedBal = Math.round(s.balance * 100) / 100;
      if (roundedBal < -0.01) {
        debtors.push({ id: s.id, name: s.name, amount: Math.abs(roundedBal) });
      } else if (roundedBal > 0.01) {
        creditors.push({ id: s.id, name: s.name, amount: roundedBal });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settledAmt = Math.min(debtor.amount, creditor.amount);

      if (settledAmt > 0.01) {
        transactions.push({
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: Math.round(settledAmt),
        });
      }

      debtor.amount -= settledAmt;
      creditor.amount -= settledAmt;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return transactions;
  }, [activeGroup, stats]);

  const totalPot = groupExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  function setCurrency(c) {
    setState((prev) => ({ ...prev, currency: c }));
  }

  function toggleSettle(expenseId, memberId) {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? { ...e, settled: { ...e.settled, [memberId]: !e.settled?.[memberId] } }
          : e
      ),
    }));
  }

  function settlePairwiseDebt(fromId, toId) {
    // Mark all expenses where `fromId` owes `toId` as settled
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => {
        if (e.groupId === activeGroupId && e.paidBy === toId && e.splitBetween.includes(fromId)) {
          return { ...e, settled: { ...e.settled, [fromId]: true } };
        }
        return e;
      }),
    }));
  }

  function addGroup(name) {
    if (!name.trim()) return;
    const g = { id: uid(), name: name.trim(), members: [{ id: uid(), name: "You" }] };
    setState((prev) => ({ ...prev, groups: [...prev.groups, g] }));
    setActiveGroupId(g.id);
    setShowAddGroup(false);
  }

  function removeGroup(groupId) {
    if (!window.confirm("Are you sure you want to delete this group and all its expenses?")) return;
    setState((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
      expenses: prev.expenses.filter((e) => e.groupId !== groupId),
    }));
    if (activeGroupId === groupId) {
      const remaining = state?.groups.filter((g) => g.id !== groupId);
      setActiveGroupId(remaining && remaining.length ? remaining[0].id : null);
    }
  }

  function addMember(name) {
    if (!name.trim() || !activeGroup) return;
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === activeGroup.id
          ? { ...g, members: [...g.members, { id: uid(), name: name.trim() }] }
          : g
      ),
    }));
    setShowAddMember(false);
  }

  function removeMember(memberId) {
    if (!activeGroup) return;
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === activeGroup.id
          ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
          : g
      ),
      expenses: prev.expenses
        .filter((e) => !(e.groupId === activeGroup.id && e.paidBy === memberId))
        .map((e) => {
          if (e.groupId !== activeGroup.id) return e;
          const newSplits = e.splitBetween.filter((id) => id !== memberId);
          const newSettled = { ...e.settled };
          delete newSettled[memberId];
          return { ...e, splitBetween: newSplits, settled: newSettled };
        })
        .filter((e) => e.groupId !== activeGroup.id || e.splitBetween.length > 0),
    }));
  }

  function addExpense(payload) {
    setState((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          id: uid(),
          groupId: activeGroup.id,
          createdAt: Date.now(),
          settled: {},
          category: payload.category || "general",
          ...payload,
        },
      ],
    }));
    setShowAddExpense(false);
  }

  function removeExpense(expenseId) {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  }

  function resetAllData() {
    if (window.confirm("Are you sure you want to clear all data and start completely fresh?")) {
      const fresh = defaultState();
      setState(fresh);
      setActiveGroupId(null);
      try {
        if (typeof window !== "undefined" && window.storage && typeof window.storage.remove === "function") {
          window.storage.remove(STORAGE_KEY, false);
        } else if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
          window.storage.set(STORAGE_KEY, JSON.stringify(fresh), false);
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
  }

  function exportCSV() {
    if (!activeGroup || !groupExpenses.length) return;
    let csv = "Date,Description,Category,Amount,Paid By,Split Between\n";
    groupExpenses.forEach((exp) => {
      const date = new Date(exp.createdAt).toLocaleDateString();
      const payer = activeGroup.members.find((m) => m.id === exp.paidBy)?.name || "Someone";
      const cat = CATEGORIES.find((c) => c.id === exp.category)?.label || "General";
      const splitNames = exp.splitBetween
        .map((id) => activeGroup.members.find((m) => m.id === id)?.name || "")
        .filter(Boolean)
        .join("; ");

      csv += `"${date}","${exp.description.replace(/"/g, '""')}","${cat}",${exp.amount},"${payer}","${splitNames}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SplitTruth_${activeGroup.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading || !state) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingStamp}>SPLITTRUTH</div>
        <div style={styles.loadingText}>opening the ledger…</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{fontImport}</style>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>
              NO. 00{String(state.groups.length).padStart(1, "0")} — LEDGER
            </div>
            <h1 style={styles.title}>SplitTruth</h1>
            <p style={styles.subtitle}>who actually pays. tracked.</p>
          </div>

          <div style={styles.headerRight}>
            {/* Sleek Currency Switcher */}
            <div style={styles.currencyPillGroup} title="Select Currency">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  style={{
                    ...styles.currencyPill,
                    ...(currency === c ? styles.currencyPillActive : {}),
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <button style={styles.clearBtn} onClick={resetAllData} title="Clear all data and start clean">
              <RotateCcw size={13} /> Reset
            </button>
            <Receipt size={28} strokeWidth={1.5} color={COLORS.paper} style={{ opacity: 0.85 }} />
          </div>
        </header>

        {/* Group tabs */}
        <div style={styles.groupTabs}>
          {state.groups.map((g) => (
            <div
              key={g.id}
              style={{
                ...styles.groupTabWrapper,
                ...(g.id === activeGroupId ? styles.groupTabActiveWrapper : {}),
              }}
            >
              <button
                onClick={() => setActiveGroupId(g.id)}
                style={{
                  ...styles.groupTab,
                  ...(g.id === activeGroupId ? styles.groupTabActive : {}),
                }}
              >
                {g.name}
              </button>
              {g.id === activeGroupId && (
                <button
                  style={styles.groupDeleteBtn}
                  onClick={() => removeGroup(g.id)}
                  title="Delete group"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button style={styles.groupTabAdd} onClick={() => setShowAddGroup(true)} aria-label="Add group">
            <Plus size={16} />
          </button>
        </div>

        {state.groups.length === 0 ? (
          <div style={styles.noGroupsCard}>
            <Receipt size={44} color={COLORS.paperDim} style={{ marginBottom: 12 }} />
            <h3 style={styles.noGroupsTitle}>No Groups Created Yet</h3>
            <p style={styles.noGroupsSub}>Start fresh by creating your first group to track shared expenses.</p>
            <button style={styles.primaryBtn} onClick={() => setShowAddGroup(true)}>
              <Plus size={16} /> Create New Group
            </button>
          </div>
        ) : activeGroup ? (
          <>
            {/* Pot summary & Quick Actions */}
            <div style={styles.potCard}>
              <div>
                <div style={styles.potLabel}>total logged</div>
                <div style={styles.potAmount}>
                  {currency}
                  {totalPot.toLocaleString()}
                </div>
              </div>

              <div style={styles.potActions}>
                <button style={styles.iconBtn} onClick={() => setShowShareModal(true)} title="Copy WhatsApp Summary">
                  <Share2 size={14} /> Share
                </button>
                {groupExpenses.length > 0 && (
                  <button style={styles.iconBtn} onClick={exportCSV} title="Export CSV Report">
                    <Download size={14} /> Export CSV
                  </button>
                )}
                {simplifiedDebts.length > 0 && (
                  <button style={styles.settleBtn} onClick={() => setShowSettleUp(true)}>
                    <ArrowRight size={14} /> Settle Up ({simplifiedDebts.length})
                  </button>
                )}
                <button style={styles.iconBtn} onClick={() => setShowAddMember(true)}>
                  <Users size={14} /> Add member
                </button>
                {activeGroup.members.length > 0 && (
                  <button style={styles.iconBtnDanger} onClick={() => setShowRemoveMember(true)}>
                    <UserMinus size={14} /> Remove member
                  </button>
                )}
                <button
                  style={{
                    ...styles.primaryBtn,
                    opacity: activeGroup.members.length === 0 ? 0.4 : 1,
                  }}
                  disabled={activeGroup.members.length === 0}
                  onClick={() => setShowAddExpense(true)}
                >
                  <Plus size={15} /> Log expense
                </button>
              </div>
            </div>

            {/* Members & Reality Check */}
            <section style={styles.section}>
              <div style={styles.sectionHeadRow}>
                <Stamp size={16} color={COLORS.paper} />
                <h2 style={styles.sectionTitle}>Reality Check & Members</h2>
                <button
                  style={styles.helpBtn}
                  onClick={() => setShowTrustHelp(!showTrustHelp)}
                  title="What is Trust Score?"
                >
                  <HelpCircle size={13} />
                </button>
              </div>

              {showTrustHelp && (
                <div style={styles.trustHelpBox}>
                  <strong>💡 How SplitTruth Calculates Trust Score:</strong>
                  <p>
                    Trust Score is calculated based on how reliably a member settles pending shares.
                    A score below 60% with multiple pending debts tags a member as a <em>ghost payer</em>.
                  </p>
                </div>
              )}

              {activeGroup.members.length === 0 ? (
                <div style={styles.emptyState}>
                  No members in this group. Click "Add member" above to get started.
                </div>
              ) : (
                <div style={styles.trustGrid}>
                  {activeGroup.members.map((m) => {
                    const s = stats[m.id] || {
                      trustScore: 100,
                      isGhost: false,
                      balance: 0,
                      paidCount: 0,
                      unsettledCount: 0,
                    };
                    return (
                      <div key={m.id} style={styles.trustCard}>
                        <div style={styles.trustTop}>
                          <span style={styles.trustName}>{m.name}</span>
                          <button
                            style={styles.memberDeleteBtn}
                            onClick={() => removeMember(m.id)}
                            title={`Remove ${m.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div style={styles.trustStatusRow}>
                          {s.isGhost ? (
                            <span style={styles.ghostBadge}>
                              <AlertTriangle size={11} /> ghost payer
                            </span>
                          ) : (
                            <span style={styles.reliableBadge}>
                              <Check size={11} /> reliable
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            ...styles.stamp,
                            borderColor: s.isGhost ? COLORS.flag : COLORS.trust,
                            color: s.isGhost ? COLORS.flag : COLORS.trust,
                          }}
                        >
                          {s.trustScore}%
                        </div>

                        <div style={styles.trustMeta}>
                          <span>
                            {s.balance >= 0 ? (
                              <TrendingUp size={12} color={COLORS.trust} />
                            ) : (
                              <TrendingDown size={12} color={COLORS.flag} />
                            )}{" "}
                            {s.balance >= 0
                              ? `is owed ${currency}${s.balance.toFixed(0)}`
                              : `owes ${currency}${Math.abs(s.balance).toFixed(0)}`}
                          </span>
                          <span style={styles.trustSub}>
                            paid {s.paidCount}× · pending {s.unsettledCount}×
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Ledger section with Search & Category Filters */}
            <section style={styles.section}>
              <div style={styles.sectionHeadRow}>
                <Receipt size={16} color={COLORS.paper} />
                <h2 style={styles.sectionTitle}>Ledger</h2>
              </div>

              {/* Filter controls */}
              <div style={styles.filterBar}>
                <div style={styles.searchBox}>
                  <Search size={14} color={COLORS.slate} />
                  <input
                    style={styles.searchInput}
                    placeholder="Search expenses or payers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button style={styles.clearSearchBtn} onClick={() => setSearchQuery("")}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div style={styles.catFilterRow}>
                  <Filter size={13} color={COLORS.slate} />
                  <button
                    style={{
                      ...styles.catFilterChip,
                      ...(selectedCatFilter === "all" ? styles.catFilterChipActive : {}),
                    }}
                    onClick={() => setSelectedCatFilter("all")}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      style={{
                        ...styles.catFilterChip,
                        ...(selectedCatFilter === cat.id ? styles.catFilterChipActive : {}),
                      }}
                      onClick={() => setSelectedCatFilter(cat.id)}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {groupExpenses.length === 0 ? (
                <div style={styles.emptyState}>
                  No expenses logged yet. Add the first one — the ledger starts here.
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div style={styles.emptyState}>
                  No expenses match your search filter.
                </div>
              ) : (
                <div style={styles.tape}>
                  {filteredExpenses.map((exp) => {
                    const payer = activeGroup.members.find((m) => m.id === exp.paidBy);
                    const cat = CATEGORIES.find((c) => c.id === exp.category) || CATEGORIES[0];
                    const splitCount = exp.splitBetween.length || 1;
                    const share = exp.amount / splitCount;

                    return (
                      <div key={exp.id} style={styles.tapeRow}>
                        <div style={styles.tapeMain}>
                          <div>
                            <div style={styles.tapeDescRow}>
                              <span style={{ ...styles.catTag, background: cat.color }}>
                                {cat.icon} {cat.label}
                              </span>
                              <span style={styles.tapeDesc}>{exp.description}</span>
                            </div>
                            <div style={styles.tapeMeta}>
                              {payer?.name || "Someone"} paid · split {splitCount} ways
                            </div>
                          </div>
                          <div style={styles.tapeAmountRow}>
                            <div style={styles.tapeAmount}>
                              {currency}
                              {Number(exp.amount).toFixed(0)}
                            </div>
                            <button
                              style={styles.expenseDeleteBtn}
                              onClick={() => removeExpense(exp.id)}
                              title="Delete expense"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div style={styles.tapeSplits}>
                          {exp.splitBetween
                            .filter((mid) => mid !== exp.paidBy)
                            .map((mid) => {
                              const mem = activeGroup.members.find((m) => m.id === mid);
                              const isSettled = !!exp.settled?.[mid];
                              const memberShare =
                                exp.splitType === "exact" && exp.exactShares?.[mid]
                                  ? Number(exp.exactShares[mid])
                                  : share;

                              return (
                                <button
                                  key={mid}
                                  onClick={() => toggleSettle(exp.id, mid)}
                                  style={{
                                    ...styles.splitChip,
                                    ...(isSettled ? styles.splitChipDone : {}),
                                  }}
                                >
                                  {isSettled ? <Check size={11} /> : null}
                                  {mem?.name || "Member"} owes {currency}
                                  {memberShare.toFixed(0)}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      {/* Modals */}
      {showAddGroup && (
        <AddGroupModal onClose={() => setShowAddGroup(false)} onSubmit={addGroup} />
      )}
      {showAddMember && activeGroup && (
        <AddMemberModal onClose={() => setShowAddMember(false)} onSubmit={addMember} />
      )}
      {showRemoveMember && activeGroup && (
        <RemoveMemberModal
          members={activeGroup.members}
          onClose={() => setShowRemoveMember(false)}
          onRemove={(id) => {
            removeMember(id);
            if (activeGroup.members.length <= 1) setShowRemoveMember(false);
          }}
        />
      )}
      {showAddExpense && activeGroup && (
        <AddExpenseModal
          currency={currency}
          members={activeGroup.members}
          onClose={() => setShowAddExpense(false)}
          onSubmit={addExpense}
        />
      )}
      {showSettleUp && activeGroup && (
        <SettleUpModal
          currency={currency}
          debts={simplifiedDebts}
          onClose={() => setShowSettleUp(false)}
          onSettlePair={settlePairwiseDebt}
        />
      )}
      {showShareModal && activeGroup && (
        <ShareSummaryModal
          currency={currency}
          groupName={activeGroup.name}
          totalPot={totalPot}
          debts={simplifiedDebts}
          stats={stats}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

// ---------------- Modal Components ----------------

function AddGroupModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  return (
    <Modal onClose={onClose} title="New group">
      <input
        autoFocus
        style={styles.input}
        placeholder="e.g. Trip to Goa"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit(name)}
      />
      <button style={styles.primaryBtnFull} onClick={() => onSubmit(name)}>
        Create group
      </button>
    </Modal>
  );
}

function AddMemberModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  return (
    <Modal onClose={onClose} title="Add member">
      <input
        autoFocus
        style={styles.input}
        placeholder="Member name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit(name)}
      />
      <button style={styles.primaryBtnFull} onClick={() => onSubmit(name)}>
        Add Member
      </button>
    </Modal>
  );
}

function RemoveMemberModal({ members, onClose, onRemove }) {
  return (
    <Modal onClose={onClose} title="Remove member">
      <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 12 }}>
        Select a member to remove them from this group:
      </p>
      <div style={styles.removeList}>
        {members.map((m) => (
          <div key={m.id} style={styles.removeRow}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
            <button style={styles.dangerBtnSmall} onClick={() => onRemove(m.id)}>
              <Trash2 size={13} /> Remove
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function AddExpenseModal({ currency, members, onClose, onSubmit }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(members[0]?.id || "");
  const [splitBetween, setSplitBetween] = useState(members.map((m) => m.id));
  const [category, setCategory] = useState("general");
  const [splitType, setSplitType] = useState("equal"); // 'equal' | 'exact'
  const [exactShares, setExactShares] = useState({});

  const toggleMember = (id) => {
    setSplitBetween((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExactShareChange = (id, val) => {
    setExactShares((prev) => ({ ...prev, [id]: val }));
  };

  const exactSum = Object.values(exactShares).reduce((s, v) => s + (Number(v) || 0), 0);
  const isExactValid = splitType === "equal" || Math.abs(exactSum - Number(amount)) < 0.1;
  const canSubmit =
    description.trim() && Number(amount) > 0 && paidBy && splitBetween.length > 0 && isExactValid;

  return (
    <Modal onClose={onClose} title="Log an expense">
      <input
        autoFocus
        style={styles.input}
        placeholder="What was it for? (e.g. Dinner)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        style={styles.input}
        placeholder={`Amount (${currency})`}
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div style={styles.fieldLabel}>Category</div>
      <div style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            style={{
              ...styles.pickChip,
              ...(category === cat.id ? styles.pickChipActive : {}),
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div style={styles.fieldLabel}>Paid by</div>
      <div style={styles.chipRow}>
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setPaidBy(m.id)}
            style={{ ...styles.pickChip, ...(paidBy === m.id ? styles.pickChipActive : {}) }}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Split Mode Selector */}
      <div style={styles.fieldLabel}>Split Mode</div>
      <div style={styles.tabToggleRow}>
        <button
          type="button"
          style={{ ...styles.tabToggleBtn, ...(splitType === "equal" ? styles.tabToggleActive : {}) }}
          onClick={() => setSplitType("equal")}
        >
          Equal
        </button>
        <button
          type="button"
          style={{ ...styles.tabToggleBtn, ...(splitType === "exact" ? styles.tabToggleActive : {}) }}
          onClick={() => setSplitType("exact")}
        >
          Exact Amounts
        </button>
      </div>

      {splitType === "equal" ? (
        <>
          <div style={styles.fieldLabel}>Split between</div>
          <div style={styles.chipRow}>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                style={{
                  ...styles.pickChip,
                  ...(splitBetween.includes(m.id) ? styles.pickChipActive : {}),
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={styles.exactList}>
          <div style={styles.fieldLabel}>Enter individual shares ({currency}):</div>
          {members.map((m) => (
            <div key={m.id} style={styles.exactRow}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
              <input
                style={styles.exactInput}
                type="number"
                placeholder="0"
                value={exactShares[m.id] || ""}
                onChange={(e) => handleExactShareChange(m.id, e.target.value)}
              />
            </div>
          ))}
          {amount && !isExactValid && (
            <div style={styles.errorText}>
              Sum of shares ({currency}{exactSum}) must equal total amount ({currency}{amount})
            </div>
          )}
        </div>
      )}

      <button
        style={{ ...styles.primaryBtnFull, opacity: canSubmit ? 1 : 0.4 }}
        disabled={!canSubmit}
        onClick={() =>
          canSubmit &&
          onSubmit({
            description: description.trim(),
            amount: Number(amount),
            paidBy,
            splitBetween: splitType === "equal" ? splitBetween : members.map((m) => m.id),
            category,
            splitType,
            exactShares,
          })
        }
      >
        Add to ledger
      </button>
    </Modal>
  );
}

function SettleUpModal({ currency, debts, onClose, onSettlePair }) {
  return (
    <Modal onClose={onClose} title="Settle Up Simplified Debts">
      <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 12 }}>
        SplitTruth automatically simplifies debts across all group members:
      </p>

      {debts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: COLORS.trust, fontWeight: 600 }}>
          🎉 All debts in this group are fully settled!
        </div>
      ) : (
        <div style={styles.settleList}>
          {debts.map((d, i) => (
            <div key={i} style={styles.settleCard}>
              <div style={styles.settleInfo}>
                <span style={{ fontWeight: 600, color: COLORS.flag }}>{d.fromName}</span>
                <span style={{ fontSize: 12, color: COLORS.slate }}>owes</span>
                <span style={{ fontWeight: 600, color: COLORS.trust }}>{d.toName}</span>
              </div>
              <div style={styles.settleRight}>
                <span style={styles.settleAmount}>
                  {currency}
                  {d.amount}
                </span>
                <button
                  style={styles.settlePairBtn}
                  onClick={() => {
                    onSettlePair(d.fromId, d.toId);
                  }}
                >
                  Mark Settled
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ShareSummaryModal({ currency, groupName, totalPot, debts, stats, onClose }) {
  const [copied, setCopied] = useState(false);

  const formattedText = useMemo(() => {
    let txt = `📊 SplitTruth Summary: ${groupName}\n`;
    txt += `------------------------------------\n`;
    txt += `💰 Total Logged: ${currency}${totalPot.toLocaleString()}\n\n`;

    txt += `👥 Net Settlements Needed:\n`;
    if (debts.length === 0) {
      txt += `✨ All group members are settled up!\n`;
    } else {
      debts.forEach((d) => {
        txt += `• ${d.fromName} owes ${d.toName}: ${currency}${d.amount}\n`;
      });
    }

    txt += `\nTracked live on SplitTruth`;
    return txt;
  }, [groupName, currency, totalPot, debts]);

  function copyToClipboard() {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Modal onClose={onClose} title="Share Group Summary">
      <p style={{ fontSize: 13, color: COLORS.slate, marginBottom: 8 }}>
        Copy and paste this clean summary into your WhatsApp or Telegram group chat:
      </p>

      <textarea style={styles.summaryTextarea} readOnly value={formattedText} />

      <button style={styles.primaryBtnFull} onClick={copyToClipboard}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied to Clipboard!" : "Copy Summary Text"}
      </button>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ---------------- Design Tokens & Styles ----------------
const COLORS = {
  ink: "#14171A",
  inkSoft: "#20242A",
  paper: "#EDEAE0",
  paperDim: "#D8D3C4",
  flag: "#FF5A4E",
  trust: "#B8FF3D",
  slate: "#8A93A3",
};

const fontImport = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');`;

const styles = {
  app: {
    minHeight: "100vh",
    background: COLORS.ink,
    fontFamily: "'Inter', sans-serif",
    color: COLORS.paper,
    padding: "0",
  },
  loadingWrap: {
    minHeight: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: COLORS.ink,
    color: COLORS.paper,
    gap: 8,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  loadingStamp: { fontSize: 22, letterSpacing: 4, fontWeight: 700 },
  loadingText: { fontSize: 12, color: COLORS.slate },
  container: { maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottom: `1px solid ${COLORS.inkSoft}`,
    paddingBottom: 18,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  currencyPillGroup: {
    display: "flex",
    background: COLORS.inkSoft,
    padding: "3px",
    borderRadius: 8,
    border: `1px solid ${COLORS.slate}30`,
    gap: 2,
  },
  currencyPill: {
    background: "transparent",
    border: "none",
    color: COLORS.slate,
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 7px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s ease",
  },
  currencyPillActive: {
    background: COLORS.paper,
    color: COLORS.ink,
    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: `1px solid ${COLORS.flag}`,
    color: COLORS.flag,
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    color: COLORS.slate,
    marginBottom: 6,
  },
  title: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 30,
    fontWeight: 700,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: { margin: "4px 0 0", fontSize: 13, color: COLORS.slate },
  groupTabs: { display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" },
  groupTabWrapper: {
    display: "flex",
    alignItems: "center",
    background: "transparent",
    border: `1px solid ${COLORS.inkSoft}`,
    borderRadius: 20,
    paddingRight: 4,
  },
  groupTabActiveWrapper: {
    background: COLORS.paper,
    borderColor: COLORS.paper,
  },
  groupTab: {
    background: "transparent",
    border: "none",
    color: COLORS.slate,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  groupTabActive: {
    color: COLORS.ink,
    fontWeight: 600,
  },
  groupDeleteBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.ink,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
    opacity: 0.6,
  },
  groupTabAdd: {
    background: "transparent",
    border: `1px dashed ${COLORS.slate}`,
    color: COLORS.slate,
    borderRadius: 20,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  noGroupsCard: {
    background: COLORS.inkSoft,
    borderRadius: 16,
    padding: "40px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  noGroupsTitle: {
    fontSize: 18,
    fontFamily: "'IBM Plex Mono', monospace",
    margin: 0,
  },
  noGroupsSub: {
    fontSize: 13,
    color: COLORS.slate,
    maxWidth: 320,
    marginBottom: 12,
  },
  potCard: {
    background: COLORS.paper,
    color: COLORS.ink,
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
    flexWrap: "wrap",
    gap: 14,
  },
  potLabel: { fontSize: 11, letterSpacing: 1.5, color: COLORS.slate, textTransform: "uppercase" },
  potAmount: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700 },
  potActions: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: `1px solid ${COLORS.ink}`,
    color: COLORS.ink,
    borderRadius: 8,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  iconBtnDanger: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: `1px solid ${COLORS.flag}`,
    color: COLORS.flag,
    borderRadius: 8,
    padding: "7px 11px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  settleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: COLORS.trust,
    color: COLORS.ink,
    border: "none",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: COLORS.ink,
    color: COLORS.paper,
    border: "none",
    borderRadius: 8,
    padding: "7px 13px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  section: { marginBottom: 28 },
  sectionHeadRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
    margin: 0,
  },
  helpBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.slate,
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  trustHelpBox: {
    background: COLORS.inkSoft,
    borderLeft: `3px solid ${COLORS.trust}`,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    marginBottom: 14,
    color: COLORS.paper,
  },
  trustGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 },
  trustCard: {
    background: COLORS.inkSoft,
    borderRadius: 12,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  trustTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 },
  trustName: { fontWeight: 600, fontSize: 14 },
  memberDeleteBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.slate,
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
  },
  trustStatusRow: { display: "flex", alignItems: "center", minHeight: 18 },
  ghostBadge: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 10,
    color: COLORS.flag,
    background: "rgba(255,90,78,0.12)",
    padding: "2px 6px",
    borderRadius: 6,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  reliableBadge: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 10,
    color: COLORS.trust,
    background: "rgba(184,255,61,0.1)",
    padding: "2px 6px",
    borderRadius: 6,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  stamp: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 22,
    fontWeight: 700,
    border: "2px solid",
    borderRadius: 8,
    padding: "4px 0",
    textAlign: "center",
    transform: "rotate(-1.5deg)",
  },
  trustMeta: { display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: COLORS.slate },
  trustSub: { fontSize: 11, color: COLORS.slate },
  filterBar: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 14,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: COLORS.inkSoft,
    borderRadius: 8,
    padding: "8px 12px",
    border: `1px solid ${COLORS.slate}30`,
  },
  searchInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: COLORS.paper,
    fontSize: 13,
    width: "100%",
  },
  clearSearchBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.slate,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  catFilterRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  catFilterChip: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 16,
    border: `1px solid ${COLORS.slate}40`,
    background: "transparent",
    color: COLORS.slate,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  catFilterChipActive: {
    background: COLORS.paper,
    color: COLORS.ink,
    borderColor: COLORS.paper,
    fontWeight: 600,
  },
  emptyState: {
    background: COLORS.inkSoft,
    borderRadius: 12,
    padding: 24,
    fontSize: 13,
    color: COLORS.slate,
    textAlign: "center",
  },
  tape: { display: "flex", flexDirection: "column", gap: 10 },
  tapeRow: {
    background: COLORS.paper,
    color: COLORS.ink,
    borderRadius: 10,
    padding: "14px 16px",
  },
  tapeMain: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  tapeDescRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  catTag: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 4,
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
  tapeDesc: { fontWeight: 600, fontSize: 14 },
  tapeMeta: { fontSize: 11.5, color: COLORS.slate, marginTop: 4 },
  tapeAmountRow: { display: "flex", alignItems: "center", gap: 10 },
  tapeAmount: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 16 },
  expenseDeleteBtn: {
    background: "transparent",
    border: "none",
    color: COLORS.slate,
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
  },
  tapeSplits: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },
  splitChip: {
    fontSize: 11,
    padding: "4px 9px",
    borderRadius: 20,
    border: `1px solid ${COLORS.paperDim}`,
    background: "transparent",
    color: COLORS.ink,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  splitChipDone: {
    background: COLORS.ink,
    color: COLORS.trust,
    borderColor: COLORS.ink,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 20,
  },
  modalCard: {
    background: COLORS.paper,
    color: COLORS.ink,
    borderRadius: 14,
    width: "100%",
    maxWidth: 380,
    padding: 20,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTitle: { margin: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 15 },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: COLORS.ink,
    padding: 4,
  },
  modalBody: { display: "flex", flexDirection: "column", gap: 10 },
  removeList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" },
  removeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#fff",
    borderRadius: 8,
    border: `1px solid ${COLORS.paperDim}`,
  },
  dangerBtnSmall: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: COLORS.flag,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  input: {
    border: `1px solid ${COLORS.paperDim}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    background: "#fff",
    color: COLORS.ink,
    outline: "none",
  },
  fieldLabel: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: COLORS.slate, marginTop: 4 },
  chipRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  pickChip: {
    fontSize: 12,
    padding: "6px 11px",
    borderRadius: 20,
    border: `1px solid ${COLORS.paperDim}`,
    background: "transparent",
    color: COLORS.ink,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  pickChipActive: { background: COLORS.ink, color: COLORS.paper, borderColor: COLORS.ink },
  tabToggleRow: { display: "flex", gap: 6, background: COLORS.paperDim, padding: 3, borderRadius: 8 },
  tabToggleBtn: {
    flex: 1,
    padding: "6px 0",
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  tabToggleActive: { background: COLORS.ink, color: COLORS.paper, fontWeight: 600 },
  exactList: { display: "flex", flexDirection: "column", gap: 6 },
  exactRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  exactInput: {
    width: 80,
    padding: "6px 8px",
    borderRadius: 6,
    border: `1px solid ${COLORS.paperDim}`,
    fontSize: 13,
    outline: "none",
  },
  errorText: { color: COLORS.flag, fontSize: 11, marginTop: 4 },
  settleList: { display: "flex", flexDirection: "column", gap: 8 },
  settleCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    borderRadius: 8,
    padding: "10px 12px",
    border: `1px solid ${COLORS.paperDim}`,
  },
  settleInfo: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  settleRight: { display: "flex", alignItems: "center", gap: 10 },
  settleAmount: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14 },
  settlePairBtn: {
    background: COLORS.trust,
    color: COLORS.ink,
    border: "none",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  summaryTextarea: {
    width: "100%",
    height: 140,
    borderRadius: 8,
    border: `1px solid ${COLORS.paperDim}`,
    padding: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    background: "#fff",
    color: COLORS.ink,
    resize: "none",
    outline: "none",
  },
  primaryBtnFull: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: COLORS.ink,
    color: COLORS.paper,
    border: "none",
    borderRadius: 8,
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 6,
    fontFamily: "'Inter', sans-serif",
  },
};
