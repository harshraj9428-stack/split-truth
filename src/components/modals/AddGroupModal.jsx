import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Copy } from 'lucide-react';
import { styles, COLORS } from '../../styles';
import Modal from './Modal';

export default function AddGroupModal({ onClose, onSubmit }) {
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
