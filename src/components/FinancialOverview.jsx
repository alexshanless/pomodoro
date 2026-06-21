import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  IoAdd, IoArrowUpOutline, IoArrowDownOutline, IoCardOutline, IoBarChartOutline,
  IoPricetagOutline, IoDownloadOutline, IoDocumentTextOutline, IoChevronUp, IoChevronDown,
  IoPencil, IoTrashOutline,
} from 'react-icons/io5';
import { useFinancialTransactions } from '../hooks/useFinancialTransactions';
import { useProjects } from '../hooks/useProjects';
import { useDialog } from '../contexts/DialogContext';
import ActionsMenu from './ActionsMenu';
import ModalCloseButton from './ModalCloseButton';
import { exportFinancialToCSV, exportFinancialToPDF } from '../utils/exportUtils';
import { formatCurrency } from '../utils/format';
import { formatRelativeDate } from '../utils/dateUtils';
import '../styles/FinancialRedesign.css';

const RANGE_TABS = [
  { value: 'all', label: 'All', mobileLabel: 'All time' },
  { value: 'today', label: 'Today', mobileLabel: 'Today' },
  { value: '7d', label: '7d', mobileLabel: 'Last 7 days' },
  { value: '30d', label: '30d', mobileLabel: 'Last 30 days' },
  { value: '90d', label: '90d', mobileLabel: 'Last 90 days' },
  { value: '1y', label: '1y', mobileLabel: 'Last 12 months' },
];

const RANGE_LABELS = {
  all: 'All time', today: 'Today', '7d': 'Last 7 days',
  '30d': 'Last 30 days', '90d': 'Last 90 days', '1y': 'Last 12 months',
};

const CATEGORY_COLORS = ['var(--fp-c2)', 'var(--fp-c1)', 'var(--fp-c3)', 'var(--fp-pos)', 'var(--fp-neg)', 'var(--fp-muted)'];

const SPENDING_CATEGORIES = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other'];

// Chart geometry (ported from the design's SVG render).
const VB_W = 960, VB_H = 300;
const PAD = { l: 56, r: 14, t: 18, b: 38 };
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const hourLabel = (h) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

const fmt2 = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (n) => (Math.abs(n) >= 1000 ? '$' + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k' : '$' + n);

// Dollars / decimal split for the big tile figures, with optional sign prefix.
const splitMoney = (n) => {
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dot = s.lastIndexOf('.');
  const sign = n < 0 ? '−' : '';
  return [`${sign}$${s.slice(0, dot)}`, s.slice(dot)];
};

// Smallest round ceiling just above the data (~4 gridlines).
const niceMax = (v) => {
  const target = v * 1.08;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  const candidates = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag);
  for (const c of candidates) { if (c >= target) return c; }
  return 10 * mag;
};

// Normalized polyline (78x30 viewBox) from a numeric series.
const sparkPolyline = (values) => {
  if (!values || values.length === 0) return '0,15 78,15';
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const span = max - min || 1;
  const stepX = 78 / (pts.length - 1);
  return pts
    .map((v, i) => `${+(i * stepX).toFixed(1)},${+(26 - ((v - min) / span) * 22).toFixed(1)}`)
    .join(' ');
};

const initialsFrom = (source) => {
  const text = (source || '').trim();
  if (!text) return '–';
  return text.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
};

