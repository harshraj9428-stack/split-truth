import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Copy } from 'lucide-react';
import { styles, COLORS } from '../../styles';
import Modal from './Modal';

export default function RemoveMemberModal({ members, onClose, onRemove }) {
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
