import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Copy } from 'lucide-react';
import { styles, COLORS } from '../../styles';
import Modal from './Modal';

export default function SettleUpModal({ currency, debts, onClose, onSettlePair }) {
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