// Build the time buckets for a range. Returns { bins: [{label, start, end}], note }.
const buildBins = (range, now, earliest) => {
  const day0 = startOfDay(now);
  const bins = [];
  let note = 'Income vs spending, monthly';

  if (range === 'today') {
    note = 'Today, 2-hour blocks';
    for (let h = 0; h < 24; h += 2) {
      const start = new Date(day0); start.setHours(h);
      const end = new Date(day0); end.setHours(h + 2);
      bins.push({ label: hourLabel(h), start, end });
    }
  } else if (range === '7d') {
    note = 'Income vs spending, daily';
    for (let i = 6; i >= 0; i--) {
      const start = new Date(day0); start.setDate(start.getDate() - i);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      bins.push({ label: start.toLocaleDateString('en-US', { weekday: 'short' }), start, end });
    }
  } else if (range === '30d') {
    note = 'Income vs spending, weekly';
    for (let i = 4; i >= 0; i--) {
      const end = new Date(day0); end.setDate(end.getDate() - i * 7 + 1);
      const start = new Date(end); start.setDate(start.getDate() - 7);
      bins.push({ label: `W${5 - i}`, start, end });
    }
  } else {
    let months;
    if (range === '90d') months = 3;
    else if (range === '1y') months = 12;
    else {
      const startM = earliest ? new Date(earliest.getFullYear(), earliest.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1);
      months = (now.getFullYear() - startM.getFullYear()) * 12 + (now.getMonth() - startM.getMonth()) + 1;
      months = Math.min(Math.max(months, 1), 36);
    }
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      bins.push({ label: start.toLocaleDateString('en-US', { month: 'short' }), start, end });
    }
  }
  return { bins, note };
};

