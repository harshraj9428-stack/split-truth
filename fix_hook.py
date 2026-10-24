import sys

with open('d:/SplitTruth-git-ready/src/App_backup.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

hook_lines = []
hook_lines.append("import { useState, useEffect, useMemo, useCallback } from 'react';\n\n")
hook_lines.append('const STORAGE_KEY = "splittruth-state-v1";\n')

# Copy CATEGORIES so it's available for exportCSV
hook_lines.extend(lines[27:36])

# Copy from const uid to the end of saveState (lines 36-90 in backup)
# Let's find 'const uid'
start_idx = next(i for i, l in enumerate(lines) if 'const uid' in l)
end_idx = next(i for i, l in enumerate(lines) if 'export default function SplitTruth' in l)

hook_lines.extend(lines[start_idx:end_idx])

hook_lines.append("\nexport function useSplitTruthState() {\n")

# Now copy the state variables and functions inside SplitTruth
# We need lines from after 'export default function SplitTruth() {'
# up to 'if (loading || !state) {'
# BUT excluding the modals states and filter states

component_start = end_idx + 1
component_end = next(i for i, l in enumerate(lines) if 'if (loading || !state)' in l)

exclude_vars = [
    'showAddExpense', 'showAddMember', 'showAddGroup', 'showRemoveMember',
    'showSettleUp', 'showShareModal', 'showTrustHelp', 'searchQuery', 'selectedCatFilter',
    '// Modals', '// Filters & Search'
]

for i in range(component_start, component_end):
    line = lines[i]
    if not any(v in line for v in exclude_vars):
        hook_lines.append(line)

# Add the return statement
hook_lines.append("""
  return {
    state,
    loading,
    activeGroupId,
    setActiveGroupId,
    currency,
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
""")

with open('d:/SplitTruth-git-ready/src/hooks/useSplitTruthState.js', 'w', encoding='utf-8') as f:
    f.writelines(hook_lines)

print("Fixed useSplitTruthState.js")
