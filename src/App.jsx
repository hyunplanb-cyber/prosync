import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import {
  loadAll, seedInitialData,
  dbLogin, dbRegister,
  dbAddProject, dbUpdateProject,
  dbAddTask, dbAddTasks, dbUpdateTask, dbDeleteTask, dbDeleteTasks, dbDeleteProjectTasksNotManual,
  dbAddDoc, dbDeleteDoc,
} from "./lib/db.js";
import {
  LayoutDashboard, FolderOpen, TrendingUp, Archive, Users, LogOut,
  Plus, ChevronRight, ChevronDown, Upload, Download, Share2,
  Edit2, Trash2, X, Clock, CheckCircle, FileText, ExternalLink,
  Calendar, Menu, BarChart2, Target, AlertCircle, ArrowLeft,
  UserPlus, Link, CheckSquare, Square, Minus, RefreshCw, Info
} from "lucide-react";

/* ── 공휴일 / 영업일 ─────────────────────────────────────────────── */
const HOLIDAYS=new Set(["2026-01-01","2026-03-01","2026-05-05","2026-06-06","2026-08-17","2026-10-09","2026-12-25","2025-01-01","2025-03-01","2025-05-05","2025-06-06","2025-08-15","2025-10-03","2025-10-09","2025-12-25"]);
function isWD(d){const w=d.getDay();return w!==0&&w!==6&&!HOLIDAYS.has(d.toISOString().split("T")[0]);}
function countWD(s,e){if(!s||!e)return 0;let n=0,c=new Date(s),ed=new Date(e);while(c<=ed){if(isWD(c))n++;c.setDate(c.getDate()+1);}return n;}
function calcPct(s,e){if(!s||!e)return 0;const t=new Date(),st=new Date(s),en=new Date(e),tot=countWD(s,e);if(!tot)return 0;if(t<st)return 0;/* 시작 전 → 0% */const cap=t>en?en:t;return Math.min(100,Math.round(countWD(s,cap.toISOString().split("T")[0])/tot*100));}
function calcPctAt(ts,te,asOfStr){if(!ts||!te||!asOfStr)return 0;const tot=countWD(ts,te);if(!tot)return 0;const asOf=new Date(asOfStr),st=new Date(ts),en=new Date(te),cap=asOf<st?st:asOf>en?en:asOf;return Math.min(100,Math.round(countWD(ts,cap.toISOString().split("T")[0])/tot*100));}
function getWeeks(s,e){if(!s||!e)return[];const wks=[];let cur=new Date(s);const dow=cur.getDay();cur.setDate(cur.getDate()+(dow===0?-6:1-dow));const ed=new Date(e);let n=1;while(cur<=ed){const ws=new Date(cur),we=new Date(cur);we.setDate(we.getDate()+4);wks.push({num:n,start:ws.toISOString().split("T")[0],end:we.toISOString().split("T")[0]});cur.setDate(cur.getDate()+7);n++;}return wks;}
function isActiveInWeek(ts,te,ws,we){return ts&&te&&ts<=we&&te>=ws;}

/* ── ID 생성 (UUID) ──────────────────────────────────────────────── */
const nid=()=>crypto.randomUUID();

/* ── 노션 로드맵 파싱 ────────────────────────────────────────────── */
const PHASE_COLORS=["#6366f1","#8b5cf6","#10b981","#f59e0b","#ef4444"];
function buildNotionTasks(pid){
  const t=[];
  const defs=[
    {title:"Phase 1 — 지식그래프 · QA셋 · 쉐도우홈페이지",desc:"AI 봇이 밝은세상안과를 신뢰할 수 있는 출처로 인식하도록 데이터 기반 구축",color:"#6366f1",ps:"2026-04-28",pe:"2026-06-20",tasks:[
      {title:"[기획] 시술 콘텐츠 매핑 테이블 확정",role:"기획",uid:4,ts:"2026-04-28",te:"2026-05-08",subs:["병원 주요 시술 목록 추출 (홈페이지 기준)","시술별 효과/부작용/주의사항/논문출처 엑셀 정리","JSON-LD에 넣을 핵심 키워드 선정"]},
      {title:"[서버] Neo4j 지식그래프 구축",role:"서버",uid:3,ts:"2026-05-09",te:"2026-05-23",subs:["Neo4j Aura 클라우드 계정 생성","노드 설계: 시술명→효과→부작용→근거논문","매핑 테이블 데이터 Neo4j 업로드 (Python 스크립트)"]},
      {title:"[기획] QA 데이터셋 500개 제작",role:"기획",uid:4,ts:"2026-05-09",te:"2026-05-23",subs:["환자 예상 질문 유형 분류 (증상/비용/회복기간/비교)","원장님 상담 톤 기준 답변 작성 (JSONL 포맷)","지식그래프 근거 메타데이터 연결"]},
      {title:"[디자인] 쉐도우 홈페이지 HTML 구조 설계",role:"디자인",uid:2,ts:"2026-05-11",te:"2026-05-30",subs:["AI 봇 크롤링 최적화 HTML 템플릿 작성","시술별 URL 구조 결정 (/laser-vision/lasik 등)","JSON-LD 스키마 마크업 삽입 위치 정의"]},
      {title:"[기획+디자인] UTM 파라미터 기획",role:"기획",uid:4,ts:"2026-05-25",te:"2026-06-05",subs:["쉐도우 페이지→본 홈페이지 링크 UTM 태깅 설계","utm_source/medium 분류 체계 수립","Google Analytics 4 연동 확인"]},
      {title:"[서버] 자동 생성 스크립트 개발",role:"서버",uid:3,ts:"2026-05-25",te:"2026-06-12",subs:["Neo4j→HTML 페이지 자동 생성 Python 스크립트","JSON-LD 동적 삽입 로직 구현","QA셋을 개별 URL 페이지로 자동 배포"]},
      {title:"[서버] 호스팅 서버 세팅 & 배포",role:"서버",uid:3,ts:"2026-06-08",te:"2026-06-20",subs:["GitHub Pages / Vercel로 쉐도우 사이트 배포","Google Search Console 등록 및 사이트맵 제출","AI 봇 접근 허용 robots.txt 설정"]},
      {title:"[공통] 인덱싱 및 AI 봇 노출 확인",role:"공통",uid:1,ts:"2026-06-15",te:"2026-06-20",subs:["ChatGPT/Perplexity/Google AI 검색 테스트","Search Console 크롤링 오류 점검","Phase 1 완료 보고서 작성"]},
    ]},
    {title:"Phase 2 — 앰버서더 챗봇 개발",desc:"유입된 방문자가 챗봇 상담 후 예약까지 이어지도록 전환 경험 설계",color:"#8b5cf6",ps:"2026-06-22",pe:"2026-07-31",tasks:[
      {title:"[서버] 개발 환경 셋업",role:"서버",uid:3,ts:"2026-06-22",te:"2026-06-26",subs:["Python 3.10+ / LangChain 설치","Gemini API Key 발급 (Google AI Studio)","Pinecone 또는 Milvus 벡터DB 계정 생성"]},
      {title:"[서버] 데이터 임베딩 & 벡터DB 적재",role:"서버",uid:3,ts:"2026-06-26",te:"2026-07-10",subs:["QA 500개 + 지식그래프 데이터 벡터 변환","Pinecone/Milvus 자동 업로드 스크립트","유사도 검색 정확도 테스트"]},
      {title:"[기획] 원장님 페르소나 & 시스템 프롬프트 설계",role:"기획",uid:4,ts:"2026-06-22",te:"2026-07-04",subs:["역할/제약/톤앤매너 프롬프트 작성","금지 발화 목록 (의학적 오판 방지)","시스템 프롬프트 v1 문서 작성"]},
      {title:"[기획] 챗봇 → 예약 전환 플로우 설계",role:"기획",uid:4,ts:"2026-07-01",te:"2026-07-11",subs:["상담 종료 시점 예약 유도 시나리오 정의","예약 버튼 클릭 URL 확정","자연스러운 예약 유도 타이밍 3가지 이상 설정"]},
      {title:"[서버] RAG 파이프라인 개발",role:"서버",uid:3,ts:"2026-07-06",te:"2026-07-19",subs:["LangChain RAG 체인 구성 (검색→프롬프트→응답)","Gemini Flash API 연동","답변 품질 테스트 (20개 시나리오)"]},
      {title:"[디자인+프론트] 챗봇 UI 개발 & 홈페이지 삽입",role:"디자인",uid:2,ts:"2026-07-06",te:"2026-07-25",subs:["챗봇 위젯 디자인 (피그마→HTML/CSS)","기존 홈페이지에 스크립트 삽입","모바일 반응형 확인 및 예약 버튼 고정"]},
      {title:"[공통] 베타 테스트 & 피드백 반영",role:"공통",uid:1,ts:"2026-07-22",te:"2026-07-31",subs:["내부 직원 50개 질문 테스트","오답 케이스 QA셋에 추가","챗봇 상담 후 예약 클릭률 측정"]},
    ]},
    {title:"Phase 3 — 지능형 평판 보호 시스템",desc:"AI 답변 내 SOV 유지 + 부정 평판 조기 차단으로 퍼널 유입량 보호",color:"#10b981",ps:"2026-08-01",pe:"2026-08-31",tasks:[
      {title:"[서버] 모니터링 환경 구축",role:"서버",uid:3,ts:"2026-08-01",te:"2026-08-08",subs:["Playwright / Firecrawl / LangChain 설치","Gemini API Key + Firecrawl API Key 발급","Slack Webhook URL 생성 (알림용)"]},
      {title:"[서버] 데이터 수집기 개발 (collector.py)",role:"서버",uid:3,ts:"2026-08-06",te:"2026-08-16",subs:["ChatGPT/Perplexity AI 답변 내 SOV 측정 자동화","맘카페/네이버 지도 리뷰 크롤링","수집 주기 스케줄러 설정 (1일 1회)"]},
      {title:"[서버] 감성 분석 & 위협 감지 (analyzer.py)",role:"서버",uid:3,ts:"2026-08-10",te:"2026-08-21",subs:["Gemini로 부정 리뷰 자동 분류","위험도 점수 산출 로직 (긴급/주의/정상)","AI 답변 내 경쟁 병원 우위 감지"]},
      {title:"[서버] 자동 대응 시스템 (responder.py)",role:"서버",uid:3,ts:"2026-08-17",te:"2026-08-28",subs:["부정 이슈→원장님 답변 초안 자동 생성","Slack 긴급 알림 발송","대응 답변 승인 후 게시 플로우 설계"]},
      {title:"[디자인+프론트] 통합 대시보드 구축",role:"디자인",uid:2,ts:"2026-08-10",te:"2026-08-31",subs:["평판 현황 대시보드 (SOV/리뷰추이/예약전환율)","Weekly 리포트 자동 발송 (이메일/Slack)","Phase 3 완료 보고서 및 시스템 고도화 검토"]},
    ]},
  ];
  defs.forEach(ph=>{
    const phId=nid();
    t.push({id:phId,pid,parentId:null,depth:0,uid:1,title:ph.title,desc:ph.desc,ts:ph.ps,te:ph.pe,cs:ph.ps,ce:ph.pe,status:"예정",color:ph.color,del:[],expanded:true});
    ph.tasks.forEach(tk=>{
      const tkId=nid();
      t.push({id:tkId,pid,parentId:phId,depth:1,uid:tk.uid,title:tk.title,role:tk.role,desc:"",ts:tk.ts,te:tk.te,cs:tk.ts,ce:tk.te,status:"예정",del:[],expanded:true});
      tk.subs.forEach(s=>t.push({id:nid(),pid,parentId:tkId,depth:2,uid:tk.uid,title:s,desc:"",ts:tk.ts,te:tk.te,cs:tk.ts,ce:tk.te,status:"예정",del:[]}));
    });
  });
  return t;
}

/* ── 초기 데이터 ─────────────────────────────────────────────────── */
const VACANT_ID=0; // 공석
const INIT_USERS=[
  {id:1,name:"H마스터",email:"hyun.planb@gmail.com",password:"1234",role:"master"},
  {id:2,name:"이디자인",email:"lee@test.com",   password:"1234",role:"member"},
  {id:3,name:"박개발",  email:"park@test.com",  password:"1234",role:"member"},
  {id:4,name:"최기획",  email:"choi@test.com",  password:"1234",role:"member"},
];
const NOTION_PID="proj-brighteye-ai-2026";
const INIT_PROJS=[
  {id:NOTION_PID,name:"밝은세상안과 × AI 프로젝트",desc:"AI 노출 → 홈페이지 유입 → 예약 전환 퍼널 구축",start:"2026-04-28",end:"2026-08-31",members:[
    {id:2,role:"디자인",customRole:"",tabs:["schedule","progress","documents"]},
    {id:3,role:"개발",  customRole:"",tabs:["schedule","progress","documents"]},
    {id:4,role:"기획",  customRole:"",tabs:["schedule","progress","documents"]},
  ],color:"#6366f1",notionUrl:"https://www.notion.so/34c049f6e99e81bd9d03e194adedb341"},
  {id:"proj-website-renewal-2025",name:"웹사이트 리뉴얼",desc:"기업 메인 웹사이트 전면 리뉴얼",start:"2025-03-01",end:"2025-06-30",members:[
    {id:2,role:"디자인",customRole:"",tabs:["schedule","progress","documents"]},
    {id:3,role:"개발",  customRole:"",tabs:["schedule","progress","documents"]},
    {id:4,role:"기획",  customRole:"",tabs:["schedule","progress","documents"]},
  ],color:"#10b981",notionUrl:""},
];
const INIT_TASKS=[...buildNotionTasks(NOTION_PID)];
const INIT_DOCS=[
  {id:1,pid:NOTION_PID,uid:1,title:"킥오프 회의록",desc:"2026년 4월 28일 킥오프 미팅 회의록",files:[],links:["https://www.notion.so/34c049f6e99e81bd9d03e194adedb341"],at:"2026-04-28"},
];
const KNOWN_NOTION_IDS=["34c049f6e99e81bd9d03e194adedb341"];

