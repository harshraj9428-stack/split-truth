const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const backupPath = path.join(srcDir, 'App_backup.jsx');
const content = fs.readFileSync(backupPath, 'utf8');

// 1. Extract styles.js
const stylesMatch = content.match(/const COLORS = \{[\s\S]*$/);
if (stylesMatch) {
  const stylesCode = stylesMatch[0].replace('const styles = {', 'export const styles = {').replace('const COLORS = {', 'export const COLORS = {');
  fs.writeFileSync(path.join(srcDir, 'styles.js'), stylesCode);
}

// 2. Extract Modals
const modals = [
  'AddGroupModal',
  'AddMemberModal',
  'RemoveMemberModal',
  'AddExpenseModal',
  'SettleUpModal',
  'ShareSummaryModal',
  'Modal'
];

modals.forEach(modalName => {
  const regex = new RegExp(`function ${modalName}\\(.*?\\) \\{[\\s\\S]*?\\n\\}`);
  const match = content.match(regex);
  if (match) {
    let modalCode = `import React, { useState, useMemo } from 'react';\n`;
    modalCode += `import { X, Trash2, Check, Copy } from 'lucide-react';\n`;
    modalCode += `import { styles, COLORS } from '../../styles';\n`;
    if (modalName !== 'Modal') {
      modalCode += `import Modal from './Modal';\n`;
    }
    // Hardcode CATEGORIES for AddExpenseModal just in case
    if (modalName === 'AddExpenseModal') {
      modalCode += `\nconst CATEGORIES = [\n  { id: "general", label: "General", icon: "🏷️", color: "#8A93A3" },\n  { id: "food", label: "Food & Dining", icon: "🍕", color: "#FF6B6B" },\n  { id: "travel", label: "Fuel & Travel", icon: "⛽", color: "#4D96FF" },\n  { id: "stay", label: "Rent & Stay", icon: "🏠", color: "#6BCB77" },\n  { id: "groceries", label: "Groceries", icon: "🛒", color: "#FFD93D" },\n  { id: "fun", label: "Entertainment", icon: "🍿", color: "#9B51E0" },\n];\n`;
    }

    modalCode += `\nexport default ${match[0]}\n`;
    fs.writeFileSync(path.join(srcDir, 'components', 'modals', `${modalName}.jsx`), modalCode);
  }
});

// 3. Extract useSplitTruthState.js
const stateLogicStart = content.indexOf('const uid = () =>');
const stateLogicEnd = content.indexOf('export default function SplitTruth() {');
if (stateLogicStart > -1 && stateLogicEnd > -1) {
  let stateLogic = content.substring(stateLogicStart, stateLogicEnd);
  
  // Also need to get the logic inside SplitTruth component
  const componentStart = content.indexOf('export default function SplitTruth() {');
  const returnStart = content.indexOf('return (', componentStart);
  let componentLogic = content.substring(componentStart + 'export default function SplitTruth() {'.length, returnStart);

  // Clean up component logic to remove modal states, search, filter
  let useHookCode = `import { useState, useEffect, useMemo, useCallback } from 'react';\n\n`;
  useHookCode += `const STORAGE_KEY = "splittruth-state-v1";\n`;
  
  useHookCode += stateLogic;
  
  useHookCode += `\nexport function useSplitTruthState() {\n`;
  
  // Extract only state and functions from componentLogic
  const lines = componentLogic.split('\\n');
  const hookLines = lines.filter(line => 
    !line.includes('showAddGroup') && 
    !line.includes('showAddMember') &&
    !line.includes('showRemoveMember') &&
    !line.includes('showSettleUp') &&
    !line.includes('showShareModal') &&
    !line.includes('showTrustHelp') &&
    !line.includes('showAddExpense') &&
    !line.includes('searchQuery') &&
    !line.includes('selectedCatFilter') &&
    !line.includes('// Modals') &&
    !line.includes('// Filters & Search')
  );
  useHookCode += hookLines.join('\\n');
  
  useHookCode += `\n  return {\n    state,\n    loading,\n    activeGroupId,\n    setActiveGroupId,\n    currency,\n    activeGroup,\n    groupExpenses,\n    stats,\n    simplifiedDebts,\n    addGroup,\n    removeGroup,\n    addMember,\n    removeMember,\n    addExpense,\n    removeExpense,\n    settlePairwiseDebt,\n    toggleSettle,\n    resetAllData,\n    exportCSV,\n  };\n}\n`;

  fs.writeFileSync(path.join(srcDir, 'hooks', 'useSplitTruthState.js'), useHookCode);
}

// 4. Rewrite App.jsx
let newApp = `import React, { useState, useMemo } from "react";\n`;
newApp += `import { Plus, Receipt, Users, X, TrendingDown, TrendingUp, Stamp, Check, AlertTriangle, Trash2, UserMinus, RotateCcw, Share2, Download, Search, Filter, ArrowRight, HelpCircle, Copy, DollarSign } from "lucide-react";\n`;
newApp += `import { styles, COLORS } from "./styles";\n`;
newApp += `import { useSplitTruthState } from "./hooks/useSplitTruthState";\n`;
newApp += `import AddGroupModal from "./components/modals/AddGroupModal";\n`;
newApp += `import AddMemberModal from "./components/modals/AddMemberModal";\n`;
newApp += `import RemoveMemberModal from "./components/modals/RemoveMemberModal";\n`;
newApp += `import AddExpenseModal from "./components/modals/AddExpenseModal";\n`;
newApp += `import SettleUpModal from "./components/modals/SettleUpModal";\n`;
newApp += `import ShareSummaryModal from "./components/modals/ShareSummaryModal";\n\n`;

const categoriesCode = `const CATEGORIES = [\n  { id: "general", label: "General", icon: "🏷️", color: "#8A93A3" },\n  { id: "food", label: "Food & Dining", icon: "🍕", color: "#FF6B6B" },\n  { id: "travel", label: "Fuel & Travel", icon: "⛽", color: "#4D96FF" },\n  { id: "stay", label: "Rent & Stay", icon: "🏠", color: "#6BCB77" },\n  { id: "groceries", label: "Groceries", icon: "🛒", color: "#FFD93D" },\n  { id: "fun", label: "Entertainment", icon: "🍿", color: "#9B51E0" },\n];\n\n`;
newApp += categoriesCode;

newApp += `export default function SplitTruth() {\n`;
newApp += `  const { state, loading, activeGroupId, setActiveGroupId, currency, activeGroup, groupExpenses, stats, simplifiedDebts, addGroup, removeGroup, addMember, removeMember, addExpense, removeExpense, settlePairwiseDebt, toggleSettle, resetAllData, exportCSV } = useSplitTruthState();\n\n`;
newApp += `  const [showAddExpense, setShowAddExpense] = useState(false);\n`;
newApp += `  const [showAddMember, setShowAddMember] = useState(false);\n`;
newApp += `  const [showAddGroup, setShowAddGroup] = useState(false);\n`;
newApp += `  const [showRemoveMember, setShowRemoveMember] = useState(false);\n`;
newApp += `  const [showSettleUp, setShowSettleUp] = useState(false);\n`;
newApp += `  const [showShareModal, setShowShareModal] = useState(false);\n`;
newApp += `  const [showTrustHelp, setShowTrustHelp] = useState(false);\n`;
newApp += `  const [searchQuery, setSearchQuery] = useState("");\n`;
newApp += `  const [selectedCatFilter, setSelectedCatFilter] = useState("all");\n\n`;

// Copy the useMemo for filteredExpenses and totalPot
const appStart = content.indexOf('const filteredExpenses = useMemo(() => {');
const appEnd = content.indexOf('// ---------------- Modal Components ----------------');
if (appStart > -1 && appEnd > -1) {
  let appLogic = content.substring(appStart, appEnd);
  newApp += appLogic;
}
newApp += `\n}\n`;

fs.writeFileSync(path.join(srcDir, 'App.jsx'), newApp);
console.log("DONE");
