import React, { useState, useMemo } from "react";
import { Plus, Receipt, Users, X, TrendingDown, TrendingUp, Stamp, Check, AlertTriangle, Trash2, UserMinus, RotateCcw, Share2, Download, Search, Filter, ArrowRight, HelpCircle, Copy, DollarSign } from "lucide-react";
import { styles, COLORS } from "./styles";
import { useSplitTruthState } from "./hooks/useSplitTruthState";
import AddGroupModal from "./components/modals/AddGroupModal";
import AddMemberModal from "./components/modals/AddMemberModal";
import RemoveMemberModal from "./components/modals/RemoveMemberModal";
import AddExpenseModal from "./components/modals/AddExpenseModal";
import SettleUpModal from "./components/modals/SettleUpModal";
import ShareSummaryModal from "./components/modals/ShareSummaryModal";

const CATEGORIES = [
  { id: "general", label: "General", icon: "🏷️", color: "#8A93A3" },
  { id: "food", label: "Food & Dining", icon: "🍕", color: "#FF6B6B" },
  { id: "travel", label: "Fuel & Travel", icon: "⛽", color: "#4D96FF" },
  { id: "stay", label: "Rent & Stay", icon: "🏠", color: "#6BCB77" },
  { id: "groceries", label: "Groceries", icon: "🛒", color: "#FFD93D" },
  { id: "fun", label: "Entertainment", icon: "🍿", color: "#9B51E0" },
];

const CURRENCIES = ["₹", "$", "€", "£", "A$"];
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');`;

export default function SplitTruth() {
  const { state, loading, activeGroupId, setActiveGroupId, currency, setCurrency, activeGroup, groupExpenses, stats, simplifiedDebts, addGroup, removeGroup, addMember, removeMember, addExpense, removeExpense, settlePairwiseDebt, toggleSettle, resetAllData, exportCSV } = useSplitTruthState();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTrustHelp, setShowTrustHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");

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

  const totalPot = groupExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

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
        <AddGroupModal onClose={() => setShowAddGroup(false)} onSubmit={(name) => { addGroup(name); setShowAddGroup(false); }} />
      )}
      {showAddMember && activeGroup && (
        <AddMemberModal onClose={() => setShowAddMember(false)} onSubmit={(name) => { addMember(name); setShowAddMember(false); }} />
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
          onSubmit={(payload) => { addExpense(payload); setShowAddExpense(false); }}
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

