import "../assets/styles/Analytics.css";
import "../assets/styles/Dashboard.css"; // reuse your nav + cards styles
import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";

/* ---------- helpers ---------- */
function money(n) {
  return `€${Number(n || 0).toFixed(2)}`;
}

function monthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // "2026-02"
}
function monthLabelShort(d) {
  return d.toLocaleString("en-US", { month: "short" });
}
function monthLabelLong(d) {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
}
function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function pctChange(curr, prev) {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return ((curr - prev) / prev) * 100;
}

/* ---------- page ---------- */
export default function Analytics() {
  const user = auth.currentUser;
  const uid = user?.uid;

  const displayName =
    user?.displayName || (user?.email ? user.email.split("@")[0] : "User");

  // month currently selected (same concept as dashboard)
  const [cursorDate, setCursorDate] = useState(new Date());

  // data (we will load a range covering months)
  const [txAll, setTxAll] = useState([]);
  const [catsAll, setCatsAll] = useState([]); // monthly categories (monthKey)

  // ranges
  const thisMonthStart = useMemo(() => startOfMonth(cursorDate), [cursorDate]);
  const thisMonthEnd = useMemo(() => endOfMonth(cursorDate), [cursorDate]);

  const lastMonthDate = useMemo(
    () => new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1),
    [cursorDate]
  );
  const lastMonthStart = useMemo(() => startOfMonth(lastMonthDate), [lastMonthDate]);
  const lastMonthEnd = useMemo(() => endOfMonth(lastMonthDate), [lastMonthDate]);

  // last 6 months window (for bars/trends)
  const sixMonthsStart = useMemo(
    () => startOfMonth(new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 5, 1)),
    [cursorDate]
  );
  const sixMonthsEnd = useMemo(() => thisMonthEnd, [thisMonthEnd]);

  // last 14 days window (for spending trend)
  const trendStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return startOfDay(d);
  }, []);
  const trendEnd = useMemo(() => endOfDay(new Date()), []);

  // 1) Listen to transactions in last 6 months (covers charts + this/last month)
  useEffect(() => {
    if (!uid) return;

    const txRef = collection(db, "users", uid, "transactions");
    const qTx = query(
      txRef,
      where("date", ">=", Timestamp.fromDate(sixMonthsStart)),
      where("date", "<=", Timestamp.fromDate(sixMonthsEnd)),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(qTx, (snap) => {
      setTxAll(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [uid, sixMonthsStart, sixMonthsEnd]);

  // 2) Listen to categories (for last 6 months) – monthly categories by monthKey
  useEffect(() => {
    if (!uid) return;

    const catsRef = collection(db, "users", uid, "categories");
    const qCats = query(catsRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(qCats, (snap) => {
      setCatsAll(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [uid]);

  /* ---------- computed analytics ---------- */
  const computed = useMemo(() => {
    // transactions -> normalize dates
    const tx = txAll.map((t) => ({
      ...t,
      amount: Number(t.amount || 0),
      jsDate: t.date?.toDate ? t.date.toDate() : new Date(),
    }));

    const inRange = (d, a, b) => d >= a && d <= b;

    const thisTx = tx.filter((t) => inRange(t.jsDate, thisMonthStart, thisMonthEnd));
    const lastTx = tx.filter((t) => inRange(t.jsDate, lastMonthStart, lastMonthEnd));

    const thisSpent = thisTx.reduce((s, t) => s + t.amount, 0);
    const lastSpent = lastTx.reduce((s, t) => s + t.amount, 0);

    const change = pctChange(thisSpent, lastSpent);

    // daily average in current month up to today (or whole month)
    const daysInMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0).getDate();
    const dailyAvg = daysInMonth > 0 ? thisSpent / daysInMonth : 0;

    // avg transaction
    const avgTx = thisTx.length ? thisSpent / thisTx.length : 0;

    // Spending trend (last 14 days)
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(startOfDay(d));
    }

    // sum by day
    const daySums = days.map((day) => {
      const dayEnd = endOfDay(day);
      const sum = tx
        .filter((t) => inRange(t.jsDate, day, dayEnd))
        .reduce((s, t) => s + t.amount, 0);
      return sum;
    });

    // Budget vs Actual (last 6 months)
    const monthPoints = [];
    for (let i = 5; i >= 0; i--) {
      const md = new Date(cursorDate.getFullYear(), cursorDate.getMonth() - i, 1);
      const mk = monthKey(md);

      const mStart = startOfMonth(md);
      const mEnd = endOfMonth(md);

      const mTx = tx.filter((t) => inRange(t.jsDate, mStart, mEnd));
      const actual = mTx.reduce((s, t) => s + t.amount, 0);

      const monthCats = catsAll.filter((c) => c.monthKey === mk);
      const budget = monthCats.reduce((s, c) => s + Number(c.budget || 0), 0);

      monthPoints.push({
        label: monthLabelShort(md),
        monthKey: mk,
        budget,
        actual,
      });
    }

    // Category trends (top category by spend in last 3 months)
    const last3 = monthPoints.slice(-3); // last 3 month labels
    // group spend by categoryId for entire 6 months
    const byCat = new Map();
    for (const t of tx) {
      const k = t.categoryId || "uncat";
      byCat.set(k, (byCat.get(k) || 0) + t.amount);
    }
    // choose top by spend
    const topCatId = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "uncat";
    const topCatName =
      catsAll.find((c) => c.id === topCatId)?.name || "grocery"; // fallback label

    const catTrend = last3.map((mp) => {
      const md = new Date(
        Number(mp.monthKey.split("-")[0]),
        Number(mp.monthKey.split("-")[1]) - 1,
        1
      );
      const mStart = startOfMonth(md);
      const mEnd = endOfMonth(md);

      const sum = tx
        .filter((t) => t.categoryId === topCatId && inRange(t.jsDate, mStart, mEnd))
        .reduce((s, t) => s + t.amount, 0);

      return { label: mp.label, value: sum };
    });

    // Insights
    const overBudgetCount = monthPoints[monthPoints.length - 1]
      ? Math.max(0, (monthPoints[monthPoints.length - 1].actual > monthPoints[monthPoints.length - 1].budget) ? 1 : 0)
      : 0;

    const projected = dailyAvg * daysInMonth;

    return {
      thisSpent,
      thisTxCount: thisTx.length,
      change,
      dailyAvg,
      avgTx,
      days,
      daySums,
      monthPoints,
      topCatName,
      catTrend,
      projected,
      overBudgetCount,
    };
  }, [
    txAll,
    catsAll,
    cursorDate,
    thisMonthStart,
    thisMonthEnd,
    lastMonthStart,
    lastMonthEnd,
  ]);

  const onPrev = () => setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const onNext = () => setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="dash">
      {/* same navbar look */}
      <header className="topnav">
        <div className="brand">
          <div className="brandIcon">
            <WalletSmallIcon />
          </div>
          <div className="brandName">BudgetWise</div>
        </div>

        <nav className="tabs">
            <div className="welcomeUser">
          Welcome, <span className="welcomeName">{displayName}</span>
        </div>
          <Link to="/dashboard" className="tab">
            <GridIcon /> Dashboard
          </Link>
          <Link to="/analytics" className="tab tab-active">
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
            <h1 className="dash-title">Analytics</h1>
            <p className="dash-subtitle">Understand your spending patterns</p>
          </div>

          <div className="dash-monthPicker">
            <button className="iconBtn" onClick={onPrev} aria-label="Previous month">
              ‹
            </button>
            <div className="dash-monthLabel">{monthLabelLong(cursorDate)}</div>
            <button className="iconBtn" onClick={onNext} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        {/* top stats like screenshot */}
        <section className="statsGrid">
          <StatCard
            icon={<CalendarIcon />}
            label="This Month"
            value={money(computed.thisSpent)}
            sub={`${computed.thisTxCount} transactions`}
          />
          <StatCard
            icon={<VsIcon />}
            label="vs Last Month"
            value={`${computed.change >= 0 ? "+" : ""}${computed.change.toFixed(1)}%`}
            sub={computed.change >= 0 ? "More than last month" : "Less than last month"}
            accent="green"
          />
          <StatCard
            icon={<BoltIcon />}
            label="Daily Average"
            value={money(computed.dailyAvg)}
            sub="Per day this month"
            accent="yellow"
          />
          <StatCard
            icon={<TargetIcon />}
            label="Avg Transaction"
            value={money(computed.avgTx)}
            sub="Per expense"
          />
        </section>

        {/* charts row */}
        <section className="analyticsGrid">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Spending Trend</h2>
                <div className="panelSub">Last 14 days</div>
              </div>
            </div>
            <LineChart
              labels={computed.days.map((d) => d.toLocaleString("en-US", { month: "short", day: "2-digit" }))}
              values={computed.daySums}
            />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Budget vs Actual</h2>
                <div className="panelSub">Last 6 months</div>
              </div>
            </div>
            <BarCompare
              labels={computed.monthPoints.map((m) => m.label)}
              budget={computed.monthPoints.map((m) => m.budget)}
              actual={computed.monthPoints.map((m) => m.actual)}
            />
          </div>

          <div className="panel analyticsWide">
            <div className="panel-head">
              <div>
                <h2>Category Trends</h2>
                <div className="panelSub">Top categories over time</div>
              </div>
            </div>

            <LineChart
              labels={computed.catTrend.map((x) => x.label)}
              values={computed.catTrend.map((x) => x.value)}
              legend={computed.topCatName}
            />
          </div>
        </section>

        {/* insights */}
        <section className="insights">
          <h2 className="insightsTitle">Insights & Recommendations</h2>

          <div className="insightGrid">
            <div className="insightCard">
              <div className="insightIcon yellow">
                <AlertSmallIcon />
              </div>
              <div className="insightBody">
                <div className="insightHeading">
                  {computed.overBudgetCount} Categories Over Budget
                </div>
                <div className="insightText">
                  {computed.overBudgetCount
                    ? "One of your categories has exceeded the monthly limit."
                    : "You are currently within your budgets this month."}
                </div>
              </div>
            </div>

            <div className="insightCard">
              <div className="insightIcon blue">
                <BulbIcon />
              </div>
              <div className="insightBody">
                <div className="insightHeading">Projected Overspend</div>
                <div className="insightText">
                  At your current pace, you'll spend {money(computed.projected)} this month.
                  Consider cutting back if needed.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- small reused components ---------- */
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

/* ---------- SVG charts (no libs) ---------- */
function LineChart({ labels, values, legend }) {
  const W = 820;
  const H = 260;
  const pad = 36;

  const max = Math.max(...values, 1);
  const min = 0;

  const pts = values.map((v, i) => {
    const x = pad + (i * (W - pad * 2)) / Math.max(values.length - 1, 1);
    const y = pad + (1 - (v - min) / (max - min)) * (H - pad * 2);
    return { x, y };
  });

  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const last = pts[pts.length - 1];

  return (
    <div className="chartWrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chartSvg" preserveAspectRatio="none">
        {/* axis labels minimal */}
        <path d={d} className="linePath" />
        {last && <circle cx={last.x} cy={last.y} r="4" className="lineDot" />}
      </svg>

      <div className="chartAxis">
        {labels.map((l, i) => (
          <span key={i} className="chartTick">
            {i % Math.ceil(labels.length / 6) === 0 ? l : ""}
          </span>
        ))}
      </div>

      {legend && (
        <div className="chartLegend">
          <span className="legendDot" />
          <span className="legendText">{legend}</span>
        </div>
      )}
    </div>
  );
}

function BarCompare({ labels, budget, actual }) {
  const W = 820;
  const H = 260;
  const pad = 36;

  const max = Math.max(...budget, ...actual, 1);
  const barW = (W - pad * 2) / labels.length;
  const innerW = Math.min(22, barW * 0.35);
  const gap = 10;

  return (
    <div className="chartWrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chartSvg" preserveAspectRatio="none">
        {labels.map((_, i) => {
          const x0 = pad + i * barW + barW / 2 - (innerW + gap / 2);
          const x1 = pad + i * barW + barW / 2 + gap / 2;

          const hb = ((budget[i] || 0) / max) * (H - pad * 2);
          const ha = ((actual[i] || 0) / max) * (H - pad * 2);

          return (
            <g key={i}>
              {/* budget (gray) */}
              <rect
                x={x0}
                y={H - pad - hb}
                width={innerW}
                height={hb}
                rx="6"
                className="barBudget"
              />
              {/* actual (green) */}
              <rect
                x={x1}
                y={H - pad - ha}
                width={innerW}
                height={ha}
                rx="6"
                className="barActual"
              />
            </g>
          );
        })}
      </svg>

      <div className="chartAxis">
        {labels.map((l, i) => (
          <span key={i} className="chartTick">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- icons ---------- */
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
function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 7a5 5 0 1 0 5 5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11a1 1 0 1 0 1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3v3M17 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function VsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 7l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 17l5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".35"
      />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2 3 14h8l-1 8 11-14h-8l0-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function AlertSmallIcon() {
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
function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