/* ── 공통 UI ─────────────────────────────────────────────────────── */
const Av=({n,sz="w-8 h-8",ts="text-xs",vacant=false})=>(
  <div className={`${sz} rounded-full flex items-center justify-center font-bold ${ts} flex-shrink-0 ${vacant?"bg-orange-100 text-orange-500 border border-dashed border-orange-300":"bg-indigo-100 text-indigo-600"}`}>
    {vacant?"?":n?.[0]}
  </div>
);
const STag=({s})=>{const m={"진행중":"bg-blue-100 text-blue-700","완료":"bg-emerald-100 text-emerald-700","예정":"bg-slate-100 text-slate-500","지연":"bg-red-100 text-red-700"};return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${m[s]||m["예정"]}`}>{s}</span>;};
const ROLE_PALETTE={"PM":"bg-slate-800 text-white","기획":"bg-purple-100 text-purple-700","디자인":"bg-pink-100 text-pink-700","개발":"bg-blue-100 text-blue-700","서버":"bg-blue-100 text-blue-700","공통":"bg-slate-100 text-slate-600"};
const RTag=({r})=>{if(!r)return null;const cls=Object.keys(ROLE_PALETTE).find(k=>r===k||r?.startsWith(k))?ROLE_PALETTE[Object.keys(ROLE_PALETTE).find(k=>r===k||r?.startsWith(k))]:"bg-teal-100 text-teal-700";return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${cls}`}>{r}</span>;};
const Bar=({v,color="#6366f1",h="h-2"})=>(<div className={`${h} bg-slate-100 rounded-full overflow-hidden`}><div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.max(0,Math.min(100,v||0))}%`,backgroundColor:color}}/></div>);
const Fl=({label,children})=>(<div><label className="text-sm text-slate-600 font-semibold mb-1.5 block">{label}</label>{children}</div>);
const IC="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white";
const BtnPrimary=({onClick,children,className=""})=>(<button onClick={onClick} className={`bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors ${className}`}>{children}</button>);
const BtnGhost=({onClick,children,className=""})=>(<button onClick={onClick} className={`border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl text-sm font-semibold transition-colors ${className}`}>{children}</button>);

/* ── Sheet ───────────────────────────────────────────────────────── */
function Sheet({title,onClose,children,wide,scroll=true}){
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"/>
      <div onClick={e=>e.stopPropagation()}
        className={`relative bg-white w-full ${wide?"sm:max-w-xl":"sm:max-w-md"} rounded-t-2xl sm:rounded-2xl sm:m-4 ${scroll?"max-h-[92vh] overflow-y-auto":""}`}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full"/></div>
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
function Sidebar({me,page,side,setSide,setPage,setModal,logout}){
  const items=[{id:"dash",icon:LayoutDashboard,label:"대시보드"},{id:"proj",icon:FolderOpen,label:"프로젝트"},...(me?.role==="master"?[{id:"users",icon:Users,label:"회원 관리"}]:[])];
  return(
    <aside className={`hidden sm:flex ${side?"w-60":"w-16"} bg-slate-900 flex-col flex-shrink-0 transition-all duration-300`}>
      <div className="p-4 flex items-center gap-3"><div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0"><BarChart2 size={15} className="text-white"/></div>{side&&<span className="text-white font-extrabold tracking-tight">ProSync</span>}</div>
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {items.map(({id,icon:Icon,label})=>(
          <button key={id} onClick={()=>{if(id==="users")setModal("users");else setPage("dash");}}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${(id==="dash"&&page==="dash")||(id==="proj"&&page==="proj")?"bg-indigo-500/20 text-indigo-300":"text-slate-400 hover:text-white hover:bg-white/5"}`}>
            <Icon size={16}/>{side&&label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        {side?(<button onClick={()=>setModal("myInfo")} className="flex items-center gap-3 mb-3 px-1 w-full hover:bg-white/5 rounded-xl py-1 transition-colors"><Av n={me?.name}/><div className="flex-1 min-w-0 text-left"><p className="text-white text-sm font-semibold truncate">{me?.name}</p><p className="text-slate-400 text-xs">{me?.role==="master"?"👑 마스터":"일반회원"}</p></div></button>):<button onClick={()=>setModal("myInfo")} className="flex justify-center mb-3 w-full"><Av n={me?.name}/></button>}
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 text-sm transition-colors"><LogOut size={14}/>{side&&"로그아웃"}</button>
      </div>
    </aside>
  );
}
function BotNav({me,page,setPage,setModal}){
  const items=[{id:"dash",icon:LayoutDashboard,label:"홈"},{id:"proj",icon:FolderOpen,label:"프로젝트"},...(me?.role==="master"?[{id:"users",icon:Users,label:"회원"}]:[])];
  const cur=page==="proj"?"proj":"dash";
  return(
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 flex" style={{paddingBottom:"env(safe-area-inset-bottom)"}}>
      {items.map(({id,icon:Icon,label})=>(
        <button key={id} onClick={()=>{if(id==="users")setModal("users");else setPage("dash");}}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold transition-colors ${cur===id?"text-indigo-600":"text-slate-400"}`}>
          <Icon size={19} strokeWidth={cur===id?2.5:1.8}/>{label}
        </button>
      ))}
    </nav>
  );
}

/* ── 진척율 계산 ─────────────────────────────────────────────────── */
function treePct(tasks,nodeId,type){
  const ch=tasks.filter(t=>t.parentId===nodeId);
  if(!ch.length){const n=tasks.find(t=>t.id===nodeId);if(!n)return 0;return calcPct(type==="t"?n.ts:n.cs,type==="t"?n.te:n.ce);}
  let tw=0,wp=0;ch.forEach(c=>{const d=countWD(type==="t"?c.ts:c.cs,type==="t"?c.te:c.ce)||1;tw+=d;wp+=treePct(tasks,c.id,type)*d;});return tw?Math.round(wp/tw):0;
}
function projPct(tasks,pid,type){
  const phases=tasks.filter(t=>t.pid===pid&&t.depth===0);
  if(!phases.length){const all=tasks.filter(t=>t.pid===pid&&t.depth===1);if(!all.length)return 0;let tw=0,wp=0;all.forEach(t=>{const d=countWD(type==="t"?t.ts:t.cs,type==="t"?t.te:t.ce)||1;tw+=d;wp+=calcPct(type==="t"?t.ts:t.cs,type==="t"?t.te:t.ce)*d;});return tw?Math.round(wp/tw):0;}
  let tw=0,wp=0;phases.forEach(p=>{const d=countWD(p.ts,p.te)||1;tw+=d;wp+=treePct(tasks,p.id,type)*d;});return tw?Math.round(wp/tw):0;
}

/* ── 날짜 자동 산출 / 상태 헬퍼 ────────────────────────────────────── */
function calcTaskDR(tid,tasks,type){
  const subs=tasks.filter(s=>s.parentId===tid&&s.depth===2);
  if(!subs.length)return null;
  const starts=subs.map(s=>type==="t"?s.ts:s.cs).filter(Boolean).sort();
  const ends=subs.map(s=>type==="t"?s.te:s.ce).filter(Boolean).sort();
  return {s:starts[0],e:ends[ends.length-1]};
}
function calcPhaseDR(pid,tasks,type){
  const tks=tasks.filter(t=>t.parentId===pid&&t.depth===1);
  if(!tks.length)return null;
  const all=[];
  tks.forEach(t=>{const d=calcTaskDR(t.id,tasks,type);if(d)all.push(d);else all.push({s:type==="t"?t.ts:t.cs,e:type==="t"?t.te:t.ce});});
  const starts=all.map(d=>d.s).filter(Boolean).sort();
  const ends=all.map(d=>d.e).filter(Boolean).sort();
  if(!starts.length)return null;
  return{s:starts[0],e:ends[ends.length-1]};
}
function autoStatus(ts,te,manual,stored){
  if(manual)return stored;
  const today=new Date().toISOString().split("T")[0];
  if(!ts)return stored||"예정";
  if(today<ts)return "예정";
  if(today>te)return "완료";
  return "진행중";
}
function fd(d){return d?d.slice(5).replace("-","/"):"—";}

/* ── 멤버 권한 헬퍼 ──────────────────────────────────────────────── */
function getMemberInfo(uid,proj){
  if(!proj?.members)return null;
  return proj.members.find(m=>typeof m==="object"?m.id===uid:m===uid)||null;
}
function getMemberRole(uid,proj){
  const m=getMemberInfo(uid,proj);
  if(!m||typeof m!=="object")return null;
  return m.customRole||m.role||null;
}
function getMemberTabs(uid,proj){
  const m=getMemberInfo(uid,proj);
  if(!m||typeof m!=="object")return["schedule","progress","documents"];
  return m.tabs||["schedule","progress","documents"];
}
function getMemberIds(proj){
  if(!proj?.members)return[];
  return proj.members.map(m=>typeof m==="object"?m.id:m);
}

/* ════════════════════════════════════════════════════════════════════
   메인 앱
════════════════════════════════════════════════════════════════════ */
export default function App(){
  const [users,  setUsers] = useState([]);
  const [projs,  setProjs] = useState([]);
  const [tasks,  setTasks] = useState([]);
  const [docs,   setDocs]  = useState([]);
  const [me,     setMe]    = useState(null);
  const [page,   setPage]  = useState("login");
  const [selP,   setSelP]  = useState(null);
  const [tab,    setTab]   = useState("schedule");
  const [pTab,   setPTab]  = useState("unit");
  const [side,   setSide]  = useState(true);
  const [modal,  setModal] = useState(null);
  const [selDoc, setSelDoc]= useState(null);

  // 편집 상태
  const [editItem,  setEditItem]  = useState(null);  // Phase/Task/SubTask 편집 대상
  const [parentCtx, setParentCtx]= useState(null);   // 추가 시 부모 ID
  const [newPhase,  setNewPhase]  = useState({title:"",desc:"",ts:"",te:"",color:"#6366f1"});
  const [newTask,   setNewTask]   = useState({title:"",role:"기획",uid:"",desc:"",ts:"",te:""});
  const [newSub,    setNewSub]    = useState({title:"",desc:"",ts:"",te:""});
  const [nd, setND] = useState({title:"",desc:"",link:"",files:[]});
  const [np, setNP] = useState({name:"",desc:"",start:"",end:"",members:[],notionUrl:""});
  const [mCfg, setMCfg] = useState({}); // {uid: {role,customRole,tabs}}
  const [lf, setLF] = useState({email:"",password:""});
  const [pwForm, setPwForm] = useState({cur:"",next:"",next2:""});
  const [pwErr, setPwErr] = useState("");
  const [le, setLE] = useState("");
  const [rf, setRF] = useState({name:"",email:"",password:"",pw2:""});
  const [re, setRE] = useState("");
  const [notionSt,  setNotionSt]  = useState(""); // "loading"|"ok"|"fail"
  const [syncConf,  setSyncConf]  = useState(false);
  const [syncing,   setSyncing]   = useState(false);
  const [editMember,setEditMember] = useState(null);
  const [addMemberMode,setAddMemberMode] = useState(false); // 멤버 추가 패널
  const [addMemberCfg,setAddMemberCfg] = useState({uid:"",role:"기획",customRole:"",tabs:["schedule","progress","documents"]});
  const [replaceTarget,setReplaceTarget] = useState(null); // {uid, cfg} 교체 대상
  const [loading, setLoading] = useState(true);
  const [expandedUnitPhases, setExpandedUnitPhases] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({});

  /* ── localStorage 앱 캐시 헬퍼 ── */
  function lsGetAppCache(){
    try{const c=JSON.parse(localStorage.getItem('ps_app_cache')||'{}');if(c.tasks?.length&&c.projs?.length)return c;}catch{}
    return null;
  }
  function lsSaveAppCache(p,t,d){
    try{localStorage.setItem('ps_app_cache',JSON.stringify({projs:p,tasks:t,docs:d}));}catch{}
  }

  /* ── 초기 데이터 로드 ── */
  useEffect(()=>{
    // localStorage 캐시 먼저 읽어서 즉시 표시
    const lsCache=lsGetAppCache();
    if(lsCache){setProjs(lsCache.projs);setTasks(lsCache.tasks);setDocs(lsCache.docs||[]);setUsers(INIT_USERS);}

    loadAll().then(({users:u,projs:p,tasks:t,docs:d})=>{
      // Supabase 유저 + localStorage 로컬 가입 유저 합치기 (이메일 기준 중복 제거)
      const lsU=lsGetUsers();
      const base=u.length?u:INIT_USERS;
      const merged=[...base,...lsU.filter(lu=>!base.find(x=>x.email===lu.email))];
      setUsers(merged);
      if(p.length){
        // 프로젝트/문서는 Supabase 최신, 태스크는 캐시 우선 (로컬 편집 보존)
        setProjs(p);setDocs(d);
        if(!lsCache)setTasks(t);
        // 캐시 없었으면 Supabase 데이터로 초기 캐시 생성
        if(!lsCache)lsSaveAppCache(p,t,d);
      } else if(!lsCache){
        setProjs(INIT_PROJS);setTasks(INIT_TASKS);setDocs(INIT_DOCS);
        seedInitialData(INIT_USERS,INIT_PROJS,INIT_TASKS,INIT_DOCS);
      }
      // lsCache 있고 p.length=0이면 캐시 데이터 유지 (이미 위에서 set)
    }).catch(()=>{
      const lsU=lsGetUsers();
      setUsers([...INIT_USERS,...lsU.filter(lu=>!INIT_USERS.find(x=>x.email===lu.email))]);
      if(!lsCache){setProjs(INIT_PROJS);setTasks(INIT_TASKS);setDocs(INIT_DOCS);}
    }).finally(()=>setLoading(false));
  },[]);

  /* ── 데이터 변경 시 localStorage 자동 저장 ── */
  useEffect(()=>{
    if(tasks.length&&projs.length)lsSaveAppCache(projs,tasks,docs);
  },[tasks,projs,docs]);

  const myP = me?.role==="master"?projs:projs.filter(p=>getMemberIds(p).includes(me?.id));
  const pd  = docs.filter(d=>d.pid===selP?.id);
  const uN  = id=>id===VACANT_ID?"공석":users.find(u=>u.id===id)?.name??"?";

  /* ── localStorage 유저 캐시 헬퍼 ── */
  function lsGetUsers(){try{return JSON.parse(localStorage.getItem('ps_users')||'[]');}catch{return[];}}
  function lsSaveUser(u){const arr=lsGetUsers().filter(x=>x.email!==u.email);localStorage.setItem('ps_users',JSON.stringify([...arr,u]));}

  /* ── localStorage 태스크 오버라이드 헬퍼 (Supabase UPDATE 실패 보완) ── */
  function lsGetTaskOverrides(){try{return JSON.parse(localStorage.getItem('ps_task_overrides')||'{}');}catch{return{};}}
  function lsSaveTaskOverride(t){const o=lsGetTaskOverrides();o[t.id]=t;localStorage.setItem('ps_task_overrides',JSON.stringify(o));}
  function lsRemoveTaskOverride(id){const o=lsGetTaskOverrides();delete o[id];localStorage.setItem('ps_task_overrides',JSON.stringify(o));}

  /* ── 인증 ── */
  function login(){
    dbLogin(lf.email,lf.password).then(u=>{
      if(u){setMe(u);setPage("dash");setLE("");return;}
      // Supabase 없으면 INIT_USERS → localStorage 순으로 폴백
      const local=[...INIT_USERS,...lsGetUsers()].find(x=>x.email===lf.email&&x.password===lf.password);
      if(local){setMe(local);setPage("dash");setLE("");}
      else setLE("이메일 또는 비밀번호가 올바르지 않습니다.");
    }).catch(()=>{
      const u=[...INIT_USERS,...lsGetUsers()].find(x=>x.email===lf.email&&x.password===lf.password);
      if(u){setMe(u);setPage("dash");setLE("");}
      else setLE("이메일 또는 비밀번호가 올바르지 않습니다.");
    });
  }
  function register(){
    if(!rf.name||!rf.email||!rf.password){setRE("모든 항목을 입력해주세요.");return;}
    if(rf.password!==rf.pw2){setRE("비밀번호가 일치하지 않습니다.");return;}
    const allUsers=[...users,...lsGetUsers()];
    if(allUsers.find(u=>u.email===rf.email)){setRE("이미 사용 중인 이메일입니다.");return;}
    const tempId=Date.now();
    const newUser={id:tempId,name:rf.name,email:rf.email,password:rf.password,role:"member"};
    lsSaveUser(newUser); // localStorage에 즉시 저장 (새로고침해도 유지)
    setUsers(prev=>[...prev,newUser]);
    setMe(newUser);setPage("dash");
    setRF({name:"",email:"",password:"",pw2:""});
    dbRegister(rf.name,rf.email,rf.password).then(u=>{
      lsSaveUser(u);
      setUsers(prev=>prev.map(x=>x.id===tempId?u:x));setMe(u);
    }).catch(err=>console.warn('[prosync] register sync',err));
  }
  function logout(){setMe(null);setPage("login");setLF({email:"",password:""});}
  function changePassword(){
    if(!pwForm.cur||!pwForm.next||!pwForm.next2){setPwErr("모든 항목을 입력해주세요.");return;}
    if(pwForm.cur!==me.password){setPwErr("현재 비밀번호가 올바르지 않습니다.");return;}
    if(pwForm.next.length<4){setPwErr("새 비밀번호는 4자 이상이어야 합니다.");return;}
    if(pwForm.next!==pwForm.next2){setPwErr("새 비밀번호가 일치하지 않습니다.");return;}
    const updated={...me,password:pwForm.next};
    setMe(updated);
    setUsers(users.map(u=>u.id===me.id?updated:u));
    supabase.from('users').update({password:pwForm.next}).eq('id',me.id).then(({error})=>{if(error)console.warn('[prosync] pw update',error);});
    setPwForm({cur:"",next:"",next2:""});setPwErr("");setModal("myInfo");
  }
  function doDeleteUser(uid){
    if(!window.confirm("이 회원을 삭제할까요?\n담당 미완료 일정은 공석으로 변경됩니다."))return;
    const today=new Date().toISOString().split("T")[0];
    // 담당 미완료 태스크 → 공석
    const nextTasks=tasks.map(t=>{
      if(t.uid!==uid)return t;
      const remaining=t.te>=today&&t.status!=="완료";
      return remaining?{...t,uid:VACANT_ID}:t;
    });
    nextTasks.forEach((t,i)=>{if(t.uid===VACANT_ID&&tasks[i].uid===uid)dbUpdateTask(t);});
    setTasks(nextTasks);
    // 모든 프로젝트 멤버에서 제거
    const nextProjs=projs.map(p=>{
      if(!getMemberIds(p).includes(uid))return p;
      const next={...p,members:p.members.filter(m=>(typeof m==="object"?m.id:m)!==uid)};
      dbUpdateProject(next);return next;
    });
    setProjs(nextProjs);
    // 유저 삭제
    setUsers(users.filter(u=>u.id!==uid));
    supabase.from('users').delete().eq('id',uid).then(({error})=>{if(error)console.warn('[prosync] delete user',error);});
  }
  function openProject(p){
    setSelP(p);
    // 접근 가능한 첫 번째 탭으로
    const allowedTabs=me?.role==="master"?["schedule","progress","documents"]:getMemberTabs(me?.id,p);
    setTab(allowedTabs[0]||"schedule");
    setSelDoc(null);setPage("proj");
  }

  /* ── Notion ── */
  function isKnownNotion(url){return KNOWN_NOTION_IDS.some(k=>url?.includes(k));}
  function handleNotionImport(){
    if(!np.notionUrl){setNotionSt("fail");return;}
    setNotionSt("loading");
    setTimeout(()=>{
      if(isKnownNotion(np.notionUrl)){setNotionSt("ok");setNP(p=>({...p,name:"밝은세상안과 × AI 프로젝트",desc:"AI 노출 → 홈페이지 유입 → 예약 전환 퍼널 구축",start:"2026-04-28",end:"2026-08-31",members:[2,3,4]}));}
      else setNotionSt("fail");
    },800);
  }
  function doNotionResync(){
    setSyncing(true);
    setTimeout(()=>{
      if(selP&&isKnownNotion(selP.notionUrl)){
        const newTasks=buildNotionTasks(selP.id);
        const kept=tasks.filter(t=>t.pid!==selP.id||t._manual);
        setTasks([...kept,...newTasks]);
        dbDeleteProjectTasksNotManual(selP.id);
        dbAddTasks(newTasks);
      }
      setSyncing(false);setSyncConf(false);
      if(editMember)setEditMember(projs.find(p=>p.id===editMember.id));
    },1200);
  }

  /* ── 프로젝트 ── */
  function doAddProj(){
    const cols=["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6"];
    const newId=nid();
    const memberObjs=np.members.map(uid=>({
      id:uid,
      role:mCfg[uid]?.role||"기획",
      customRole:mCfg[uid]?.customRole||"",
      tabs:mCfg[uid]?.tabs||["schedule","progress","documents"],
    }));
    const newProj={id:newId,color:cols[projs.length%5],...np,members:memberObjs};
    setProjs([...projs,newProj]);
    let notionTasks=[];
    if(isKnownNotion(np.notionUrl)&&notionSt==="ok"){
      notionTasks=buildNotionTasks(newId);
      setTasks([...tasks,...notionTasks]);
    }
    dbAddProject(newProj);
    if(notionTasks.length) dbAddTasks(notionTasks);
    setNP({name:"",desc:"",start:"",end:"",members:[],notionUrl:""});
    setMCfg({});setNotionSt("");setModal(null);
  }

  /* ── Phase CRUD ── */
  function doAddPhase(){
    const ph={id:nid(),pid:selP.id,parentId:null,depth:0,uid:me.id,title:newPhase.title,desc:newPhase.desc,ts:newPhase.ts,te:newPhase.te,cs:newPhase.ts,ce:newPhase.te,status:"예정",color:newPhase.color,del:[],expanded:true,_manual:true};
    setTasks([...tasks,ph]);dbAddTask(ph);
    setNewPhase({title:"",desc:"",ts:"",te:"",color:"#6366f1"});setModal(null);
  }
  function doEditPhase(){
    const updated={...tasks.find(t=>t.id===editItem.id),...editItem,_statusManual:true};
    setTasks(tasks.map(t=>t.id===editItem.id?updated:t));dbUpdateTask(updated);lsSaveTaskOverride(updated);
    setEditItem(null);setModal(null);
  }
  function doDeletePhase(id){
    if(!window.confirm("이 Phase와 모든 하위 항목이 삭제됩니다. 계속할까요?"))return;
    const ids=collectIds(tasks,id);
    setTasks(tasks.filter(t=>!ids.has(t.id)));dbDeleteTasks(ids);
  }
  function collectIds(tasks,rootId){const ids=new Set([rootId]);tasks.filter(t=>t.parentId===rootId).forEach(c=>collectIds(tasks,c.id).forEach(id=>ids.add(id)));return ids;}

  /* ── Task CRUD ── */
  function doAddTask(){
    const ph=tasks.find(t=>t.id===parentCtx);
    const tk={id:nid(),pid:selP.id,parentId:parentCtx,depth:1,uid:parseInt(newTask.uid)||me.id,title:newTask.title,role:newTask.role,desc:newTask.desc,ts:newTask.ts||ph?.ts||"",te:newTask.te||ph?.te||"",cs:newTask.ts||ph?.ts||"",ce:newTask.te||ph?.te||"",status:"예정",del:[],expanded:true,_manual:true};
    setTasks([...tasks,tk]);dbAddTask(tk);
    setNewTask({title:"",role:"기획",uid:"",desc:"",ts:"",te:""});setParentCtx(null);setModal(null);
  }
  function doEditTask(){
    const updated={...tasks.find(t=>t.id===editItem.id),...editItem,_statusManual:true};
    setTasks(tasks.map(t=>t.id===editItem.id?updated:t));dbUpdateTask(updated);lsSaveTaskOverride(updated);
    setEditItem(null);setModal(null);
  }
  function doDeleteTask(id){
    if(!window.confirm("이 업무와 세부 항목이 삭제됩니다. 계속할까요?"))return;
    const ids=collectIds(tasks,id);
    setTasks(tasks.filter(t=>!ids.has(t.id)));dbDeleteTasks(ids);
  }

  /* ── SubTask CRUD ── */
  function doAddSub(){
    const parent=tasks.find(t=>t.id===parentCtx);
    const s={id:nid(),pid:selP.id,parentId:parentCtx,depth:2,uid:parent?.uid||me.id,title:newSub.title,desc:newSub.desc,ts:newSub.ts||parent?.ts||"",te:newSub.te||parent?.te||"",cs:newSub.ts||parent?.ts||"",ce:newSub.te||parent?.te||"",status:"예정",del:[],_manual:true};
    setTasks([...tasks,s]);dbAddTask(s);
    setNewSub({title:"",desc:"",ts:"",te:""});setParentCtx(null);setModal(null);
  }
  function doEditSub(){
    const updated={...tasks.find(t=>t.id===editItem.id),...editItem};
    setTasks(tasks.map(t=>t.id===editItem.id?updated:t));dbUpdateTask(updated);lsSaveTaskOverride(updated);
    setEditItem(null);setModal(null);
  }
  function doDeleteSub(id){setTasks(tasks.filter(t=>t.id!==id));dbDeleteTask(id);lsRemoveTaskOverride(id);}

  /* ── 자료 ── */
  /* ── 멤버 추가 ── */
  function doAddMember(projId, uid, cfg){
    let next=null;
    setProjs(projs.map(p=>{
      if(p.id!==projId)return p;
      if(getMemberIds(p).includes(uid))return next=p;
      next={...p, members:[...p.members, {id:uid, role:cfg.role||"기획", customRole:cfg.customRole||"", tabs:cfg.tabs||["schedule","progress","documents"]}]};
      return next;
    }));
    if(next) dbUpdateProject(next);
    return next;
  }

  /* ── 멤버 삭제: 남은 일정은 공석(VACANT_ID)으로 변경 ── */
  function doRemoveMember(projId, uid){
    const today=new Date().toISOString().split("T")[0];
    const affected=tasks.filter(t=>t.pid===projId&&t.uid===uid&&t.te>=today&&t.status!=="완료");
    setTasks(tasks.map(t=>{
      if(t.pid!==projId||t.uid!==uid)return t;
      const isRemaining=t.te>=today&&t.status!=="완료";
      return isRemaining?{...t,uid:VACANT_ID}:t;
    }));
    affected.forEach(t=>dbUpdateTask({...t,uid:VACANT_ID}));
    let next=null;
    setProjs(projs.map(p=>{
      if(p.id!==projId)return p;
      next={...p,members:p.members.filter(m=>(typeof m==="object"?m.id:m)!==uid)};
      return next;
    }));
    if(next) dbUpdateProject(next);
    return next;
  }

  /* ── 멤버 교체: 교체 전 남은 일정을 신규 멤버로 변경 ── */
  function doReplaceMember(projId, oldUid, newUid, cfg){
    const today=new Date().toISOString().split("T")[0];
    const affected=tasks.filter(t=>t.pid===projId&&t.uid===oldUid&&t.te>=today&&t.status!=="완료");
    setTasks(tasks.map(t=>{
      if(t.pid!==projId||t.uid!==oldUid)return t;
      const isRemaining=t.te>=today&&t.status!=="완료";
      return isRemaining?{...t,uid:newUid}:t;
    }));
    affected.forEach(t=>dbUpdateTask({...t,uid:newUid}));
    let next=null;
    setProjs(projs.map(p=>{
      if(p.id!==projId)return p;
      const newMemberObj={id:newUid,role:cfg.role||"기획",customRole:cfg.customRole||"",tabs:cfg.tabs||["schedule","progress","documents"]};
      const exists=getMemberIds(p).includes(oldUid);
      next=exists
        ?{...p,members:p.members.map(m=>(typeof m==="object"&&m.id===oldUid)?newMemberObj:m)}
        :{...p,members:[...p.members.filter(m=>(typeof m==="object"?m.id:m)!==oldUid),newMemberObj]};
      return next;
    }));
    if(next) dbUpdateProject(next);
    return next;
  }

  function doAddDoc(){
    const d={id:nid(),pid:selP.id,uid:me.id,title:nd.title,desc:nd.desc,files:nd.files,links:nd.link?[nd.link]:[],at:new Date().toISOString().split("T")[0]};
    setDocs([...docs,d]);dbAddDoc(d);
    setND({title:"",desc:"",link:"",files:[]});setModal(null);
  }
  function handleFiles(e){const MAX=50*1024*1024,picked=Array.from(e.target.files);Promise.all(picked.filter(f=>f.size<=MAX).map(f=>new Promise(res=>{const r=new FileReader();r.onload=ev=>res({name:f.name,size:(f.size/1024/1024).toFixed(1)+"MB",dataUrl:ev.target.result});r.readAsDataURL(f);})))
    .then(files=>setND({...nd,files:[...nd.files,...files]}));e.target.value="";}

  /* ── 편의 ── */
  function toggleExpand(id){setTasks(tasks.map(t=>t.id===id?{...t,expanded:!t.expanded}:t));}
  function canEdit(t){return me?.role==="master"||t.uid===me?.id;}
  function isMaster(){return me?.role==="master";}
  const navP={me,page,side,setSide,setPage,setModal,logout};

  /* ══════════ LOADING ════════════════════════════════════════════ */
  if(loading)return(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"><BarChart2 size={22} className="text-white"/></div>
        <p className="text-white font-extrabold text-lg tracking-tight">ProSync</p>
        <p className="text-slate-400 text-sm mt-1">데이터 불러오는 중…</p>
      </div>
    </div>
  );

  /* ══════════ LOGIN ═══════════════════════════════════════════════ */
  if(page==="login")return(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><div className="inline-flex items-center gap-2.5 mb-2"><div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center"><BarChart2 size={20} className="text-white"/></div><span className="text-white font-extrabold text-2xl tracking-tight">ProSync</span></div><p className="text-slate-400 text-sm mt-1">프로젝트 관리 플랫폼</p></div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7">
          <h2 className="text-white text-xl font-bold mb-5">로그인</h2>
          <div className="space-y-4">
            <div><label className="text-slate-300 text-sm block mb-1.5">이메일</label><input type="email" value={lf.email} onChange={e=>setLF({...lf,email:e.target.value})} placeholder="이메일" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"/></div>
            <div><label className="text-slate-300 text-sm block mb-1.5">비밀번호</label><input type="password" value={lf.password} onChange={e=>setLF({...lf,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="비밀번호" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"/></div>
            {le&&<p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle size={12}/>{le}</p>}
            <button onClick={login} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl py-3.5 font-semibold text-sm">로그인</button>
            <button onClick={()=>{setPage("register");setLE("");}} className="w-full border border-white/10 text-slate-300 hover:text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2"><UserPlus size={15}/>회원가입</button>
          </div>
          <div className="mt-5 pt-5 border-t border-white/10"><p className="text-slate-400 text-xs text-center mb-3">테스트 계정</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>setLF({email:"hyun.planb@gmail.com",password:"1234"})} className="text-xs bg-white/5 hover:bg-indigo-500/20 border border-white/10 text-slate-300 hover:text-indigo-300 rounded-xl py-3">👑 마스터</button>
              <button onClick={()=>setLF({email:"choi@test.com",password:"1234"})} className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl py-3">👤 최기획</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════ REGISTER ════════════════════════════════════════════ */
  if(page==="register")return(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6"><div className="inline-flex items-center gap-2.5"><div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center"><BarChart2 size={20} className="text-white"/></div><span className="text-white font-extrabold text-2xl tracking-tight">ProSync</span></div></div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7">
          <button onClick={()=>setPage("login")} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-5"><ArrowLeft size={14}/>로그인으로 돌아가기</button>
          <h2 className="text-white text-xl font-bold mb-4">회원가입</h2>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-3 mb-5 flex gap-2"><span className="text-amber-400 text-sm">💡</span><p className="text-amber-300/80 text-xs leading-relaxed">가입 후 <b className="text-amber-300">마스터</b>가 프로젝트에 배정해야 접근할 수 있어요.</p></div>
          <div className="space-y-4">
            <div><label className="text-slate-300 text-sm block mb-1.5">이름</label><input value={rf.name} onChange={e=>setRF({...rf,name:e.target.value})} placeholder="이름" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"/></div>
            <div><label className="text-slate-300 text-sm block mb-1.5">이메일</label><input type="email" value={rf.email} onChange={e=>setRF({...rf,email:e.target.value})} placeholder="이메일" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"/></div>

            <div><label className="text-slate-300 text-sm block mb-1.5">비밀번호</label><input type="password" value={rf.password} onChange={e=>setRF({...rf,password:e.target.value})} placeholder="비밀번호" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"/></div>
            <div><label className="text-slate-300 text-sm block mb-1.5">비밀번호 확인</label><input type="password" value={rf.pw2} onChange={e=>setRF({...rf,pw2:e.target.value})} onKeyDown={e=>e.key==="Enter"&&register()} placeholder="비밀번호 재입력" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"/></div>
            {re&&<p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle size={12}/>{re}</p>}
            <button onClick={register} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl py-3.5 font-semibold text-sm">가입하기</button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════ DASHBOARD ═══════════════════════════════════════════ */
  if(page==="dash")return(
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar {...navP}/>
      <main className="flex-1 flex flex-col min-w-0 overflow-auto pb-20 sm:pb-0">
        <header className="hidden sm:flex bg-white border-b border-slate-100 px-6 py-4 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3"><button onClick={()=>setSide(!side)} className="text-slate-400 hover:text-slate-600 p-1"><Menu size={18}/></button><h1 className="font-bold text-slate-800 text-base">대시보드</h1></div>
          {isMaster()&&<button onClick={()=>setModal("addProj")} className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Plus size={14}/>새 프로젝트</button>}
        </header>
        <header className="sm:hidden bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2"><div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center"><BarChart2 size={13} className="text-white"/></div><span className="font-extrabold text-slate-800 text-base tracking-tight">ProSync</span></div>
          <div className="flex items-center gap-2">
            {isMaster()&&<button onClick={()=>setModal("addProj")} className="flex items-center gap-1 bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-semibold"><Plus size={12}/>새 프로젝트</button>}
            <button onClick={()=>setModal("myInfo")} className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold">{me?.name[0]}</button>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
            {[{label:"전체",value:myP.length,icon:FolderOpen,bg:"bg-indigo-50",tc:"text-indigo-500"},{label:"진행중",value:1,icon:Clock,bg:"bg-blue-50",tc:"text-blue-500"},{label:"완료",value:0,icon:CheckCircle,bg:"bg-emerald-50",tc:"text-emerald-500"}].map((s,i)=>(
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 shadow-sm">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${s.bg} rounded-xl flex items-center justify-center mb-2 sm:mb-3`}><s.icon size={15} className={s.tc}/></div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-800">{s.value}</p>
                <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-3"><h2 className="text-slate-700 font-bold text-sm">내 프로젝트</h2><span className="text-slate-400 text-xs">{myP.length}개</span></div>
          {myP.length===0?<div className="text-center py-16 text-slate-300"><FolderOpen size={36} className="mx-auto mb-3"/><p className="text-sm font-medium">배정된 프로젝트가 없어요</p></div>:(
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {myP.map(p=>{
                const tP=projPct(tasks,p.id,"t"),cP=projPct(tasks,p.id,"c");
                const mem=getMemberIds(p).map(id=>users.find(u=>u.id===id)).filter(Boolean);
                const phases=tasks.filter(t=>t.pid===p.id&&t.depth===0);
                return(
                  <div key={p.id} onClick={()=>openProject(p)} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group active:scale-[0.98]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{backgroundColor:p.color}}/>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">{p.name}</h3>
                          <p className="text-slate-400 text-xs mt-0.5">{p.start} ~ {p.end}</p>
                          {p.notionUrl&&<div className="flex items-center gap-1 mt-1"><Link size={9} className="text-slate-300"/><span className="text-slate-300 text-[10px]">Notion 연동</span></div>}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5"/>
                    </div>
                    {phases.length>0&&<div className="flex gap-1.5 mb-3 flex-wrap">{phases.map(ph=><span key={ph.id} className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{backgroundColor:ph.color||p.color}}>{ph.title.split("—")[0].trim()}</span>)}</div>}
                    <div className="space-y-2 mb-3">
                      <div><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">목표</span><span className="font-bold" style={{color:p.color}}>{tP}%</span></div><Bar v={tP} color={p.color}/></div>
                      <div><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">현황</span><span className="font-bold text-slate-400">{cP}%</span></div><Bar v={cP} color="#94a3b8"/></div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex -space-x-1.5">{mem.slice(0,4).map(m=>{const mr=getMemberRole(m.id,p);return(<div key={m.id} title={`${m.name}${mr?" · "+mr:""}`} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 text-xs font-bold">{m.name[0]}</div>);})}</div>
                      <span className="text-slate-400 text-xs">{tasks.filter(t=>t.pid===p.id&&t.depth===2).length}개 세부업무</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BotNav me={me} page={page} setPage={setPage} setModal={setModal}/>

      {/* 대시보드 모달들 */}
      {modal==="myInfo"&&<Sheet title="내 정보" onClose={()=>setModal(null)}>
        <div className="flex items-center gap-4 mb-5 p-4 bg-slate-50 rounded-xl"><div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-extrabold text-xl">{me?.name[0]}</div><div><p className="font-bold text-slate-800 text-base">{me?.name}</p><p className="text-slate-400 text-sm">{me?.email}</p><div className="flex items-center gap-2 mt-1"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${me?.role==="master"?"bg-indigo-100 text-indigo-700":"bg-slate-200 text-slate-600"}`}>{me?.role==="master"?"👑 마스터":"일반회원"}</span>{me?.jobRole&&<span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{me?.jobRole}</span>}</div></div></div>
        <div className="space-y-2">
          <button onClick={()=>{setPwForm({cur:"",next:"",next2:""});setPwErr("");setModal("changePassword");}} className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50">🔒 비밀번호 변경</button>
          <button onClick={()=>{setModal(null);logout();}} className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 py-3 rounded-xl text-sm font-semibold hover:bg-red-50"><LogOut size={14}/>로그아웃</button>
        </div>
      </Sheet>}
      {modal==="changePassword"&&<Sheet title="비밀번호 변경" onClose={()=>setModal(null)}>
        <div className="space-y-4 mb-5">
          <Fl label="현재 비밀번호"><input type="password" className={IC} placeholder="현재 비밀번호 입력" value={pwForm.cur} onChange={e=>setPwForm({...pwForm,cur:e.target.value})}/></Fl>
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <Fl label="새 비밀번호"><input type="password" className={IC} placeholder="새 비밀번호 (4자 이상)" value={pwForm.next} onChange={e=>setPwForm({...pwForm,next:e.target.value})}/></Fl>
            <Fl label="새 비밀번호 확인"><input type="password" className={IC} placeholder="새 비밀번호 재입력" value={pwForm.next2} onChange={e=>setPwForm({...pwForm,next2:e.target.value})} onKeyDown={e=>e.key==="Enter"&&changePassword()}/></Fl>
          </div>
          {pwErr&&<p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle size={12}/>{pwErr}</p>}
        </div>
        <div className="flex gap-3"><BtnGhost onClick={()=>setModal("myInfo")} className="flex-1">취소</BtnGhost><BtnPrimary onClick={changePassword} className="flex-1">변경 완료</BtnPrimary></div>
      </Sheet>}
      {modal==="users"&&<Sheet title="회원 관리" onClose={()=>setModal(null)}>
        <div className="space-y-2 mb-4">{users.map(u=>(
          <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Av n={u.name} sz="w-10 h-10" ts="text-sm"/>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
              <p className="text-slate-400 text-xs truncate">{u.jobRole?`${u.jobRole}·`:''}{u.email}</p>
            </div>
            <span className={`text-xs px-2.5 py-1.5 rounded-full font-semibold flex-shrink-0 ${u.role==="master"?"bg-indigo-100 text-indigo-700":"bg-slate-200 text-slate-600"}`}>{u.role==="master"?"👑 마스터":"일반"}</span>
            {u.role!=="master"&&<button onClick={()=>doDeleteUser(u.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13}/></button>}
          </div>
        ))}</div>
        <button onClick={()=>setModal(null)} className="w-full border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50">닫기</button>
      </Sheet>}
      {modal==="addProj"&&<Sheet title="새 프로젝트 생성" onClose={()=>setModal(null)} wide>
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5"><Link size={12}/>노션 로드맵 연동 (선택)</p>
            <div className="flex gap-2">
              <input className={IC+" flex-1 text-xs"} placeholder="https://notion.so/..." value={np.notionUrl} onChange={e=>{setNP({...np,notionUrl:e.target.value});setNotionSt("");}}/>
              <button onClick={handleNotionImport} className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex-shrink-0 flex items-center gap-1">
                {notionSt==="loading"?<RefreshCw size={12} className="animate-spin"/>:<Link size={12}/>}
                {notionSt==="loading"?"파싱중":"불러오기"}
              </button>
            </div>
            {notionSt==="ok"&&<p className="text-emerald-600 text-xs mt-2 flex items-center gap-1"><CheckCircle size={11}/>로드맵 읽기 완료 — 3뎁스 일정이 자동 생성됩니다.</p>}
            {notionSt==="fail"&&<p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle size={11}/>지원되는 Notion URL이 아닙니다.</p>}
          </div>
          <Fl label="프로젝트 명"><input className={IC} placeholder="이름" value={np.name} onChange={e=>setNP({...np,name:e.target.value})}/></Fl>
          <Fl label="내용"><textarea className={IC+" resize-none"} rows={2} placeholder="설명" value={np.desc} onChange={e=>setNP({...np,desc:e.target.value})}/></Fl>
          <div className="grid grid-cols-2 gap-3">
            <Fl label="시작일"><input type="date" className={IC} value={np.start} onChange={e=>setNP({...np,start:e.target.value})}/></Fl>
            <Fl label="종료일"><input type="date" className={IC} value={np.end} onChange={e=>setNP({...np,end:e.target.value})}/></Fl>
          </div>
          <Fl label="팀원 배정 및 권한 설정">
            <div className="space-y-2 mt-1">
              {users.filter(u=>u.role==="member").map(u=>{
                const isSelected=np.members.includes(u.id);
                const cfg=mCfg[u.id]||{role:"기획",customRole:"",tabs:["schedule","progress","documents"]};
                const ROLES=["PM","기획","디자인","개발"];
                function updateCfg(patch){setMCfg({...mCfg,[u.id]:{...cfg,...patch}});}
                function toggleTab(tab){const t=cfg.tabs.includes(tab)?cfg.tabs.filter(x=>x!==tab):[...cfg.tabs,tab];updateCfg({tabs:t});}
                return(
                  <div key={u.id} className={`rounded-xl border transition-all ${isSelected?"border-indigo-200 bg-indigo-50/30":"border-slate-100"}`}>
                    <label className="flex items-center gap-3 p-3 cursor-pointer">
                      <input type="checkbox" className="accent-indigo-500 w-4 h-4" checked={isSelected}
                        onChange={e=>{const m=e.target.checked?[...np.members,u.id]:np.members.filter(id=>id!==u.id);setNP({...np,members:m});}}/>
                      <Av n={u.name} sz="w-7 h-7"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </label>
                    {isSelected&&(
                      <div className="px-3 pb-3 space-y-3 border-t border-indigo-100 pt-3">
                        {/* 역할 선택 */}
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold mb-1.5">역할</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLES.map(r=><button key={r} type="button" onClick={()=>updateCfg({role:r,customRole:""})}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${cfg.role===r&&!cfg.customRole?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-500 hover:border-indigo-300"}`}>{r}</button>)}
                            <button type="button" onClick={()=>updateCfg({role:"custom",customRole:cfg.customRole||""})}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${cfg.role==="custom"?"bg-teal-500 text-white border-teal-500":"border-slate-200 text-slate-500 hover:border-teal-300"}`}>직접입력</button>
                          </div>
                          {cfg.role==="custom"&&<input className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400" placeholder="역할명 입력" value={cfg.customRole} onChange={e=>updateCfg({customRole:e.target.value})}/>}
                        </div>
                        {/* 메뉴 접근 권한 */}
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold mb-1.5">메뉴 접근 권한</p>
                          <div className="flex gap-2">
                            {[["schedule","📅 일정"],["progress","📊 진척율"],["documents","📁 자료실"]].map(([id,label])=>(
                              <button key={id} type="button" onClick={()=>toggleTab(id)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${cfg.tabs.includes(id)?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-400 hover:border-indigo-300"}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Fl>
        </div>
        <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doAddProj} className="flex-1">생성</BtnPrimary></div>
      </Sheet>}
    </div>
  );

  /* ══════════ PROJECT DETAIL ══════════════════════════════════════ */
  if(page==="proj"&&selP){
    const projTasks=tasks.filter(t=>t.pid===selP.id);
    const phases=projTasks.filter(t=>t.depth===0).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
    const tTotal=projPct(tasks,selP.id,"t"), cTotal=projPct(tasks,selP.id,"c");
    // 멤버 목록 (새 구조 지원)
    const mem=getMemberIds(selP).map(id=>users.find(u=>u.id===id)).filter(Boolean);
    // 현재 사용자 접근 가능 탭
    const allowedTabs=isMaster()?["schedule","progress","documents"]:getMemberTabs(me?.id,selP);
    const myRole=getMemberRole(me?.id,selP);

    /* ── 3뎁스 트리 렌더 ── */
    function renderTree(){
      if(phases.length===0){
        return(
          <div>
            {projTasks.filter(t=>t.depth===1).map(t=>renderTask(t,selP.color,null))}
            {isMaster()&&<button onClick={()=>{setNewPhase({title:"",desc:"",ts:selP.start,te:selP.end,color:"#6366f1"});setModal("addPhase");}} className="mt-3 w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-500 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"><Plus size={14}/>Phase 추가</button>}
          </div>
        );
      }
      return(
        <div>
          {phases.map(ph=>{
            const phTp=treePct(projTasks,ph.id,"t"), phCp=treePct(projTasks,ph.id,"c");
            const phTasks=projTasks.filter(t=>t.parentId===ph.id).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
            // Phase 날짜 자동 산출
            const phTDR=calcPhaseDR(ph.id,projTasks,"t");
            const phCDR=calcPhaseDR(ph.id,projTasks,"c");
            const phTs=phTDR?.s||ph.ts, phTe=phTDR?.e||ph.te;
            const phCs=phCDR?.s||ph.cs, phCe=phCDR?.e||ph.ce;
            const phStatus=autoStatus(phTs,phTe,ph._statusManual,ph.status);
            return(
              <div key={ph.id} className="mb-4">
                {/* Phase 헤더 */}
                <div className="rounded-xl sm:rounded-2xl overflow-hidden mb-2">
                  <div className="p-3.5 text-white flex items-start gap-2" style={{backgroundColor:ph.color||selP.color}}>
                    <button onClick={()=>toggleExpand(ph.id)} className="text-white/80 hover:text-white flex-shrink-0 mt-0.5">{ph.expanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-extrabold text-sm truncate">{ph.title}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-semibold">{phStatus}</span>
                      </div>
                      <p className="text-white/70 text-xs hidden sm:block">🎯 {fd(phTs)} ~ {fd(phTe)}{(phCs!==phTs||phCe!==phTe)?<span className="ml-2 text-yellow-200">📊 {fd(phCs)}~{fd(phCe)}</span>:null}</p>
                    </div>
                    {/* Phase 진척율 */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:block text-right"><p className="text-[10px] text-white/60">목표</p><p className="font-extrabold text-sm">{phTp}%</p></div>
                      <div className="hidden sm:block text-right"><p className="text-[10px] text-white/60">현황</p><p className="font-extrabold text-sm">{phCp}%</p></div>
                      <div className="sm:hidden font-extrabold text-sm">{phTp}%</div>
                      {/* Phase 액션 (마스터) */}
                      {isMaster()&&(
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={e=>{e.stopPropagation();setNewTask({title:"",role:"기획",uid:getMemberIds(selP)[0]||"",desc:"",ts:ph.ts,te:ph.te});setParentCtx(ph.id);setModal("addTask");}} title="Task 추가" className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg"><Plus size={13}/></button>
                          <button onClick={e=>{e.stopPropagation();setEditItem({...ph});setModal("editPhase");}} title="Phase 수정" className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg"><Edit2 size={12}/></button>
                          <button onClick={e=>{e.stopPropagation();doDeletePhase(ph.id);}} title="Phase 삭제" className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-red-400/40 rounded-lg"><Trash2 size={12}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Phase 진척율 바 */}
                  <div className="px-3.5 py-2 grid grid-cols-2 gap-2" style={{backgroundColor:(ph.color||selP.color)+"22"}}>
                    <div><p className="text-[10px] mb-1" style={{color:ph.color||selP.color}}>목표 {phTp}%</p><Bar v={phTp} color={ph.color||selP.color}/></div>
                    <div><p className="text-[10px] text-slate-400 mb-1">현황 {phCp}%</p><Bar v={phCp} color="#94a3b8"/></div>
                  </div>
                </div>
                {/* Tasks */}
                {ph.expanded&&(
                  <div className="pl-2 sm:pl-4 space-y-2">
                    {phTasks.map(t=>renderTask(t,ph.color||selP.color,ph))}
                    {isMaster()&&<button onClick={()=>{setNewTask({title:"",role:"기획",uid:getMemberIds(selP)[0]||"",desc:"",ts:ph.ts,te:ph.te});setParentCtx(ph.id);setModal("addTask");}} className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-500 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"><Plus size={13}/>Task 추가</button>}
                  </div>
                )}
              </div>
            );
          })}
          {/* Phase 추가 버튼 */}
          {isMaster()&&<button onClick={()=>{setNewPhase({title:"",desc:"",ts:selP.start,te:selP.end,color:"#6366f1"});setModal("addPhase");}} className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-500 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors mt-2"><Plus size={14}/>Phase 추가</button>}
        </div>
      );
    }

    function renderTask(t,phColor,ph){
      const subs=projTasks.filter(s=>s.parentId===t.id).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
      // 날짜 자동 산출: 서브태스크가 있으면 서브태스크 기준
      const tDR=calcTaskDR(t.id,projTasks,"t");
      const cDR=calcTaskDR(t.id,projTasks,"c");
      const effTs=tDR?.s||t.ts, effTe=tDR?.e||t.te;
      const effCs=cDR?.s||t.cs, effCe=cDR?.e||t.ce;
      const tP=calcPct(effTs,effTe), cP=calcPct(effCs,effCe);
      const delayed=effCs&&effCe&&effTs&&effTe&&new Date(effCe)>new Date(effTe);
      const status=autoStatus(effTs,effTe,t._statusManual,t.status);
      return(
        <div key={t.id} className="bg-white rounded-xl border border-slate-100 shadow-sm mb-2">
          <div className="p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <button onClick={()=>subs.length&&toggleExpand(t.id)} className={`mt-0.5 flex-shrink-0 ${subs.length?"text-slate-400 hover:text-indigo-500":"text-slate-200 cursor-default"}`}>
                {subs.length?(t.expanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>):<Minus size={14}/>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {t.role&&<RTag r={t.role}/>}
                  <span className="font-bold text-slate-800 text-sm">{t.title}</span>
                  <STag s={status}/>
                  {delayed&&<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">⚠지연</span>}
                </div>
                {/* 목표일정 */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                  <span>🎯 {fd(effTs)} ~ {fd(effTe)}</span>
                  {(effCs!==effTs||effCe!==effTe)&&<span className="text-orange-400">📊 {fd(effCs)} ~ {fd(effCe)}</span>}
                </div>
              </div>
              {/* Task 액션 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="hidden sm:flex items-center gap-1">{(()=>{if(t.uid===VACANT_ID)return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-500 font-bold">공석</span>;const mr=getMemberRole(t.uid,selP);return mr?<RTag r={mr}/>:null;})()}</div>
                <Av n={uN(t.uid)} sz="w-6 h-6" ts="text-[10px]" vacant={t.uid===VACANT_ID}/>
                {canEdit(t)&&<button onClick={()=>{setEditItem({...t});setModal("editTask");}} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit2 size={12}/></button>}
                {(isMaster()||t.uid===me?.id)&&<button onClick={()=>doDeleteTask(t.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={12}/></button>}
                <button onClick={()=>{setNewSub({title:"",desc:"",ts:effTs,te:effTe});setParentCtx(t.id);setModal("addSub");}} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg" title="세부업무 추가"><Plus size={12}/></button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><div className="flex justify-between text-[11px] mb-1"><span className="text-slate-400">목표</span><span className="font-bold" style={{color:phColor}}>{tP}%</span></div><Bar v={tP} color={phColor}/></div>
              <div><div className="flex justify-between text-[11px] mb-1"><span className="text-slate-400">현황</span><span className="font-bold text-slate-500">{cP}%</span></div><Bar v={cP} color="#94a3b8"/></div>
            </div>
          </div>
          {/* SubTasks */}
          {t.expanded&&subs.length>0&&(
            <div className="border-t border-slate-50 divide-y divide-slate-50">
              {subs.map(s=>{
                const sP=calcPct(s.cs,s.ce);
                const sStatus=autoStatus(s.ts,s.te,s._statusManual,s.status);
                return(
                  <div key={s.id} className="px-3 sm:px-4 py-2.5 flex items-center gap-2 group hover:bg-slate-50">
                    <div className="w-4 flex-shrink-0"/>
                    <button onClick={()=>{if(canEdit(s)){const ns=s.status==="완료"?"예정":"완료";const updated={...s,status:ns,_statusManual:true};setTasks(tasks.map(x=>x.id===s.id?updated:x));dbUpdateTask(updated);lsSaveTaskOverride(updated);}}} className={`flex-shrink-0 ${canEdit(s)?"cursor-pointer":"cursor-default"}`}>
                      {sStatus==="완료"?<CheckSquare size={14} className="text-emerald-500"/>:<Square size={14} className="text-slate-300"/>}
                    </button>
                    {/* 제목 + 날짜 */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${sStatus==="완료"?"line-through text-slate-400":"text-slate-700"}`}>{s.title}</p>
                      {(s.ts||s.te)&&<p className="text-[11px] text-slate-400 mt-0.5">{fd(s.ts)} ~ {fd(s.te)}{s.cs!==s.ts||s.ce!==s.te?<span className="text-orange-400 ml-1.5">{fd(s.cs)}~{fd(s.ce)}</span>:null}</p>}
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0 w-7 text-right">{sP}%</span>
                    {/* SubTask 액션 */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit(s)&&<button onClick={()=>{setEditItem({...s});setModal("editSub");}} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-indigo-500 rounded"><Edit2 size={11}/></button>}
                      {(isMaster()||s.uid===me?.id)&&<button onClick={()=>doDeleteSub(s.id)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 rounded"><Trash2 size={11}/></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    /* ── 주간 진척율 ── */
    function renderWeekly(){
      const allTasks=projTasks.filter(t=>t.depth===1);
      const weeks=getWeeks(selP.start,selP.end);
      const today=new Date().toISOString().split("T")[0];
      return(
        <div className="space-y-3">
          {weeks.map(w=>{
            const isPast=w.end<today,isCurrent=w.start<=today&&w.end>=today,isFuture=w.start>today;
            // 미래 주차는 진척율 0 — 아직 도래하지 않음
            const asOf=isCurrent?today:w.end;
            const activeTasks=allTasks.filter(t=>isActiveInWeek(t.ts,t.te,w.start,w.end));
            let tw=0,wpT=0,wpC=0;
            if(!isFuture){
              allTasks.forEach(t=>{
                const d=countWD(t.ts,t.te)||1; tw+=d;
                wpT+=calcPctAt(t.ts,t.te,w.end)*d;
                wpC+=calcPctAt(t.cs,t.ce,asOf)*d;
              });
            }
            const wTP=tw?Math.round(wpT/tw):0, wCP=tw?Math.round(wpC/tw):0;
            const isWOpen=expandedWeeks[w.num]!=null?expandedWeeks[w.num]:isCurrent;
            return(
              <div key={w.num} className={`bg-white rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden ${isCurrent?"border-indigo-300 ring-2 ring-indigo-100":isPast?"border-slate-100":"border-dashed border-slate-200"}`}>
                <button onClick={()=>setExpandedWeeks(p=>({...p,[w.num]:!isWOpen}))}
                  className={`w-full px-4 py-3 flex items-center justify-between ${isCurrent?"bg-indigo-500":isPast?"bg-slate-700":"bg-slate-50"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${isCurrent?"bg-white text-indigo-600":isPast?"bg-white/20 text-white":"bg-slate-200 text-slate-500"}`}>{w.num}주차</div>
                    <div>
                      <p className={`text-sm font-bold ${isCurrent||isPast?"text-white":"text-slate-500"}`}>{w.start.slice(5).replace("-","/")} ~ {w.end.slice(5).replace("-","/")}</p>
                      <p className={`text-[11px] ${isCurrent?"text-indigo-200":isPast?"text-white/60":"text-slate-400"}`}>{isCurrent?"📍 이번 주":isPast?"✓ 완료된 주":"예정"}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className={`text-[10px] leading-tight ${isCurrent||isPast?"text-white/70":"text-slate-400"}`}>주간목표<br/>진척율</p>
                      <p className={`text-base font-extrabold ${isCurrent||isPast?"text-white":"text-slate-400"}`}>{isFuture?"—":wTP+"%"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] leading-tight ${isCurrent||isPast?"text-white/70":"text-slate-400"}`}>주간현황<br/>진척율</p>
                      <p className={`text-base font-extrabold ${isCurrent?"text-yellow-300":isPast?"text-white":"text-slate-400"}`}>{isFuture?"—":wCP+"%"}</p>
                    </div>
                  </div>
                  {isWOpen?<ChevronDown size={14} className={isCurrent||isPast?"text-white/70":"text-slate-400"}/>:<ChevronRight size={14} className={isCurrent||isPast?"text-white/70":"text-slate-400"}/>}
                </button>
                {isWOpen&&(
                  <>
                    {activeTasks.length>0&&(
                      <div className="divide-y divide-slate-50">
                        {activeTasks.map(t=>{
                          const ph=projTasks.find(x=>x.id===t.parentId);
                          const phC=ph?.color||selP.color;
                          const asOfTask=isFuture?w.end:isCurrent?today:w.end;
                          const tCP=calcPctAt(t.cs,t.ce,asOfTask);
                          const subs=projTasks.filter(s=>s.parentId===t.id).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
                          const activeSubs=subs.filter(s=>isActiveInWeek(s.ts,s.te,w.start,w.end)||isActiveInWeek(s.cs,s.ce,w.start,w.end));
                          return(
                            <div key={t.id}>
                              <div className="px-4 py-3 flex items-center gap-3">
                                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{backgroundColor:phC}}/>
                                <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                                  {t.role&&<RTag r={t.role}/>}
                                  <span className="text-xs font-bold text-slate-700 truncate">{t.title}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <Av n={uN(t.uid)} sz="w-6 h-6" ts="text-[10px]"/>
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-400">현황</p>
                                    <p className="text-sm font-extrabold" style={{color:phC}}>{isFuture?"—":tCP+"%"}</p>
                                  </div>
                                </div>
                              </div>
                              {(activeSubs.length>0?activeSubs:subs).length>0&&(
                                <div className="bg-slate-50 divide-y divide-white">
                                  {(activeSubs.length>0?activeSubs:subs).map(s=>{
                                    const sCP=isFuture?0:calcPctAt(s.cs,s.ce,asOfTask);
                                    return(
                                      <div key={s.id} className="px-5 sm:px-6 py-2.5 flex items-center gap-2.5">
                                        <div className="w-3 flex-shrink-0"/>
                                        {s.status==="완료"?<CheckSquare size={13} className="text-emerald-500 flex-shrink-0"/>:<Square size={13} className="text-slate-300 flex-shrink-0"/>}
                                        <span className={`flex-1 text-xs min-w-0 truncate ${s.status==="완료"?"line-through text-slate-400":"text-slate-600"}`}>{s.title}</span>
                                        <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 w-8 text-right">{isFuture?"—":sCP+"%"}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {activeTasks.length===0&&<p className="px-4 py-4 text-xs text-slate-300 text-center">이 주에 예정된 작업이 없어요</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return(
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar {...navP}/>
        <main className="flex-1 flex flex-col min-w-0 overflow-auto pb-20 sm:pb-0">
          {/* PC 헤더 */}
          <header className="hidden sm:flex bg-white border-b border-slate-100 px-6 py-4 items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button onClick={()=>setSide(!side)} className="text-slate-400 hover:text-slate-600"><Menu size={18}/></button>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <button onClick={()=>setPage("dash")} className="hover:text-indigo-500">대시보드</button>
                <ChevronRight size={11}/><span className="text-slate-700 font-semibold">{selP.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selP.notionUrl&&<button onClick={()=>setSyncConf(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"><RefreshCw size={11}/>Notion 재동기화</button>}
              {selP.notionUrl&&<a href={selP.notionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-indigo-300"><Link size={11}/>Notion 로드맵</a>}
              {isMaster()&&<button onClick={()=>setEditMember(selP)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"><Users size={11}/>멤버 관리</button>}
              <div className="flex -space-x-1.5">{mem.map(m=>{const mr=getMemberRole(m.id,selP);return(<div key={m.id} title={`${m.name}${mr?" ("+mr+")":""}`} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 text-xs font-bold">{m.name[0]}</div>);})}</div>
            </div>
          </header>
          {/* 모바일 헤더 */}
          <header className="sm:hidden bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-30">
            <button onClick={()=>setPage("dash")} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-xl flex-shrink-0"><ArrowLeft size={18}/></button>
            <div className="flex items-center gap-2 flex-1 min-w-0"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:selP.color}}/><h1 className="font-bold text-slate-800 text-base truncate">{selP.name}</h1></div>
            {selP.notionUrl&&<button onClick={()=>setSyncConf(true)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-500"><RefreshCw size={16}/></button>}
            {isMaster()&&<button onClick={()=>setEditMember(selP)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-500"><Users size={16}/></button>}
          </header>

          {/* 진척율 요약 */}
          <div className="p-4 sm:p-6 pb-0">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div><div className="flex items-center justify-between mb-2"><span className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5"><Target size={13} className="text-indigo-400"/>전체 진척율 (목표)</span><span className="text-xl sm:text-2xl font-extrabold" style={{color:selP.color}}>{tTotal}%</span></div><Bar v={tTotal} color={selP.color} h="h-3"/></div>
                <div><div className="flex items-center justify-between mb-2"><span className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5"><TrendingUp size={13} className="text-slate-400"/>전체 진척율 (현황)</span><span className="text-xl sm:text-2xl font-extrabold text-slate-600">{cTotal}%</span></div><Bar v={cTotal} color="#94a3b8" h="h-3"/></div>
              </div>
              <p className="text-slate-400 text-xs mt-3 text-right">{selP.start} ~ {selP.end} · 주말·공휴일 제외</p>
            </div>
          </div>

          {/* 탭 */}
          <div className="px-4 sm:px-6 pt-4">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl sm:w-fit sm:flex">
              {[["schedule","일정",Calendar],["progress","진척율",TrendingUp],["documents","자료실",Archive]]
                .filter(([id])=>allowedTabs.includes(id))
                .map(([id,label,Icon])=>(
                  <button key={id} onClick={()=>{setTab(id);setSelDoc(null);}}
                    className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab===id?"bg-white text-indigo-600 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                    <Icon size={13}/>{label}
                  </button>
                ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* 일정 탭 */}
            {tab==="schedule"&&(
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-800">일정 목록</h2>
                    {!isMaster()&&<p className="text-xs text-slate-400 mt-0.5">✏️ 본인 담당 업무만 수정 가능</p>}
                  </div>
                  {isMaster()&&(
                    <button
                      onClick={()=>{setNewPhase({title:"",desc:"",ts:selP.start,te:selP.end,color:"#6366f1"});setModal("addPhase");}}
                      className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-colors">
                      <Plus size={13}/>Phase 추가
                    </button>
                  )}
                </div>
                {renderTree()}
              </div>
            )}

            {/* 진척율 탭 */}
            {tab==="progress"&&(
              <div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-5">
                  {[["unit","단위별"],["weekly","주간"]].map(([id,label])=>(
                    <button key={id} onClick={()=>setPTab(id)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${pTab===id?"bg-white text-indigo-600 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>{label} 진척율</button>
                  ))}
                </div>
                {pTab==="unit"&&(
                  <div className="space-y-3">
                    {phases.map(ph=>{
                      const phTp=treePct(projTasks,ph.id,"t"),phCp=treePct(projTasks,ph.id,"c");
                      const phTasks=projTasks.filter(t=>t.parentId===ph.id).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
                      const isOpen=expandedUnitPhases[ph.id]!==false;
                      return(
                        <div key={ph.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <button onClick={()=>setExpandedUnitPhases(p=>({...p,[ph.id]:!isOpen}))}
                            className="w-full p-4 text-white text-left" style={{backgroundColor:ph.color||selP.color}}>
                            <div className="flex items-center justify-between">
                              <p className="font-extrabold text-sm">{ph.title}</p>
                              <div className="flex items-center gap-3">
                                <span className="text-white/80 text-xs font-bold">{phTp}% / {phCp}%</span>
                                {isOpen?<ChevronDown size={15} className="text-white/80"/>:<ChevronRight size={15} className="text-white/80"/>}
                              </div>
                            </div>
                            {isOpen&&<div className="grid grid-cols-2 gap-3 mt-3">
                              <div><div className="flex justify-between text-xs mb-1"><span className="text-white/70">목표</span><b>{phTp}%</b></div><Bar v={phTp} color="rgba(255,255,255,0.9)" h="h-2"/></div>
                              <div><div className="flex justify-between text-xs mb-1"><span className="text-white/70">현황</span><b>{phCp}%</b></div><Bar v={phCp} color="rgba(255,255,255,0.5)" h="h-2"/></div>
                            </div>}
                          </button>
                          {isOpen&&<div className="divide-y divide-slate-50">
                            {phTasks.map(t=>{
                              const tTp=calcPct(t.ts,t.te),tCp=calcPct(t.cs,t.ce),delayed=t.cs&&t.ce&&t.ts&&t.te&&new Date(t.ce)>new Date(t.te);
                              const subs=projTasks.filter(s=>s.parentId===t.id).sort((a,b)=>(a.ts||'').localeCompare(b.ts||''));
                              return(
                                <div key={t.id} className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-wrap"><Av n={uN(t.uid)} sz="w-6 h-6" ts="text-[10px]"/>{t.role&&<RTag r={t.role}/>}<p className="font-semibold text-slate-800 text-sm">{t.title}</p></div>
                                    {delayed&&<span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">⚠지연</span>}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">목표</span><span className="font-bold" style={{color:ph.color||selP.color}}>{tTp}%</span></div><Bar v={tTp} color={ph.color||selP.color} h="h-2"/><p className="text-slate-300 text-[10px] mt-1">{countWD(t.ts,t.te)}일</p></div>
                                    <div><div className="flex justify-between text-xs mb-1"><span className="text-slate-400">현황</span><span className="font-bold text-slate-600">{tCp}%</span></div><Bar v={tCp} color="#94a3b8" h="h-2"/><p className="text-slate-300 text-[10px] mt-1">{countWD(t.cs,t.ce)}일</p></div>
                                  </div>
                                  {subs.length>0&&<div className="space-y-1 pl-2 border-l-2" style={{borderColor:(ph.color||selP.color)+"44"}}>{subs.map(s=><div key={s.id} className="flex items-center gap-2 py-1">{s.status==="완료"?<CheckSquare size={12} className="text-emerald-500 flex-shrink-0"/>:<Square size={12} className="text-slate-300 flex-shrink-0"/>}<span className={`text-xs flex-1 truncate ${s.status==="완료"?"line-through text-slate-400":"text-slate-600"}`}>{s.title}</span><span className="text-[11px] text-slate-400">{calcPct(s.cs,s.ce)}%</span></div>)}</div>}
                                </div>
                              );
                            })}
                          </div>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {pTab==="weekly"&&renderWeekly()}
              </div>
            )}

            {/* 자료실 탭 */}
            {tab==="documents"&&(
              <div>
                {!selDoc?(
                  <>
                    <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-slate-800">자료실 <span className="text-slate-400 font-normal text-xs ml-1">{pd.length}건</span></h2><button onClick={()=>setModal("addDoc")} className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold"><Plus size={13}/>자료 등록</button></div>

                    <div className="space-y-2">
                      {pd.map(d=><div key={d.id} onClick={()=>setSelDoc(d)} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-200 hover:shadow-md active:scale-[0.99] transition-all group"><div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100"><Archive size={16} className="text-indigo-500"/></div><div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm truncate">{d.title}</p><p className="text-slate-400 text-xs mt-0.5">{uN(d.uid)} · {d.at}</p></div><div className="flex items-center gap-2 flex-shrink-0">{d.files.length>0&&<span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg"><FileText size={10}/>{d.files.length}</span>}{d.links.length>0&&<span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-50 px-2 py-1 rounded-lg"><ExternalLink size={10}/>{d.links.length}</span>}<ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400"/></div></div>)}
                      {pd.length===0&&<div className="text-center py-12 text-slate-300"><Archive size={32} className="mx-auto mb-3"/><p className="text-sm">등록된 자료가 없어요</p></div>}
                    </div>
                  </>
                ):(
                  <div>
                    <div className="flex items-center gap-2 mb-4"><button onClick={()=>setSelDoc(null)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-xl flex-shrink-0"><ArrowLeft size={16}/></button><h2 className="font-bold text-slate-800 flex-1 truncate">{selDoc.title}</h2>{(isMaster()||selDoc.uid===me?.id)&&<button onClick={()=>{setDocs(docs.filter(x=>x.id!==selDoc.id));dbDeleteDoc(selDoc.id);setSelDoc(null);}} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={14}/></button>}<button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl"><Share2 size={14}/></button></div>
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100"><Av n={uN(selDoc.uid)} sz="w-9 h-9"/><div><p className="font-semibold text-slate-800 text-sm">{uN(selDoc.uid)}</p><p className="text-slate-400 text-xs">{selDoc.at} 등록</p></div></div>
                      {selDoc.desc&&<div className="mb-5"><p className="text-xs font-bold text-slate-500 mb-2">내용</p><p className="text-sm text-slate-700 leading-relaxed">{selDoc.desc}</p></div>}
                      {selDoc.files.length>0&&<div className="mb-5"><p className="text-xs font-bold text-slate-500 mb-2">첨부 파일 {selDoc.files.length}개</p><div className="space-y-2">{selDoc.files.map((f,i)=><div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3"><div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center"><FileText size={14} className="text-indigo-400"/></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-700 truncate">{f.name}</p></div>{f.dataUrl?<a href={f.dataUrl} download={f.name} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Download size={12}/>다운로드</a>:<span className="text-xs text-slate-400 bg-slate-200 px-3 py-1.5 rounded-lg font-bold">샘플</span>}</div>)}</div></div>}
                      {selDoc.links.length>0&&<div><p className="text-xs font-bold text-slate-500 mb-2">링크 {selDoc.links.length}개</p>{selDoc.links.map((l,i)=><a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3 hover:bg-blue-100 mb-2"><div className="w-8 h-8 bg-white rounded-lg border border-blue-200 flex items-center justify-center"><ExternalLink size={14} className="text-blue-500"/></div><p className="text-sm text-blue-700 font-semibold flex-1 truncate">{l}</p><ChevronRight size={14} className="text-blue-400"/></a>)}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <BotNav me={me} page={page} setPage={setPage} setModal={setModal}/>

        {/* ══ 모달: Phase 추가 ══ */}
        {modal==="addPhase"&&<Sheet title="Phase 추가" onClose={()=>setModal(null)} wide>
          <div className="space-y-4">
            <Fl label="Phase 명"><input className={IC} placeholder="예: Phase 1 — 기획 단계" value={newPhase.title} onChange={e=>setNewPhase({...newPhase,title:e.target.value})}/></Fl>
            <Fl label="설명"><textarea className={IC+" resize-none"} rows={2} placeholder="이 Phase의 목표" value={newPhase.desc} onChange={e=>setNewPhase({...newPhase,desc:e.target.value})}/></Fl>
            <div className="grid grid-cols-2 gap-3">
              <Fl label="시작일"><input type="date" className={IC} value={newPhase.ts} onChange={e=>setNewPhase({...newPhase,ts:e.target.value})}/></Fl>
              <Fl label="종료일"><input type="date" className={IC} value={newPhase.te} onChange={e=>setNewPhase({...newPhase,te:e.target.value})}/></Fl>
            </div>
            <Fl label="색상">
              <div className="flex gap-2 mt-1">{PHASE_COLORS.map(c=><button key={c} onClick={()=>setNewPhase({...newPhase,color:c})} className={`w-8 h-8 rounded-full transition-all ${newPhase.color===c?"ring-2 ring-offset-2 ring-indigo-400 scale-110":""}`} style={{backgroundColor:c}}/>)}</div>
            </Fl>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doAddPhase} className="flex-1">추가</BtnPrimary></div>
        </Sheet>}

        {/* ══ 모달: Phase 수정 ══ */}
        {modal==="editPhase"&&editItem&&<Sheet title="Phase 수정" onClose={()=>setModal(null)} wide>
          <div className="space-y-4">
            <Fl label="Phase 명"><input className={IC} value={editItem.title} onChange={e=>setEditItem({...editItem,title:e.target.value})}/></Fl>
            <Fl label="설명"><textarea className={IC+" resize-none"} rows={2} value={editItem.desc} onChange={e=>setEditItem({...editItem,desc:e.target.value})}/></Fl>
            <div className="grid grid-cols-2 gap-3">
              <Fl label="시작일"><input type="date" className={IC} value={editItem.ts} onChange={e=>setEditItem({...editItem,ts:e.target.value})}/></Fl>
              <Fl label="종료일"><input type="date" className={IC} value={editItem.te} onChange={e=>setEditItem({...editItem,te:e.target.value})}/></Fl>
            </div>
            <Fl label="색상"><div className="flex gap-2 mt-1">{PHASE_COLORS.map(c=><button key={c} onClick={()=>setEditItem({...editItem,color:c})} className={`w-8 h-8 rounded-full transition-all ${editItem.color===c?"ring-2 ring-offset-2 ring-indigo-400 scale-110":""}`} style={{backgroundColor:c}}/>)}</div></Fl>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doEditPhase} className="flex-1">저장</BtnPrimary></div>
        </Sheet>}

        {/* ══ 모달: Task 추가 ══ */}
        {modal==="addTask"&&<Sheet title="업무(Task) 추가" onClose={()=>setModal(null)} wide>
          <div className="space-y-4">
            <Fl label="업무 제목"><input className={IC} placeholder="업무 이름" value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})}/></Fl>
            <Fl label="역할">
              <div className="grid grid-cols-4 gap-2">
                {["기획","서버","디자인","공통"].map(r=><button key={r} onClick={()=>setNewTask({...newTask,role:r})} className={`py-2 rounded-xl text-xs font-bold border transition-all ${newTask.role===r?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-500 hover:border-indigo-300"}`}>{r}</button>)}
              </div>
            </Fl>
            <Fl label="담당자">
              <select className={IC} value={newTask.uid} onChange={e=>setNewTask({...newTask,uid:e.target.value})}>
                <option value="">담당자 선택</option>
                {users.map(u=><option key={u.id} value={u.id}>{u.name}{u.jobRole ? ` (${u.jobRole})` : ''}</option>)}
              </select>
            </Fl>
            <Fl label="설명"><textarea className={IC+" resize-none"} rows={2} placeholder="상세 설명" value={newTask.desc} onChange={e=>setNewTask({...newTask,desc:e.target.value})}/></Fl>
            <div className="grid grid-cols-2 gap-3">
              <Fl label="시작일"><input type="date" className={IC} value={newTask.ts} onChange={e=>setNewTask({...newTask,ts:e.target.value})}/></Fl>
              <Fl label="종료일"><input type="date" className={IC} value={newTask.te} onChange={e=>setNewTask({...newTask,te:e.target.value})}/></Fl>
            </div>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doAddTask} className="flex-1">추가</BtnPrimary></div>
        </Sheet>}

        {/* ══ 모달: Task 수정 ══ */}
        {modal==="editTask"&&editItem&&<Sheet title="업무 수정" onClose={()=>setModal(null)} wide>
          <div className="space-y-4">
            <Fl label="업무 제목"><input className={IC} value={editItem.title} onChange={e=>setEditItem({...editItem,title:e.target.value})}/></Fl>
            <Fl label="상태"><div className="flex gap-2">{["예정","진행중","완료"].map(s=><button key={s} onClick={()=>setEditItem({...editItem,status:s})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${editItem.status===s?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-500 hover:border-indigo-300"}`}>{s}</button>)}</div></Fl>
            <Fl label="담당자"><select className={IC} value={editItem.uid} onChange={e=>setEditItem({...editItem,uid:parseInt(e.target.value)})}>{users.map(u=><option key={u.id} value={u.id}>{u.name}{u.jobRole ? ` (${u.jobRole})` : ''}</option>)}</select></Fl>
            <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
              <p className="text-indigo-700 text-xs font-bold">🎯 목표 일정</p>
              <div className="grid grid-cols-2 gap-3">
                <Fl label="시작일"><input type="date" className={IC} value={editItem.ts} onChange={e=>setEditItem({...editItem,ts:e.target.value,cs:e.target.value})}/></Fl>
                <Fl label="종료일"><input type="date" className={IC} value={editItem.te} onChange={e=>setEditItem({...editItem,te:e.target.value,ce:e.target.value})}/></Fl>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-slate-600 text-xs font-bold">📊 현황 일정 <span className="text-slate-400 font-normal">(목표와 다를 경우만)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <Fl label="시작일"><input type="date" className={IC} value={editItem.cs} onChange={e=>setEditItem({...editItem,cs:e.target.value})}/></Fl>
                <Fl label="종료일"><input type="date" className={IC} value={editItem.ce} onChange={e=>setEditItem({...editItem,ce:e.target.value})}/></Fl>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doEditTask} className="flex-1">저장</BtnPrimary></div>
        </Sheet>}

        {/* ══ 모달: SubTask 추가 ══ */}
        {modal==="addSub"&&<Sheet title="세부 업무 추가" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Fl label="세부 업무명"><input className={IC} placeholder="세부 업무 내용" value={newSub.title} onChange={e=>setNewSub({...newSub,title:e.target.value})}/></Fl>
            <Fl label="설명 (선택)"><textarea className={IC+" resize-none"} rows={2} value={newSub.desc} onChange={e=>setNewSub({...newSub,desc:e.target.value})}/></Fl>
            <div className="grid grid-cols-2 gap-3">
              <Fl label="시작일"><input type="date" className={IC} value={newSub.ts} onChange={e=>setNewSub({...newSub,ts:e.target.value})}/></Fl>
              <Fl label="종료일"><input type="date" className={IC} value={newSub.te} onChange={e=>setNewSub({...newSub,te:e.target.value})}/></Fl>
            </div>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doAddSub} className="flex-1">추가</BtnPrimary></div>
        </Sheet>}

        {/* ══ 모달: SubTask 수정 ══ */}
        {modal==="editSub"&&editItem&&<Sheet title="세부 업무 수정" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Fl label="세부 업무명"><input className={IC} value={editItem.title} onChange={e=>setEditItem({...editItem,title:e.target.value})}/></Fl>
            <Fl label="상태"><div className="flex gap-2">{["예정","진행중","완료"].map(s=><button key={s} onClick={()=>setEditItem({...editItem,status:s})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${editItem.status===s?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-500"}`}>{s}</button>)}</div></Fl>
            <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
              <p className="text-indigo-700 text-xs font-bold">🎯 목표 일정</p>
              <div className="grid grid-cols-2 gap-3">
                <Fl label="시작일"><input type="date" className={IC} value={editItem.ts} onChange={e=>setEditItem({...editItem,ts:e.target.value,cs:e.target.value})}/></Fl>
                <Fl label="종료일"><input type="date" className={IC} value={editItem.te} onChange={e=>setEditItem({...editItem,te:e.target.value,ce:e.target.value})}/></Fl>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-slate-600 text-xs font-bold">📊 현황 일정</p>
              <div className="grid grid-cols-2 gap-3">
                <Fl label="시작일"><input type="date" className={IC} value={editItem.cs} onChange={e=>setEditItem({...editItem,cs:e.target.value})}/></Fl>
                <Fl label="종료일"><input type="date" className={IC} value={editItem.ce} onChange={e=>setEditItem({...editItem,ce:e.target.value})}/></Fl>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doEditSub} className="flex-1">저장</BtnPrimary></div>
        </Sheet>}

        {/* ══ 모달: 자료 등록 ══ */}
        {modal==="addDoc"&&<Sheet title="자료 등록" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Fl label="제목"><input className={IC} placeholder="자료 제목" value={nd.title} onChange={e=>setND({...nd,title:e.target.value})}/></Fl>
            <Fl label="설명"><textarea className={IC+" resize-none"} rows={2} placeholder="자료 설명" value={nd.desc} onChange={e=>setND({...nd,desc:e.target.value})}/></Fl>
            <Fl label="파일 첨부">
              <label className="block cursor-pointer"><input type="file" multiple className="hidden" onChange={handleFiles}/>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-indigo-300"><Upload size={18} className="text-slate-300 mx-auto mb-1.5"/><p className="text-slate-400 text-xs font-semibold">파일 선택 또는 탭</p><p className="text-slate-300 text-[11px] mt-0.5">여러 파일 동시 선택 · 최대 50MB</p></div>
              </label>
              {nd.files.length>0&&<div className="mt-2 space-y-1.5">{nd.files.map((f,i)=><div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2"><FileText size={13} className="text-indigo-400 flex-shrink-0"/><span className="text-xs text-slate-700 flex-1 truncate">{f.name}</span><button onClick={()=>setND({...nd,files:nd.files.filter((_,j)=>j!==i)})} className="text-slate-300 hover:text-red-500"><X size={13}/></button></div>)}</div>}
            </Fl>
            <Fl label="링크 (선택)"><input className={IC} placeholder="https://..." value={nd.link} onChange={e=>setND({...nd,link:e.target.value})}/></Fl>
          </div>
          <div className="flex gap-3 mt-5"><BtnGhost onClick={()=>setModal(null)} className="flex-1">취소</BtnGhost><BtnPrimary onClick={doAddDoc} className="flex-1">등록</BtnPrimary></div>
        </Sheet>}

        {/* ══ 멤버 관리 모달 ══ */}
        {editMember&&(
          <Sheet title="멤버 관리" onClose={()=>{setEditMember(null);setAddMemberMode(false);setReplaceTarget(null);}} wide>
            {(()=>{
              const ROLES=["PM","기획","디자인","개발"];
              const tabs3=[["schedule","📅 일정"],["progress","📊 진척율"],["documents","📁 자료실"]];
              const memberIds=getMemberIds(editMember);
              // 공석 탐색 (태스크에 VACANT_ID가 있는지)
              const vacantTasks=tasks.filter(t=>t.pid===editMember.id&&t.uid===VACANT_ID&&t.status!=="완료");
              const hasVacant=vacantTasks.length>0&&!memberIds.includes(VACANT_ID);

              function MemberRoleEditor({uid, mInfo, onUpdate}){
                return(
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-500 font-semibold mb-1.5">역할</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLES.map(r=><button key={r} type="button" onClick={()=>onUpdate({role:r,customRole:""})}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${mInfo.role===r&&!mInfo.customRole?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-500 hover:border-indigo-300"}`}>{r}</button>)}
                        <button type="button" onClick={()=>onUpdate({role:"custom",customRole:mInfo.customRole||""})}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${mInfo.role==="custom"?"bg-teal-500 text-white border-teal-500":"border-slate-200 text-slate-500 hover:border-teal-300"}`}>직접입력</button>
                      </div>
                      {mInfo.role==="custom"&&<input className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400" placeholder="역할명 입력" value={mInfo.customRole||""} onChange={e=>onUpdate({customRole:e.target.value})}/>}
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 font-semibold mb-1.5">메뉴 접근 권한</p>
                      <div className="flex gap-2">
                        {tabs3.map(([id,label])=>(
                          <button key={id} type="button" onClick={()=>{const t=mInfo.tabs?.includes(id)?mInfo.tabs.filter(x=>x!==id):[...(mInfo.tabs||[]),id];onUpdate({tabs:t});}}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${mInfo.tabs?.includes(id)?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-400 hover:border-indigo-300"}`}>{label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return(
                <div className="space-y-3">
                  {/* 공석 항목 */}
                  {hasVacant&&(
                    <div className="border-2 border-dashed border-orange-200 rounded-xl overflow-hidden bg-orange-50/50">
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-dashed border-orange-300 flex items-center justify-center text-orange-500 font-bold text-xs">?</div>
                        <div className="flex-1">
                          <p className="font-semibold text-orange-600 text-sm">공석</p>
                          <p className="text-orange-400 text-xs">{vacantTasks.length}개 일정 배정 대기 중</p>
                        </div>
                        <button onClick={()=>setReplaceTarget({uid:VACANT_ID,cfg:{role:"기획",customRole:"",tabs:["schedule","progress","documents"]}})}
                          className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors">
                          <Plus size={12}/>인원 배정
                        </button>
                      </div>
                      {replaceTarget?.uid===VACANT_ID&&(
                        <div className="border-t border-orange-200 p-3 space-y-3 bg-white">
                          <p className="text-xs font-bold text-slate-600">배정할 멤버 선택</p>
                          <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                            value={replaceTarget.cfg.newUid||""} onChange={e=>setReplaceTarget({...replaceTarget,cfg:{...replaceTarget.cfg,newUid:parseInt(e.target.value)}})}>
                            <option value="">멤버 선택</option>
                            {users.filter(u=>u.role==="member"&&!memberIds.includes(u.id)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <MemberRoleEditor uid={VACANT_ID} mInfo={replaceTarget.cfg} onUpdate={patch=>setReplaceTarget({...replaceTarget,cfg:{...replaceTarget.cfg,...patch}})}/>
                          <div className="flex gap-2 pt-1">
                            <button onClick={()=>setReplaceTarget(null)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50">취소</button>
                            <button onClick={()=>{if(!replaceTarget.cfg.newUid)return;const np=doReplaceMember(editMember.id,VACANT_ID,replaceTarget.cfg.newUid,replaceTarget.cfg);setReplaceTarget(null);if(np)setEditMember(np);}}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-xs font-semibold">배정 완료</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 기존 멤버 목록 */}
                  {memberIds.filter(uid=>uid!==VACANT_ID).map(uid=>{
                    const u=users.find(x=>x.id===uid);
                    if(!u)return null;
                    const mInfo=getMemberInfo(uid,editMember)||{role:"기획",customRole:"",tabs:["schedule","progress","documents"]};
                    const effRole=mInfo.customRole||mInfo.role;
                    const isReplacing=replaceTarget?.uid===uid;
                    function updateMember(patch){
                      const newMembers=editMember.members.map(m=>(typeof m==="object"&&m.id===uid)?{...m,...patch}:m);
                      const updatedProj={...editMember,members:newMembers};
                      setProjs(projs.map(p=>p.id===editMember.id?updatedProj:p));
                      setEditMember(updatedProj);
                      dbUpdateProject(updatedProj);
                    }
                    return(
                      <div key={uid} className="border border-slate-100 rounded-xl overflow-hidden">
                        {/* 멤버 헤더 */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50">
                          <Av n={u.name} sz="w-8 h-8"/>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                            <p className="text-slate-400 text-xs">{u.email}</p>
                          </div>
                          {effRole&&<RTag r={effRole}/>}
                          {/* 교체/삭제 버튼 */}
                          <div className="flex gap-1 flex-shrink-0">
                            <button title="교체" onClick={()=>setReplaceTarget(isReplacing?null:{uid,cfg:{role:mInfo.role,customRole:mInfo.customRole||"",tabs:mInfo.tabs||["schedule","progress","documents"],newUid:""}})}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors ${isReplacing?"bg-indigo-500 text-white":"text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"}`}>
                              <Edit2 size={12}/>
                            </button>
                            <button title="삭제" onClick={()=>{if(!window.confirm(`${u.name}을(를) 프로젝트에서 제거할까요?
미완료 일정은 공석으로 변경됩니다.`))return;const np=doRemoveMember(editMember.id,uid);if(np)setEditMember(np);}}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </div>
                        {/* 역할/권한 편집 */}
                        {!isReplacing&&<MemberRoleEditor uid={uid} mInfo={mInfo} onUpdate={updateMember}/>}
                        {/* 교체 UI */}
                        {isReplacing&&(
                          <div className="border-t border-slate-100 p-3 bg-indigo-50/40 space-y-3">
                            <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5"><Edit2 size={11}/>교체할 멤버 선택 <span className="text-indigo-400 font-normal">({u.name}의 미완료 일정이 자동 이전됩니다)</span></p>
                            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                              value={replaceTarget.cfg.newUid||""} onChange={e=>setReplaceTarget({...replaceTarget,cfg:{...replaceTarget.cfg,newUid:parseInt(e.target.value)}})}>
                              <option value="">교체할 멤버 선택</option>
                              {users.filter(u2=>u2.role==="member"&&!memberIds.includes(u2.id)).map(u2=><option key={u2.id} value={u2.id}>{u2.name}</option>)}
                            </select>
                            <MemberRoleEditor uid={uid} mInfo={replaceTarget.cfg} onUpdate={patch=>setReplaceTarget({...replaceTarget,cfg:{...replaceTarget.cfg,...patch}})}/>
                            <div className="flex gap-2 pt-1">
                              <button onClick={()=>setReplaceTarget(null)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50">취소</button>
                              <button onClick={()=>{if(!replaceTarget.cfg.newUid)return;const np=doReplaceMember(editMember.id,uid,replaceTarget.cfg.newUid,replaceTarget.cfg);setReplaceTarget(null);if(np)setEditMember(np);}}
                                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl text-xs font-semibold">교체 완료</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 멤버 추가 */}
                  {!addMemberMode?(
                    <button onClick={()=>setAddMemberMode(true)}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-500 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                      <Plus size={14}/>멤버 추가
                    </button>
                  ):(
                    <div className="border-2 border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/30">
                      <div className="p-3 border-b border-indigo-100 flex items-center justify-between">
                        <p className="text-sm font-bold text-indigo-700">새 멤버 추가</p>
                        <button onClick={()=>setAddMemberMode(false)} className="text-slate-400 hover:text-slate-600"><X size={15}/></button>
                      </div>
                      <div className="p-3 space-y-3">
                        <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                          value={addMemberCfg.uid||""} onChange={e=>setAddMemberCfg({...addMemberCfg,uid:parseInt(e.target.value)})}>
                          <option value="">추가할 멤버 선택</option>
                          {users.filter(u=>u.role==="member"&&!memberIds.includes(u.id)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold mb-1.5">역할</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLES.map(r=><button key={r} type="button" onClick={()=>setAddMemberCfg({...addMemberCfg,role:r,customRole:""})}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${addMemberCfg.role===r&&!addMemberCfg.customRole?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-500 hover:border-indigo-300"}`}>{r}</button>)}
                            <button type="button" onClick={()=>setAddMemberCfg({...addMemberCfg,role:"custom"})}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${addMemberCfg.role==="custom"?"bg-teal-500 text-white border-teal-500":"border-slate-200 text-slate-500 hover:border-teal-300"}`}>직접입력</button>
                          </div>
                          {addMemberCfg.role==="custom"&&<input className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400" placeholder="역할명 입력" value={addMemberCfg.customRole||""} onChange={e=>setAddMemberCfg({...addMemberCfg,customRole:e.target.value})}/>}
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 font-semibold mb-1.5">메뉴 접근 권한</p>
                          <div className="flex gap-2">
                            {tabs3.map(([id,label])=>(
                              <button key={id} type="button" onClick={()=>{const t=addMemberCfg.tabs?.includes(id)?addMemberCfg.tabs.filter(x=>x!==id):[...(addMemberCfg.tabs||[]),id];setAddMemberCfg({...addMemberCfg,tabs:t});}}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${addMemberCfg.tabs?.includes(id)?"bg-indigo-500 text-white border-indigo-500":"border-slate-200 text-slate-400 hover:border-indigo-300"}`}>{label}</button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={()=>{setAddMemberMode(false);setAddMemberCfg({uid:"",role:"기획",customRole:"",tabs:["schedule","progress","documents"]});}} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50">취소</button>
                          <button onClick={()=>{if(!addMemberCfg.uid)return;const np=doAddMember(editMember.id,addMemberCfg.uid,addMemberCfg);setAddMemberMode(false);setAddMemberCfg({uid:"",role:"기획",customRole:"",tabs:["schedule","progress","documents"]});if(np)setEditMember(np);}}
                            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl text-xs font-semibold">추가</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <button onClick={()=>{setEditMember(null);setAddMemberMode(false);setReplaceTarget(null);}} className="w-full mt-5 border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl text-sm font-semibold">닫기</button>
          </Sheet>
        )}

        {/* ══ Notion 재동기화 확인 다이얼로그 ══ */}
        {syncConf&&<Sheet title="Notion 재동기화" onClose={()=>setSyncConf(false)}>
          <div className="space-y-4">
            {/* 추천 방식 안내 */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3">
              <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5"/>
              <div className="text-xs text-indigo-800 leading-relaxed">
                <p className="font-bold mb-1">✅ 권장: ProSync 수정 + Notion은 참조용</p>
                <p>ProSync에서 현황일정·담당자·진척율 등 세부 데이터를 관리하고, Notion은 원본 로드맵 참조 문서로 활용하는 방식을 권장합니다.</p>
                <p className="mt-2 text-indigo-600">Notion으로 실시간 Push는 블록 구조 제약으로 현재 미지원이에요.</p>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={16} className="text-orange-500 flex-shrink-0 mt-0.5"/>
              <div className="text-xs text-orange-800 leading-relaxed">
                <p className="font-bold mb-1">⚠️ 재동기화 시 주의</p>
                <p>Notion 로드맵을 다시 불러오면 <b>기존 일정이 초기값으로 초기화</b>됩니다. ProSync에서 수정한 현황일정, 진척율이 사라질 수 있어요.</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <BtnGhost onClick={()=>setSyncConf(false)} className="flex-1">취소</BtnGhost>
            <button onClick={doNotionResync} disabled={syncing}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {syncing?<><RefreshCw size={14} className="animate-spin"/>동기화 중...</>:<><RefreshCw size={14}/>재동기화</>}
            </button>
          </div>
        </Sheet>}
      </div>
    );
  }
  return null;
}
