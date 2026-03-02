import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#F0EDE6", sidebar:"#F7F5F0", panel:"#FDFCFA",
  header:"#1A1A1D", text:"#1C1916", textSub:"#6B6560", textGhost:"#ABA59C",
  border:"#E2DDD6", hover:"#F4F1EB", selected:"#EEE8DE",
  amber:"#C47D00", red:"#B83030", blue:"#1E64B8",
  green:"#178048", violet:"#6030B0", teal:"#0E7888", orange:"#B85010",
};

const WS_COLORS = [
  "#C47D00","#1E64B8","#178048","#B83030",
  "#6030B0","#0E7888","#B85010","#5A5048",
];

const KIND = {
  post:   { label:"ポスト",    color:C.blue,   desc:"Xに投稿するコンテンツ" },
  memo:   { label:"メモ",      color:C.teal,   desc:"リサーチ・アイデアのメモ" },
  prompt: { label:"プロンプト", color:C.violet, desc:"AIに使うプロンプトテンプレート" },
};

const POST_TYPE = {
  insight:  { label:"インサイト", color:C.blue   },
  story:    { label:"ストーリー", color:C.red    },
  tips:     { label:"Tips",       color:C.green  },
  question: { label:"問いかけ",   color:C.amber  },
  thread:   { label:"スレッド",   color:C.teal   },
  opinion:  { label:"意見",       color:C.violet },
  news:     { label:"ニュース",   color:C.orange },
};

const STATUS = {
  idea:    { label:"アイデア",     dot:"#C0B8AC" },
  draft:   { label:"下書き",       dot:C.amber   },
  ready:   { label:"投稿準備完了", dot:C.green   },
  posted:  { label:"投稿済み",     dot:C.blue    },
  archive: { label:"アーカイブ",   dot:"#C4BDB5" },
};

const RANK = {
  none:   { label:"未評価", color:C.textGhost },
  first:  { label:"1軍",   color:"#C09010"   },
  second: { label:"2軍",   color:"#909090"   },
  third:  { label:"3軍",   color:"#A05828"   },
};

const FOLDER_COLORS = [C.amber,C.blue,C.green,C.red,C.violet,C.teal,C.orange,"#808070"];

// ─── Initial workspace factory ────────────────────────────────────────────────
const makeInitFolders = () => [
  { id:`f${Date.now()}0`, name:"Inbox",        color:C.blue,   parentId:null },
  { id:`f${Date.now()}1`, name:"リサーチメモ", color:C.teal,   parentId:null },
  { id:`f${Date.now()}2`, name:"ネタ出し",     color:C.amber,  parentId:null },
  { id:`f${Date.now()}3`, name:"構成アイデア", color:C.violet, parentId:null },
];

const makeInitItems = (folders) => {
  const inbox = folders[0].id;
  return [
    { id:`i${Date.now()}0`, folderId:inbox, kind:"memo", type:"insight", status:"idea", rank:"none",
      title:"使い方メモ",
      content:"【PostFlowの使い方】\n\n・Inboxに何でも放り込む\n・フォルダに整理してポスト化\n・取り込みボタンで箇条書きを一括登録\n・★で1軍管理\n・ワークスペースでクライアント別に分離",
      tags:[], createdAt:new Date().toISOString().split("T")[0], notes:"" },
  ];
};

// ─── Default workspaces ───────────────────────────────────────────────────────
const makeDefaultWorkspaces = () => {
  const ws1Id = "ws_personal";
  const ws2Id = "ws_client_a";
  const f1 = makeInitFolders();
  const f2 = makeInitFolders();
  return {
    workspaces: [
      { id:ws1Id, name:"自分用",      color:C.amber  },
      { id:ws2Id, name:"クライアントA", color:C.blue },
    ],
    data: {
      [ws1Id]: { items:makeInitItems(f1), folders:f1, links:[
        { id:"l1", title:"ChatGPT",    url:"https://chat.openai.com", category:"AIツール", color:C.green,  memo:"" },
        { id:"l2", title:"Claude",     url:"https://claude.ai",        category:"AIツール", color:C.violet, memo:"" },
        { id:"l3", title:"Perplexity", url:"https://perplexity.ai",    category:"AIツール", color:C.teal,   memo:"" },
      ]},
      [ws2Id]: { items:makeInitItems(f2), folders:f2, links:[] },
    },
  };
};

let _n = 700;
const uid   = () => `${++_n}_${Date.now()}`;
const chars = s => [...(s||"")].length;
const today = () => new Date().toISOString().split("T")[0];

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({ n, s=14 }) => {
  const g = { width:s, height:s, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 };
  const v = "0 0 24 24";
  const icons = {
    folder:   <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    folderO:  <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    inbox:    <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
    file:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    memo:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 9.5-9.5z"/></svg>,
    prompt:   <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
    plus:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox={v}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    edit:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    trash:    <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    copy:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    check:    <svg {...g} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox={v}><polyline points="20 6 9 17 4 12"/></svg>,
    close:    <svg {...g} fill="none" stroke="currentColor" strokeWidth="2" viewBox={v}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    search:   <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    chevR:    <svg {...g} fill="none" stroke="currentColor" strokeWidth="2" viewBox={v}><polyline points="9 18 15 12 9 6"/></svg>,
    chevD:    <svg {...g} fill="none" stroke="currentColor" strokeWidth="2" viewBox={v}><polyline points="6 9 12 15 18 9"/></svg>,
    chevDsm:  <svg {...g} fill="none" stroke="currentColor" strokeWidth="2" viewBox={v}><polyline points="6 9 12 15 18 9"/></svg>,
    more:     <svg {...g} fill="currentColor" viewBox={v}><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>,
    star:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    starF:    <svg {...g} fill={C.amber} stroke="none" viewBox={v}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    xLogo:    <svg {...g} viewBox={v} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>,
    import:   <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    link:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    ext:      <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    move:     <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/></svg>,
    dup:      <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M8 8H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2"/><rect x="10" y="2" width="12" height="12" rx="2"/></svg>,
    all:      <svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    subfolder:<svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="12" x2="18" y2="12"/><line x1="15" y1="9" x2="15" y2="15"/></svg>,
    workspace:<svg {...g} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox={v}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  };
  return icons[n] || null;
};

// ─── Primitives ───────────────────────────────────────────────────────────────
const Dot = ({ color, size=8 }) => (
  <span style={{ display:"inline-block", width:size, height:size, borderRadius:"50%", background:color, flexShrink:0 }}/>
);

const IS = { width:"100%", background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:8, padding:"8px 11px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
const SS = { ...IS, cursor:"pointer" };
const LS = { fontSize:10, color:C.textGhost, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 };
const SL = { fontSize:10, fontWeight:700, color:C.textGhost, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:4 };
const mIS = danger => ({ display:"flex", alignItems:"center", gap:7, width:"100%", padding:"7px 11px", background:"none", border:"none", cursor:"pointer", borderRadius:6, color:danger?C.red:C.textSub, fontSize:12, fontFamily:"inherit", fontWeight:600 });

const GhostBtn = ({ children, onClick, danger, small, style={}, title }) => {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:5, padding:small?"4px 9px":"5px 12px", borderRadius:7, background:h?(danger?"#FFF0EE":C.hover):"transparent", border:"none", cursor:"pointer", color:h?(danger?C.red:C.textSub):C.textGhost, fontSize:small?11.5:12.5, fontWeight:600, fontFamily:"inherit", transition:"all 0.12s", ...style }}>
      {children}
    </button>
  );
};

const SolidBtn = ({ children, onClick, color=C.amber, small, style={}, disabled }) => {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:5, padding:small?"4px 12px":"6px 15px", borderRadius:8, background:h?color+"DD":color, border:"none", cursor:disabled?"not-allowed":"pointer", color:"#fff", fontSize:small?11.5:13, fontWeight:700, fontFamily:"inherit", transition:"all 0.12s", opacity:disabled?0.5:1, ...style }}>
      {children}
    </button>
  );
};

const CopyBtn = ({ text, small }) => {
  const [ok,setOk] = useState(false);
  return (
    <GhostBtn small={small} onClick={()=>{ navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false),1500); }}>
      {ok ? <><Ic n="check" s={12}/>コピー済</> : <><Ic n="copy" s={12}/>コピー</>}
    </GhostBtn>
  );
};

const kindIcon  = k => ({ post:"xLogo", memo:"memo", prompt:"prompt" }[k] || "file");
const kindColor = k => KIND[k]?.color || C.textGhost;

