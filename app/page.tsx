"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const SUBJECTS = ["世界史", "日本史", "英語", "数学", "理科", "国語", "地理", "公民", "その他"];
const SELF_EVAL = [
  { label: "完璧", value: "perfect" },
  { label: "あいまい", value: "vague" },
  { label: "思い出せなかった", value: "failed" },
];
const TABS = [
  { id: "list",  label: "一覧" },
  { id: "add",   label: "追加" },
  { id: "tree",  label: "ツリー" },
  { id: "stats", label: "統計" },
];

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadData() {
  try { return JSON.parse(localStorage.getItem("studytree_v2") || "{}"); }
  catch { return {}; }
}
function saveData(data: unknown) {
  localStorage.setItem("studytree_v2", JSON.stringify(data));
}

type Subtitle = { id: string; label: string; content: string };
type Review   = { id: string; at: number; mode: string; eval: string };
type Item     = {
  id: string; title: string; subject: string;
  memo: string; date: string;
  subtitles: Subtitle[];
  reviews: Review[];
  createdAt: number;
};

const SEED: Item[] = [
  {
    id: "seed1", title: "フランス革命", subject: "世界史",
    memo: "近代化の重要転換点", date: "2024-06-10",
    subtitles: [
      { id: "s1", label: "原因",  content: "財政危機・身分制度への不満・啓蒙思想の普及" },
      { id: "s2", label: "経過",  content: "三部会召集→バスティーユ陥落→人権宣言→ルイ16世処刑" },
      { id: "s3", label: "結果",  content: "王政の廃止・第一共和政樹立・ナポレオン台頭" },
      { id: "s4", label: "影響",  content: "自由・平等・博愛の理念が世界に拡散、近代市民社会の基礎" },
    ],
    reviews: [], createdAt: Date.now() - 86400000,
  },
  {
    id: "seed2", title: "不定詞", subject: "英語",
    memo: "to + 動詞原形", date: "2024-06-09",
    subtitles: [
      { id: "s5", label: "名詞的用法",   content: "主語・目的語・補語になる。例: To study is important." },
      { id: "s6", label: "形容詞的用法", content: "名詞を修飾する。例: I have a book to read." },
      { id: "s7", label: "副詞的用法",   content: "動詞・形容詞・文全体を修飾。目的・原因・結果など。" },
    ],
    reviews: [], createdAt: Date.now() - 172800000,
  },
];

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:      #ffffff;
    --surface: #f7f7f7;
    --border:  #e0e0e0;
    --text:    #111111;
    --muted:   #888888;
    --faint:   #cccccc;
    --radius:  6px;
    --font: -apple-system, 'Helvetica Neue', sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:      #111111;
      --surface: #1a1a1a;
      --border:  #2e2e2e;
      --text:    #eeeeee;
      --muted:   #777777;
      --faint:   #333333;
    }
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 15px; line-height: 1.5; }
  button { cursor: pointer; font-family: var(--font); border: none; background: none; color: inherit; }
  input, textarea, select {
    font-family: var(--font);
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 9px 12px;
    width: 100%;
    font-size: 15px;
    outline: none;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--text); }
  textarea { resize: vertical; min-height: 72px; }
  select option { background: var(--bg); }
  .app { max-width: 480px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }
  .header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100;
    background: var(--bg);
    display: flex; align-items: baseline; gap: 10px;
  }
  .header-title { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
  .header-sub   { font-size: 12px; color: var(--muted); }
  .content { flex: 1; overflow-y: auto; padding-bottom: 72px; }
  .tab-bar {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 480px;
    background: var(--bg);
    border-top: 1px solid var(--border);
    display: flex; z-index: 200;
  }
  .tab-item {
    flex: 1; padding: 12px 4px 16px;
    font-size: 12px; color: var(--muted);
    text-align: center; transition: color 0.15s;
  }
  .tab-item.active { color: var(--text); font-weight: 600; }
  .pad { padding: 16px 18px; }
  .label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 5px; }
  .field { margin-bottom: 14px; }
  .row2  { display: flex; gap: 10px; }
  .row2 .field { flex: 1; }
  .divider { height: 1px; background: var(--border); margin: 16px 0; }
  .section-head {
    font-size: 12px; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 12px;
    display: flex; align-items: center; gap: 8px;
  }
  .sub-row {
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 10px 12px; margin-bottom: 8px;
    display: flex; gap: 8px; align-items: flex-start;
  }
  .sub-row-fields { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .sub-label-input {
    background: transparent; border: none; border-bottom: 1px solid var(--border);
    border-radius: 0; padding: 3px 0; font-size: 14px; font-weight: 600;
  }
  .sub-label-input:focus { border-bottom-color: var(--text); outline: none; }
  .sub-content-input {
    background: transparent; border: none; border-radius: 0;
    padding: 3px 0; font-size: 13px; color: var(--muted); min-height: 48px;
  }
  .sub-content-input:focus { outline: none; color: var(--text); }
  .sub-controls { display: flex; flex-direction: column; gap: 2px; }
  .icon-btn { padding: 3px 6px; font-size: 13px; color: var(--muted); border-radius: 4px; }
  .icon-btn:hover { color: var(--text); background: var(--surface); }
  .icon-btn.danger:hover { color: #cc0000; }
  .add-sub {
    width: 100%; padding: 10px; border-radius: var(--radius);
    border: 1px dashed var(--border); font-size: 13px; color: var(--muted);
    transition: border-color 0.15s, color 0.15s; text-align: center;
  }
  .add-sub:hover { border-color: var(--text); color: var(--text); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px;
         padding: 9px 16px; border-radius: var(--radius); font-size: 14px; font-weight: 600; }
  .btn-primary   { background: var(--text); color: var(--bg); }
  .btn-secondary { background: var(--surface); border: 1px solid var(--border); }
  .btn-ghost     { color: var(--muted); font-size: 13px; padding: 6px 8px; }
  .btn-ghost:hover { color: var(--text); }
  .btn-full { width: 100%; }
  .btn-row  { display: flex; gap: 8px; margin-top: 18px; }
  .card {
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 16px; margin-bottom: 10px;
  }
  .card-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
  .card-meta  { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .chip { font-size: 11px; padding: 2px 8px; border: 1px solid var(--border); border-radius: 20px; color: var(--muted); }
  .card-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .card-action-btn {
    font-size: 12px; padding: 5px 11px; border: 1px solid var(--border);
    border-radius: var(--radius); font-weight: 500; color: var(--text); background: transparent;
  }
  .card-action-btn:hover { background: var(--surface); }
  .card-action-btn.accent { border-color: var(--text); font-weight: 600; }
  .search-wrap { position: relative; margin-bottom: 14px; }
  .search-wrap input { padding-left: 12px; }
  .search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
  .tree-subject {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 0; cursor: pointer;
    border-bottom: 1px solid var(--border); margin-bottom: 4px;
  }
  .tree-subject-name { font-size: 14px; font-weight: 700; }
  .tree-chevron { font-size: 10px; color: var(--muted); transition: transform 0.15s; }
  .tree-chevron.open { transform: rotate(90deg); }
  .tree-item { border-left: 1px solid var(--border); margin-left: 12px; padding-left: 14px; margin-bottom: 6px; }
  .tree-item-header { display: flex; align-items: center; gap: 8px; padding: 7px 0; cursor: pointer; }
  .tree-item-name { font-size: 14px; font-weight: 600; flex: 1; }
  .tree-sub { margin-top: 4px; margin-bottom: 6px; }
  .tree-sub-row { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--faint); font-size: 13px; }
  .tree-sub-row:last-child { border-bottom: none; }
  .tree-sub-marker { color: var(--muted); font-size: 11px; min-width: 12px; margin-top: 2px; }
  .tree-sub-lbl  { font-weight: 600; min-width: 80px; }
  .tree-sub-body { color: var(--muted); }
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: flex-end; justify-content: center; z-index: 500;
  }
  .sheet {
    background: var(--bg); border-radius: 14px 14px 0 0;
    padding: 22px 18px 36px; width: 100%; max-width: 480px;
    max-height: 88vh; overflow-y: auto; border-top: 1px solid var(--border);
  }
  .sheet-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .sheet-mode {
    font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    color: var(--muted); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px;
  }
  .sheet-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
  .recall-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 12px; border: 1px solid var(--border);
    border-radius: var(--radius); margin-bottom: 8px;
    cursor: pointer; transition: background 0.1s;
  }
  .recall-row:hover { background: var(--surface); }
  .recall-row.shown { background: var(--surface); }
  .recall-num {
    width: 24px; height: 24px; border: 1px solid var(--border);
    border-radius: 4px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: var(--muted);
  }
  .recall-row.shown .recall-num { border-color: var(--text); color: var(--text); }
  .recall-lbl  { font-size: 14px; font-weight: 600; }
  .recall-body { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .hidden-text { color: var(--faint); font-size: 13px; }
  .blank-row {
    display: flex; align-items: center; gap: 10px;
    padding: 12px; border: 1px dashed var(--border);
    border-radius: var(--radius); margin-bottom: 8px;
  }
  .blank-box  { width: 24px; height: 24px; border: 1px dashed var(--muted); border-radius: 4px; flex-shrink: 0; }
  .blank-line { flex: 1; height: 1px; background: var(--faint); }
  .eval-row { display: flex; gap: 8px; margin-top: 16px; }
  .eval-btn {
    flex: 1; padding: 11px 4px; border: 1px solid var(--border);
    border-radius: var(--radius); font-size: 13px; font-weight: 600; transition: background 0.1s;
  }
  .eval-btn:hover { background: var(--surface); }
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stat-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
  .stat-num  { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .stat-lbl  { font-size: 12px; color: var(--muted); }
  .bar-row   { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-name  { font-size: 13px; min-width: 72px; }
  .bar-wrap  { flex: 1; background: var(--surface); border-radius: 2px; height: 6px; overflow: hidden; }
  .bar-fill  { height: 100%; background: var(--text); border-radius: 2px; transition: width 0.4s; }
  .bar-count { font-size: 12px; color: var(--muted); min-width: 20px; text-align: right; }
  .empty { text-align: center; padding: 48px 20px; color: var(--muted); font-size: 14px; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .appear { animation: slideUp 0.2s ease; }
`;

// ── ItemForm ──────────────────────────────────────────────────────────────────
function ItemForm({ item, onSave, onCancel }: {
  item?: Item;
  onSave: (f: Omit<Item, "id" | "reviews" | "createdAt">) => void;
  onCancel?: () => void;
}) {
  const [title,     setTitle]     = useState(item?.title   || "");
  const [subject,   setSubject]   = useState(item?.subject || "世界史");
  const [memo,      setMemo]      = useState(item?.memo    || "");
  const [date,      setDate]      = useState(item?.date    || new Date().toISOString().slice(0,10));
  const [subtitles, setSubtitles] = useState<Subtitle[]>(
    item?.subtitles?.length ? item.subtitles : [{ id: genId(), label: "", content: "" }]
  );

  const addSub    = () => setSubtitles(s => [...s, { id: genId(), label: "", content: "" }]);
  const removeSub = (id: string) => setSubtitles(s => s.filter(x => x.id !== id));
  const updateSub = (id: string, f: keyof Subtitle, v: string) =>
    setSubtitles(s => s.map(x => x.id === id ? { ...x, [f]: v } : x));
  const moveSub = (i: number, d: number) => {
    const a = [...subtitles], to = i + d;
    if (to < 0 || to >= a.length) return;
    [a[i], a[to]] = [a[to], a[i]];
    setSubtitles(a);
  };
  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), subject, memo, date, subtitles: subtitles.filter(s => s.label.trim()) });
  };

  return (
    <div className="pad appear">
      <div className="field">
        <label className="label">タイトル</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：フランス革命" />
      </div>
      <div className="row2">
        <div className="field">
          <label className="label">科目</label>
          <select value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">学習日</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label">メモ（任意）</label>
        <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="補足など" />
      </div>

      <div className="divider" />
      <div className="section-head">
        <span>小タイトル</span>
        <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{subtitles.length} 件</span>
      </div>

      {subtitles.map((s, i) => (
        <div key={s.id} className="sub-row">
          <div className="sub-row-fields">
            <input
              className="sub-label-input"
              value={s.label}
              onChange={e => updateSub(s.id, "label", e.target.value)}
              placeholder={`項目 ${i + 1}（例：原因）`}
            />
            <textarea
              className="sub-content-input"
              value={s.content}
              onChange={e => updateSub(s.id, "content", e.target.value)}
              placeholder="内容…"
              rows={3}
            />
          </div>
          <div className="sub-controls">
            <button className="icon-btn" onClick={() => moveSub(i, -1)}>↑</button>
            <button className="icon-btn" onClick={() => moveSub(i,  1)}>↓</button>
            <button className="icon-btn danger" onClick={() => removeSub(s.id)}>×</button>
          </div>
        </div>
      ))}

      <button className="add-sub" onClick={addSub}>+ 項目を追加</button>

      <div className="btn-row">
        {onCancel && (
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>キャンセル</button>
        )}
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={!title.trim()}>
          {item ? "更新する" : "保存する"}
        </button>
      </div>
    </div>
  );
}

// ── TreeView ──────────────────────────────────────────────────────────────────
function TreeView({ items, onReview }: { items: Item[]; onReview: (it: Item) => void }) {
  const [subjOpen, setSubjOpen] = useState<Record<string, boolean>>({});
  const [itemOpen, setItemOpen] = useState<Record<string, boolean>>({});

  const bySubject = useMemo(() => {
    const m: Record<string, Item[]> = {};
    items.forEach(it => { (m[it.subject] = m[it.subject] || []).push(it); });
    return m;
  }, [items]);

  if (!items.length) return <div className="empty">学習項目がありません。</div>;

  return (
    <div className="pad appear">
      {Object.entries(bySubject).map(([subj, sitems]) => {
        const open = subjOpen[subj] !== false;
        return (
          <div key={subj}>
            <div className="tree-subject" onClick={() => setSubjOpen(o => ({ ...o, [subj]: !open }))}>
              <span className={`tree-chevron ${open ? "open" : ""}`}>▶</span>
              <span className="tree-subject-name">{subj}</span>
              <span className="chip">{sitems.length}</span>
            </div>
            {open && sitems.map(it => {
              const expanded = !!itemOpen[it.id];
              return (
                <div key={it.id} className="tree-item">
                  <div className="tree-item-header" onClick={() => setItemOpen(o => ({ ...o, [it.id]: !expanded }))}>
                    <span style={{ color: "var(--muted)", fontSize: "11px", minWidth: "12px" }}>{expanded ? "−" : "+"}</span>
                    <span className="tree-item-name">{it.title}</span>
                    <button
                      className="card-action-btn"
                      style={{ fontSize: "11px", padding: "3px 8px" }}
                      onClick={e => { e.stopPropagation(); onReview(it); }}
                    >
                      復習
                    </button>
                  </div>
                  {expanded && (
                    <div className="tree-sub appear">
                      {it.subtitles.map((s, i) => (
                        <div key={s.id} className="tree-sub-row">
                          <span className="tree-sub-marker">{i === it.subtitles.length - 1 ? "└" : "├"}</span>
                          <span className="tree-sub-lbl">{s.label}</span>
                          <span className="tree-sub-body">{s.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── RecallSheet ───────────────────────────────────────────────────────────────
function RecallSheet({ item, mode, onClose, onEval }: {
  item: Item; mode: string;
  onClose: () => void;
  onEval: (id: string, val: string) => void;
}) {
  const isBlank = mode === "blank";
  const [shownIds, setShownIds] = useState<Record<string, boolean>>({});
  const [allShown, setAllShown] = useState(false);

  const showAll = () => {
    const m: Record<string, boolean> = {};
    item.subtitles.forEach(s => { m[s.id] = true; });
    setShownIds(m);
    setAllShown(true);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-mode">{isBlank ? "白紙再現" : "想起モード"}</span>
          <button className="btn-ghost" onClick={onClose} style={{ marginLeft: "auto" }}>閉じる</button>
        </div>
        <div className="sheet-title">{item.title}</div>
        <div style={{ marginBottom: "16px" }}><span className="chip">{item.subject}</span></div>

        {isBlank && !allShown ? (
          <>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "14px" }}>
              小タイトルをすべて思い出してください。
            </p>
            {item.subtitles.map((_, i) => (
              <div key={i} className="blank-row">
                <div className="blank-box" />
                <div className="blank-line" />
              </div>
            ))}
            <button className="btn btn-primary btn-full" style={{ marginTop: "14px" }} onClick={showAll}>
              答え合わせ
            </button>
          </>
        ) : (
          <>
            {item.subtitles.map((s, i) => {
              const shown = !!shownIds[s.id];
              return (
                <div key={s.id} className={`recall-row ${shown ? "shown" : ""}`}
                  onClick={() => !isBlank && setShownIds(m => ({ ...m, [s.id]: true }))}>
                  <div className="recall-num">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div className="recall-lbl">
                      {shown ? s.label : <span className="hidden-text">──────</span>}
                    </div>
                    {shown && s.content && <div className="recall-body appear">{s.content}</div>}
                  </div>
                  {!shown && !isBlank && (
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>タップ</span>
                  )}
                </div>
              );
            })}
            {!allShown && !isBlank && (
              <button className="btn btn-secondary btn-full" style={{ marginTop: "10px" }} onClick={showAll}>
                すべて表示
              </button>
            )}
            {allShown && (
              <div className="eval-row">
                {SELF_EVAL.map(e => (
                  <button key={e.value} className="eval-btn" onClick={() => onEval(item.id, e.value)}>
                    {e.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── StatsView ─────────────────────────────────────────────────────────────────
function StatsView({ items }: { items: Item[] }) {
  const totalRecalls = items.reduce((a, it) => a + (it.reviews?.length || 0), 0);
  const blanks  = items.reduce((a, it) => a + (it.reviews?.filter(r => r.mode === "blank").length || 0), 0);
  const recalls = totalRecalls - blanks;
  const weak    = items.filter(it => it.reviews?.slice(-1)[0]?.eval === "failed");

  const subjCount: Record<string, number> = {};
  items.forEach(it => { subjCount[it.subject] = (subjCount[it.subject] || 0) + 1; });
  const maxS = Math.max(...Object.values(subjCount), 1);

  return (
    <div className="pad appear">
      <div className="section-head">サマリー</div>
      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        {[
          { n: items.length, l: "登録タイトル" },
          { n: recalls,      l: "想起回数" },
          { n: blanks,       l: "白紙再現回数" },
          { n: weak.length,  l: "苦手項目" },
        ].map(x => (
          <div key={x.l} className="stat-card">
            <div className="stat-num">{x.n}</div>
            <div className="stat-lbl">{x.l}</div>
          </div>
        ))}
      </div>
      <div className="divider" />
      <div className="section-head">科目別</div>
      {Object.entries(subjCount).sort((a,b) => b[1]-a[1]).map(([s, n]) => (
        <div key={s} className="bar-row">
          <div className="bar-name">{s}</div>
          <div className="bar-wrap"><div className="bar-fill" style={{ width: `${(n/maxS)*100}%` }} /></div>
          <div className="bar-count">{n}</div>
        </div>
      ))}
      {weak.length > 0 && (
        <>
          <div className="divider" />
          <div className="section-head">苦手項目</div>
          {weak.map(it => (
            <div key={it.id} className="card">
              <div className="card-title" style={{ fontSize: "14px" }}>{it.title}</div>
              <div className="card-meta">
                <span className="chip">{it.subject}</span>
                <span className="chip">思い出せなかった</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState("list");
  const [items,      setItems]      = useState<Item[]>([]);
  const [search,     setSearch]     = useState("");
  const [editItem,   setEditItem]   = useState<Item | null>(null);
  const [recallItem, setRecallItem] = useState<Item | null>(null);
  const [recallMode, setRecallMode] = useState("recall");
  const [showEdit,   setShowEdit]   = useState(false);

  useEffect(() => {
    const d = loadData() as { items?: Item[] };
    if (d.items) { setItems(d.items); }
    else { saveData({ items: SEED }); setItems(SEED); }
  }, []);

  const persist = useCallback((next: Item[]) => { setItems(next); saveData({ items: next }); }, []);

  const handleSaveNew = (f: Omit<Item, "id"|"reviews"|"createdAt">) =>
    { persist([{ id: genId(), ...f, reviews: [], createdAt: Date.now() }, ...items]); setTab("list"); };
  const handleEdit = (f: Omit<Item, "id"|"reviews"|"createdAt">) =>
    { persist(items.map(it => it.id === editItem!.id ? { ...it, ...f } : it)); setEditItem(null); setShowEdit(false); };
  const handleDelete = (id: string) =>
    { if (!confirm("削除しますか？")) return; persist(items.filter(it => it.id !== id)); };
  const handleEval = (id: string, val: string) => {
    const r: Review = { id: genId(), at: Date.now(), mode: recallMode, eval: val };
    persist(items.map(it => it.id === id ? { ...it, reviews: [...(it.reviews||[]), r] } : it));
    setRecallItem(null);
  };

  const openRecall = (it: Item, m: string) => { setRecallItem(it); setRecallMode(m); };

  const filtered = useMemo(() =>
    items.filter(it =>
      it.title.includes(search) || it.subject.includes(search) ||
      it.subtitles?.some(s => s.label.includes(search))
    ), [items, search]);

  const lastEval = (it: Item) => {
    const l = it.reviews?.slice(-1)[0];
    return l ? SELF_EVAL.find(e => e.value === l.eval)?.label : null;
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="header">
          <span className="header-title">StudyTree</span>
          <span className="header-sub">構造を再現する学習</span>
        </header>

        <main className="content">
          {tab === "list" && (
            <div className="pad">
              <div className="search-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索…" />
                {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
              </div>
              {filtered.length === 0 ? (
                <div className="empty">
                  {search ? "一致する項目がありません。" : "項目がありません。「追加」から登録してください。"}
                </div>
              ) : filtered.map(it => (
                <div key={it.id} className="card appear">
                  <div className="card-title">{it.title}</div>
                  <div className="card-meta">
                    <span className="chip">{it.subject}</span>
                    <span className="chip">{it.date}</span>
                    <span className="chip">{it.subtitles?.length || 0} 項目</span>
                    {lastEval(it) && <span className="chip">{lastEval(it)}</span>}
                  </div>
                  {it.memo && <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>{it.memo}</div>}
                  <div className="card-actions">
                    <button className="card-action-btn accent" onClick={() => openRecall(it, "recall")}>想起</button>
                    <button className="card-action-btn accent" onClick={() => openRecall(it, "blank")}>白紙再現</button>
                    <button className="btn-ghost" style={{ marginLeft: "auto" }} onClick={() => { setEditItem(it); setShowEdit(true); }}>編集</button>
                    <button className="btn-ghost" onClick={() => handleDelete(it.id)}>削除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "add"   && <ItemForm onSave={handleSaveNew} />}
          {tab === "tree"  && <TreeView items={items} onReview={it => openRecall(it, "recall")} />}
          {tab === "stats" && <StatsView items={items} />}
        </main>

        <nav className="tab-bar">
          {TABS.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {recallItem && (
          <RecallSheet item={recallItem} mode={recallMode} onClose={() => setRecallItem(null)} onEval={handleEval} />
        )}

        {showEdit && editItem && (
          <div className="overlay" onClick={() => setShowEdit(false)}>
            <div className="sheet" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontWeight: 700, fontSize: "16px" }}>編集</span>
                <button className="btn-ghost" onClick={() => setShowEdit(false)} style={{ marginLeft: "auto" }}>閉じる</button>
              </div>
              <ItemForm item={editItem} onSave={handleEdit} onCancel={() => setShowEdit(false)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
