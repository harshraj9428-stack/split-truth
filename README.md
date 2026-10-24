# 🧾 SplitTruth

> **Who actually pays. Tracked.**

SplitTruth is a sleek, modern, and reliable expense-splitting web application built with **React** and **Vite**. It helps groups effortlessly track shared expenses, calculate net balances, simplify pairwise debts, monitor member reliability through **Trust Scores**, and share settlement summaries via WhatsApp or CSV exports.

---

## 📸 Overview & Features

### 📁 Multi-Group Management
- Organize expenses across multiple groups (e.g., Trips, House Rent, Parties).
- Easily create groups, add members, or remove members as needed.

### 💸 Flexible Expense Logging
- Log expenses with custom descriptions and category tags:
  - 🍕 Food & Dining
  - ⛽ Fuel & Travel
  - 🏠 Rent & Stay
  - 🛒 Groceries
  - 🍿 Entertainment
  - 🏷️ General
- Support for **Equal Splits** or **Exact Custom Amounts** per member.

### 🎯 Reality Check & Trust Score Engine
- Monitors member settlement reliability in real-time.
- Calculates a dynamic **Trust Score (%)** for each group member.
- Automatically flags members with low settlement scores as **"Ghost Payers"** 👻.

### 🔀 Debt Simplification ("Settle Up")
- Algorithmically reduces complex multi-person balances into the minimum required pair-to-pair transactions.
- Settle individual pairwise debts with a single click.

### 🔤 Multi-Currency Support
- Instant currency toggle supporting:
  - Indian Rupee (`₹`)
  - US Dollar (`$`)
  - Euro (`€`)
  - British Pound (`£`)
  - Australian Dollar (`A$`)

### 📲 Share & Export
- **WhatsApp Summary Generator**: Formats clean, copyable text summaries formatted for quick posting to group chats.
- **CSV Report Export**: Download full ledger records as `.csv` spreadsheets.

### 🔍 Search & Category Filtering
- Real-time search by expense description or payer name.
- One-tap category chips to filter ledger records.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Frontend Framework** | [React 18](https://react.dev/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Typography** | [Space Mono](https://fonts.google.com/specimen/Space+Mono) & [Inter](https://fonts.google.com/specimen/Inter) |
| **Styling** | Custom Design System (CSS-in-JS tokens) |

---

## 📁 Project Structure

```
SplitTruth/
├── src/
│   ├── components/
│   │   └── modals/
│   │       ├── AddExpenseModal.jsx     # Log new expense
│   │       ├── AddGroupModal.jsx       # Create new group
│   │       ├── AddMemberModal.jsx      # Add group member
│   │       ├── Modal.jsx               # Base modal layout
│   │       ├── RemoveMemberModal.jsx   # Remove group member
│   │       ├── SettleUpModal.jsx       # Pairwise debt resolution
│   │       └── ShareSummaryModal.jsx   # WhatsApp summary helper
│   ├── hooks/
│   │   └── useSplitTruthState.js   # Central state management hook
│   ├── App.jsx                     # Core application view
│   ├── index.css                   # Global styles & resets
│   ├── main.jsx                    # Application entry point
│   └── styles.js                   # Design tokens & inline style definitions
├── index.html                      # HTML template
├── package.json                    # Project dependencies & scripts
├── vite.config.js                  # Vite configuration
└── README.md                       # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v16.0 or higher) installed on your system.

### Quick Start

1. **Navigate to project directory**:
   ```bash
   cd SplitTruth-git-ready
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser at the local URL (usually `http://localhost:5173`).

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Launches dev server with Hot Module Replacement (HMR) |
| `npm run build` | Bundles production assets into `dist/` |
| `npm run preview` | Previews the production build locally |

---

## 📄 License

This project is licensed under the MIT License.
