import { dbLoadEntries, dbSaveEntry } from "./supabase.js"
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";

// ─── TOURNAMENT DATA ──────────────────────────────────────────────────────────
const GROUPS = {
  A:["Mexico","South Africa","South Korea","Czech Republic"],
  B:["Canada","Bosnia & Herzegovina","Qatar","Switzerland"],
  C:["Brazil","Morocco","Haiti","Scotland"],
  D:["USA","Paraguay","Turkey","Australia"],
  E:["Germany","Ivory Coast","Curaçao","Ecuador"],
  F:["Japan","Tunisia","Netherlands","Sweden"],
  G:["Belgium","Iran","Egypt","New Zealand"],
  H:["Spain","Cape Verde","Saudi Arabia","Uruguay"],
  I:["France","Norway","Iraq","Senegal"],
  J:["Argentina","Algeria","Jordan","Austria"],
  K:["Portugal","Colombia","Uzbekistan","DR Congo"],
  L:["England","Panama","Croatia","Ghana"],
};

const FLAG_CODES = {
  Mexico:"mx","South Africa":"za","South Korea":"kr","Czech Republic":"cz",
  Canada:"ca","Bosnia & Herzegovina":"ba",Qatar:"qa",Switzerland:"ch",
  Brazil:"br",Morocco:"ma",Haiti:"ht",Scotland:"gb-sct",
  USA:"us",Paraguay:"py",Turkey:"tr",Australia:"au",
  Germany:"de","Ivory Coast":"ci","Curaçao":"cw",Ecuador:"ec",
  Japan:"jp",Tunisia:"tn",Netherlands:"nl",Sweden:"se",
  Belgium:"be",Iran:"ir",Egypt:"eg","New Zealand":"nz",
  Spain:"es","Cape Verde":"cv","Saudi Arabia":"sa",Uruguay:"uy",
  France:"fr",Norway:"no",Iraq:"iq",Senegal:"sn",
  Argentina:"ar",Algeria:"dz",Jordan:"jo",Austria:"at",
  Portugal:"pt",Colombia:"co",Uzbekistan:"uz","DR Congo":"cd",
  England:"gb-eng",Panama:"pa",Croatia:"hr",Ghana:"gh",
};
const FlagIcon = ({ t, size=20 }) => {
  const code = FLAG_CODES[t];
  if (!code) return <span style={{display:"inline-block",width:size,height:Math.round(size*0.75),background:"#3A5A48",borderRadius:2,flexShrink:0,verticalAlign:"middle"}}/>;
  return <img src={`https://flagcdn.com/w40/${code}.png`} width={size} height={Math.round(size*0.75)} alt={t} style={{display:"inline-block",verticalAlign:"middle",borderRadius:2,objectFit:"cover",flexShrink:0}}/>;
};

// ─── BRACKET STRUCTURE ────────────────────────────────────────────────────────
// Each side (A=SF1, B=SF2) has: 8 R32 → 4 R16 → 2 QF → 1 SF
// Feeders are match IDs — R16 winner feeds from two R32 winners, etc.

const R32 = [
  // SIDE A
  {id:"r32_1", fifa:"M73", top:{p:2,g:"A"}, bot:{p:2,g:"B"}, r16:"r16_1", side:"A"},
  {id:"r32_2", fifa:"M75", top:{p:1,g:"F"}, bot:{p:2,g:"C"}, r16:"r16_1", side:"A"},
  {id:"r32_3", fifa:"M74", top:{p:1,g:"E"}, bot:{p:3,note:"Best 3rd ABCDF"}, r16:"r16_2", side:"A"},
  {id:"r32_4", fifa:"M77", top:{p:1,g:"I"}, bot:{p:3,note:"Best 3rd CDFGH"}, r16:"r16_2", side:"A"},
  {id:"r32_5", fifa:"M76", top:{p:1,g:"C"}, bot:{p:2,g:"F"}, r16:"r16_3", side:"A"},
  {id:"r32_6", fifa:"M78", top:{p:2,g:"E"}, bot:{p:2,g:"I"}, r16:"r16_3", side:"A"},
  {id:"r32_7", fifa:"M79", top:{p:1,g:"A"}, bot:{p:3,note:"Best 3rd CEFHI"}, r16:"r16_4", side:"A"},
  {id:"r32_8", fifa:"M80", top:{p:1,g:"L"}, bot:{p:3,note:"Best 3rd EHIJK"}, r16:"r16_4", side:"A"},
  // SIDE B
  {id:"r32_9",  fifa:"M84", top:{p:1,g:"H"}, bot:{p:2,g:"J"}, r16:"r16_5", side:"B"},
  {id:"r32_10", fifa:"M83", top:{p:2,g:"K"}, bot:{p:2,g:"L"}, r16:"r16_5", side:"B"},
  {id:"r32_11", fifa:"M81", top:{p:1,g:"D"}, bot:{p:3,note:"Best 3rd BEFIJ"}, r16:"r16_6", side:"B"},
  {id:"r32_12", fifa:"M82", top:{p:1,g:"G"}, bot:{p:3,note:"Best 3rd AEHIJ"}, r16:"r16_6", side:"B"},
  {id:"r32_13", fifa:"M86", top:{p:1,g:"J"}, bot:{p:2,g:"H"}, r16:"r16_7", side:"B"},
  {id:"r32_14", fifa:"M88", top:{p:2,g:"D"}, bot:{p:2,g:"G"}, r16:"r16_7", side:"B"},
  {id:"r32_15", fifa:"M85", top:{p:1,g:"B"}, bot:{p:3,note:"Best 3rd EFGIJ"}, r16:"r16_8", side:"B"},
  {id:"r32_16", fifa:"M87", top:{p:1,g:"K"}, bot:{p:3,note:"Best 3rd DEIJL"}, r16:"r16_8", side:"B"},
];

const R16 = [
  {id:"r16_1", top:"r32_1", bot:"r32_2", qf:"qf1", side:"A"},
  {id:"r16_2", top:"r32_3", bot:"r32_4", qf:"qf1", side:"A"},
  {id:"r16_3", top:"r32_5", bot:"r32_6", qf:"qf2", side:"A"},
  {id:"r16_4", top:"r32_7", bot:"r32_8", qf:"qf2", side:"A"},
  {id:"r16_5", top:"r32_9",  bot:"r32_10", qf:"qf3", side:"B"},
  {id:"r16_6", top:"r32_11", bot:"r32_12", qf:"qf3", side:"B"},
  {id:"r16_7", top:"r32_13", bot:"r32_14", qf:"qf4", side:"B"},
  {id:"r16_8", top:"r32_15", bot:"r32_16", qf:"qf4", side:"B"},
];

const QF = [
  {id:"qf1", top:"r16_1", bot:"r16_2", sf:"sf1", side:"A"},
  {id:"qf2", top:"r16_3", bot:"r16_4", sf:"sf1", side:"A"},
  {id:"qf3", top:"r16_5", bot:"r16_6", sf:"sf2", side:"B"},
  {id:"qf4", top:"r16_7", bot:"r16_8", sf:"sf2", side:"B"},
];

const SF = [
  {id:"sf1", top:"qf1", bot:"qf2", final:"final", side:"A"},
  {id:"sf2", top:"qf3", bot:"qf4", final:"final", side:"B"},
];

