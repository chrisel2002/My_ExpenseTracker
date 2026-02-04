import "../assets/styles/Dashboard.css";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  deleteDoc,
  doc
} from "firebase/firestore";
import { Link } from "react-router-dom";

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function monthLabel(d) {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}
function toDateInputValue(date) {
  // YYYY-MM-DD
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function money(n) {
  return `€${Number(n || 0).toFixed(2)}`;
}
function monthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // e.g. "2026-02"
}

export default function Dashboard() {
  const user = auth.currentUser; // ProtectedRoute should ensure this exists
  const uid = user?.uid;
  const displayName =
  user?.displayName ||
  (user?.email ? user.email.split("@")[0] : "User");

  // month you are viewing
  const [cursorDate, setCursorDate] = useState(new Date());
  const activeMonthKey = useMemo(() => monthKey(cursorDate), [cursorDate]);
  // data from Firestore
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // modals
  const [openCategory, setOpenCategory] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  // --- Category form state
  const [catName, setCatName] = useState("");
  const [catBudget, setCatBudget] = useState("");

  // --- Expense form state (matches your modal design)
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCategoryId, setExpCategoryId] = useState("");
  const [expDate, setExpDate] = useState(toDateInputValue(new Date()));
  const [expNotes, setExpNotes] = useState("");

  // range for current month
  const rangeStart = useMemo(() => startOfMonth(cursorDate), [cursorDate]);
  const rangeEnd = useMemo(() => endOfMonth(cursorDate), [cursorDate]);
  async function handleDeleteExpense(txId) {
  if (!uid) return;
  const ok = window.confirm("Delete this expense?");
  if (!ok) return;

  await deleteDoc(doc(db, "users", uid, "transactions", txId));
}

  // 1) Listen categories (all)
  useEffect(() => {
    if (!uid) return;

    const catsRef = collection(db, "users", uid, "categories");
    const qCats = query(catsRef,where("monthKey", "==", activeMonthKey), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(qCats, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [uid, activeMonthKey]);

  // 2) Listen transactions for the current month
  useEffect(() => {
    if (!uid) return;

    const txRef = collection(db, "users", uid, "transactions");

    // Range query by date (monthly view)
    const qTx = query(
      txRef,
      where("date", ">=", Timestamp.fromDate(rangeStart)),
      where("date", "<=", Timestamp.fromDate(rangeEnd)),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(qTx, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [uid, rangeStart, rangeEnd]);

  // Derived dashboard numbers
  const view = useMemo(() => {
    const totalBudget = categories.reduce((s, c) => s + Number(c.budget || 0), 0);
    const spent = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const remaining = totalBudget - spent;
    const overBudget = remaining < 0;

    // spent per category
    const spentByCategory = new Map();
    for (const t of transactions) {
      const k = t.categoryId || "uncat";
      spentByCategory.set(k, (spentByCategory.get(k) || 0) + Number(t.amount || 0));
    }

    // category cards computed
    const categoryCards = categories.map((c) => {
      const catSpent = spentByCategory.get(c.id) || 0;
      const budget = Number(c.budget || 0);
      const pct = budget > 0 ? Math.round((catSpent / budget) * 100) : 0;
      const over = catSpent > budget && budget > 0;
      return {
        id: c.id,
        name: c.name,
        budget,
        spent: catSpent,
        pct: Math.min(100, pct),
        over,
        overAmount: Math.max(0, catSpent - budget),
      };
    });

    const alerts = categoryCards.filter((x) => x.over).length;

    const recent = transactions.slice(0, 5).map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const date = t.date?.toDate ? t.date.toDate() : new Date();
      return {
        id: t.id,
        description: t.description || "expense",
        category: cat?.name || "uncategorized",
        dateLabel: date.toLocaleString("en-US", { month: "short", day: "2-digit" }),
        amount: -Math.abs(Number(t.amount || 0)),
        avatar: (cat?.name || "u").slice(0, 1).toLowerCase(),
      };
    });

    return {
      label: monthLabel(cursorDate),
      totalBudget,
      spent,
      remaining,
      overBudget,
      alerts,
      categoriesCount: categories.length,
      txCount: transactions.length,
      categoryCards,
      recent,
    };
  }, [categories, transactions, cursorDate]);

  // Month navigation
  const onPrev = () => setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const onNext = () => setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Add category -> Firestore
  async function handleAddCategory(e) {
    e.preventDefault();
    if (!uid) return;

    const name = catName.trim();
    const budget = Number(catBudget);

    if (!name) return alert("Enter category name");
    if (Number.isNaN(budget) || budget < 0) return alert("Enter valid budget");

    await addDoc(collection(db, "users", uid, "categories"), {
      name: name.toLowerCase(),
      budget,
      monthKey: activeMonthKey,
      createdAt: serverTimestamp(),
    });

    // reset + close
    setCatName("");
    setCatBudget("");
    setOpenCategory(false);
  }

  // Add expense -> Firestore
  async function handleAddExpense(e) {
    e.preventDefault();
    if (!uid) return;

    const amount = Number(expAmount);
    if (Number.isNaN(amount) || amount <= 0) return alert("Enter valid amount");
    if (!expDesc.trim()) return alert("Enter description");
    if (!expCategoryId) return alert("Select a category");
    if (!expDate) return alert("Select a date");

    // convert YYYY-MM-DD to Date
    const [yyyy, mm, dd] = expDate.split("-").map(Number);
    const jsDate = new Date(yyyy, mm - 1, dd, 12, 0, 0); // noon avoids timezone edge cases

    await addDoc(collection(db, "users", uid, "transactions"), {
      amount,
      description: expDesc.trim(),
      categoryId: expCategoryId,
      date: Timestamp.fromDate(jsDate),
      notes: expNotes.trim(),
      createdAt: serverTimestamp(),
    });

    // reset + close
    setExpAmount("");
    setExpDesc("");
    setExpCategoryId("");
    setExpNotes("");
    setExpDate(toDateInputValue(new Date()));
    setOpenExpense(false);
  }

  return (
    <div className="dash">
      <header className="topnav">
        <div className="brand">
          <div className="brandIcon">
            <WalletSmallIcon />
          </div>
          <div className="brandName">Expense Tracker</div>
        </div>
        {/* tabs right side */}
        <nav className="tabs">
            <div className="welcomeUser">
            Welcome, <span className="welcomeName">{displayName}</span>
        </div>
          <Link to="/dashboard" className="tab tab-active">
            <GridIcon /> Dashboard
          </Link>
          <Link to="/analytics" className="tab">
            <ChartIcon /> Analytics
          </Link>
        </nav>

        <button className="logoutBtn" onClick={() => signOut(auth)}>
          Logout
        </button>
      </header>

      <main className="dash-main">
        <div className="dash-headerRow">
          <div>
            <h1 className="dash-title">Budget Overview</h1>
            <p className="dash-subtitle">Track your spending and stay on target</p>
          </div>

          <div className="dash-monthPicker">
            <button className="iconBtn" onClick={onPrev} aria-label="Previous month">
              ‹
            </button>
            <div className="dash-monthLabel">{view.label}</div>
            <button className="iconBtn" onClick={onNext} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        {/* Stats */}
        <section className="statsGrid">
          <StatCard
            icon={<TargetIcon />}
            label="Total Budget"
            value={money(view.totalBudget)}
            sub={`${view.categoriesCount} categories`}
          />
          <StatCard
            icon={<WalletIcon />}
            label="Spent"
            value={money(view.spent)}
            sub={`${view.txCount} transactions`}
            accent="green"
          />
          <StatCard
            icon={<DownTrendIcon />}
            label="Remaining"
            value={money(Math.abs(view.remaining))}
            sub={view.overBudget ? "Over budget" : "Under budget"}
            accent={view.overBudget ? "red" : "green"}
          />
          <StatCard
            icon={<AlertIcon />}
            label="Alerts"
            value={`${view.alerts}`}
            sub="Categories over budget"
            accent={view.alerts ? "yellow" : "muted"}
          />
        </section>

        {/* Main content */}
        <section className="dash-contentGrid">
          <div className="panel">
            <div className="panel-head">
              <h2>Budget Categories</h2>
              <button className="addBtn" onClick={() => setOpenCategory(true)}>
                <PlusIcon /> Add Category
              </button>
            </div>

            {/* show all category cards */}
            <div style={{ display: "grid", gap: 12 }}>
              {view.categoryCards.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  No categories yet. Click “Add Category”.
                </div>
              ) : (
                view.categoryCards.map((c) => <CategoryCard key={c.id} cat={c} />)
              )}
            </div>
          </div>

          <div className="panel panel-small recentPanel">
            <div className="panel-head">
              <h2>Recent Expenses</h2>
              <button className="addBtn" onClick={() => setOpenExpense(true)}>
                <PlusIcon /> Add Expense
              </button>
            </div>

            <div className="recentList">
              {view.recent.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  No expenses yet for this month.
                </div>
              ) : (
                view.recent.map((r) => (
                  <div className="recentItem" key={r.id}>
                    <div className="recentAvatar">{r.avatar}</div>
                    <div className="recentMid">
                      <div className="recentTitle">{r.description}</div>
                      <div className="recentMeta">
                         {r.dateLabel}
                      </div>
                    </div>
                    <div className="recentRight">
                        <div className="recentAmount">{formatMoney(r.amount)}</div>

                        <button
                             className="deleteBtn"
                             onClick={() => handleDeleteExpense(r.id)}
                             aria-label="Delete expense"
                             title="Delete"
                             type="button"
                        >
                             🗑
                         </button>
                    </div>

                </div>
                ))
              )}
            </div>
          </div>

          <div className="panel panel-wide">
            <div className="panel-head">
              <h2>Spending Breakdown</h2>
            </div>

            {/* simple breakdown: total spent vs budget */}
            <div className="breakdown">
              <Donut
                value={view.spent}
                max={Math.max(view.totalBudget, view.spent, 1)}
                centerTop={money(view.spent)}
                centerBottom={`of ${money(view.totalBudget)}`}
              />

              <div className="breakdownLegend">
                <div className="legendRow">
                  <span className="dot" />
                  <div className="legendName">spent</div>
                  <div className="legendAmount">{money(view.spent)}</div>
                </div>
                <div className="legendBar" />
              </div>
            </div>
          </div>
        </section>

        {/* Floating Add button -> add expense */}
        <button className="fab" aria-label="Add" onClick={() => setOpenExpense(true)}>
          +
        </button>
      </main>

      {openCategory && (
        <ModalShell title="Add Category" onClose={() => setOpenCategory(false)}>
          <form className="modalForm" onSubmit={handleAddCategory}>
            <label className="modalLabel">Category Name</label>
            <input
              className="modalInput"
              placeholder="e.g., grocery"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />

            <label className="modalLabel">Monthly Budget</label>
            <input
              className="modalInput"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={catBudget}
              onChange={(e) => setCatBudget(e.target.value)}
            />

            <button className="modalPrimary" type="submit">
              <span className="modalPlus">+</span>
              Add Category
            </button>
          </form>
        </ModalShell>
      )}

     
      {openExpense && (
        <ModalShell title="Add Expense" onClose={() => setOpenExpense(false)}>
          <form className="modalForm" onSubmit={handleAddExpense}>
            <label className="modalLabel">Amount</label>
            <input
              className="modalInput"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
            />

            <label className="modalLabel">Description</label>
            <input
              className="modalInput"
              placeholder="What did you spend on?"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
            />

            <label className="modalLabel">Category</label>
            <select
              className="modalSelect"
              value={expCategoryId}
              onChange={(e) => setExpCategoryId(e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="modalLabel">Date</label>
            <input
              className="modalInput"
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
            />

            <label className="modalLabel">Notes (optional)</label>
            <textarea
              className="modalTextarea"
              placeholder="Add any notes..."
              value={expNotes}
              onChange={(e) => setExpNotes(e.target.value)}
            />

            <button className="modalPrimary" type="submit">
              <span className="modalPlus">+</span>
              Add Expense
            </button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

/* ---------- UI components ---------- */

function ModalShell({ title, onClose, children }) {
  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">{title}</h3>
          <button className="modalClose" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`statCard ${accent ? `stat-${accent}` : ""}`}>
      <div className="statIcon">{icon}</div>
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
      <div className="statSub">{sub}</div>
    </div>
  );
}

function CategoryCard({ cat }) {
  const pctWidth = cat.budget > 0 ? Math.min(100, (cat.spent / cat.budget) * 100) : 0;

  return (
    <div className="categoryCard">
      <div className="catTop">
        <div className="catIcon">
          <CartIcon />
        </div>
        <div className={`pill ${cat.over ? "pill-red" : "pill-green"}`}>
          {cat.budget > 0 ? `${cat.pct}%` : "—"}
        </div>
      </div>

      <div className="catName">{cat.name}</div>
      <div className="catMeta">
        {money(cat.spent)} of {money(cat.budget)}
      </div>

      <div className="progress">
        <div
          className={`progressFill ${cat.over ? "fill-red" : "fill-green"}`}
          style={{ width: `${pctWidth}%` }}
        />
      </div>

      <div className={`catWarn ${cat.over ? "warn-red" : "warn-green"}`}>
        {cat.over ? `${money(cat.overAmount)} over budget` : "On track"}
      </div>
    </div>
  );
}

/* ---------- donut chart (no libs) ---------- */
function Donut({ value, max, centerTop, centerBottom }) {
  const size = 150;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, value / max);
  const dash = c * ratio;

  return (
    <div className="donutWrap">
      <svg width={size} height={size} className="donut">
        <circle cx={size / 2} cy={size / 2} r={r} className="donutTrack" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="donutValue"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
        />
      </svg>

      <div className="donutCenter">
        <div className="donutTop">{centerTop}</div>
        <div className="donutBottom">{centerBottom}</div>
      </div>
    </div>
  );
}

function formatMoney(n) {
  const abs = Math.abs(n).toFixed(2);
  return `${n < 0 ? "-" : ""}€${abs}`;
}

/* ---------- icons ---------- */
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        fill="currentColor"
      />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 19V5M10 19V9M15 19V12M20 19V7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function WalletSmallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M16 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7a5 5 0 1 0 5 5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11a1 1 0 1 0 1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8a3 3 0 0 1 3-3h12v4H7a3 3 0 0 0 0 6h12v4H7a3 3 0 0 1-3-3V8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function DownTrendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7l6 6 4-4 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13.2A2 2 0 0 1 19.6 20H4.4a2 2 0 0 1-1.7-2.6l7.6-13.2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6h15l-2 8H7L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
