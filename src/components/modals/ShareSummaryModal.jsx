import React, { useState, useMemo } from 'react';
import { X, Trash2, Check, Copy } from 'lucide-react';
import { styles, COLORS } from '../../styles';
import Modal from './Modal';

export default function ShareSummaryModal({ currency, groupName, totalPot, debts, stats, onClose }) {
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