const FinancialOverview = () => {
  const { incomes, spendings, addTransaction, updateTransaction, deleteTransaction } = useFinancialTransactions();
  const { projects } = useProjects();
  const { confirm } = useDialog();

  const [range, setRange] = useState(() => {
    const saved = localStorage.getItem('pompay-fin-range');
    return RANGE_TABS.some((r) => r.value === saved) ? saved : 'all';
  });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showSpendingForm, setShowSpendingForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [tip, setTip] = useState(null);

  const chartWrapRef = useRef(null);
  const addWrapRef = useRef(null);

  // Income form fields
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date());
  const [incomeProject, setIncomeProject] = useState('');

  // Spending form fields
  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingDescription, setSpendingDescription] = useState('');
  const [spendingCategory, setSpendingCategory] = useState('Food');
  const [spendingDate, setSpendingDate] = useState(new Date());
  const [spendingProject, setSpendingProject] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');

  useEffect(() => {
    localStorage.setItem('pompay-fin-range', range);
  }, [range]);

  // Close the Add menu on outside click.
  useEffect(() => {
    if (!showAddMenu) return undefined;
    const onClick = (e) => {
      if (addWrapRef.current && !addWrapRef.current.contains(e.target)) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showAddMenu]);

  const earliest = useMemo(() => {
    const all = [...incomes, ...spendings];
    if (all.length === 0) return null;
    return all.reduce((min, t) => {
      const d = new Date(t.date);
      return d < min ? d : min;
    }, new Date(all[0].date));
  }, [incomes, spendings]);

  // Bins + per-bin income/spending aggregation. Tile totals are summed from the
  // same bins so the chart and the headline figures always agree.
  const model = useMemo(() => {
    const now = new Date();
    const { bins, note } = buildBins(range, now, earliest);
    const income = new Array(bins.length).fill(0);
    const spending = new Array(bins.length).fill(0);

    const binIndex = (ts) => bins.findIndex((b) => ts >= b.start.getTime() && ts < b.end.getTime());
    incomes.forEach((t) => {
      const i = binIndex(new Date(t.date).getTime());
      if (i >= 0) income[i] += parseFloat(t.amount || 0);
    });
    spendings.forEach((t) => {
      const i = binIndex(new Date(t.date).getTime());
      if (i >= 0) spending[i] += parseFloat(t.amount || 0);
    });

    const winStart = bins.length ? bins[0].start.getTime() : 0;
    const winEnd = bins.length ? bins[bins.length - 1].end.getTime() : 0;

    return {
      bins, note, income, spending,
      labels: bins.map((b) => b.label),
      winStart, winEnd,
    };
  }, [range, incomes, spendings, earliest]);

  const summary = useMemo(() => {
    const inTot = model.income.reduce((a, b) => a + b, 0);
    const outTot = model.spending.reduce((a, b) => a + b, 0);
    const bal = inTot - outTot;

    // Previous-period totals (equal span immediately before the window). Skipped for "all".
    let dIn = null;
    let dOut = null;
    if (range !== 'all' && model.winEnd > model.winStart) {
      const span = model.winEnd - model.winStart;
      const prevStart = model.winStart - span;
      const sumIn = (rows) => rows.reduce((s, t) => {
        const ts = new Date(t.date).getTime();
        return ts >= prevStart && ts < model.winStart ? s + parseFloat(t.amount || 0) : s;
      }, 0);
      const prevIn = sumIn(incomes);
      const prevOut = sumIn(spendings);
      const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : null);
      dIn = pct(inTot, prevIn);
      dOut = pct(outTot, prevOut);
    }
    // Balance delta = savings rate (balance as a share of income).
    const dBal = inTot > 0 ? (bal / inTot) * 100 : null;

    return {
      inTot, outTot, bal, dIn, dOut, dBal,
      sparkIn: sparkPolyline(model.income),
      sparkOut: sparkPolyline(model.spending),
      sparkBal: sparkPolyline(model.income.map((v, i) => v - model.spending[i])),
    };
  }, [model, range, incomes, spendings]);

  // SVG chart primitives.
  const chart = useMemo(() => {
    const { income, spending, labels } = model;
    const n = labels.length || 1;
    const maxV = Math.max(...income, ...spending, 1);
    const yMax = niceMax(maxV);
    const x = (i) => PAD.l + (PLOT_W / n) * (i + 0.5);
    const y = (v) => PAD.t + PLOT_H - (v / yMax) * PLOT_H;
    const baseY = PAD.t + PLOT_H;
    const groupW = PLOT_W / n;
    const barW = Math.min(26, groupW * 0.3);
    const gap = 6;

    const lines = 4;
    const gridLines = [];
    for (let i = 0; i <= lines; i++) {
      const val = (yMax / lines) * i;
      const gy = y(val);
      gridLines.push({ gy, dash: i === 0 ? '0' : '4 6', label: fmtK(Math.round(val)) });
    }

    const incomeBars = [];
    const spendingBars = [];
    const xLabels = [];
    const bands = [];
    const netPts = [];
    labels.forEach((lab, i) => {
      const cx = x(i);
      const inH = (income[i] / yMax) * PLOT_H;
      const outH = (spending[i] / yMax) * PLOT_H;
      if (inH > 0) incomeBars.push({ x: cx - barW - gap / 2, y: baseY - inH, w: barW, h: inH, rx: Math.min(6, inH / 2) });
      if (outH > 0) spendingBars.push({ x: cx + gap / 2, y: baseY - outH, w: barW, h: outH, rx: Math.min(6, outH / 2) });
      netPts.push([cx, y(income[i] - spending[i])]);
      xLabels.push({ x: cx, label: lab });
      bands.push({ x: cx - groupW / 2, w: groupW, i });
    });

    const netPath = netPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');
    const netDots = netPts.map((p) => ({ cx: p[0], cy: p[1] }));

    return { gridLines, incomeBars, spendingBars, xLabels, bands, netPath, netDots };
  }, [model]);

  // Transactions in the active window, newest first.
  const windowTransactions = useMemo(() => {
    const all = [
      ...incomes.map((t) => ({ ...t, type: 'income' })),
      ...spendings.map((t) => ({ ...t, type: 'spending' })),
    ];
    const filtered = range === 'all'
      ? all
      : all.filter((t) => {
          const ts = new Date(t.date).getTime();
          return ts >= model.winStart && ts < model.winEnd;
        });
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [incomes, spendings, range, model]);

  // Spending grouped by category within the window.
  const categories = useMemo(() => {
    const byCat = {};
    spendings.forEach((t) => {
      const ts = new Date(t.date).getTime();
      if (range !== 'all' && (ts < model.winStart || ts >= model.winEnd)) return;
      const key = t.category || 'Other';
      byCat[key] = (byCat[key] || 0) + parseFloat(t.amount || 0);
    });
    const rows = Object.keys(byCat)
      .map((name) => ({ name, amount: byCat[name] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
    const maxAmt = Math.max(1, ...rows.map((r) => r.amount));
    return rows.map((r, i) => ({
      ...r,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      pct: Math.max(6, Math.round((r.amount / maxAmt) * 100)),
    }));
  }, [spendings, range, model]);

  const projectById = useCallback((id) => projects.find((p) => p.id === id), [projects]);

  // ---------- Form handlers ----------
  const resetIncomeForm = () => {
    setIncomeAmount(''); setIncomeDescription(''); setIncomeDate(new Date()); setIncomeProject('');
    setShowIncomeForm(false); setEditingTransaction(null);
  };

  const resetSpendingForm = () => {
    setSpendingAmount(''); setSpendingDescription(''); setSpendingCategory('Food');
    setSpendingDate(new Date()); setSpendingProject(''); setIsRecurring(false); setRecurringType('monthly');
    setShowSpendingForm(false); setEditingTransaction(null);
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (!incomeAmount || !incomeDescription) return;
    const payload = {
      amount: parseFloat(incomeAmount),
      description: incomeDescription,
      date: incomeDate.toISOString(),
      project_id: incomeProject || null,
    };
    const result = editingTransaction
      ? await updateTransaction(editingTransaction.id, payload)
      : await addTransaction({ type: 'income', category: null, is_recurring: false, recurring_type: null, ...payload });
    if (!result.error) resetIncomeForm();
  };

  const handleAddSpending = async (e) => {
    e.preventDefault();
    if (!spendingAmount || !spendingDescription) return;
    const payload = {
      amount: parseFloat(spendingAmount),
      description: spendingDescription,
      category: spendingCategory,
      date: spendingDate.toISOString(),
      project_id: spendingProject || null,
      is_recurring: isRecurring,
      recurring_type: isRecurring ? recurringType : null,
    };
    const result = editingTransaction
      ? await updateTransaction(editingTransaction.id, payload)
      : await addTransaction({ type: 'spending', ...payload });
    if (!result.error) resetSpendingForm();
  };

  const handleEditTransaction = (e, transaction) => {
    if (e) e.stopPropagation();
    setEditingTransaction(transaction);
    if (transaction.type === 'income') {
      setIncomeAmount(transaction.amount.toString());
      setIncomeDescription(transaction.description);
      setIncomeDate(new Date(transaction.date));
      setIncomeProject(transaction.project_id || '');
      setShowSpendingForm(false);
      setShowIncomeForm(true);
    } else {
      setSpendingAmount(transaction.amount.toString());
      setSpendingDescription(transaction.description);
      setSpendingCategory(transaction.category || 'Food');
      setSpendingDate(new Date(transaction.date));
      setSpendingProject(transaction.project_id || '');
      setIsRecurring(transaction.is_recurring || false);
      setRecurringType(transaction.recurring_type || 'monthly');
      setShowIncomeForm(false);
      setShowSpendingForm(true);
    }
  };

  const handleDeleteTransaction = async (e, id) => {
    if (e) e.stopPropagation();
    const ok = await confirm('Are you sure you want to delete this transaction?', {
      title: 'Delete transaction',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (ok) await deleteTransaction(id);
  };

  const handleExportCSV = () => {
    exportFinancialToCSV(incomes, spendings, { projects });
    setShowExportModal(false);
  };
  const handleExportPDF = () => {
    exportFinancialToPDF(incomes, spendings, { projects });
    setShowExportModal(false);
  };

  const rowActions = (transaction) => [
    { label: 'Edit', icon: <IoPencil size={18} />, onClick: (e) => handleEditTransaction(e, transaction) },
    { label: 'Delete', icon: <IoTrashOutline size={18} />, onClick: (e) => handleDeleteTransaction(e, transaction.id), danger: true },
  ];

  const showTip = (e, i) => {
    if (!chartWrapRef.current) return;
    const rect = chartWrapRef.current.getBoundingClientRect();
    setTip({ i, left: e.clientX - rect.left, top: e.clientY - rect.top - 14 });
  };

  const [inWhole, inDec] = splitMoney(summary.inTot);
  const [outWhole, outDec] = splitMoney(summary.outTot);
  const [balWhole, balDec] = splitMoney(summary.bal);

  const renderDelta = (value) => {
    if (value === null) return null;
    const up = value >= 0;
    return (
      <span className={`fp-delta ${up ? 'up' : 'down'}`}>
        {up ? <IoChevronUp aria-hidden='true' /> : <IoChevronDown aria-hidden='true' />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className='pompay-financial'>
      <div className='fp-wrap'>

        {/* Page head */}
        <div className='fp-head'>
          <div className='fp-htext'>
            <h1>Financial</h1>
            <div className='fp-sub'>
              {RANGE_LABELS[range]} · net{' '}
              <span className={summary.bal >= 0 ? 'fp-net-pos' : 'fp-net-neg'}>
                {summary.bal >= 0 ? '+' : '−'}{formatCurrency(Math.abs(summary.bal))}
              </span>
            </div>
          </div>

          <div className='fp-tabs' role='group' aria-label='Time range'>
            {RANGE_TABS.map((t) => (
              <button
                key={t.value}
                className={`fp-tab ${range === t.value ? 'on' : ''}`}
                onClick={() => setRange(t.value)}
                aria-pressed={range === t.value}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className='fp-range-select'
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label='Time range'
          >
            {RANGE_TABS.map((t) => (
              <option key={t.value} value={t.value}>{t.mobileLabel}</option>
            ))}
          </select>

          <button className='fp-icon-btn' onClick={() => setShowExportModal(true)} aria-label='Export statement'>
            <IoDocumentTextOutline aria-hidden='true' />
          </button>

          <div className='fp-add-wrap' ref={addWrapRef}>
            <button className='fp-btn fp-btn-primary' onClick={() => setShowAddMenu((v) => !v)} aria-haspopup='true' aria-expanded={showAddMenu}>
              <IoAdd aria-hidden='true' /> Add
            </button>
            {showAddMenu && (
              <div className='fp-add-menu' role='menu'>
                <button className='income' role='menuitem' onClick={() => { setShowAddMenu(false); resetSpendingForm(); setShowIncomeForm(true); }}>
                  <IoArrowUpOutline aria-hidden='true' /> Add Income
                </button>
                <button className='spending' role='menuitem' onClick={() => { setShowAddMenu(false); resetIncomeForm(); setShowSpendingForm(true); }}>
                  <IoArrowDownOutline aria-hidden='true' /> Add Spending
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Overview tiles */}
        <section className='fp-stats'>
          <div className='fp-stat'>
            <div className='fp-top'>
              <span className='fp-badge fp-b-in'><IoArrowUpOutline aria-hidden='true' /></span>
              <span className='fp-lab'>Income</span>
            </div>
            <div className='fp-num pos'>{inWhole}<span className='fp-dec'>{inDec}</span></div>
            <div className='fp-sub'>
              {renderDelta(summary.dIn)}
              {range === 'all' ? 'all time' : 'vs prev period'}
            </div>
            <svg className='fp-spark' viewBox='0 0 78 30' fill='none' preserveAspectRatio='none' aria-hidden='true'>
              <polyline points={summary.sparkIn} stroke='var(--fp-pos)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>

          <div className='fp-stat'>
            <div className='fp-top'>
              <span className='fp-badge fp-b-out'><IoArrowDownOutline aria-hidden='true' /></span>
              <span className='fp-lab'>Spending</span>
            </div>
            <div className='fp-num neg'>{outWhole}<span className='fp-dec'>{outDec}</span></div>
            <div className='fp-sub'>
              {renderDelta(summary.dOut)}
              {range === 'all' ? 'all time' : 'vs prev period'}
            </div>
            <svg className='fp-spark' viewBox='0 0 78 30' fill='none' preserveAspectRatio='none' aria-hidden='true'>
              <polyline points={summary.sparkOut} stroke='var(--fp-neg)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>

          <div className='fp-stat'>
            <div className='fp-top'>
              <span className='fp-badge fp-b-bal'><IoCardOutline aria-hidden='true' /></span>
              <span className='fp-lab'>Balance</span>
            </div>
            <div className={`fp-num ${summary.bal < 0 ? 'neg' : ''}`}>{balWhole}<span className='fp-dec'>{balDec}</span></div>
            <div className='fp-sub'>
              {renderDelta(summary.dBal)}
              income minus spending
            </div>
            <svg className='fp-spark' viewBox='0 0 78 30' fill='none' preserveAspectRatio='none' aria-hidden='true'>
              <polyline points={summary.sparkBal} stroke='var(--fp-c1)' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </div>
        </section>

        {/* Cash flow chart */}
        <section className='fp-panel'>
          <div className='fp-phead fp-phead-cf'>
            <span className='fp-ic'><IoBarChartOutline aria-hidden='true' /></span>
            <div>
              <h2>Cash Flow</h2>
              <div className='fp-cf-note'>{model.note}</div>
            </div>
            <div className='fp-legend'>
              <span className='fp-lg'><span className='fp-sw' style={{ background: 'var(--fp-pos)' }} />Income</span>
              <span className='fp-lg'><span className='fp-sw' style={{ background: 'var(--fp-track)' }} />Spending</span>
              <span className='fp-lg'><span className='fp-swline' />Net</span>
            </div>
          </div>

          <div className='fp-chart-wrap' ref={chartWrapRef}>
            <svg
              className='fp-chart'
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              preserveAspectRatio='none'
              role='img'
              aria-label='Monthly income, spending and net cash flow'
            >
              <defs>
                <linearGradient id='fpGradIn' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0' stopColor='#5fe0b4' />
                  <stop offset='1' stopColor='var(--fp-pos)' />
                </linearGradient>
              </defs>

              {chart.gridLines.map((g, i) => (
                <g key={`g${i}`}>
                  <line className='fp-grid-line' x1={PAD.l} x2={VB_W - PAD.r} y1={g.gy} y2={g.gy} strokeDasharray={g.dash} />
                  <text className='fp-axis-y' x={PAD.l - 12} y={g.gy + 4} textAnchor='end'>{g.label}</text>
                </g>
              ))}

              {chart.incomeBars.map((b, i) => (
                <rect key={`in${i}`} className='fp-bar' x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill='url(#fpGradIn)' />
              ))}
              {chart.spendingBars.map((b, i) => (
                <rect key={`out${i}`} className='fp-bar' x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill='var(--fp-track)' />
              ))}

              <path className='fp-net-line' d={chart.netPath} />
              {chart.netDots.map((d, i) => (
                <circle key={`d${i}`} className='fp-net-dot' cx={d.cx} cy={d.cy} r={3.5} />
              ))}

              {chart.xLabels.map((t, i) => (
                <text key={`x${i}`} className='fp-axis-x' x={t.x} y={VB_H - 12} textAnchor='middle'>{t.label}</text>
              ))}

              {chart.bands.map((b) => (
                <rect
                  key={`b${b.i}`}
                  className='fp-band'
                  x={b.x}
                  y={PAD.t}
                  width={b.w}
                  height={PLOT_H}
                  fill='transparent'
                  onMouseMove={(e) => showTip(e, b.i)}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </svg>

            <div
              className={`fp-tooltip ${tip ? 'on' : ''}`}
              style={tip ? { left: tip.left, top: tip.top } : undefined}
            >
              {tip && (() => {
                const net = model.income[tip.i] - model.spending[tip.i];
                return (
                  <>
                    <div className='fp-tt-m'>{model.labels[tip.i]}</div>
                    <div className='fp-tt-row'>
                      <span className='fp-sw' style={{ background: 'var(--fp-pos)' }} />Income
                      <span className='fp-tt-v' style={{ color: 'var(--fp-pos)' }}>{fmt2(model.income[tip.i])}</span>
                    </div>
                    <div className='fp-tt-row'>
                      <span className='fp-sw' style={{ background: 'var(--fp-soft)' }} />Spending
                      <span className='fp-tt-v'>{fmt2(model.spending[tip.i])}</span>
                    </div>
                    <div className='fp-tt-row fp-tt-net'>
                      <span className='fp-sw' style={{ background: 'var(--fp-c1)' }} />Net
                      <span className='fp-tt-v' style={{ color: 'var(--fp-c1)' }}>{net >= 0 ? '+' : '−'}{fmt2(Math.abs(net))}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Transactions + categories */}
        <div className='fp-grid2'>
          <section className='fp-panel'>
            <div className='fp-phead'>
              <span className='fp-ic'><IoCardOutline aria-hidden='true' /></span>
              <h2>Transactions</h2>
              <div className='fp-spacer' />
              <button className='fp-btn fp-btn-ghost' onClick={() => setShowExportModal(true)}>
                <IoDownloadOutline aria-hidden='true' /> Export
              </button>
            </div>

            {windowTransactions.length > 0 ? (
              <div className='fp-flist'>
                {windowTransactions.map((transaction) => {
                  const project = projectById(transaction.project_id);
                  const isIncome = transaction.type === 'income';
                  const amount = parseFloat(transaction.amount || 0);
                  const meta = project?.name || (isIncome ? 'Income' : transaction.category || 'Spending');
                  const dotColor = project?.color || (isIncome ? 'var(--fp-c2)' : 'var(--fp-c1)');
                  return (
                    <div key={`${transaction.type}-${transaction.id}`} className='fp-fitem'>
                      <span className={`fp-favatar ${isIncome ? 'income' : 'expense'}`}>
                        {initialsFrom(project?.name || transaction.description)}
                      </span>
                      <div className='fp-fmain'>
                        <span className='fp-fname'>{transaction.description}</span>
                        <span className='fp-fdate'>
                          <span className='fp-mdot' style={{ background: dotColor }} />
                          {meta} · {formatRelativeDate(transaction.date)}
                        </span>
                      </div>
                      <span className={`fp-famt ${isIncome ? 'pos' : 'neg'}`}>
                        {isIncome ? '+' : '−'}{formatCurrency(amount)}
                      </span>
                      <span className='fp-frow-menu'>
                        <ActionsMenu actions={rowActions(transaction)} menuPosition='right' />
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className='fp-empty'>No transactions in this range. Add income or spending to get started.</p>
            )}
          </section>

          <section className='fp-panel'>
            <div className='fp-phead'>
              <span className='fp-ic'><IoPricetagOutline aria-hidden='true' /></span>
              <h2>By Category</h2>
              <div className='fp-spacer' />
              <span className='fp-cap'>spending</span>
            </div>

            {categories.length > 0 ? (
              <div className='fp-taglist'>
                {categories.map((c) => (
                  <div key={c.name} className='fp-tagrow'>
                    <div className='fp-ttop'>
                      <span className='fp-tname'><span className='fp-sq' style={{ background: c.color }} />{c.name}</span>
                      <span className='fp-tcount'>{formatCurrency(c.amount)}</span>
                    </div>
                    <div className='fp-ttrack'><i style={{ width: `${c.pct}%`, background: c.color }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='fp-empty'>No spending in this range.</p>
            )}
          </section>
        </div>
      </div>

      {/* Add / Edit Income modal */}
      {showIncomeForm && (
        <div className='fp-modal' onClick={resetIncomeForm}>
          <div className='fp-modal-card' onClick={(e) => e.stopPropagation()} role='dialog' aria-modal='true' aria-labelledby='fp-income-title'>
            <div className='fp-modal-head'>
              <h3 id='fp-income-title'>{editingTransaction ? 'Edit Income' : 'Add Income'}</h3>
              <ModalCloseButton onClick={resetIncomeForm} />
            </div>
            <form onSubmit={handleAddIncome} className='fp-form'>
              <div className='fp-field'>
                <label htmlFor='fp-income-amount'>Amount *</label>
                <input id='fp-income-amount' className='fp-input' type='number' placeholder='0.00' value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} step='0.01' min='0' required />
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-income-desc'>Description *</label>
                <input id='fp-income-desc' className='fp-input' type='text' placeholder='e.g., Milestone payout' value={incomeDescription} onChange={(e) => setIncomeDescription(e.target.value)} required />
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-income-date'>Date</label>
                <DatePicker id='fp-income-date' selected={incomeDate} onChange={(date) => setIncomeDate(date)} dateFormat='MM/dd/yyyy' className='fp-input fp-date' />
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-income-project'>Project</label>
                <select id='fp-income-project' className='fp-select' value={incomeProject} onChange={(e) => setIncomeProject(e.target.value)}>
                  <option value=''>No Project (Optional)</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className='fp-modal-actions'>
                <button type='button' className='fp-btn-cancel' onClick={resetIncomeForm}>Cancel</button>
                <button type='submit' className='fp-btn fp-btn-primary'>{editingTransaction ? 'Update Income' : 'Add Income'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Spending modal */}
      {showSpendingForm && (
        <div className='fp-modal' onClick={resetSpendingForm}>
          <div className='fp-modal-card' onClick={(e) => e.stopPropagation()} role='dialog' aria-modal='true' aria-labelledby='fp-spending-title'>
            <div className='fp-modal-head'>
              <h3 id='fp-spending-title'>{editingTransaction ? 'Edit Spending' : 'Add Spending'}</h3>
              <ModalCloseButton onClick={resetSpendingForm} />
            </div>
            <form onSubmit={handleAddSpending} className='fp-form'>
              <div className='fp-field'>
                <label htmlFor='fp-spending-amount'>Amount *</label>
                <input id='fp-spending-amount' className='fp-input' type='number' placeholder='0.00' value={spendingAmount} onChange={(e) => setSpendingAmount(e.target.value)} step='0.01' min='0' required />
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-spending-desc'>Description *</label>
                <input id='fp-spending-desc' className='fp-input' type='text' placeholder='e.g., Office rent' value={spendingDescription} onChange={(e) => setSpendingDescription(e.target.value)} required />
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-spending-cat'>Category</label>
                <select id='fp-spending-cat' className='fp-select' value={spendingCategory} onChange={(e) => setSpendingCategory(e.target.value)}>
                  {SPENDING_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-spending-date'>Date</label>
                <DatePicker id='fp-spending-date' selected={spendingDate} onChange={(date) => setSpendingDate(date)} dateFormat='MM/dd/yyyy' className='fp-input fp-date' />
              </div>
              <div className='fp-field'>
                <label htmlFor='fp-spending-project'>Project</label>
                <select id='fp-spending-project' className='fp-select' value={spendingProject} onChange={(e) => setSpendingProject(e.target.value)}>
                  <option value=''>No Project (Optional)</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className='fp-field'>
                <label className='fp-check'>
                  <input type='checkbox' checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
                  Recurring spending
                </label>
                {isRecurring && (
                  <select className='fp-select' value={recurringType} onChange={(e) => setRecurringType(e.target.value)}>
                    <option value='weekly'>Weekly</option>
                    <option value='monthly'>Monthly</option>
                    <option value='yearly'>Yearly</option>
                  </select>
                )}
              </div>
              <div className='fp-modal-actions'>
                <button type='button' className='fp-btn-cancel' onClick={resetSpendingForm}>Cancel</button>
                <button type='submit' className='fp-btn fp-btn-primary'>{editingTransaction ? 'Update Spending' : 'Add Spending'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExportModal && (
        <div className='fp-modal' onClick={() => setShowExportModal(false)}>
          <div className='fp-modal-card' onClick={(e) => e.stopPropagation()} role='dialog' aria-modal='true' aria-labelledby='fp-export-title'>
            <div className='fp-modal-head'>
              <h3 id='fp-export-title'>Export Financial Data</h3>
              <ModalCloseButton onClick={() => setShowExportModal(false)} />
            </div>
            <p className='fp-export-note'>Choose a format for your income and spending records.</p>
            <div className='fp-export-opts'>
              <button className='fp-btn-export' onClick={handleExportCSV}>
                <IoDownloadOutline aria-hidden='true' /> Export to CSV <span className='fp-export-hint'>Spreadsheet</span>
              </button>
              <button className='fp-btn-export' onClick={handleExportPDF}>
                <IoDocumentTextOutline aria-hidden='true' /> Export to PDF <span className='fp-export-hint'>Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialOverview;
