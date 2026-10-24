import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Copy } from 'lucide-react';
import { styles, COLORS } from '../../styles';
import Modal from './Modal';

export default function AddMemberModal({ onClose, onSubmit }) {
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
