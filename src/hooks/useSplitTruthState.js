import { useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEY = "splittruth-state-v1";
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


export function useSplitTruthState() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState(null);



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


  return {
    state,
    loading,
    activeGroupId,
    setActiveGroupId,
    currency,
    setCurrency,
    activeGroup,
    groupExpenses,
    stats,
    simplifiedDebts,
    addGroup,
    removeGroup,
    addMember,
    removeMember,
    addExpense,
    removeExpense,
    settlePairwiseDebt,
    toggleSettle,
    resetAllData,
    exportCSV,
  };
}
