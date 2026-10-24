import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Copy } from 'lucide-react';
import { styles, COLORS } from '../../styles';
import Modal from './Modal';

const CATEGORIES = [
  { id: "general", label: "General", icon: "🏷️", color: "#8A93A3" },
  { id: "food", label: "Food & Dining", icon: "🍕", color: "#FF6B6B" },
  { id: "travel", label: "Fuel & Travel", icon: "⛽", color: "#4D96FF" },
  { id: "stay", label: "Rent & Stay", icon: "🏠", color: "#6BCB77" },
  { id: "groceries", label: "Groceries", icon: "🛒", color: "#FFD93D" },
  { id: "fun", label: "Entertainment", icon: "🍿", color: "#9B51E0" },
];

export default function AddExpenseModal({ currency, members, onClose, onSubmit }) {
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