// Build a lookup of which match feeds which parent
// parent[childId] = parentId
const PARENT = {};
R16.forEach(m => { PARENT[m.top] = m.id; PARENT[m.bot] = m.id; });
QF.forEach(m  => { PARENT[m.top] = m.id; PARENT[m.bot] = m.id; });
SF.forEach(m  => { PARENT[m.top] = m.id; PARENT[m.bot] = m.id; });
PARENT["sf1"] = "final"; PARENT["sf2"] = "final";

const LOCK_DATE = new Date("2026-06-11T15:00:00Z");
const isLocked = () => new Date() >= LOCK_DATE;

// ─── STORAGE ──────────────────────────────────────────────────────────────────
// Storage now handled by Supabase (see supabase.js)
// Falls back to localStorage if env vars not set
async function loadEntries() {
  return dbLoadEntries()
}
async function saveEntries(entry) {
  return dbSaveEntry(entry)
}


// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  base:"#060b08", surface:"#0c1812", raised:"#132018",
  border:"#1e3828", borderHi:"#2e5840",
  gold:"#F2B705", goldHi:"#FFD34E", goldDim:"#7A5C02", goldGlow:"#F2B70518",
  green:"#25A244", red:"#E8362A", white:"#EFF4EC", slate:"#8BA898", dim:"#3A5A48",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${T.base};color:${T.white};font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
button{cursor:pointer;font-family:inherit;transition:all .15s}
button:disabled{opacity:.35;cursor:not-allowed;pointer-events:none}
input{font-family:inherit}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
input::placeholder{color:${T.dim}}
input:focus{outline:none;border-color:${T.gold}!important;box-shadow:0 0 0 2px ${T.goldGlow}}

@keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes glow{0%,100%{filter:drop-shadow(0 0 10px ${T.gold}99)}50%{filter:drop-shadow(0 0 24px ${T.goldHi})}}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}

.trophy-anim{animation:glow 2.8s ease-in-out infinite;display:inline-block}
.fade-in{animation:up .28s ease both}
.spin-anim{width:16px;height:16px;border:2px solid ${T.border};border-top-color:${T.gold};border-radius:50%;animation:spin .65s linear infinite;display:inline-block;vertical-align:middle}
.live-dot{width:7px;height:7px;border-radius:50%;background:${T.red};display:inline-block;animation:pulse 1s infinite}

.nav-tab{padding:11px 18px;background:transparent;color:${T.slate};border:none;border-bottom:2px solid transparent;font-size:13px;font-weight:600;letter-spacing:.03em;white-space:nowrap}
.nav-tab:hover{color:${T.white}}
.nav-tab.active{color:${T.gold};border-bottom-color:${T.gold}}

.card{background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:20px}
.input{width:100%;padding:10px 13px;background:${T.base};border:1px solid ${T.border};border-radius:8px;color:${T.white};font-size:14px}
.lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${T.slate};margin-bottom:6px;display:block;font-weight:600}

.btn-gold{padding:11px 24px;background:${T.gold};color:${T.base};border:none;border-radius:8px;font-size:14px;font-weight:700}
.btn-gold:hover{background:${T.goldHi};transform:translateY(-1px)}
.btn-ghost{padding:10px 22px;background:transparent;color:${T.gold};border:1.5px solid ${T.goldDim};border-radius:8px;font-size:14px;font-weight:600}
.btn-ghost:hover{border-color:${T.gold};background:${T.goldGlow}}
.btn-sm{padding:6px 13px;font-size:12px}

.step{flex:1;text-align:center;padding:9px 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-bottom:2px solid ${T.border};color:${T.dim};transition:all .2s}
.step.active{color:${T.gold};border-bottom-color:${T.gold}}
.step.done{color:${T.green};border-bottom-color:${T.green};cursor:pointer}

.grid-2{display:grid;grid-template-columns:repeat(auto-fill,minmax(262px,1fr));gap:14px}
.team-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid ${T.border}}
.team-row:last-child{border-bottom:none}
.pick-btn{padding:5px 11px;border-radius:5px;border:1px solid ${T.border};background:${T.base};color:${T.slate};font-size:12px;font-weight:500}
.pick-btn:hover{border-color:${T.gold}44;color:${T.white}}
.pick-btn.sel{background:${T.goldGlow};border-color:${T.gold};color:${T.gold};font-weight:700}
.pick-btn.third{background:#25A24418;border-color:#25A24455;color:${T.green}}

.hint{font-size:12px;color:${T.slate};line-height:1.65;padding:10px 14px;background:${T.base};border:1px solid ${T.border};border-radius:8px}
.section-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:${T.gold};letter-spacing:.08em;text-transform:uppercase}

/* ── BRACKET TREE ─────────────────────────────────────────── */
/* Horizontal scroll wrapper */
.bkt-scroll{overflow-x:auto;overflow-y:auto;padding-bottom:12px}
.bkt-scroll::-webkit-scrollbar{height:5px}

/* The outer flex row: one column per round */
.bkt-row{display:flex;align-items:flex-start;gap:0;min-width:max-content}

/* A round column */
.bkt-col{display:flex;flex-direction:column;width:190px;flex-shrink:0}
.bkt-col-header{
  font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;
  letter-spacing:.12em;text-transform:uppercase;color:${T.slate};
  text-align:center;padding:0 8px 10px;border-bottom:1px solid ${T.border};
  margin-bottom:0;
}
.bkt-col-header span{display:block;font-size:10px;font-weight:400;color:${T.dim};margin-top:2px;font-family:'DM Sans',sans-serif;letter-spacing:.04em}

/* Connector column */
.bkt-conn{width:28px;flex-shrink:0;position:relative}

/* Match card */
.bkt-match{
  background:${T.raised};border:1px solid ${T.border};border-radius:8px;
  overflow:hidden;margin:0 8px;transition:border-color .2s;
  flex-shrink:0;
}
.bkt-match.picked{border-color:${T.borderHi}}
.bkt-match-hdr{
  padding:3px 8px;border-bottom:1px solid ${T.border};
  display:flex;justify-content:space-between;align-items:center;
}
.bkt-match-hdr-txt{
  font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;
  color:${T.slate};letter-spacing:.1em;text-transform:uppercase
}

/* Team row inside match */
.bkt-team{
  display:flex;align-items:center;gap:6px;padding:6px 8px;
  font-size:12px;font-weight:500;color:${T.white};
  transition:background .12s;min-height:32px;
  border-bottom:1px solid ${T.border};
}
.bkt-team:last-child{border-bottom:none}
.bkt-team.clickable{cursor:pointer}
.bkt-team.clickable:hover{background:${T.border}}
.bkt-team.winner{background:${T.goldGlow};color:${T.gold};font-weight:700}
.bkt-team.winner .bkt-flag{filter:drop-shadow(0 0 3px ${T.gold}88)}
.bkt-team.loser{opacity:.38}
.bkt-team.tbd{color:${T.dim};font-style:italic;pointer-events:none}
.bkt-flag{font-size:15px;flex-shrink:0;line-height:1}
.bkt-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
.bkt-check{color:${T.gold};font-size:11px;flex-shrink:0}
.bkt-3rd{font-size:9px;color:${T.green};border:1px solid ${T.green}44;border-radius:3px;padding:1px 4px;flex-shrink:0}
.bkt-slot{font-size:9px;color:${T.dim};border:1px solid ${T.border};border-radius:3px;padding:1px 5px;white-space:nowrap;flex-shrink:0;max-width:90px;overflow:hidden;text-overflow:ellipsis}