// ─── Workspace Switcher ───────────────────────────────────────────────────────
const WorkspaceSwitcher = ({ workspaces, activeId, onSwitch, onAdd, onRename, onDelete }) => {
  const [open,    setOpen]    = useState(false);
  const [adding,  setAdding]  = useState(false);
  const [newName, setNewName] = useState("");
  const [newCol,  setNewCol]  = useState(WS_COLORS[0]);
  const [renId,   setRenId]   = useState(null);
  const [renVal,  setRenVal]  = useState("");

  const active = workspaces.find(w => w.id === activeId);

  const addWs = () => {
    if (!newName.trim()) return;
    onAdd({ id:`ws_${uid()}`, name:newName.trim(), color:newCol });
    setNewName(""); setAdding(false); setOpen(false);
  };

  const commitRename = () => {
    if (renVal.trim()) onRename(renId, renVal.trim());
    setRenId(null);
  };

  return (
    <div style={{ position:"relative" }}>
      {/* Trigger */}
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 10px 4px 8px", borderRadius:8, background:open?"#2E2E35":"transparent", border:"none", cursor:"pointer", color:"#EDEBE6", fontFamily:"inherit", transition:"background 0.12s" }}
        onMouseEnter={e => e.currentTarget.style.background="#2E2E35"}
        onMouseLeave={e => !open && (e.currentTarget.style.background="transparent")}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:active?.color||C.amber, flexShrink:0 }}/>
        <span style={{ fontSize:13, fontWeight:700, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {active?.name || "ワークスペース"}
        </span>
        <span style={{ color:"#666", display:"flex", marginLeft:2 }}><Ic n="chevDsm" s={12}/></span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", left:0, top:"calc(100% + 6px)", zIndex:300, background:"#242428", border:"1px solid #383840", borderRadius:12, boxShadow:"0 16px 48px rgba(0,0,0,0.4)", padding:6, minWidth:220 }}
          onClick={e => e.stopPropagation()}>

          <div style={{ fontSize:9.5, fontWeight:700, color:"#555", letterSpacing:"0.08em", textTransform:"uppercase", padding:"4px 10px 6px" }}>
            ワークスペース
          </div>

          {workspaces.map(ws => (
            <div key={ws.id} style={{ display:"flex", alignItems:"center", gap:0, borderRadius:8, overflow:"hidden" }}>
              {renId === ws.id ? (
                <input autoFocus value={renVal} onChange={e => setRenVal(e.target.value)}
                  onBlur={commitRename} onKeyDown={e => { if(e.key==="Enter") commitRename(); if(e.key==="Escape") setRenId(null); }}
                  style={{ flex:1, background:"#2E2E35", border:"none", outline:`1.5px solid ${ws.color}`, borderRadius:6, padding:"6px 10px", color:"#EDEBE6", fontSize:12.5, fontFamily:"inherit", margin:"2px 4px" }}/>
              ) : (
                <>
                  <button onClick={() => { onSwitch(ws.id); setOpen(false); }}
                    style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:ws.id===activeId?"#2E2E35":"transparent", border:"none", cursor:"pointer", color:ws.id===activeId?"#EDEBE6":"#999", borderRadius:8, fontFamily:"inherit", transition:"all 0.12s" }}
                    onMouseEnter={e => { if(ws.id!==activeId) e.currentTarget.style.background="#28282C"; }}
                    onMouseLeave={e => { if(ws.id!==activeId) e.currentTarget.style.background="transparent"; }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:ws.color, flexShrink:0 }}/>
                    <span style={{ fontSize:13, fontWeight:ws.id===activeId?700:500 }}>{ws.name}</span>
                    {ws.id===activeId && <span style={{ marginLeft:"auto", color:ws.color }}><Ic n="check" s={12}/></span>}
                  </button>
                  <button onClick={() => { setRenId(ws.id); setRenVal(ws.name); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#555", padding:"8px 6px", display:"flex", transition:"color 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.color="#999"} onMouseLeave={e => e.currentTarget.style.color="#555"}>
                    <Ic n="edit" s={12}/>
                  </button>
                  {workspaces.length > 1 && (
                    <button onClick={() => onDelete(ws.id)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#555", padding:"8px 6px 8px 2px", display:"flex", transition:"color 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.color="#B83030"} onMouseLeave={e => e.currentTarget.style.color="#555"}>
                      <Ic n="trash" s={12}/>
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          <div style={{ height:1, background:"#333", margin:"6px 4px" }}/>

          {adding ? (
            <div style={{ padding:"4px 6px", display:"flex", flexDirection:"column", gap:6 }}>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") addWs(); if(e.key==="Escape") setAdding(false); }}
                placeholder="ワークスペース名" style={{ background:"#2E2E35", border:"1px solid #444", borderRadius:6, padding:"7px 10px", color:"#EDEBE6", fontSize:12.5, fontFamily:"inherit", outline:"none" }}/>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {WS_COLORS.map(col => (
                  <button key={col} onClick={() => setNewCol(col)}
                    style={{ width:18, height:18, borderRadius:"50%", background:col, border:`2px solid ${newCol===col?"#EDEBE6":"transparent"}`, cursor:"pointer" }}/>
                ))}
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={() => setAdding(false)} style={{ flex:1, padding:"5px", background:"#2E2E35", border:"none", borderRadius:6, cursor:"pointer", color:"#999", fontSize:12, fontFamily:"inherit" }}>キャンセル</button>
                <button onClick={addWs} style={{ flex:1, padding:"5px", background:newCol, border:"none", borderRadius:6, cursor:"pointer", color:"#fff", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>追加</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:6, padding:"7px 10px", background:"transparent", border:"none", cursor:"pointer", color:"#666", fontSize:12.5, fontFamily:"inherit", fontWeight:600, borderRadius:8, transition:"all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background="#28282C"; e.currentTarget.style.color="#999"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#666"; }}>
              <Ic n="plus" s={13}/>新しいワークスペース
            </button>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {open && <div style={{ position:"fixed", inset:0, zIndex:299 }} onClick={() => setOpen(false)}/>}
    </div>
  );
};

// ─── Sub-folder add form ──────────────────────────────────────────────────────
const SubFolderForm = ({ parentId, onAdd, onCancel }) => {
  const [name,setName]   = useState("");
  const [color,setColor] = useState(C.amber);
  const submit = () => { if(name.trim()) { onAdd({ id:uid(), name:name.trim(), color, parentId }); onCancel(); } };
  return (
    <div style={{ padding:"6px 8px 6px 28px", display:"flex", flexDirection:"column", gap:5 }} onClick={e=>e.stopPropagation()}>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") submit(); if(e.key==="Escape") onCancel(); }}
        placeholder="サブフォルダ名" style={{ ...IS, fontSize:12, padding:"5px 9px" }}/>
      <div style={{ display:"flex", gap:4 }}>
        {FOLDER_COLORS.map(col=>(
          <button key={col} onClick={()=>setColor(col)} style={{ width:16, height:16, borderRadius:"50%", background:col, border:`2px solid ${color===col?C.text:"transparent"}`, cursor:"pointer" }}/>
        ))}
      </div>
      <div style={{ display:"flex", gap:5 }}>
        <GhostBtn small onClick={onCancel} style={{ flex:1, justifyContent:"center" }}>キャンセル</GhostBtn>
        <SolidBtn color={color} small onClick={submit} style={{ flex:1, justifyContent:"center" }}><Ic n="check" s={11}/>追加</SolidBtn>
      </div>
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ folders, items, selected, onSelect, onAddFolder, onRename, onDeleteFolder }) => {
  const [collapsed,  setCollapsed]  = useState({});
  const [renaming,   setRenaming]   = useState(null);
  const [rVal,       setRVal]       = useState("");
  const [menuId,     setMenuId]     = useState(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newCol,     setNewCol]     = useState(C.amber);
  const [addSubFor,  setAddSubFor]  = useState(null);

  const toggle = id => setCollapsed(s=>({...s,[id]:!s[id]}));

  const allDesc = useCallback((fid) => {
    const ch = folders.filter(f=>f.parentId===fid);
    return [fid,...ch.flatMap(c=>allDesc(c.id))];
  },[folders]);

  const cnt = fid => items.filter(i=>allDesc(fid).includes(i.folderId)).length;
  const commitRename = () => { if(rVal.trim()) onRename(renaming,rVal.trim()); setRenaming(null); };
  const addRoot = () => { if(newName.trim()) { onAddFolder({ id:uid(), name:newName.trim(), color:newCol, parentId:null }); setNewName(""); setAddingRoot(false); } };

  const SMART = [
    { id:"__all__",     label:"すべて",       icon:"all",   count:items.length },
    { id:"__starred__", label:"1軍",           icon:"starF", count:items.filter(i=>i.rank==="first").length,    color:C.amber  },
    { id:"__ready__",   label:"投稿準備完了",  icon:"check", count:items.filter(i=>i.status==="ready").length,  color:C.green  },
    { id:"__posted__",  label:"投稿済み",      icon:"xLogo", count:items.filter(i=>i.status==="posted").length, color:C.blue   },
  ];

  const renderFolder = (folder, depth=0) => {
    const children = folders.filter(f=>f.parentId===folder.id);
    const open   = !collapsed[folder.id];
    const active = selected===folder.id;
    const c      = cnt(folder.id);
    const isInbox = folder.name==="Inbox" && !folder.parentId;

    return (
      <div key={folder.id}>
        <div
          style={{ display:"flex", alignItems:"center", gap:6, padding:`7px 10px 7px ${12+depth*14}px`, borderRadius:8, margin:"1px 4px", cursor:"pointer", background:active?folder.color+"16":"transparent", transition:"background 0.12s", position:"relative" }}
          onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=C.hover; }}
          onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}
          onClick={()=>{ onSelect(folder.id); setMenuId(null); }}>
          <span onClick={e=>{e.stopPropagation();toggle(folder.id);}} style={{ display:"flex", width:14, color:C.textGhost, flexShrink:0 }}>
            {children.length>0?(open?<Ic n="chevD" s={12}/>:<Ic n="chevR" s={12}/>):<span style={{width:12}}/>}
          </span>
          <span style={{ color:folder.color, display:"flex" }}>
            <Ic n={isInbox?"inbox":(open&&children.length>0?"folderO":"folder")} s={14}/>
          </span>
          {renaming===folder.id ? (
            <input autoFocus value={rVal} onChange={e=>setRVal(e.target.value)}
              onBlur={commitRename} onKeyDown={e=>{ if(e.key==="Enter") commitRename(); if(e.key==="Escape") setRenaming(null); }}
              style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, fontWeight:600, color:C.text, fontFamily:"inherit" }}
              onClick={e=>e.stopPropagation()}/>
          ) : (
            <span style={{ flex:1, fontSize:13, fontWeight:active?700:500, color:active?C.text:C.textSub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{folder.name}</span>
          )}
          {c>0 && <span style={{ fontSize:10.5, color:active?folder.color:C.textGhost, fontWeight:700 }}>{c}</span>}
          <button className="f-more" onClick={e=>{ e.stopPropagation(); setMenuId(menuId===folder.id?null:folder.id); setAddSubFor(null); }}
            style={{ display:"flex", background:"none", border:"none", cursor:"pointer", color:C.textGhost, padding:"1px 2px", opacity:0, transition:"opacity 0.12s" }}>
            <Ic n="more" s={13}/>
          </button>
          {menuId===folder.id && (
            <div style={{ position:"absolute", right:4, top:"calc(100% + 2px)", zIndex:80, background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.10)", padding:5, minWidth:155 }}
              onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{ setAddSubFor(folder.id); setMenuId(null); }} style={mIS(false)} onMouseEnter={e=>e.currentTarget.style.background=C.hover} onMouseLeave={e=>e.currentTarget.style.background="none"}><Ic n="subfolder" s={12}/>サブフォルダを追加</button>
              <button onClick={()=>{ setRenaming(folder.id); setRVal(folder.name); setMenuId(null); }} style={mIS(false)} onMouseEnter={e=>e.currentTarget.style.background=C.hover} onMouseLeave={e=>e.currentTarget.style.background="none"}><Ic n="edit" s={12}/>名前変更</button>
              {!isInbox && (
                <button onClick={()=>{ onDeleteFolder(folder.id); setMenuId(null); }} style={mIS(true)} onMouseEnter={e=>e.currentTarget.style.background="#FFF0EE"} onMouseLeave={e=>e.currentTarget.style.background="none"}><Ic n="trash" s={12}/>削除</button>
              )}
            </div>
          )}
        </div>
        {addSubFor===folder.id && <SubFolderForm parentId={folder.id} onAdd={onAddFolder} onCancel={()=>setAddSubFor(null)}/>}
        {open && children.map(c=>renderFolder(c,depth+1))}
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"12px 8px 6px" }}>
        <div style={{ ...SL, paddingLeft:8 }}>スマートフォルダ</div>
        {SMART.map(s=>{
          const active = selected===s.id;
          const col    = s.color||C.textSub;
          return (
            <div key={s.id} onClick={()=>onSelect(s.id)}
              style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 12px", borderRadius:8, margin:"1px 4px", cursor:"pointer", background:active?col+"14":"transparent", color:active?col:C.textSub, transition:"background 0.12s" }}
              onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=C.hover; }}
              onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
              <span style={{ color:active?col:C.textGhost, display:"flex" }}><Ic n={s.icon} s={13}/></span>
              <span style={{ flex:1, fontSize:13, fontWeight:active?700:500 }}>{s.label}</span>
              <span style={{ fontSize:10.5, color:active?col:C.textGhost, fontWeight:700 }}>{s.count}</span>
            </div>
          );
        })}
      </div>
      <div style={{ height:1, background:C.border, margin:"8px 14px" }}/>
      <div style={{ flex:1, overflowY:"auto", padding:"0 4px" }}>
        <div style={{ ...SL, paddingLeft:14 }}>フォルダ</div>
        {folders.filter(f=>!f.parentId).map(f=>renderFolder(f))}
      </div>
      <div style={{ padding:"8px 10px", borderTop:`1px solid ${C.border}` }}>
        {addingRoot ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") addRoot(); if(e.key==="Escape") setAddingRoot(false); }}
              placeholder="フォルダ名" style={{ ...IS, fontSize:12, padding:"6px 9px" }}/>
            <div style={{ display:"flex", gap:4 }}>
              {FOLDER_COLORS.map(col=><button key={col} onClick={()=>setNewCol(col)} style={{ width:17, height:17, borderRadius:"50%", background:col, border:`2px solid ${newCol===col?C.text:"transparent"}`, cursor:"pointer" }}/>)}
            </div>
            <div style={{ display:"flex", gap:5 }}>
              <GhostBtn small onClick={()=>setAddingRoot(false)} style={{ flex:1, justifyContent:"center" }}>キャンセル</GhostBtn>
              <SolidBtn color={newCol} small onClick={addRoot} style={{ flex:1, justifyContent:"center" }}><Ic n="check" s={11}/>追加</SolidBtn>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAddingRoot(true)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:6, padding:"7px 10px", background:"none", border:`1.5px dashed ${C.border}`, borderRadius:8, cursor:"pointer", color:C.textGhost, fontSize:12.5, fontFamily:"inherit", fontWeight:600, transition:"all 0.12s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.amber; e.currentTarget.style.color=C.amber; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textGhost; }}>
            <Ic n="plus" s={13}/>フォルダを追加
          </button>
        )}
      </div>
      <style>{`div:hover .f-more{opacity:1!important} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#D5D0C8;border-radius:4px} input:focus,textarea:focus,select:focus{border-color:${C.amber}!important;box-shadow:0 0 0 3px ${C.amber}18}`}</style>
    </div>
  );
};

// ─── Item Row ─────────────────────────────────────────────────────────────────
const ItemRow = ({ item, folders, onEdit, onDelete, onDuplicate, onMove, onRank, onSelect, active }) => {
  const [hover,    setHover]    = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [moveMenu, setMoveMenu] = useState(false);

  const kc     = kindColor(item.kind);
  const cnt    = chars(item.content);
  const isPost = item.kind==="post";

  return (
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>{ setHover(false); setMoreMenu(false); setMoveMenu(false); }}
      onClick={()=>onSelect(item)}
      style={{ display:"flex", alignItems:"center", padding:"0 20px", height:54, cursor:"pointer", transition:"background 0.1s", background:active?C.selected:(hover?C.hover:"transparent"), borderLeft:`3px solid ${active?kc:"transparent"}`, borderBottom:`1px solid ${C.border}`, position:"relative" }}>

      {/* Star / kind icon */}
      <div style={{ width:26, display:"flex", justifyContent:"center", flexShrink:0 }}>
        {isPost ? (
          <span onClick={e=>{ e.stopPropagation(); onRank(item.id,item.rank==="first"?"none":"first"); }}
            style={{ cursor:"pointer", color:item.rank==="first"?C.amber:C.border, transition:"color 0.12s", display:"flex" }}
            onMouseEnter={e=>e.currentTarget.style.color=C.amber}
            onMouseLeave={e=>e.currentTarget.style.color=item.rank==="first"?C.amber:C.border}>
            <Ic n={item.rank==="first"?"starF":"star"} s={13}/>
          </span>
        ) : (
          <span style={{ color:kc+"88", display:"flex" }}><Ic n={kindIcon(item.kind)} s={13}/></span>
        )}
      </div>

      {/* Status dot */}
      <div style={{ width:10, marginRight:12, flexShrink:0, display:"flex", justifyContent:"center" }}>
        <Dot color={isPost?STATUS[item.status].dot:kc} size={7}/>
      </div>

      {/* Title + preview */}
      <div style={{ flex:1, minWidth:0, marginRight:14 }}>
        <div style={{ fontSize:13.5, fontWeight:active?700:500, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
        {(hover||active) && (
          <div style={{ fontSize:11, color:C.textGhost, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:2 }}>
            {item.content.replace(/\n/g," ").slice(0,70)}…
          </div>
        )}
      </div>

      {/* Right meta */}
      {!hover && !active && (
        <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <span style={{ fontSize:10.5, fontWeight:700, color:kc, background:kc+"14", borderRadius:5, padding:"1px 7px", whiteSpace:"nowrap" }}>{KIND[item.kind]?.label}</span>
          {isPost && <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11.5, fontWeight:600, color:STATUS[item.status].dot, whiteSpace:"nowrap" }}><Dot color={STATUS[item.status].dot} size={6}/>{STATUS[item.status].label}</span>}
          {isPost && <span style={{ fontSize:11, color:C.textGhost, fontWeight:600, width:40, textAlign:"right" }}>{cnt}字</span>}
          <span style={{ fontSize:11, color:C.textGhost, width:64, textAlign:"right" }}>{item.createdAt}</span>
        </div>
      )}

      {/* Hover actions */}
      {(hover||active) && (
        <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
          {isPost && <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:STATUS[item.status].dot, marginRight:4, whiteSpace:"nowrap" }}><Dot color={STATUS[item.status].dot} size={6}/>{STATUS[item.status].label}</span>}
          <span style={{ width:1, height:14, background:C.border, marginRight:2 }}/>
          <GhostBtn small onClick={()=>onEdit(item)}><Ic n="edit" s={12}/>編集</GhostBtn>
          <CopyBtn text={item.content} small/>
          <div style={{ position:"relative" }}>
            <GhostBtn small onClick={()=>setMoveMenu(m=>!m)}><Ic n="move" s={12}/>移動</GhostBtn>
            {moveMenu && (
              <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", zIndex:80, background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.10)", padding:5, minWidth:160, maxHeight:220, overflowY:"auto" }}>
                {folders.map(f=>(
                  <button key={f.id} onClick={()=>{ onMove(item.id,f.id); setMoveMenu(false); }}
                    style={{ ...mIS(false), background:item.folderId===f.id?f.color+"12":"none", color:item.folderId===f.id?f.color:C.textSub, fontWeight:item.folderId===f.id?700:500 }}
                    onMouseEnter={e=>{ if(item.folderId!==f.id) e.currentTarget.style.background=C.hover; }}
                    onMouseLeave={e=>{ if(item.folderId!==f.id) e.currentTarget.style.background="none"; }}>
                    <span style={{ color:f.color }}><Ic n="folder" s={12}/></span>{f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position:"relative" }}>
            <GhostBtn small onClick={()=>setMoreMenu(m=>!m)}><Ic n="more" s={13}/></GhostBtn>
            {moreMenu && (
              <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", zIndex:80, background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.10)", padding:5, minWidth:110 }}>
                <button onClick={()=>{ onDuplicate(item); setMoreMenu(false); }} style={mIS(false)} onMouseEnter={e=>e.currentTarget.style.background=C.hover} onMouseLeave={e=>e.currentTarget.style.background="none"}><Ic n="dup" s={12}/>複製</button>
                <button onClick={()=>{ onDelete(item.id); setMoreMenu(false); }} style={mIS(true)} onMouseEnter={e=>e.currentTarget.style.background="#FFF0EE"} onMouseLeave={e=>e.currentTarget.style.background="none"}><Ic n="trash" s={12}/>削除</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────
const Detail = ({ item, folders, onClose, onEdit, onStatus, onRank }) => {
  const kc     = kindColor(item.kind);
  const folder = folders.find(f=>f.id===item.folderId);
  const cnt    = chars(item.content);
  const isPost = item.kind==="post";
  const tc     = isPost ? POST_TYPE[item.type] : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:C.panel, borderLeft:`1px solid ${C.border}` }}>
      <div style={{ padding:"18px 18px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, color:kc, background:kc+"14", borderRadius:5, padding:"2px 8px" }}>{KIND[item.kind]?.label}</span>
          {folder && <span style={{ fontSize:11, color:folder.color, fontWeight:600 }}>{folder.name}</span>}
          <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:C.textGhost, display:"flex" }}><Ic n="close" s={16}/></button>
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, lineHeight:1.35, marginBottom:12 }}>{item.title}</div>
        {isPost && (
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={LS}>ステータス</div>
              <select value={item.status} onChange={e=>onStatus(item.id,e.target.value)} style={{ ...SS, fontSize:12, padding:"5px 8px" }}>
                {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <div style={LS}>評価</div>
              <select value={item.rank||"none"} onChange={e=>onRank(item.id,e.target.value)} style={{ ...SS, fontSize:12, padding:"5px 8px", color:RANK[item.rank||"none"].color }}>
                {Object.entries(RANK).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:18 }}>
        {isPost ? (
          <div style={{ background:C.bg, borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${tc.color},${tc.color}66)`, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>あなたのアカウント</div>
                <div style={{ fontSize:11, color:C.textGhost }}>@username</div>
              </div>
            </div>
            <p style={{ margin:"0 0 12px", fontSize:14.5, color:C.text, lineHeight:1.85, whiteSpace:"pre-wrap" }}>{item.content}</p>
            <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11, color:C.textGhost }}>{item.createdAt}</span>
              <span style={{ fontSize:11, color:C.textGhost, fontWeight:600 }}>{cnt}字</span>
            </div>
          </div>
        ) : (
          <div style={{ background:C.bg, borderRadius:10, padding:16, marginBottom:14 }}>
            <p style={{ margin:0, fontSize:item.kind==="prompt"?13:14, color:C.text, lineHeight:1.85, whiteSpace:"pre-wrap", fontFamily:item.kind==="prompt"?"'Courier New',monospace":"inherit" }}>{item.content}</p>
          </div>
        )}

        {item.notes && (
          <div style={{ background:C.amber+"0E", borderLeft:`3px solid ${C.amber}`, borderRadius:8, padding:"10px 14px", marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>メモ</div>
            <div style={{ fontSize:13, color:C.textSub, lineHeight:1.7 }}>{item.notes}</div>
          </div>
        )}

        {item.tags?.length>0 && (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {item.tags.map(t=><span key={t} style={{ fontSize:11, color:C.textGhost, background:C.bg, borderRadius:5, padding:"2px 9px", border:`1px solid ${C.border}` }}>#{t}</span>)}
          </div>
        )}
      </div>

      <div style={{ padding:"11px 16px", borderTop:`1px solid ${C.border}`, display:"flex", gap:7, alignItems:"center", flexShrink:0 }}>
        <CopyBtn text={item.content}/>
        <GhostBtn small onClick={()=>onEdit(item)}><Ic n="edit" s={12}/>編集</GhostBtn>
        {isPost && (
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.content)}`} target="_blank" rel="noopener"
            style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:8, background:"#000", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>
            <Ic n="xLogo" s={12}/>投稿
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Item Modal ───────────────────────────────────────────────────────────────
const ItemModal = ({ item, folders, defFolderId, links, onSave, onClose }) => {
  const isNew = !item?.id;
  const [form,setForm] = useState({
    kind:"post", title:"", content:"", type:"insight", status:"idea", rank:"none", tags:[], notes:"",
    folderId:defFolderId||folders[0]?.id||"", ...(item||{})
  });
  const [tagIn,setTagIn] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const cnt    = chars(form.content);
  const kc     = kindColor(form.kind);
  const isPost = form.kind==="post";
  const tc     = isPost ? POST_TYPE[form.type] : null;
  const accent = tc?.color || kc;

  // ドラッグ誤クローズ防止
  const mouseDownOnOverlay = useRef(false);

  const addTag = () => { const t=tagIn.trim(); if(t&&!form.tags.includes(t)) set("tags",[...form.tags,t]); setTagIn(""); };
  const save = () => {
    if(!form.content.trim()) return;
    // タイトルが空なら本文1行目、それもなければ「無題」
    const autoTitle = form.title.trim() || form.content.trim().split("\n")[0].slice(0,40) || "無題";
    onSave({...form, title:autoTitle, id:form.id||uid(), createdAt:form.createdAt||today()});
    onClose();
  };

  const aiLinks = links.filter(l=>l.category==="AIツール"||l.category==="プロンプト集");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,9,8,0.45)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:1000, padding:"28px 20px", overflowY:"auto" }}
      onMouseDown={e=>{ mouseDownOnOverlay.current = (e.target===e.currentTarget); }}
      onClick={e=>{ if(e.target===e.currentTarget && mouseDownOnOverlay.current) onClose(); mouseDownOnOverlay.current=false; }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderTop:`3px solid ${accent}`, borderRadius:14, width:"100%", maxWidth:600, boxShadow:"0 32px 80px rgba(0,0,0,0.14)" }}>
        <div style={{ padding:"16px 20px 0", display:"flex", alignItems:"center" }}>
          <Dot color={accent} size={8}/>
          <span style={{ fontWeight:800, fontSize:15, color:C.text, marginLeft:8 }}>{isNew?"新規作成":"編集"}</span>
          <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:C.textGhost, display:"flex" }}><Ic n="close" s={17}/></button>
        </div>

        <div style={{ padding:"14px 20px 20px", display:"flex", flexDirection:"column", gap:13 }}>
          {/* Kind tabs */}
          <div>
            <label style={LS}>種類</label>
            <div style={{ display:"flex", gap:6 }}>
              {Object.entries(KIND).map(([k,v])=>(
                <button key={k} onClick={()=>set("kind",k)}
                  style={{ flex:1, padding:"8px 0", borderRadius:8, border:`1.5px solid ${form.kind===k?v.color:C.border}`, background:form.kind===k?v.color+"14":"transparent", color:form.kind===k?v.color:C.textGhost, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Ic n={kindIcon(k)} s={13}/>{v.label}</div>
                  <div style={{ fontSize:9.5, color:form.kind===k?v.color:C.textGhost, marginTop:2, fontWeight:500 }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:2 }}><label style={LS}>タイトル</label><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="タイトル" style={IS}/></div>
            <div style={{ flex:1 }}><label style={LS}>フォルダ</label><select value={form.folderId} onChange={e=>set("folderId",e.target.value)} style={SS}>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          </div>

          {isPost && (
            <div style={{ display:"flex", gap:10 }}>
              {[{l:"種別",k:"type",opts:Object.entries(POST_TYPE).map(([k,v])=>({k,l:v.label}))},{l:"ステータス",k:"status",opts:Object.entries(STATUS).map(([k,v])=>({k,l:v.label}))},{l:"評価",k:"rank",opts:Object.entries(RANK).map(([k,v])=>({k,l:v.label}))}].map(({l,k,opts})=>(
                <div key={k} style={{ flex:1 }}><label style={LS}>{l}</label><select value={form[k]} onChange={e=>set(k,e.target.value)} style={SS}>{opts.map(o=><option key={o.k} value={o.k}>{o.l}</option>)}</select></div>
              ))}
            </div>
          )}

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <label style={LS}>{isPost?"本文":form.kind==="prompt"?"プロンプト本文":"メモ内容"}</label>
              <span style={{ fontSize:11, color:C.textGhost, fontWeight:600 }}>{cnt}字</span>
            </div>
            <textarea value={form.content} onChange={e=>set("content",e.target.value)}
              placeholder={form.kind==="prompt"?"あなたは…のエキスパートです。\n\n{変数}":form.kind==="memo"?"リサーチ内容・アイデアをメモ…":"ポストの内容を入力…"}
              rows={form.kind==="prompt"?7:5}
              style={{ ...IS, resize:"vertical", lineHeight:1.85, fontFamily:form.kind==="prompt"?"'Courier New',monospace":"inherit" }}/>
            {isPost && (
              <div style={{ marginTop:6, background:C.bg, borderRadius:9, padding:"9px 13px", display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${accent},${accent}66)`, flexShrink:0 }}/>
                <div style={{ flex:1, fontSize:12, color:C.textSub, lineHeight:1.6, whiteSpace:"pre-wrap", maxHeight:48, overflow:"hidden" }}>{form.content||"プレビュー…"}</div>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(form.content)}`} target="_blank" rel="noopener"
                  style={{ flexShrink:0, display:"flex", alignItems:"center", gap:4, padding:"4px 11px", borderRadius:7, background:"#000", color:"#fff", fontSize:11, fontWeight:700, textDecoration:"none" }}>
                  <Ic n="xLogo" s={11}/>投稿
                </a>
              </div>
            )}
          </div>

          <div><label style={LS}>メモ</label><input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="参考・調査メモ" style={IS}/></div>

          <div>
            <label style={LS}>タグ</label>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
              {form.tags.map(t=><span key={t} style={{ fontSize:11.5, background:accent+"14", color:accent, borderRadius:5, padding:"2px 9px", display:"flex", alignItems:"center", gap:4 }}>#{t}<button onClick={()=>set("tags",form.tags.filter(x=>x!==t))} style={{ background:"none", border:"none", cursor:"pointer", color:accent, padding:0 }}>×</button></span>)}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={tagIn} onChange={e=>setTagIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()} placeholder="タグ入力 → Enter" style={{ ...IS, flex:1 }}/>
              <SolidBtn color={C.amber} small onClick={addTag}><Ic n="plus" s={12}/>追加</SolidBtn>
            </div>
          </div>

          {aiLinks.length>0 && (
            <div>
              <label style={LS}>リンク / プロンプト</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {aiLinks.map(l=>l.url
                  ? <a key={l.id} href={l.url} target="_blank" rel="noopener" style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 11px", borderRadius:7, fontSize:12, fontWeight:600, background:(l.color||C.blue)+"14", color:l.color||C.blue, textDecoration:"none" }}><Ic n="ext" s={11}/>{l.title}</a>
                  : <button key={l.id} onClick={()=>navigator.clipboard.writeText(l.memo)} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 11px", borderRadius:7, fontSize:12, fontWeight:600, background:(l.color||C.amber)+"14", color:l.color||C.amber, cursor:"pointer", fontFamily:"inherit", border:"none" }}><Ic n="copy" s={11}/>{l.title}</button>
                )}
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:8, borderTop:`1px solid ${C.border}` }}>
            <GhostBtn onClick={onClose}>キャンセル</GhostBtn>
            <SolidBtn color={accent} onClick={save}><Ic n="check" s={13}/>{isNew?"作成":"保存"}</SolidBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Import Modal ─────────────────────────────────────────────────────────────
const ImportModal = ({ folders, defFolderId, onImport, onClose }) => {
  const [raw,setRaw]         = useState("");
  const [parsed,setParsed]   = useState([]);
  const [folderId,setFolder] = useState(defFolderId||folders[0]?.id||"");
  const [kind,setKind]       = useState("memo");
  const [sel,setSel]         = useState(new Set());
  const [step,setStep]       = useState(1);

  const parse = () => {
    const lines = raw.split("\n").map(l=>l.replace(/^[・\-\*\d\.]+\s*/,"").trim()).filter(l=>l.length>2);
    const items = lines.map(l=>({ id:uid(), text:l }));
    setParsed(items); setSel(new Set(items.map(i=>i.id))); setStep(2);
  };

  const doImport = () => {
    parsed.filter(i=>sel.has(i.id)).forEach(item=>{
      onImport({ id:uid(), folderId, kind, type:"insight", status:"idea", rank:"none",
        title:item.text.slice(0,40)+(item.text.length>40?"…":""),
        content:item.text, tags:[], createdAt:today(), notes:"" });
    });
    onClose();
  };

  const toggle = id => { const s=new Set(sel); s.has(id)?s.delete(id):s.add(id); setSel(s); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,9,8,0.45)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:24 }}
      onMouseDown={e=>{ if(e.target===e.currentTarget) e.currentTarget._md=true; }}
      onClick={e=>{ if(e.target===e.currentTarget&&e.currentTarget._md) onClose(); e.currentTarget._md=false; }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:520, boxShadow:"0 32px 80px rgba(0,0,0,0.14)", maxHeight:"82vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"15px 18px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
          <Ic n="import" s={16}/><span style={{ fontWeight:800, fontSize:14, color:C.text }}>テキストを取り込む</span>
          <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:C.textGhost, display:"flex" }}><Ic n="close" s={16}/></button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:12 }}>
          {step===1 ? (
            <>
              <div style={{ background:C.blue+"0C", border:`1px solid ${C.blue}22`, borderRadius:9, padding:"10px 14px", fontSize:12.5, color:C.textSub, lineHeight:1.7 }}>
                リサーチメモや箇条書きをペーストすると、<strong style={{color:C.text}}>1行 = 1アイテム</strong>として一括登録します。
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}><label style={LS}>取り込み先</label><select value={folderId} onChange={e=>setFolder(e.target.value)} style={SS}>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={LS}>種類</label><select value={kind} onChange={e=>setKind(e.target.value)} style={SS}>{Object.entries(KIND).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div><label style={LS}>テキストをペースト</label>
                <textarea value={raw} onChange={e=>setRaw(e.target.value)} rows={9}
                  placeholder={"・GPT-4oは画像認識が大幅改善\n・Claude Sonnetはコスパが高い\n\n→ 行ごとに1件として取り込みます"}
                  style={{ ...IS, resize:"vertical", lineHeight:1.8 }}/>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{parsed.length}件を検出</span>
                <button onClick={()=>setSel(sel.size===parsed.length?new Set():new Set(parsed.map(i=>i.id)))} style={{ fontSize:11.5, color:C.amber, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>{sel.size===parsed.length?"全解除":"全選択"}</button>
                <span style={{ marginLeft:"auto", fontSize:12, color:C.textGhost }}>{sel.size}件を取り込む</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {parsed.map(item=>{
                  const on=sel.has(item.id);
                  return (
                    <div key={item.id} onClick={()=>toggle(item.id)}
                      style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 12px", borderRadius:9, background:on?C.amber+"0C":C.bg, border:`1.5px solid ${on?C.amber+"44":C.border}`, cursor:"pointer", transition:"all 0.12s" }}>
                      <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${on?C.amber:C.border}`, background:on?C.amber:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        {on && <Ic n="check" s={10}/>}
                      </div>
                      <span style={{ fontSize:13, color:C.text, lineHeight:1.55 }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div style={{ padding:"11px 18px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, justifyContent:"flex-end" }}>
          {step===2 && <GhostBtn onClick={()=>setStep(1)}>戻る</GhostBtn>}
          <GhostBtn onClick={onClose}>キャンセル</GhostBtn>
          {step===1
            ? <SolidBtn color={C.blue} onClick={parse}><Ic n="import" s={13}/>解析</SolidBtn>
            : <SolidBtn color={C.amber} onClick={doImport} disabled={sel.size===0}><Ic n="check" s={13}/>{sel.size}件を取り込む</SolidBtn>
          }
        </div>
      </div>
    </div>
  );
};

// ─── Link Manager ─────────────────────────────────────────────────────────────
const LinkManager = ({ list, onAdd, onDelete, onEdit }) => {
  const [f,setF]        = useState({ title:"", url:"", category:"AIツール", memo:"", color:C.blue });
  const [editing,setEd] = useState(null);
  const [copyId,setCopy]= useState(null);
  const sf = (k,v) => setF(p=>({...p,[k]:v}));
  const CATS = ["AIツール","参考サイト","プロンプト集","その他"];
  const COLS = [C.blue,C.green,C.amber,C.red,C.violet,C.teal,C.orange,"#808070"];
  const save = () => {
    if(!f.title.trim()) return;
    if(editing){ onEdit({...editing,...f}); setEd(null); } else onAdd({...f,id:uid()});
    setF({ title:"", url:"", category:"AIツール", memo:"", color:C.blue });
  };
  const startEdit = l => { setEd(l); setF({ title:l.title, url:l.url, category:l.category, memo:l.memo, color:l.color||C.blue }); };
  const copy = (id,text) => { navigator.clipboard.writeText(text); setCopy(id); setTimeout(()=>setCopy(null),1500); };
  const grouped = CATS.reduce((a,c)=>({...a,[c]:list.filter(l=>l.category===c)}),{});
  return (
    <div style={{ maxWidth:700, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderTop:`2px solid ${C.blue}`, borderRadius:12, padding:20 }}>
        <div style={{ fontWeight:800, fontSize:13.5, color:C.text, marginBottom:14, display:"flex", alignItems:"center", gap:7 }}><Ic n="link" s={15}/>{editing?"編集":"リンク / プロンプトを追加"}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div><label style={LS}>タイトル</label><input value={f.title} onChange={e=>sf("title",e.target.value)} placeholder="名前" style={IS}/></div>
          <div><label style={LS}>カテゴリ</label><select value={f.category} onChange={e=>sf("category",e.target.value)} style={SS}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={LS}>URL</label><input value={f.url} onChange={e=>sf("url",e.target.value)} placeholder="https://…（なしでOK）" style={IS}/></div>
        <div style={{ marginBottom:12 }}><label style={LS}>メモ / プロンプト本文</label><textarea value={f.memo} onChange={e=>sf("memo",e.target.value)} rows={3} style={{ ...IS, resize:"vertical", lineHeight:1.7 }} placeholder="内容…"/></div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <label style={{ ...LS, margin:0 }}>カラー</label>
          <div style={{ display:"flex", gap:5 }}>{COLS.map(col=><button key={col} onClick={()=>sf("color",col)} style={{ width:18, height:18, borderRadius:"50%", background:col, border:`2.5px solid ${f.color===col?C.text:"transparent"}`, cursor:"pointer" }}/>)}</div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          {editing && <GhostBtn small onClick={()=>{setEd(null);setF({title:"",url:"",category:"AIツール",memo:"",color:C.blue});}}> キャンセル</GhostBtn>}
          <SolidBtn color={C.blue} small onClick={save}><Ic n="check" s={12}/>{editing?"更新":"追加"}</SolidBtn>
        </div>
      </div>
      {CATS.map(cat=>grouped[cat].length>0&&(
        <div key={cat}>
          <div style={{ fontSize:10.5, fontWeight:700, color:C.textGhost, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            <Ic n={cat==="プロンプト集"?"prompt":"link"} s={12}/>{cat} ({grouped[cat].length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {grouped[cat].map(l=>(
              <div key={l.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderLeft:`3px solid ${l.color||C.blue}`, borderRadius:10, padding:"12px 16px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <Dot color={l.color||C.blue} size={7}/>
                      <span style={{ fontWeight:700, fontSize:13.5, color:C.text }}>{l.title}</span>
                      {l.url && <span style={{ fontSize:11, color:C.textGhost }}>{l.url.replace(/https?:\/\//,"").slice(0,40)}</span>}
                    </div>
                    {l.memo && <div style={{ fontSize:12.5, color:C.textSub, background:C.bg, borderRadius:7, padding:"7px 11px", fontFamily:cat==="プロンプト集"?"'Courier New',monospace":"inherit", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{l.memo.length>160?l.memo.slice(0,160)+"…":l.memo}</div>}
                  </div>
                  <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                    {l.url&&<a href={l.url} target="_blank" rel="noopener" style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:7, fontSize:12, fontWeight:600, background:(l.color||C.blue)+"14", color:l.color||C.blue, textDecoration:"none" }}><Ic n="ext" s={11}/>開く</a>}
                    {l.memo&&<button onClick={()=>copy(l.id,l.memo)} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:7, fontSize:12, fontWeight:600, background:C.bg, color:copyId===l.id?C.green:C.textSub, border:`1px solid ${C.border}`, cursor:"pointer", fontFamily:"inherit" }}><Ic n={copyId===l.id?"check":"copy"} s={11}/>{copyId===l.id?"済":"コピー"}</button>}
                    <GhostBtn small onClick={()=>startEdit(l)}><Ic n="edit" s={12}/></GhostBtn>
                    <GhostBtn small danger onClick={()=>onDelete(l.id)}><Ic n="trash" s={12}/></GhostBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── useIsMobile ──────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
};

// ─── Mobile Item Card ─────────────────────────────────────────────────────────
const MobileItemCard = ({ item, folders, onOpen }) => {
  const kc     = kindColor(item.kind);
  const folder = folders.find(f => f.id === item.folderId);
  const isPost = item.kind === "post";
  return (
    <div onClick={() => onOpen(item)}
      style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:"transparent", WebkitTapHighlightColor:"transparent" }}>
      <div style={{ width:40, height:40, borderRadius:11, background:kc+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Ic n={kindIcon(item.kind)} s={18} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14.5, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>{item.title}</div>
        <div style={{ fontSize:12, color:C.textGhost, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.content.replace(/\n/g," ")}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
        <span style={{ fontSize:11, color:C.textGhost }}>{item.createdAt}</span>
        <div style={{ display:"flex", gap:4 }}>
          {isPost && item.rank==="first" && <Ic n="starF" s={12}/>}
          {isPost && <span style={{ width:7, height:7, borderRadius:"50%", background:STATUS[item.status].dot, display:"inline-block" }}/>}
          <span style={{ fontSize:10.5, fontWeight:700, color:kc }}>{KIND[item.kind]?.label}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Mobile Detail ────────────────────────────────────────────────────────────
const MobileDetail = ({ item, folders, onBack, onEdit, onStatus, onRank, onDelete }) => {
  const kc     = kindColor(item.kind);
  const folder = folders.find(f => f.id === item.folderId);
  const isPost = item.kind === "post";
  const tc     = isPost ? POST_TYPE[item.type] : null;
  const cnt    = chars(item.content);
  const [copied, setCopied] = useState(false);

  const copy = () => { navigator.clipboard.writeText(item.content); setCopied(true); setTimeout(()=>setCopied(false),1500); };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:C.panel }}>
      {/* Nav bar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:`1px solid ${C.border}`, background:C.panel, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:C.amber, fontSize:15, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5, padding:0 }}>
          <Ic n="chevR" s={16} /> 戻る
        </button>
        <span style={{ flex:1 }}/>
        <button onClick={() => onEdit(item)} style={{ background:"none", border:"none", cursor:"pointer", color:C.textSub, display:"flex" }}><Ic n="edit" s={18}/></button>
        <button onClick={() => onDelete(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, display:"flex" }}><Ic n="trash" s={18}/></button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:18 }}>
        {/* Kind + folder */}
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, color:kc, background:kc+"14", borderRadius:5, padding:"2px 9px" }}>{KIND[item.kind]?.label}</span>
          {folder && <span style={{ fontSize:11, color:folder.color, fontWeight:600 }}>{folder.name}</span>}
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:C.text, lineHeight:1.3, marginBottom:16 }}>{item.title}</div>

        {/* Status/rank for posts */}
        {isPost && (
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <div style={{ flex:1 }}>
              <div style={LS}>ステータス</div>
              <select value={item.status} onChange={e=>onStatus(item.id,e.target.value)} style={{ ...SS, fontSize:13, padding:"7px 9px" }}>
                {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <div style={LS}>評価</div>
              <select value={item.rank||"none"} onChange={e=>onRank(item.id,e.target.value)} style={{ ...SS, fontSize:13, padding:"7px 9px", color:RANK[item.rank||"none"].color }}>
                {Object.entries(RANK).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ background:C.bg, borderRadius:12, padding:16, marginBottom:16, lineHeight:1.85, fontSize:14.5, color:C.text, whiteSpace:"pre-wrap", fontFamily:item.kind==="prompt"?"'Courier New',monospace":"inherit" }}>
          {item.content}
        </div>
        {isPost && <div style={{ fontSize:12, color:C.textGhost, textAlign:"right", marginTop:-10, marginBottom:16 }}>{cnt}字</div>}

        {item.notes && (
          <div style={{ background:C.amber+"0E", borderLeft:`3px solid ${C.amber}`, borderRadius:9, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>メモ</div>
            <div style={{ fontSize:13, color:C.textSub, lineHeight:1.7 }}>{item.notes}</div>
          </div>
        )}
        {item.tags?.length>0 && (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {item.tags.map(t=><span key={t} style={{ fontSize:12, color:C.textGhost, background:C.bg, borderRadius:5, padding:"2px 10px", border:`1px solid ${C.border}` }}>#{t}</span>)}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ padding:"12px 18px 28px", borderTop:`1px solid ${C.border}`, display:"flex", gap:9, flexShrink:0 }}>
        <button onClick={copy}
          style={{ flex:1, padding:"13px", borderRadius:12, background:C.bg, border:`1.5px solid ${C.border}`, fontSize:14, fontWeight:700, color:copied?C.green:C.textSub, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
          <Ic n={copied?"check":"copy"} s={16}/>{copied?"コピー済":"コピー"}
        </button>
        {isPost && (
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.content)}`} target="_blank" rel="noopener"
            style={{ flex:1, padding:"13px", borderRadius:12, background:"#000", fontSize:14, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:7, textDecoration:"none" }}>
            <Ic n="xLogo" s={15}/>X投稿
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Mobile Compose Sheet ─────────────────────────────────────────────────────
const MobileCompose = ({ folders, defFolderId, links, onSave, onClose, defaultKind="memo" }) => {
  const [form, setForm] = useState({ kind:defaultKind, title:"", content:"", type:"insight", status:"idea", rank:"none", tags:[], notes:"", folderId:defFolderId||folders[0]?.id||"" });
  const [tagIn, setTagIn] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const kc   = kindColor(form.kind);
  const save = () => { if(!form.title.trim()||!form.content.trim()) return; onSave({...form,id:uid(),createdAt:today()}); onClose(); };
  const addTag = () => { const t=tagIn.trim(); if(t&&!form.tags.includes(t)) set("tags",[...form.tags,t]); setTagIn(""); };
  const aiLinks = links.filter(l=>l.category==="AIツール"||l.category==="プロンプト集");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:500, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.panel, borderRadius:"20px 20px 0 0", display:"flex", flexDirection:"column", maxHeight:"92vh" }}>
        {/* Handle */}
        <div style={{ width:36, height:4, background:C.border, borderRadius:2, margin:"12px auto 0", flexShrink:0 }}/>

        {/* Kind tabs */}
        <div style={{ display:"flex", gap:7, padding:"12px 18px 10px", flexShrink:0 }}>
          {Object.entries(KIND).map(([k,v])=>(
            <button key={k} onClick={()=>set("kind",k)}
              style={{ flex:1, padding:"9px 0", borderRadius:10, border:`1.5px solid ${form.kind===k?v.color:C.border}`, background:form.kind===k?v.color+"14":"transparent", color:form.kind===k?v.color:C.textGhost, fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}>
              {v.label}
            </button>
          ))}
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.textGhost, padding:"0 4px" }}><Ic n="close" s={20}/></button>
        </div>

        {/* Form */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 18px 8px", display:"flex", flexDirection:"column", gap:11 }}>
          <div style={{ display:"flex", gap:9 }}>
            <div style={{ flex:2 }}>
              <label style={LS}>タイトル</label>
              <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="タイトル" style={{ ...IS, fontSize:15, padding:"10px 13px" }}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={LS}>フォルダ</label>
              <select value={form.folderId} onChange={e=>set("folderId",e.target.value)} style={{ ...SS, fontSize:13, padding:"10px 9px" }}>
                {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          {form.kind==="post" && (
            <div style={{ display:"flex", gap:9 }}>
              <div style={{ flex:1 }}><label style={LS}>ステータス</label><select value={form.status} onChange={e=>set("status",e.target.value)} style={{ ...SS, fontSize:13, padding:"9px" }}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
              <div style={{ flex:1 }}><label style={LS}>評価</label><select value={form.rank} onChange={e=>set("rank",e.target.value)} style={{ ...SS, fontSize:13, padding:"9px", color:RANK[form.rank||"none"].color }}>{Object.entries(RANK).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            </div>
          )}

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <label style={LS}>{form.kind==="post"?"本文":form.kind==="prompt"?"プロンプト":"内容"}</label>
              <span style={{ fontSize:11, color:C.textGhost }}>{chars(form.content)}字</span>
            </div>
            <textarea value={form.content} onChange={e=>set("content",e.target.value)} rows={5}
              placeholder={form.kind==="memo"?"アイデア・メモ…":form.kind==="prompt"?"プロンプト本文…":"ポスト本文…"}
              style={{ ...IS, resize:"none", lineHeight:1.85, fontSize:15, padding:"11px 13px", fontFamily:form.kind==="prompt"?"'Courier New',monospace":"inherit" }}/>
          </div>

          <div><label style={LS}>メモ</label><input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="参考・調査メモ" style={{ ...IS, fontSize:14, padding:"9px 13px" }}/></div>

          <div>
            <label style={LS}>タグ</label>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
              {form.tags.map(t=><span key={t} style={{ fontSize:12, background:kc+"14", color:kc, borderRadius:5, padding:"2px 9px", display:"flex", alignItems:"center", gap:4 }}>#{t}<button onClick={()=>set("tags",form.tags.filter(x=>x!==t))} style={{ background:"none",border:"none",cursor:"pointer",color:kc,padding:0 }}>×</button></span>)}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={tagIn} onChange={e=>setTagIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()} placeholder="タグ → Enter" style={{ ...IS, flex:1, fontSize:14, padding:"9px 13px" }}/>
            </div>
          </div>

          {aiLinks.length>0 && (
            <div>
              <label style={LS}>リンク / プロンプト</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {aiLinks.map(l=>l.url
                  ? <a key={l.id} href={l.url} target="_blank" rel="noopener" style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:8, fontSize:13, fontWeight:600, background:(l.color||C.blue)+"14", color:l.color||C.blue, textDecoration:"none" }}><Ic n="ext" s={12}/>{l.title}</a>
                  : <button key={l.id} onClick={()=>navigator.clipboard.writeText(l.memo)} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:8, fontSize:13, fontWeight:600, background:(l.color||C.amber)+"14", color:l.color||C.amber, cursor:"pointer", fontFamily:"inherit", border:"none" }}><Ic n="copy" s={12}/>{l.title}</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{ padding:"10px 18px 34px", flexShrink:0 }}>
          <button onClick={save} style={{ width:"100%", padding:"15px", borderRadius:13, background:kc, border:"none", cursor:"pointer", color:"#fff", fontSize:15, fontWeight:800, fontFamily:"inherit" }}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CopyUserIdBtn ────────────────────────────────────────────────────────────
const CopyUserIdBtn = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const id = localStorage.getItem("pf_uid") || "（IDが見つかりません）";
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <GhostBtn small onClick={copy} style={{ border:"1px solid #2E2E32", color:copied?"#5A9":"#777", fontSize:11.5 }}>
      <Ic n={copied?"check":"copy"} s={12}/>{copied?"IDコピー済":"拡張機能用ID"}
    </GhostBtn>
  );
};

// ─── Mobile Layout ────────────────────────────────────────────────────────────
const MobileLayout = ({ workspaces, activeWsId, items, folders, links, onSwitchWs, onAddWs, onRenameWs, onDeleteWs, onSaveItem, onDeleteItem, onRankItem, onStatusItem, onMoveItem, onAddFolder, onRenameFolder, onDeleteFolder, onImportItem, onAddLink, onDeleteLink, onEditLink }) => {
  const [tab,      setTab]      = useState("home");  // home | folders | search
  const [screen,   setScreen]   = useState("list");  // list | detail | folder-items
  const [selItem,  setSelItem]  = useState(null);
  const [selFolder,setSelFolder]= useState(null);
  const [search,   setSearch]   = useState("");
  const [kindFil,  setKindFil]  = useState("all");
  const [fabOpen,  setFabOpen]  = useState(false);
  const [compose,  setCompose]  = useState(null);    // null | "memo" | "post" | "prompt"
  const [editItem, setEditItem] = useState(null);

  const openItem   = item => { setSelItem(item); setScreen("detail"); setFabOpen(false); };
  const openFolder = fid  => { setSelFolder(fid); setScreen("folder-items"); };
  const goBack     = ()   => { setScreen("list"); setSelItem(null); setSelFolder(null); };

  const allItems = useMemo(() => {
    let r = items;
    if(kindFil!=="all") r=r.filter(x=>x.kind===kindFil);
    if(search.trim()){ const q=search.toLowerCase(); r=r.filter(x=>x.title.toLowerCase().includes(q)||x.content.toLowerCase().includes(q)); }
    return r;
  },[items,kindFil,search]);

  const folderItems = useMemo(() => {
    if(!selFolder) return [];
    return items.filter(x=>x.folderId===selFolder);
  },[items,selFolder]);

  const curFolder = folders.find(f=>f.id===selFolder);
  const defFolderId = folders[0]?.id || "";
  const activeWs = workspaces?.find(w=>w.id===activeWsId);

  const handleDelete = (id) => { onDeleteItem(id); goBack(); };

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'Hiragino Sans','Yu Gothic','Meiryo',sans-serif", overflow:"hidden" }}>

      {/* ─── Top bar ─── */}
      <header style={{ background:C.header, flexShrink:0, zIndex:100 }}>
        {/* Logo + workspace */}
        <div style={{ display:"flex", alignItems:"center", padding:"10px 16px 8px", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:24, height:24, borderRadius:7, background:C.amber, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="xLogo" s={13}/></div>
            <span style={{ fontWeight:900, fontSize:15, color:"#EDEBE6", letterSpacing:"-0.02em" }}>PostFlow</span>
          </div>
          <div style={{ marginLeft:4 }}>
            <WorkspaceSwitcher workspaces={workspaces||[]} activeId={activeWsId} onSwitch={onSwitchWs} onAdd={onAddWs} onRename={onRenameWs} onDelete={onDeleteWs}/>
          </div>
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:12, color:"#666" }}><span style={{ color:C.amber, fontWeight:800 }}>{items.filter(x=>x.rank==="first").length}</span> 1軍</span>
        </div>
        {/* Search bar (home tab) */}
        {tab==="home" && screen==="list" && (
          <div style={{ padding:"0 16px 10px", position:"relative" }}>
            <span style={{ position:"absolute", left:26, top:"50%", transform:"translateY(-50%)", color:C.textGhost, display:"flex" }}><Ic n="search" s={14}/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索…"
              style={{ width:"100%", background:"#2A2A2E", border:"none", borderRadius:10, padding:"10px 13px 10px 34px", color:"#EDEBE6", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
          </div>
        )}
      </header>

      {/* ─── Content ─── */}
      <div style={{ flex:1, overflowY:"auto", position:"relative" }}>

        {/* ── Home: list ── */}
        {tab==="home" && screen==="list" && (
          <>
            {/* Kind filter chips */}
            <div style={{ display:"flex", gap:7, padding:"12px 16px 8px", overflowX:"auto" }}>
              {[{k:"all",l:"すべて"},...Object.entries(KIND).map(([k,v])=>({k,l:v.label}))].map(f=>(
                <button key={f.k} onClick={()=>setKindFil(f.k)}
                  style={{ flexShrink:0, padding:"6px 15px", borderRadius:99, background:kindFil===f.k?C.amber+"18":"transparent", border:`1.5px solid ${kindFil===f.k?C.amber:C.border}`, fontSize:13, fontWeight:kindFil===f.k?700:500, color:kindFil===f.k?C.amber:C.textSub, cursor:"pointer", fontFamily:"inherit" }}>
                  {f.l}
                </button>
              ))}
            </div>
            {allItems.length===0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:"60px 20px", color:C.textGhost }}>
                <Ic n="file" s={40}/>
                <div style={{ fontSize:14, fontWeight:600 }}>アイテムがありません</div>
                <button onClick={()=>setCompose("memo")} style={{ padding:"10px 22px", borderRadius:10, background:C.amber, border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>＋ メモを追加</button>
              </div>
            ) : allItems.map(item=>(
              <MobileItemCard key={item.id} item={item} folders={folders} onOpen={openItem}/>
            ))}
          </>
        )}

        {/* ── Home: detail ── */}
        {tab==="home" && screen==="detail" && selItem && (
          <MobileDetail item={selItem} folders={folders}
            onBack={goBack} onEdit={setEditItem}
            onStatus={onStatusItem} onRank={onRankItem}
            onDelete={handleDelete}/>
        )}

        {/* ── Folders tab ── */}
        {tab==="folders" && screen==="list" && (
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:14 }}>フォルダ</div>
            {/* Smart folders */}
            {[
              { id:"__all__",    label:"すべて",       icon:"all",   count:items.length,                              color:C.textSub },
              { id:"__starred__",label:"1軍",           icon:"starF", count:items.filter(x=>x.rank==="first").length,  color:C.amber   },
              { id:"__ready__",  label:"投稿準備完了",  icon:"check", count:items.filter(x=>x.status==="ready").length,color:C.green   },
            ].map(s=>(
              <div key={s.id} onClick={()=>{ setSelFolder(s.id); setScreen("folder-items"); }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderRadius:12, background:C.panel, marginBottom:8, border:`1px solid ${C.border}`, cursor:"pointer" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:s.color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ic n={s.icon} s={18} color={s.color}/>
                </div>
                <span style={{ flex:1, fontSize:15, fontWeight:600, color:C.text }}>{s.label}</span>
                <span style={{ fontSize:13, color:C.textGhost, fontWeight:600 }}>{s.count}</span>
                <span style={{ color:C.textGhost }}><Ic n="chevR" s={16}/></span>
              </div>
            ))}
            <div style={{ height:1, background:C.border, margin:"10px 0 14px" }}/>
            <div style={{ fontSize:11, fontWeight:700, color:C.textGhost, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>フォルダ</div>
            {folders.map(f=>(
              <div key={f.id} onClick={()=>openFolder(f.id)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderRadius:12, background:C.panel, marginBottom:8, border:`1px solid ${C.border}`, cursor:"pointer" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:f.color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ic n="folder" s={18} color={f.color}/>
                </div>
                <span style={{ flex:1, fontSize:15, fontWeight:600, color:C.text }}>{f.name}</span>
                <span style={{ fontSize:13, color:C.textGhost, fontWeight:600 }}>{items.filter(x=>x.folderId===f.id).length}</span>
                <span style={{ color:C.textGhost }}><Ic n="chevR" s={16}/></span>
              </div>
            ))}
          </div>
        )}

        {/* ── Folder items ── */}
        {tab==="folders" && screen==="folder-items" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 16px", background:C.panel, borderBottom:`1px solid ${C.border}` }}>
              <button onClick={goBack} style={{ background:"none", border:"none", cursor:"pointer", color:C.amber, fontSize:15, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", gap:4, padding:0 }}>
                <Ic n="chevR" s={16}/> 戻る
              </button>
              {selFolder && !selFolder.startsWith("__") && curFolder && (
                <span style={{ fontSize:16, fontWeight:700, color:C.text }}>{curFolder.name}</span>
              )}
            </div>
            {folderItems.map(item=>(
              <MobileItemCard key={item.id} item={item} folders={folders} onOpen={item=>{ openItem(item); setTab("home"); }}/>
            ))}
            {folderItems.length===0 && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"50px 20px", color:C.textGhost }}>
                <Ic n="file" s={36}/>
                <div style={{ fontSize:13, fontWeight:600 }}>アイテムがありません</div>
              </div>
            )}
          </>
        )}

        {/* ── Search tab ── */}
        {tab==="search" && (
          <div style={{ padding:"14px 16px" }}>
            <div style={{ position:"relative", marginBottom:16 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.textGhost, display:"flex" }}><Ic n="search" s={16}/></span>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="タイトル・本文を検索…"
                style={{ ...IS, padding:"12px 13px 12px 36px", fontSize:15 }}/>
            </div>
            {search.trim() ? (
              <>
                <div style={{ fontSize:12, color:C.textGhost, marginBottom:8 }}>{allItems.length}件</div>
                {allItems.map(item=><MobileItemCard key={item.id} item={item} folders={folders} onOpen={item=>{ openItem(item); setTab("home"); }}/>)}
              </>
            ) : (
              <div style={{ fontSize:13, color:C.textGhost, textAlign:"center", marginTop:40 }}>キーワードを入力してください</div>
            )}
          </div>
        )}
      </div>

      {/* ─── FAB ─── */}
      {screen==="list" && !compose && !editItem && (
        <div style={{ position:"fixed", bottom:82, right:20, zIndex:200, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:9 }}>
          {fabOpen && Object.entries(KIND).reverse().map(([k,v])=>(
            <button key={k} onClick={()=>{ setCompose(k); setFabOpen(false); }}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:99, background:v.color, border:"none", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, fontFamily:"inherit", boxShadow:`0 4px 14px ${v.color}55`, whiteSpace:"nowrap" }}>
              <Ic n={kindIcon(k)} s={14}/>{v.label}
            </button>
          ))}
          <button onClick={()=>setFabOpen(o=>!o)}
            style={{ width:56, height:56, borderRadius:"50%", background:fabOpen?"#444":C.amber, border:"none", cursor:"pointer", color:"#fff", fontSize:26, fontWeight:300, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 6px 20px ${C.amber}55`, transition:"all 0.2s", transform:fabOpen?"rotate(45deg)":"rotate(0)" }}>
            +
          </button>
        </div>
      )}
      {fabOpen && <div style={{ position:"fixed", inset:0, zIndex:199 }} onClick={()=>setFabOpen(false)}/>}

      {/* ─── Bottom nav ─── */}
      <div style={{ height:74, background:C.panel, borderTop:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-around", flexShrink:0, paddingBottom:10, zIndex:100 }}>
        {[
          { k:"home",    l:"ホーム",  ic:"all"    },
          { k:"folders", l:"フォルダ",ic:"folder" },
          { k:"search",  l:"検索",    ic:"search" },
        ].map(t=>(
          <button key={t.k} onClick={()=>{ setTab(t.k); if(t.k!==tab) setScreen("list"); }}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"6px 22px", fontFamily:"inherit", WebkitTapHighlightColor:"transparent" }}>
            <span style={{ color:tab===t.k?C.amber:C.textGhost, display:"flex" }}><Ic n={t.ic} s={22}/></span>
            <span style={{ fontSize:10, fontWeight:tab===t.k?700:500, color:tab===t.k?C.amber:C.textGhost }}>{t.l}</span>
          </button>
        ))}
      </div>

      {/* ─── Compose sheet ─── */}
      {compose && (
        <MobileCompose folders={folders} defFolderId={defFolderId} links={links}
          defaultKind={compose}
          onSave={item=>{ onSaveItem(item); setCompose(null); }}
          onClose={()=>setCompose(null)}/>
      )}

      {/* ─── Edit modal (reuse ItemModal) ─── */}
      {editItem && (
        <ItemModal item={editItem} folders={folders} defFolderId={defFolderId} links={links}
          onSave={item=>{ onSaveItem(item); setEditItem(null); setSelItem(item); }}
          onClose={()=>setEditItem(null)}/>
      )}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [workspaces, setWorkspaces] = useState(null); // null = loading
  const [activeWsId, setActiveWsId] = useState(null);
  const [wsData,     setWsData]     = useState({});   // { [wsId]: {items, folders, links} }

  const [selF,     setSelF]     = useState("__all__");
  const [selItem,  setSelItem]  = useState(null);
  const [search,   setSearch]   = useState("");
  const [statFil,  setStatFil]  = useState("all");
  const [kindFil,  setKindFil]  = useState("all");
  const [tab,      setTab]      = useState("posts");
  const [editItem, setEditItem] = useState(null);
  const [showImp,  setShowImp]  = useState(false);
  const [sort,     setSort]     = useState("date");

  // ── Bootstrap ──
  useEffect(()=>{
    (async()=>{
      try {
        const rwl = await window.storage?.get("pf7_workspaces");
        const raw = await window.storage?.get("pf7_activeWs");
        if(rwl?.value) {
          const wsList = JSON.parse(rwl.value);
          const awId   = raw?.value || wsList[0].id;
          setWorkspaces(wsList);
          setActiveWsId(awId);
          // Load all workspace data
          const data = {};
          for(const ws of wsList) {
            const ri = await window.storage?.get(`pf7i_${ws.id}`);
            const rf = await window.storage?.get(`pf7f_${ws.id}`);
            const rl = await window.storage?.get(`pf7l_${ws.id}`);
            const def = makeInitFolders();
            data[ws.id] = {
              items:   ri?.value ? JSON.parse(ri.value) : makeInitItems(def),
              folders: rf?.value ? JSON.parse(rf.value) : def,
              links:   rl?.value ? JSON.parse(rl.value) : [],
            };
          }
          setWsData(data);
        } else {
          // First run
          const init = makeDefaultWorkspaces();
          setWorkspaces(init.workspaces);
          setActiveWsId(init.workspaces[0].id);
          setWsData(init.data);
          window.storage?.set("pf7_workspaces", JSON.stringify(init.workspaces));
          window.storage?.set("pf7_activeWs",   init.workspaces[0].id);
          for(const ws of init.workspaces) {
            window.storage?.set(`pf7i_${ws.id}`, JSON.stringify(init.data[ws.id].items));
            window.storage?.set(`pf7f_${ws.id}`, JSON.stringify(init.data[ws.id].folders));
            window.storage?.set(`pf7l_${ws.id}`, JSON.stringify(init.data[ws.id].links));
          }
        }
      } catch(e) {
        const init = makeDefaultWorkspaces();
        setWorkspaces(init.workspaces);
        setActiveWsId(init.workspaces[0].id);
        setWsData(init.data);
      }
    })();
  },[]);

  // ── Workspace data accessors ──
  const curWs  = wsData[activeWsId] || { items:[], folders:[], links:[] };
  const items   = curWs.items;
  const folders = curWs.folders;
  const links   = curWs.links;

  const patchWs = (wsId, patch) => {
    setWsData(prev => {
      const next = { ...prev, [wsId]:{ ...prev[wsId], ...patch } };
      if(patch.items)   window.storage?.set(`pf7i_${wsId}`, JSON.stringify(patch.items)).catch(()=>{});
      if(patch.folders) window.storage?.set(`pf7f_${wsId}`, JSON.stringify(patch.folders)).catch(()=>{});
      if(patch.links)   window.storage?.set(`pf7l_${wsId}`, JSON.stringify(patch.links)).catch(()=>{});
      return next;
    });
  };

  const si = i => patchWs(activeWsId, { items:i });
  const sf = f => patchWs(activeWsId, { folders:f });
  const sl = l => patchWs(activeWsId, { links:l });

  // ── Workspace switching ──
  const switchWs = async (wsId) => {
    setActiveWsId(wsId);
    setSelF("__all__");
    setSelItem(null);
    setSearch("");
    window.storage?.set("pf7_activeWs", wsId);
    // Lazy-load if not yet fetched
    if(!wsData[wsId]) {
      try {
        const ri = await window.storage?.get(`pf7i_${wsId}`);
        const rf = await window.storage?.get(`pf7f_${wsId}`);
        const rl = await window.storage?.get(`pf7l_${wsId}`);
        const def = makeInitFolders();
        setWsData(prev=>({ ...prev, [wsId]:{
          items:   ri?.value?JSON.parse(ri.value):makeInitItems(def),
          folders: rf?.value?JSON.parse(rf.value):def,
          links:   rl?.value?JSON.parse(rl.value):[],
        }}));
      } catch {}
    }
  };

  const addWorkspace = (ws) => {
    const newFolders = makeInitFolders();
    const newWsList  = [...(workspaces||[]), ws];
    setWorkspaces(newWsList);
    setWsData(prev=>({ ...prev, [ws.id]:{ items:makeInitItems(newFolders), folders:newFolders, links:[] } }));
    window.storage?.set("pf7_workspaces", JSON.stringify(newWsList));
    window.storage?.set(`pf7i_${ws.id}`, JSON.stringify(makeInitItems(newFolders)));
    window.storage?.set(`pf7f_${ws.id}`, JSON.stringify(newFolders));
    window.storage?.set(`pf7l_${ws.id}`, JSON.stringify([]));
    switchWs(ws.id);
  };

  const renameWorkspace = (wsId, name) => {
    const next = (workspaces||[]).map(w=>w.id===wsId?{...w,name}:w);
    setWorkspaces(next);
    window.storage?.set("pf7_workspaces", JSON.stringify(next));
  };

  const deleteWorkspace = (wsId) => {
    const next = (workspaces||[]).filter(w=>w.id!==wsId);
    setWorkspaces(next);
    window.storage?.set("pf7_workspaces", JSON.stringify(next));
    if(activeWsId===wsId && next.length>0) switchWs(next[0].id);
  };

  // ── Item operations ──
  const save   = item => { const nx=items.find(x=>x.id===item.id)?items.map(x=>x.id===item.id?item:x):[item,...items]; si(nx); setSelItem(item); setEditItem(null); };
  const del    = id   => { si(items.filter(x=>x.id!==id)); if(selItem?.id===id) setSelItem(null); };
  const dup    = item => si([{...item,id:uid(),title:item.title+" (コピー)",status:"idea",rank:"none",createdAt:today()},...items]);
  const rank   = (id,r)  => { const nx=items.map(x=>x.id===id?{...x,rank:r}:x); si(nx); if(selItem?.id===id) setSelItem(nx.find(x=>x.id===id)); };
  const status = (id,st) => { const nx=items.map(x=>x.id===id?{...x,status:st}:x); si(nx); if(selItem?.id===id) setSelItem(nx.find(x=>x.id===id)); };
  const move   = (id,fid)=> si(items.map(x=>x.id===id?{...x,folderId:fid}:x));
  const imp    = item => si(prev=>[item,...prev]);

  const addFolder    = f => sf([...folders,f]);
  const renameFolder = (id,name) => sf(folders.map(f=>f.id===id?{...f,name}:f));
  const deleteFolder = id => {
    const fallback = folders.find(f=>f.id!==id)?.id||"";
    sf(folders.filter(f=>f.id!==id));
    si(items.map(x=>x.folderId===id?{...x,folderId:fallback}:x));
    if(selF===id) setSelF("__all__");
  };

  const allDesc = useCallback((fid)=>{ const ch=folders.filter(f=>f.parentId===fid); return [fid,...ch.flatMap(c=>allDesc(c.id))]; },[folders]);

  const filtered = useMemo(()=>{
    let r=items;
    if(selF==="__starred__")      r=r.filter(x=>x.rank==="first");
    else if(selF==="__ready__")   r=r.filter(x=>x.status==="ready");
    else if(selF==="__posted__")  r=r.filter(x=>x.status==="posted");
    else if(selF!=="__all__")     r=r.filter(x=>allDesc(selF).includes(x.folderId));
    if(statFil!=="all") r=r.filter(x=>x.status===statFil);
    if(kindFil!=="all") r=r.filter(x=>x.kind===kindFil);
    if(search.trim()){ const q=search.toLowerCase(); r=r.filter(x=>x.title.toLowerCase().includes(q)||x.content.toLowerCase().includes(q)||x.tags?.some(t=>t.toLowerCase().includes(q))); }
    if(sort==="title")  r=[...r].sort((a,b)=>a.title.localeCompare(b.title,"ja"));
    if(sort==="status") r=[...r].sort((a,b)=>Object.keys(STATUS).indexOf(a.status)-Object.keys(STATUS).indexOf(b.status));
    return r;
  },[items,selF,statFil,kindFil,search,sort,allDesc]);

  const stats = { total:items.length, posts:items.filter(x=>x.kind==="post").length, ready:items.filter(x=>x.status==="ready").length, first:items.filter(x=>x.rank==="first").length };
  const curFolder   = selF.startsWith("__") ? null : folders.find(f=>f.id===selF);
  const panelTitle  = selF==="__all__"?"すべて":selF==="__starred__"?"1軍":selF==="__ready__"?"投稿準備完了":selF==="__posted__"?"投稿済み":(curFolder?.name||"");
  const defFolderId = selF.startsWith("__") ? folders[0]?.id : selF;

  const isMobile = useIsMobile();

  if(!workspaces) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.header, color:"#666", fontSize:13, fontFamily:"'Hiragino Sans',sans-serif" }}>
      読み込み中…
    </div>
  );

  if(isMobile) return (
    <MobileLayout
      workspaces={workspaces} activeWsId={activeWsId}
      items={items} folders={folders} links={links}
      onSwitchWs={switchWs} onAddWs={addWorkspace} onRenameWs={renameWorkspace} onDeleteWs={deleteWorkspace}
      onSaveItem={save} onDeleteItem={del} onRankItem={rank} onStatusItem={status} onMoveItem={move}
      onAddFolder={addFolder} onRenameFolder={renameFolder} onDeleteFolder={deleteFolder}
      onImportItem={imp}
      onAddLink={l=>sl([...links,l])} onDeleteLink={id=>sl(links.filter(l=>l.id!==id))} onEditLink={l=>sl(links.map(x=>x.id===l.id?l:x))}/>
  );

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'Hiragino Sans','Yu Gothic','Meiryo',sans-serif", overflow:"hidden" }}>

      {/* ─── Header ─── */}
      <header style={{ background:C.header, height:46, display:"flex", alignItems:"center", padding:"0 14px", gap:10, flexShrink:0, zIndex:200 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:7, paddingRight:12, borderRight:"1px solid #2E2E32" }}>
          <div style={{ width:22, height:22, borderRadius:6, background:C.amber, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="xLogo" s={12}/></div>
          <span style={{ fontWeight:900, fontSize:14, color:"#EDEBE6", letterSpacing:"-0.02em" }}>PostFlow</span>
        </div>

        {/* Workspace switcher */}
        <div style={{ paddingRight:12, borderRight:"1px solid #2E2E32" }}>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWsId}
            onSwitch={switchWs}
            onAdd={addWorkspace}
            onRename={renameWorkspace}
            onDelete={deleteWorkspace}/>
        </div>

        {/* Tab nav */}
        <div style={{ display:"flex", gap:2 }}>
          {[{k:"posts",l:"管理"},{k:"links",l:"リンク"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{ padding:"4px 10px", borderRadius:6, background:tab===t.k?"#2E2E32":"none", border:"none", cursor:"pointer", color:tab===t.k?"#EDEBE6":"#666", fontSize:12, fontWeight:700, fontFamily:"inherit", transition:"all 0.12s" }}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        {/* Stats */}
        <div style={{ display:"flex", gap:14, marginRight:10 }}>
          {[{v:stats.total,l:"計"},{v:stats.posts,l:"ポスト",c:C.blue},{v:stats.ready,l:"Ready",c:C.green},{v:stats.first,l:"1軍",c:C.amber}].map(s=>(
            <span key={s.l} style={{ fontSize:12, color:"#666" }}>
              <span style={{ color:s.c||"#888", fontWeight:800 }}>{s.v}</span> <span style={{ fontSize:10 }}>{s.l}</span>
            </span>
          ))}
        </div>
        <GhostBtn small onClick={()=>setShowImp(true)} style={{ border:"1px solid #2E2E32", color:"#777", fontSize:11.5 }}><Ic n="import" s={12}/>取り込み</GhostBtn>
        <CopyUserIdBtn/>
        <SolidBtn color={C.amber} small onClick={()=>setEditItem({})}><Ic n="plus" s={13}/>新規作成</SolidBtn>
      </header>

      {/* ─── Body ─── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {tab==="posts" && (
          <>
            <div style={{ width:212, flexShrink:0, background:C.sidebar, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              <Sidebar folders={folders} items={items} selected={selF}
                onSelect={id=>{ setSelF(id); setSelItem(null); }}
                onAddFolder={addFolder} onRename={renameFolder} onDeleteFolder={deleteFolder}/>
            </div>

            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
              {/* Toolbar */}
              <div style={{ padding:"0 16px", height:46, display:"flex", alignItems:"center", gap:9, background:C.panel, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                  {curFolder && <Dot color={curFolder.color} size={9}/>}
                  <span style={{ fontWeight:700, fontSize:14, color:C.text }}>{panelTitle}</span>
                  <span style={{ fontSize:11.5, color:C.textGhost, fontWeight:600 }}>{filtered.length}件</span>
                </div>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:C.textGhost, display:"flex" }}><Ic n="search" s={13}/></span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索…"
                    style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"5px 10px 5px 26px", color:C.text, fontSize:12, fontFamily:"inherit", outline:"none", width:130 }}/>
                </div>
                <select value={kindFil} onChange={e=>setKindFil(e.target.value)} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.textSub, fontSize:11.5, padding:"5px 7px", fontFamily:"inherit", cursor:"pointer" }}>
                  <option value="all">全種類</option>
                  {Object.entries(KIND).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={statFil} onChange={e=>setStatFil(e.target.value)} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.textSub, fontSize:11.5, padding:"5px 7px", fontFamily:"inherit", cursor:"pointer" }}>
                  <option value="all">全ステータス</option>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.textSub, fontSize:11.5, padding:"5px 7px", fontFamily:"inherit", cursor:"pointer" }}>
                  <option value="date">日付順</option>
                  <option value="title">タイトル順</option>
                  <option value="status">ステータス順</option>
                </select>
              </div>

              {/* List */}
              <div style={{ flex:1, overflowY:"auto" }}>
                {filtered.length===0 ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, height:"100%", color:C.textGhost }}>
                    <Ic n="file" s={36}/>
                    <div style={{ fontSize:13, fontWeight:600 }}>アイテムがありません</div>
                    <div style={{ display:"flex", gap:8, marginTop:4 }}>
                      <GhostBtn small onClick={()=>setShowImp(true)}><Ic n="import" s={12}/>テキストを取り込む</GhostBtn>
                      <SolidBtn color={C.amber} small onClick={()=>setEditItem({})}><Ic n="plus" s={12}/>新規作成</SolidBtn>
                    </div>
                  </div>
                ) : filtered.map(item=>(
                  <ItemRow key={item.id} item={item} folders={folders} active={selItem?.id===item.id}
                    onEdit={setEditItem} onDelete={del} onDuplicate={dup} onMove={move} onRank={rank}
                    onSelect={x=>setSelItem(s=>s?.id===x.id?null:x)}/>
                ))}
              </div>
            </div>

            {selItem && (
              <div style={{ width:300, flexShrink:0 }}>
                <Detail item={selItem} folders={folders}
                  onClose={()=>setSelItem(null)} onEdit={setEditItem}
                  onStatus={status} onRank={rank}/>
              </div>
            )}
          </>
        )}

        {tab==="links" && (
          <div style={{ flex:1, overflowY:"auto", padding:"22px 22px 48px" }}>
            <LinkManager list={links}
              onAdd={l=>sl([...links,l])}
              onDelete={id=>sl(links.filter(l=>l.id!==id))}
              onEdit={l=>sl(links.map(x=>x.id===l.id?l:x))}/>
          </div>
        )}
      </div>

      {editItem!==null && <ItemModal item={editItem} folders={folders} defFolderId={defFolderId} links={links} onSave={save} onClose={()=>setEditItem(null)}/>}
      {showImp && <ImportModal folders={folders} defFolderId={defFolderId} onImport={imp} onClose={()=>setShowImp(false)}/>}
    </div>
  );
}