/* Spacer to vertically center match in its slot */
.bkt-spacer{flex:1}

/* Connector SVG drawn per-pair */
.bkt-conn-svg{display:block;width:28px}

/* Final card */
.final-card{
  background:linear-gradient(135deg,${T.raised},#182820);
  border:1px solid ${T.goldDim};border-radius:12px;overflow:hidden;
  box-shadow:0 0 40px ${T.goldGlow};max-width:480px;margin:0 auto;
}
.final-team-row{
  display:flex;align-items:center;gap:10px;padding:14px 18px;
  font-size:14px;font-weight:600;transition:background .15s;
  border-bottom:1px solid ${T.border};cursor:pointer;min-height:52px;
}
.final-team-row:last-child{border-bottom:none}
.final-team-row:hover{background:${T.border}}
.final-team-row.winner{background:${T.goldGlow};color:${T.gold};font-weight:700}
.final-team-row.loser{opacity:.4}
.final-team-row.tbd{color:${T.dim};font-style:italic;pointer-events:none;cursor:default}

.lb-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid ${T.border};transition:background .1s}
.lb-row:hover{background:${T.raised}}
.lb-row.top{background:${T.goldGlow};border-left:3px solid ${T.gold}}
.badge-ok{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${T.green}22;border:1px solid ${T.green}44;color:${T.green}}

.side-a{background:#1a3a5a22;border:1px solid #2a6a9a44;color:#6ab4ea;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.08em}
.side-b{background:#3a1a5a22;border:1px solid #7a4aaa44;color:#b47aea;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.08em}

.fixture-row{display:flex;align-items:center;padding:9px 0;border-bottom:1px solid ${T.border};gap:8px;flex-wrap:wrap}
.fixture-row:last-child{border-bottom:none}
.fixture-score{font-family:'Barlow Condensed',sans-serif;font-size:18px;color:${T.gold};min-width:46px;text-align:center}
`;

// ─── BRACKET STATE ────────────────────────────────────────────────────────────
// winners: { matchId: teamName }
// getTeam(matchId) → resolved team name or null
// When you pick a winner for matchId, they populate the next round automatically
// If you repick, downstream picks are cleared

function useBracket(gPicks, thirdPicks) {
  const [winners, setWinners] = useState({});

  // Resolve what team fills a slot in R32 (group picks or 3rd-place picks)
  const resolveR32Slot = useCallback((slot, matchId) => {
    if (slot.p === 3) {
      // Map 3rd-place slots in order across all R32 matches with p===3
      const thirdMatchIds = R32.filter(m => m.bot.p === 3).map(m => m.id);
      const idx = thirdMatchIds.indexOf(matchId);
      return thirdPicks[idx] || null;
    }
    const picks = gPicks[slot.g] || [];
    return picks[slot.p - 1] || null;
  }, [gPicks, thirdPicks]);

  // Get both teams for any match in the bracket
  // For R32: resolved from group/3rd picks
  // For R16/QF/SF: resolved from winners of feeder matches
  const getTeams = useCallback((matchId) => {
    const r32m = R32.find(m => m.id === matchId);
    if (r32m) {
      return [
        resolveR32Slot(r32m.top, matchId),
        resolveR32Slot(r32m.bot, matchId),
      ];
    }
    const r16m = R16.find(m => m.id === matchId);
    if (r16m) return [winners[r16m.top] || null, winners[r16m.bot] || null];

    const qfm = QF.find(m => m.id === matchId);
    if (qfm) return [winners[qfm.top] || null, winners[qfm.bot] || null];

    const sfm = SF.find(m => m.id === matchId);
    if (sfm) return [winners[sfm.top] || null, winners[sfm.bot] || null];

    if (matchId === "final") return [winners["sf1"] || null, winners["sf2"] || null];
    return [null, null];
  }, [winners, resolveR32Slot]);

  // Pick a winner — store it and clear all downstream if changed
  const pickWinner = useCallback((matchId, team) => {
    setWinners(prev => {
      // If picking the same team again, deselect
      if (prev[matchId] === team) {
        const next = { ...prev };
        delete next[matchId];
        clearAll(next, matchId);
        return next;
      }
      const next = { ...prev, [matchId]: team };
      // If this match already had a different winner, clear everything downstream
      if (prev[matchId] && prev[matchId] !== team) {
        clearAll(next, matchId);
      }
      return next;
    });
  }, []);

  // Recursively delete winners of all matches that depend on matchId
  const clearAll = (obj, matchId) => {
    const parent = PARENT[matchId];
    if (!parent) return;
    if (obj[parent]) {
      delete obj[parent];
      clearAll(obj, parent);
    }
  };

  const finalDone = !!winners["final"];

  return { winners, getTeams, pickWinner, finalDone };
}

// ─── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({ matchId, label, subLabel, teams, winner, onPick, registerRef }) {
  const ref = useRef(null);
  useEffect(() => { if (registerRef && ref.current) registerRef(matchId, ref.current); }, [matchId, registerRef]);

  const [t1, t2] = teams;
  const canPick = !!(t1 && t2);

  const isThirdSlot = (idx) => {
    if (idx !== 1) return false;
    const r32m = R32.find(m => m.id === matchId);
    return r32m?.bot?.p === 3;
  };

  const slotLabel = (slot, idx) => {
    if (!slot) return null;
    if (idx === 0) {
      const r32m = R32.find(m => m.id === matchId);
      if (r32m && !t1) return r32m.top.p === 3 ? r32m.top.note : `${r32m.top.p === 1 ? "1st" : "2nd"} Grp ${r32m.top.g}`;
    }
    if (idx === 1) {
      const r32m = R32.find(m => m.id === matchId);
      if (r32m && !t2) return r32m.bot.p === 3 ? r32m.bot.note : `${r32m.bot.p === 1 ? "1st" : "2nd"} Grp ${r32m.bot.g}`;
    }
    return null;
  };

  const TeamRow = ({ team, idx }) => {
    const isW = winner === team;
    const isL = winner && !isW;
    const is3 = isThirdSlot(idx);
    const slot = slotLabel(null, idx);

    if (!team) return (
      <div className="bkt-team tbd">
        <FlagIcon t={null} size={15}/>
        <span className="bkt-name" style={{fontStyle:"normal",color:T.dim,fontSize:11}}>{slot || "TBD"}</span>
        {is3 && <span className="bkt-3rd">3rd</span>}
      </div>
    );
    return (
      <div
        className={`bkt-team${canPick ? " clickable" : ""}${isW ? " winner" : isL ? " loser" : ""}`}
        onClick={() => canPick && onPick(matchId, team)}
      >
        <FlagIcon t={team} size={15}/>
        <span className="bkt-name">{team}</span>
        {is3 && <span className="bkt-3rd">3rd</span>}
        {isW && <span className="bkt-check">✓</span>}
      </div>
    );
  };

  return (
    <div ref={ref} className={`bkt-match${winner ? " picked" : ""}`}>
      <div className="bkt-match-hdr">
        <span className="bkt-match-hdr-txt">{label}</span>
        {subLabel && <span style={{fontSize:9,color:T.dim}}>{subLabel}</span>}
      </div>
      <TeamRow team={t1} idx={0} />
      <TeamRow team={t2} idx={1} />
    </div>
  );
}

// ─── CONNECTOR SVG ────────────────────────────────────────────────────────────
// Draws an elbow from the center of two source matches to the center of one target
// topY, botY: center-Y of the two feeder matches (relative to container top)
// outY: center-Y of the target match
// All values are px, relative to the SVG container which fills the connector column
function Connector({ topY, botY, outY, containerH, isLit }) {
  if (topY == null || botY == null || outY == null || containerH == null) return null;
  const w = 28;
  const midX = 14;
  const color = isLit ? T.gold : T.border;
  const opacity = isLit ? 0.9 : 0.45;
  // lines from left edge (0) to midX, then vertical from topY to botY, then to right edge
  const d = `M 0 ${topY} H ${midX} V ${botY} M ${midX} ${outY} H ${w}`;
  return (
    <svg width={w} height={containerH} style={{display:"block",position:"absolute",top:0,left:0,overflow:"visible",pointerEvents:"none"}}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity={opacity} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── BRACKET SIDE ─────────────────────────────────────────────────────────────
// Renders one side (A or B) as a horizontal bracket:
// [R32 col] [conn] [R16 col] [conn] [QF col] [conn] [SF col]
function BracketSide({ side, getTeams, winners, onPick }) {
  const r32 = R32.filter(m => m.side === side);
  const r16 = R16.filter(m => m.side === side);
  const qf  = QF.filter(m  => m.side === side);
  const sf  = SF.find(m   => m.side === side);

  // Refs to every match DOM node, keyed by matchId
  const matchRefs = useRef({});
  const containerRef = useRef(null);
  const [connectors, setConnectors] = useState([]);

  const registerRef = useCallback((id, el) => {
    matchRefs.current[id] = el;
  }, []);

  // Measure positions and compute connector coordinates after every render
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const containerRect = container.getBoundingClientRect();
      const get = (id) => {
        const el = matchRefs.current[id];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          top: r.top - containerRect.top,
          bot: r.bottom - containerRect.top,
          mid: (r.top + r.bottom) / 2 - containerRect.top,
          right: r.right - containerRect.left,
          left:  r.left  - containerRect.left,
        };
      };

      const lines = [];

      // R32 → R16: each pair of R32 feeds one R16
      r16.forEach(m16 => {
        const a = get(m16.top);  // top R32 match
        const b = get(m16.bot);  // bot R32 match
        const c = get(m16.id);   // R16 match
        if (!a || !b || !c) return;
        // connector column sits between R32 and R16 columns
        // draw from right edge of R32 matches to left edge of R16 match
        const connW = 28;
        lines.push({ id:`${m16.id}_in`, topY: a.mid, botY: b.mid, outY: c.mid, isLit: !!(winners[m16.top] && winners[m16.bot]) });
      });

      // R16 → QF
      qf.forEach(mqf => {
        const a = get(mqf.top);
        const b = get(mqf.bot);
        const c = get(mqf.id);
        if (!a || !b || !c) return;
        lines.push({ id:`${mqf.id}_in`, topY: a.mid, botY: b.mid, outY: c.mid, isLit: !!(winners[mqf.top] && winners[mqf.bot]) });
      });

      // QF → SF
      if (sf) {
        const a = get(sf.top);
        const b = get(sf.bot);
        const c = get(sf.id);
        if (a && b && c) {
          lines.push({ id:`${sf.id}_in`, topY: a.mid, botY: b.mid, outY: c.mid, isLit: !!(winners[sf.top] && winners[sf.bot]) });
        }
      }

      setConnectors(lines);
    };

    compute();
    // Also recompute on resize
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }); // run every render so picks update connector colors

  const ROUND_LABELS = {
    r32: { title:"Round of 32", sub:"Jun 28–Jul 3" },
    r16: { title:"Round of 16", sub:"Jul 4–7" },
    qf:  { title:"Quarter-Finals", sub:"Jul 9–11" },
    sf:  { title:`Semi-Final ${side === "A" ? "1" : "2"}`, sub: side === "A" ? "Jul 14" : "Jul 15" },
  };

  const MATCH_GAP = 10; // px gap between match cards within a column
  const MATCH_HEIGHT = 80; // approximate height per match card (header + 2 rows)

  // Each round column renders its matches spaced so their vertical centers
  // align with what connectors expect
  const ColRound = ({ matches, roundKey }) => (
    <div className="bkt-col">
      <div className="bkt-col-header">
        {ROUND_LABELS[roundKey].title}
        <span>{ROUND_LABELS[roundKey].sub}</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap: MATCH_GAP, paddingTop: MATCH_GAP }}>
        {matches.map(m => {
          const teams = getTeams(m.id);
          const label = m.fifa || m.id.toUpperCase().replace(/_/g, " ");
          return (
            <MatchCard
              key={m.id}
              matchId={m.id}
              label={label}
              teams={teams}
              winner={winners[m.id]}
              onPick={onPick}
              registerRef={registerRef}
            />
          );
        })}
      </div>
    </div>
  );

  // The connector column is positioned absolutely over the space between two round columns
  // We render it as a relative-position wrapper that contains the absolute SVG
  const ConnCol = ({ lines, pairIds }) => {
    const container = containerRef.current;
    const containerRect = container?.getBoundingClientRect();
    const relevant = lines.filter(l => pairIds.includes(l.id));
    if (!relevant.length || !containerRect) return <div style={{width:28,flexShrink:0}}/>;
    const maxY = Math.max(...relevant.map(l => Math.max(l.topY, l.botY, l.outY))) + 20;
    return (
      <div style={{width:28,flexShrink:0,position:"relative",minHeight:maxY}}>
        {relevant.map(l => (
          <Connector key={l.id} topY={l.topY} botY={l.botY} outY={l.outY}
            containerH={maxY} isLit={l.isLit}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span className={side==="A"?"side-a":"side-b"}>{side==="A"?"SEMI-FINAL 1 SIDE":"SEMI-FINAL 2 SIDE"}</span>
        <span style={{fontSize:11,color:T.dim}}>→ Final · MetLife Stadium · Jul 19</span>
      </div>

      <div ref={containerRef} style={{position:"relative"}}>
        {/* The connector SVG lives inside this positioned container */}
        {connectors.map(l => (
          <Connector key={l.id} topY={l.topY} botY={l.botY} outY={l.outY}
            containerH={containerRef.current?.offsetHeight || 600} isLit={l.isLit}
          />
        ))}

        <div className="bkt-scroll">
          <div className="bkt-row">
            {/* R32 */}
            <ColRound matches={r32} roundKey="r32" />
            {/* spacer for connector */}
            <div style={{width:28,flexShrink:0}}/>
            {/* R16 */}
            <ColRound matches={r16} roundKey="r16" />
            <div style={{width:28,flexShrink:0}}/>
            {/* QF */}
            <ColRound matches={qf} roundKey="qf" />
            <div style={{width:28,flexShrink:0}}/>
            {/* SF */}
            {sf && (
              <div className="bkt-col">
                <div className="bkt-col-header">
                  {ROUND_LABELS.sf.title}
                  <span>{ROUND_LABELS.sf.sub}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"center",flex:1,paddingTop:MATCH_GAP}}>
                  <MatchCard
                    matchId={sf.id}
                    label={`SF${side==="A"?"1":"2"}`}
                    teams={getTeams(sf.id)}
                    winner={winners[sf.id]}
                    onPick={onPick}
                    registerRef={registerRef}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FINAL CARD ───────────────────────────────────────────────────────────────
function FinalCard({ teams, winner, onPick }) {
  const [t1, t2] = teams;
  const canPick = !!(t1 && t2);

  const Row = ({ team }) => {
    const isW = winner === team;
    const isL = winner && !isW;
    if (!team) return (
      <div className="final-team-row tbd">
        <FlagIcon t={null} size={26}/>
        <span style={{fontSize:16}}>TBD — complete semi-finals</span>
      </div>
    );
    return (
      <div
        className={`final-team-row${isW?" winner":isL?" loser":""}`}
        onClick={() => canPick && onPick("final", team)}
      >
        <FlagIcon t={team} size={28}/>
        <span style={{flex:1,fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:700,letterSpacing:".04em"}}>{team}</span>
        {isW && <span style={{fontSize:20}}>🏆</span>}
        {!winner && canPick && <span style={{fontSize:11,color:T.slate,border:`1px solid ${T.border}`,padding:"2px 8px",borderRadius:4}}>Pick winner</span>}
      </div>
    );
  };

  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,justifyContent:"center"}}>
        <div className="trophy-anim" style={{fontSize:32}}>🏆</div>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:800,color:T.gold,letterSpacing:".06em",lineHeight:.9}}>THE FINAL</div>
          <div style={{fontSize:11,color:T.slate,marginTop:3}}>MetLife Stadium · July 19, 2026</div>
        </div>
      </div>
      <div className="final-card">
        <div style={{padding:"7px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"center"}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,color:T.slate,letterSpacing:".14em",textTransform:"uppercase"}}>World Cup Champion</span>
        </div>
        <Row team={t1} />
        <div style={{height:1,background:T.border}}/>
        <Row team={t2} />
      </div>
      {winner && <div style={{textAlign:"center",marginTop:12,fontSize:14,color:T.gold,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><FlagIcon t={winner} size={18}/> {winner} wins the 2026 World Cup!</div>}
    </div>
  );
}

// ─── PREDICT TAB ──────────────────────────────────────────────────────────────
function PredictTab({ onSubmit }) {
  const locked = isLocked();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [step,setStep] = useState(0);
  const [gPicks,setGPicks] = useState({});
  const [thirdPicks,setThirdPicks] = useState([]);
  const [submitted,setSubmitted] = useState(false);

  const { winners, getTeams, pickWinner, finalDone } = useBracket(gPicks, thirdPicks);

  const groupsDone = Object.keys(GROUPS).every(g => (gPicks[g]||[]).length === 2);
  const groupCount = Object.keys(GROUPS).filter(g => (gPicks[g]||[]).length === 2).length;

  const toggleGroup = (grp, team) => {
    setGPicks(prev => {
      const cur = (prev[grp]||[]).filter(Boolean);
      if (cur.includes(team)) return { ...prev, [grp]: cur.filter(t=>t!==team) };
      if (cur.length >= 2) return prev;
      return { ...prev, [grp]: [...cur, team] };
    });
  };

  const toggleThird = (team) => {
    setThirdPicks(prev =>
      prev.includes(team) ? prev.filter(t=>t!==team) : prev.length < 8 ? [...prev, team] : prev
    );
  };


  const doSubmit = async () => {
    const entry = { id:Date.now(), name:name.trim(), email:email.trim(), submittedAt:new Date().toISOString(), gPicks, thirdPicks, winners, score:0, correctPicks:0 };
    await saveEntries(entry);
    onSubmit(); setSubmitted(true);
  };

  if (locked) return (
    <div className="card fade-in" style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{fontSize:56,marginBottom:14}}>🔒</div>
      <div className="section-title">BRACKET LOCKED</div>
      <div style={{color:T.slate,marginTop:8,fontSize:14}}>Tournament started — check the Leaderboard!</div>
    </div>
  );

  if (submitted) return (
    <div className="card fade-in" style={{textAlign:"center",padding:"60px 20px"}}>
      <div className="trophy-anim" style={{fontSize:64,marginBottom:14}}>🏆</div>
      <div className="section-title">BRACKET LOCKED IN!</div>
      <div style={{color:T.slate,marginTop:8,fontSize:14}}>Saved for <strong style={{color:T.white}}>{name}</strong> · Drop the link in Discord!</div>
      {winners.final && <div style={{marginTop:8,fontSize:14,color:T.gold,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><FlagIcon t={winners.final} size={16}/> {winners.final} wins it all!</div>}
      <button className="btn-ghost" style={{marginTop:22}} onClick={() => { setSubmitted(false); setStep(0); }}>Edit Bracket</button>
    </div>
  );

  const STEPS = ["1 · Info","2 · Groups","3 · 3rd Place","4 · Bracket","5 · Submit"];

  return (
    <div className="fade-in">
      <div style={{display:"flex",marginBottom:20,borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`}}>
        {STEPS.map((l,i) => (
          <div key={i} className={`step${i===step?" active":i<step?" done":""}`} onClick={()=>i<step&&setStep(i)}>
            {i<step?"✓ ":""}{l}
          </div>
        ))}
      </div>

      {/* STEP 0 */}
      {step===0 && (
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>YOUR DETAILS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
            <div><label className="lbl">Name</label><input className="input" placeholder="e.g. Johnny" value={name} onChange={e=>setName(e.target.value)}/></div>
            <div><label className="lbl">Email</label><input className="input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          </div>
          <div className="hint" style={{marginBottom:16}}>Your bracket is shared in real time — anyone with the link sees the leaderboard. Picks lock June 11 at kickoff.</div>
          <button className="btn-gold" disabled={!name.trim()||!email.trim()} onClick={()=>setStep(1)}>Start Bracket →</button>
        </div>
      )}

      {/* STEP 1 — Groups */}
      {step===1 && (
        <div>
          <div className="card" style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div>
                <div className="section-title">GROUP STAGE</div>
                <div style={{fontSize:13,color:T.slate,marginTop:4}}>Pick <strong style={{color:T.gold}}>1st and 2nd</strong> in each group. The order matters — it determines your R32 matchup.</div>
              </div>
              <div style={{fontSize:13,color:groupsDone?T.green:T.slate,fontWeight:700,flexShrink:0}}>{groupCount}/12</div>
            </div>
          </div>
          <div className="grid-2">
            {Object.entries(GROUPS).map(([grp,teams]) => {
              const picks = gPicks[grp]||[]; const done = picks.length===2;
              return (
                <div key={grp} className="card" style={{padding:16,borderColor:done?T.green+"44":T.border}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:T.gold,letterSpacing:".1em"}}>GROUP {grp}</span>
                    <span style={{fontSize:11,color:done?T.green:T.slate,fontWeight:700}}>{done?"✓":picks.length+"/2"}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                    {[0,1].map(idx => (
                      <div key={idx} style={{padding:"5px 8px",background:picks[idx]?T.goldGlow:T.base,border:`1px solid ${picks[idx]?T.goldDim:T.dim}`,borderRadius:6,minHeight:30,display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:9,color:idx===0?T.gold:T.slate,fontWeight:700,flexShrink:0}}>{idx===0?"1ST":"2ND"}</span>
                        {picks[idx] ? <><FlagIcon t={picks[idx]} size={16}/><span style={{fontSize:11,color:T.gold,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{picks[idx]}</span></> : <span style={{fontSize:11,color:T.dim}}>—</span>}
                      </div>
                    ))}
                  </div>
                  {teams.map(t => {
                    const sel = picks.includes(t); const pos = picks.indexOf(t);
                    return (
                      <div key={t} className="team-row">
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <FlagIcon t={t} size={18}/>
                          <span style={{fontSize:13,color:sel?T.white:T.slate,fontWeight:sel?600:400}}>{t}</span>
                          {sel && <span style={{fontSize:9,background:T.goldGlow,border:`1px solid ${T.goldDim}`,color:T.gold,padding:"1px 5px",borderRadius:3,fontWeight:700}}>{pos===0?"1ST":"2ND"}</span>}
                        </div>
                        <button className={`pick-btn${sel?" sel":""}`} onClick={()=>toggleGroup(grp,t)} disabled={!sel&&picks.length>=2}>
                          {sel?"Remove":"Pick"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:18}}>
            <button className="btn-ghost" onClick={()=>setStep(0)}>← Back</button>
            <button className="btn-gold" disabled={!groupsDone} onClick={()=>setStep(2)}>{groupsDone?"Pick 3rd Place Teams →":`${groupCount}/12 complete`}</button>
          </div>
        </div>
      )}

      {/* STEP 2 — Third place */}
      {step===2 && (
        <div className="card">
          <div className="section-title" style={{marginBottom:6}}>3RD PLACE QUALIFIERS</div>
          <div className="hint" style={{marginBottom:16}}><strong style={{color:T.white}}>8 of 12 third-place teams advance</strong> — ranked by points then goal difference. Pick the 8 you think make it. The 4 you leave out go home.</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><span style={{fontSize:13,color:T.slate}}>Select exactly 8</span><span style={{fontSize:13,color:thirdPicks.length===8?T.green:T.slate,fontWeight:700}}>{thirdPicks.length}/8</span></div>
          <div className="grid-2">
            {Object.entries(GROUPS).map(([grp,teams]) => {
              const advancing = gPicks[grp]||[];
              const thirds = teams.filter(t => !advancing.includes(t));
              return (
                <div key={grp} style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                  <div style={{fontSize:11,color:T.gold,fontWeight:700,letterSpacing:".08em",marginBottom:8}}>GROUP {grp} — 3RD &amp; 4TH</div>
                  {thirds.length===0 ? <div style={{fontSize:11,color:T.dim}}>Set Group {grp} picks first</div> :
                  thirds.map(t => (
                    <div key={t} className="team-row">
                      <div style={{display:"flex",alignItems:"center",gap:6}}><FlagIcon t={t} size={18}/><span style={{fontSize:13,color:thirdPicks.includes(t)?T.white:T.slate}}>{t}</span></div>
                      <button className={`pick-btn${thirdPicks.includes(t)?" third":""}`} onClick={()=>toggleThird(t)} disabled={!thirdPicks.includes(t)&&thirdPicks.length>=8}>{thirdPicks.includes(t)?"✓ In":"Pick"}</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:18}}>
            <button className="btn-ghost" onClick={()=>setStep(1)}>← Back</button>
            <button className="btn-gold" disabled={thirdPicks.length!==8} onClick={()=>setStep(3)}>{thirdPicks.length===8?"Build Bracket →":`Pick ${8-thirdPicks.length} more`}</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Bracket */}
      {step===3 && (
        <div>
          <div className="card" style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div>
                <div className="section-title">KNOCKOUT BRACKET</div>
                <div style={{fontSize:13,color:T.slate,marginTop:4}}>Click any team to pick the winner — they advance automatically through each round. Lines turn gold as teams progress.</div>
              </div>
            </div>
          </div>

          <div className="hint" style={{marginBottom:14,display:"flex",gap:16,flexWrap:"wrap"}}>
            <span>🟡 Gold line = both teams have advanced</span>
            <span>✓ = your pick</span>
            <span style={{opacity:.5}}>Faded = eliminated</span>
            <span style={{border:`1px solid ${T.green}44`,borderRadius:3,padding:"1px 4px",color:T.green,fontSize:11}}>3rd</span> = third-place qualifier
          </div>

          <div className="card" style={{marginBottom:14,padding:16}}>
            <BracketSide side="A" getTeams={getTeams} winners={winners} onPick={pickWinner}/>
          </div>
          <div className="card" style={{marginBottom:14,padding:16}}>
            <BracketSide side="B" getTeams={getTeams} winners={winners} onPick={pickWinner}/>
          </div>
          <div className="card" style={{marginBottom:14}}>
            <FinalCard teams={[winners.sf1||null, winners.sf2||null]} winner={winners.final} onPick={pickWinner}/>
          </div>

          <div style={{display:"flex",gap:12}}>
            <button className="btn-ghost" onClick={()=>setStep(2)}>← Back</button>
            <button className="btn-gold" disabled={!finalDone} onClick={()=>setStep(4)}>{finalDone?"Review & Submit →":"Complete the bracket first"}</button>
          </div>
        </div>
      )}

      {/* STEP 4 — Review */}
      {step===4 && (
        <div className="card">
          <div className="section-title" style={{marginBottom:16}}>REVIEW YOUR BRACKET</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,padding:14,background:T.raised,borderRadius:10,marginBottom:18}}>
            <div><div className="lbl">Player</div><div style={{fontSize:16,fontWeight:700}}>{name}</div><div style={{fontSize:12,color:T.slate}}>{email}</div></div>
            <div>
              <div className="lbl">🏆 Champion</div>
              <div style={{fontSize:18,display:"flex",alignItems:"center",gap:7}}>
                {winners.final ? <><FlagIcon t={winners.final} size={24}/><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:700,color:T.gold}}>{winners.final}</span></> : "—"}
              </div>
              <div style={{fontSize:12,color:T.slate,marginTop:2}}>
                Finalist: {(() => { const other = winners.final===winners.sf1?winners.sf2:winners.sf1; return other?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><FlagIcon t={other} size={14}/>{other}</span>:"—"; })()}
              </div>
            </div>
          </div>
          <div className="lbl">Group picks</div>
          <div className="grid-2" style={{marginTop:8,marginBottom:16}}>
            {Object.entries(gPicks).map(([g,ts]) => (
              <div key={g} style={{padding:"7px 10px",background:T.raised,borderRadius:6,fontSize:12,color:T.slate}}>
                <span style={{color:T.gold,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14}}>GRP {g} </span>
                {ts.map((t,i)=><span key={t}>{i>0?" · ":""}{i+1}. <FlagIcon t={t} size={13}/> {t}</span>)}
              </div>
            ))}
          </div>
          <div className="lbl">3rd place advancing ({thirdPicks.length})</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20,marginTop:8}}>
            {thirdPicks.map(t => <span key={t} style={{padding:"3px 10px",background:"#25A24418",border:"1px solid #25A24444",borderRadius:20,fontSize:12,color:T.green,display:"inline-flex",alignItems:"center",gap:5}}><FlagIcon t={t} size={14}/>{t}</span>)}
          </div>
          <div style={{display:"flex",gap:12}}>
            <button className="btn-ghost" onClick={()=>setStep(3)}>← Edit Bracket</button>
            <button className="btn-gold" onClick={doSubmit}>🏆 Lock In My Bracket</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardTab({ entries, onRefresh }) {
  const [q,setQ] = useState("");
  const sorted = [...entries].filter(e=>e.name.toLowerCase().includes(q.toLowerCase())||e.email.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.score-a.score);
  return (
    <div className="fade-in">
      <div className="card">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div className="section-title">LEADERBOARD</div>
          <div style={{display:"flex",gap:8}}><input className="input" style={{width:170}} placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)}/><button className="btn-ghost btn-sm" onClick={onRefresh}>↻</button></div>
        </div>
        {entries.length===0 ? (
          <div style={{textAlign:"center",padding:"44px 0",color:T.slate}}>
            <div style={{fontSize:44,marginBottom:10}}>📊</div>
            <div style={{fontSize:15,fontWeight:700,color:T.white,marginBottom:5}}>No brackets yet</div>
            <div style={{fontSize:13}}>Be first — drop the link in Discord!</div>
          </div>
        ) : (
          <>
            <div style={{display:"grid",gridTemplateColumns:"40px 1fr 70px 80px 150px",gap:"0 6px",padding:"4px 12px",fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:T.slate,borderBottom:`1px solid ${T.border}`,marginBottom:2}}>
              <div>#</div><div>Player</div><div style={{textAlign:"center"}}>Pts</div><div style={{textAlign:"center"}}>Correct</div><div>Champion</div>
            </div>
            {sorted.map((e,i) => (
              <div key={e.id} className={`lb-row${i===0?" top":""}`}>
                <div style={{minWidth:34,textAlign:"center",fontSize:i<3?20:14,fontWeight:700,color:i===0?T.gold:i===1?"#ccc":i===2?"#cd7f32":T.slate}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{e.name}</div><div style={{fontSize:11,color:T.slate}}>{e.email}</div></div>
                <div style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,color:T.gold,lineHeight:1}}>{e.score}</div><div style={{fontSize:10,color:T.slate}}>pts</div></div>
                <div style={{textAlign:"center",fontSize:13,color:T.slate,fontWeight:600}}>{e.correctPicks||0}</div>
                <div style={{fontSize:13,display:"flex",alignItems:"center",gap:5}}>{e.winners?.final?<><FlagIcon t={e.winners.final} size={16}/>{e.winners.final}</>:"—"}</div>
              </div>
            ))}
          </>
        )}
        <div style={{marginTop:14,padding:"10px 14px",background:T.base,borderRadius:8,fontSize:12,color:T.slate,lineHeight:1.8}}>
          <strong style={{color:T.white}}>Scoring:</strong> Groups=1pt · 3rd-place picks=1pt ea. · R32=2pts · R16=3pts · QF=5pts · SF=8pts · Champion=15pts
        </div>
      </div>
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorksTab() {
  return (
    <div className="fade-in">
      <div className="card" style={{marginBottom:14}}>
        <div className="section-title" style={{marginBottom:14}}>2026 FORMAT</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:16}}>
          {[["48","Teams"],["12","Groups"],["32","Advance"],["104","Matches"],["5","Wins to title"]].map(([n,l])=>(
            <div key={n} style={{textAlign:"center",padding:"14px 10px",background:T.raised,border:`1px solid ${T.border}`,borderRadius:8}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:800,color:T.gold}}>{n}</div>
              <div style={{fontSize:12,color:T.slate}}>{l}</div>
            </div>
          ))}
        </div>
        <div className="hint" style={{marginBottom:10}}><strong style={{color:T.white}}>Who qualifies:</strong> Top 2 from each of 12 groups (24 teams) + best 8 third-place finishers = 32 in the Round of 32.</div>
        <div className="hint"><strong style={{color:T.white}}>Path to the Final:</strong> R32 → R16 → QF → SF → Final (Jul 19, MetLife Stadium). Bracket is pre-fixed by FIFA. Finish position determines every possible future opponent.</div>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="section-title" style={{marginBottom:14}}>OFFICIAL R32 PAIRINGS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {R32.map(m=>(
            <div key={m.id} style={{padding:"8px 12px",background:T.raised,border:`1px solid ${T.border}`,borderRadius:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:T.gold}}>{m.fifa}</span>
                <span className={m.side==="A"?"side-a":"side-b"}>{m.side==="A"?"SF1":"SF2"}</span>
              </div>
              <div style={{fontSize:12,color:T.white,fontWeight:600}}>
                {m.top.p===1?"1st":"2nd"} Grp {m.top.g} vs {m.bot.p===3?m.bot.note:`${m.bot.p===1?"1st":"2nd"} Grp ${m.bot.g}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="section-title" style={{marginBottom:14}}>SCORING</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {[["Group picks (1st/2nd)","1 pt"],["3rd Place picks","1 pt ea."],["Round of 32","2 pts"],["Round of 16","3 pts"],["Quarter-finals","5 pts"],["Semi-finals","8 pts"],["Champion","15 pts"]].map(([l,p])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:T.raised,border:`1px solid ${T.border}`,borderRadius:8}}>
              <span style={{fontSize:12,color:T.slate}}>{l}</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:700,color:T.gold}}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── GROUPS TAB ───────────────────────────────────────────────────────────────
function GroupsTab() {
  return (
    <div className="fade-in">
      <div style={{marginBottom:12,padding:"10px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.slate}}>
        <strong style={{color:T.white}}>48 teams · 12 groups · Top 2 + 8 best 3rd-place = 32 in knockout round</strong>
      </div>
      <div className="grid-2">
        {Object.entries(GROUPS).map(([g,ts])=>(
          <div key={g} className="card" style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:T.gold,letterSpacing:".1em"}}>GROUP {g}</span>
            </div>
            {ts.map((t,i)=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<ts.length-1?`1px solid ${T.border}`:"none"}}>
                <FlagIcon t={t} size={20}/>
                <span style={{fontSize:13,flex:1}}>{t}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LIVE TAB ─────────────────────────────────────────────────────────────────
const FIXTURES = [
  {date:"2026-06-11",t1:"Mexico",t2:"South Africa",grp:"A",venue:"Mexico City"},
  {date:"2026-06-11",t1:"South Korea",t2:"Czech Republic",grp:"A",venue:"Guadalajara"},
  {date:"2026-06-12",t1:"USA",t2:"Paraguay",grp:"D",venue:"Los Angeles"},
  {date:"2026-06-12",t1:"Canada",t2:"Bosnia & Herzegovina",grp:"B",venue:"Toronto"},
  {date:"2026-06-13",t1:"Brazil",t2:"Morocco",grp:"C",venue:"New York/NJ"},
  {date:"2026-06-13",t1:"France",t2:"Norway",grp:"I",venue:"San Francisco"},
  {date:"2026-06-14",t1:"Argentina",t2:"Algeria",grp:"J",venue:"Houston"},
  {date:"2026-06-14",t1:"Portugal",t2:"Colombia",grp:"K",venue:"Los Angeles"},
  {date:"2026-06-14",t1:"Spain",t2:"Cape Verde",grp:"H",venue:"Atlanta"},
  {date:"2026-06-15",t1:"England",t2:"Panama",grp:"L",venue:"Dallas"},
  {date:"2026-06-15",t1:"Germany",t2:"Ivory Coast",grp:"E",venue:"San Francisco"},
  {date:"2026-06-15",t1:"Netherlands",t2:"Sweden",grp:"F",venue:"Philadelphia"},
];
function LiveTab() {
  const [gf,setGf]=useState("all"); const now=new Date();
  const dOf=m=>new Date(m.date+"T12:00:00Z");
  const isToday=m=>dOf(m).toDateString()===now.toDateString();
  const isPast=m=>dOf(m)<now&&!isToday(m);
  const filt=arr=>gf==="all"?arr:arr.filter(m=>m.grp===gf);
  const today=FIXTURES.filter(isToday), recent=FIXTURES.filter(isPast).slice(-6).reverse(), coming=FIXTURES.filter(m=>dOf(m)>now).slice(0,12);
  const MRow=({m,live})=>(
    <div className="fixture-row">
      <div style={{flex:1,display:"flex",alignItems:"center",gap:7}}><FlagIcon t={m.t1} size={22}/><span style={{fontSize:13,fontWeight:600}}>{m.t1}</span></div>
      <div style={{textAlign:"center",minWidth:56}}>
        {live&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:1}}><span className="live-dot"/><span style={{fontSize:9,color:T.red,fontWeight:700}}>LIVE</span></div>}
        <div className="fixture-score">{isPast(m)||live?"— : —":"vs"}</div>
        <div style={{fontSize:10,color:T.slate,marginTop:1}}>{m.venue}</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:7,justifyContent:"flex-end"}}><span style={{fontSize:13,fontWeight:600}}>{m.t2}</span><FlagIcon t={m.t2} size={22}/></div>
      <div style={{width:"100%",display:"flex",justifyContent:"space-between",paddingTop:3}}>
        <span style={{fontSize:11,color:T.dim}}>Group {m.grp}</span>
        <span style={{fontSize:11,color:T.dim}}>{new Date(m.date).toLocaleDateString([],{month:"short",day:"numeric"})}</span>
      </div>
    </div>
  );
  return (
    <div className="fade-in">
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"4px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:20}}><span className="live-dot"/><span style={{fontSize:12,fontWeight:600}}>Live Schedule</span></div>
        <span style={{fontSize:12,color:T.slate}}>104 matches · Jun 11–Jul 19</span>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {["all",...Object.keys(GROUPS)].map(g=>(
          <button key={g} onClick={()=>setGf(g)} style={{padding:"4px 11px",borderRadius:20,border:`1px solid ${gf===g?T.gold:T.border}`,background:gf===g?T.goldGlow:T.surface,color:gf===g?T.gold:T.slate,fontSize:12,fontWeight:600,cursor:"pointer"}}>{g==="all"?"All":"Grp "+g}</button>
        ))}
      </div>
      {today.length>0&&<div className="card" style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><span className="live-dot"/><div className="section-title" style={{fontSize:17}}>TODAY</div></div>{filt(today).map((m,i)=><MRow key={i} m={m} live/>)}</div>}
      {recent.length>0&&<div className="card" style={{marginBottom:12}}><div className="section-title" style={{fontSize:17,marginBottom:12}}>RECENT</div>{filt(recent).map((m,i)=><MRow key={i} m={m}/>)}</div>}
      <div className="card"><div className="section-title" style={{fontSize:17,marginBottom:12}}>{!today.length&&!recent.length?"FULL SCHEDULE":"UPCOMING"}</div>{filt(coming).map((m,i)=><MRow key={i} m={m}/>)}</div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("predict");
  const [entries,setEntries]=useState([]);
  const [loading,setLoading]=useState(true);
  const refresh = useCallback(async()=>{setEntries(await loadEntries());setLoading(false);},[]);
  useEffect(()=>{
    refresh();
    // Auto-refresh leaderboard every 30s so everyone sees new entries live
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  },[refresh]);

  const TABS=[
    {id:"predict",label:"✏️  My Bracket"},
    {id:"live",label:"⚽  Live Scores"},
    {id:"leaderboard",label:"🏅  Leaderboard"},
    {id:"how",label:"📋  How It Works"},
    {id:"groups",label:"🗂️  Groups"},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.base}}>
      <style>{CSS}</style>
      <header style={{background:`linear-gradient(180deg,${T.surface} 0%,${T.base} 100%)`,borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(16px)"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div className="trophy-anim" style={{fontSize:"clamp(32px,5vw,50px)",lineHeight:1}}>🏆</div>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(22px,5vw,44px)",fontWeight:800,color:T.gold,letterSpacing:".04em",lineHeight:.92,textTransform:"uppercase"}}>World Cup 2026</div>
              <div style={{fontSize:10,letterSpacing:".2em",color:T.slate,textTransform:"uppercase",marginTop:5,fontWeight:600}}>Bracket Challenge · USA · Canada · Mexico</div>
            </div>
          </div>
          <Countdown/>
        </div>
        {entries.length>0&&(
          <div style={{borderTop:`1px solid ${T.border}`,padding:"5px 20px",background:T.raised}}>
            <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:T.slate,fontWeight:600}}>🎯 {entries.length} bracket{entries.length!==1?"s":""}</span>
              {entries.slice(0,6).map(e=><span key={e.id} style={{display:"inline-flex",padding:"2px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,fontSize:12,color:T.white}}>{e.name}</span>)}
              {entries.length>6&&<span style={{fontSize:11,color:T.dim}}>+{entries.length-6} more</span>}
            </div>
          </div>
        )}
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px",display:"flex",borderTop:`1px solid ${T.border}`,overflowX:"auto"}}>
          {TABS.map(t=><button key={t.id} className={`nav-tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
        </div>
      </header>
      <main style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px"}}>
        {loading?<div style={{textAlign:"center",padding:60}}><span className="spin-anim"/></div>:(
          <>
            {tab==="predict"&&<PredictTab onSubmit={refresh}/>}
            {tab==="live"&&<LiveTab/>}
            {tab==="leaderboard"&&<LeaderboardTab entries={entries} onRefresh={refresh}/>}
            {tab==="how"&&<HowItWorksTab/>}
            {tab==="groups"&&<GroupsTab/>}
          </>
        )}
      </main>
      <footer style={{borderTop:`1px solid ${T.border}`,padding:"16px 20px",textAlign:"center",color:T.dim,fontSize:11,marginTop:40}}>
        FIFA World Cup 2026 · Jun 11–Jul 19 · Unofficial fan bracket · Not affiliated with FIFA
      </footer>
    </div>
  );
}

function Countdown() {
  const [t,setT]=useState(""); const [locked,setLocked]=useState(isLocked());
  useEffect(()=>{
    const tick=()=>{
      const d=LOCK_DATE-new Date();
      if(d<=0){setLocked(true);setT("LOCKED");return;}
      const dd=Math.floor(d/86400000),hh=Math.floor((d%86400000)/3600000),mm=Math.floor((d%3600000)/60000),ss=Math.floor((d%60000)/1000);
      setT(`${dd}d ${String(hh).padStart(2,"0")}h ${String(mm).padStart(2,"0")}m ${String(ss).padStart(2,"0")}s`);
    };
    tick(); const id=setInterval(tick,1000); return()=>clearInterval(id);
  },[]);
  return (
    <div style={{textAlign:"right"}}>
      <div style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:T.slate,marginBottom:3}}>{locked?"Locked":"Picks lock in"}</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(16px,2.8vw,28px)",fontWeight:700,color:locked?T.red:T.gold,letterSpacing:".04em",lineHeight:1}}>{t}</div>
      {!locked&&<div style={{fontSize:10,color:T.dim,marginTop:2}}>Jun 11 · 15:00 UTC</div>}
    </div>
  );
}
