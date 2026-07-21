/* =====================================================================
   SERENO — núcleo: utilidades, estado global, permissões e persistência
   O sistema inicia sem nenhum dado: no primeiro acesso é criada a conta
   do administrador e todo o restante é cadastrado pelo próprio usuário.
   ===================================================================== */
"use strict";
const $=s=>document.querySelector(s);
const uid=()=> 'id'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const BRL=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const fmtD=iso=>{const d=new Date(iso+'T12:00');return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`};
const fmtDT=ts=>{const d=new Date(ts);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
const isoOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayISO=()=>isoOf(new Date());
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00');d.setDate(d.getDate()+n);return isoOf(d)};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const idade=nasc=>{if(!nasc)return '—';const n=new Date(nasc+'T12:00'),h=new Date();let a=h.getFullYear()-n.getFullYear();if(h.getMonth()<n.getMonth()||(h.getMonth()===n.getMonth()&&h.getDate()<n.getDate()))a--;return a+' anos'};

let DB=null, session=null, view='dashboard', viewParams={}, agendaStart=null, saveTimer=null;

/* ---------- Permissões (RBAC) ---------- */
const ROLES={
  admin:      {label:'Administrador(a)', can:['dashboard','agenda','pacientes','prontuario','financeiro','relatorios','config','usuarios','auditoria','backup']},
  psicologo:  {label:'Psicólogo(a)',     can:['dashboard','agenda','pacientes','prontuario','financeiro','relatorios','auditoria']},
  secretaria: {label:'Secretária(o)',    can:['dashboard','agenda','pacientes','financeiro']}
};
const can=perm=>{ if(!session)return false; const r=session.role==='admin'?ROLES.admin:ROLES[session.role]; return r.can.includes(perm); };

/* ---------- Persistência (window.storage com fallback em memória) ---------- */
const DBKEY='sereno_db_v1';
async function loadDB(){
  try{ if(window.storage){ const r=await window.storage.get(DBKEY); if(r&&r.value){ DB=JSON.parse(r.value); return; } } }catch(e){/* chave inexistente */}
  DB=emptyDB();
}
function persist(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async ()=>{
    try{ if(window.storage) await window.storage.set(DBKEY,JSON.stringify(DB)); }
    catch(e){ console.warn('Persistência indisponível — dados mantidos em memória.',e); }
  },400);
}
function audit(action,detail){
  DB.audit.unshift({ts:Date.now(),user:session?session.name:'sistema',action,detail});
  if(DB.audit.length>800)DB.audit.length=800;
  persist();
}


/* ---------- Banco de dados inicial (vazio) ---------- */
function emptyDB(){
  return {
    users:[], pacientes:[], apts:[], recs:[], docs:[], trans:[], audit:[],
    settings:{nomeClinica:'Meu Consultório', cnpj:'', endereco:'', lembreteHoras:24, canalPadrao:'whatsapp', codigoCadastro:''}
  };
}

/* ---------- Preferências de exibição (tema e tamanho do texto) ---------- */
const PREFKEY='sereno_prefs_v1';
let PREFS={theme:'auto',font:0};
async function loadPrefs(){
  try{ if(window.storage){ const r=await window.storage.get(PREFKEY); if(r&&r.value)PREFS=Object.assign(PREFS,JSON.parse(r.value)); } }catch(e){}
}
function savePrefs(){ try{ if(window.storage)window.storage.set(PREFKEY,JSON.stringify(PREFS)); }catch(e){} }
function themeAtual(){ return PREFS.theme==='auto' ? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : PREFS.theme; }
function applyPrefs(){
  document.documentElement.dataset.theme=themeAtual();
  document.documentElement.style.fontSize=(15+PREFS.font*1.5)+'px';
  document.querySelectorAll('.themeBtn').forEach(b=>{
    const dark=themeAtual()==='dark';
    b.textContent=dark?'☀':'☾';
    b.setAttribute('aria-label',dark?'Mudar para o modo claro':'Mudar para o modo escuro');
    b.title=b.getAttribute('aria-label');
  });
}
function toggleTheme(){ PREFS.theme=themeAtual()==='dark'?'light':'dark'; savePrefs(); applyPrefs(); }
function fontStep(n){ PREFS.font=Math.max(-1,Math.min(3,PREFS.font+n)); savePrefs(); applyPrefs(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(PREFS.theme==='auto')applyPrefs(); });

/* ---------- Arquivos anexados (um registro por documento) ---------- */
const FILEPREF='sereno_file_';
const MEMFILES={}; // reserva em memória quando o armazenamento não está disponível
async function fileSave(id,dataUrl){
  try{ if(window.storage){ await window.storage.set(FILEPREF+id,dataUrl); return true; } }catch(e){}
  MEMFILES[id]=dataUrl; return false;
}
async function fileGet(id){
  try{ if(window.storage){ const r=await window.storage.get(FILEPREF+id); if(r&&r.value)return r.value; } }catch(e){}
  return MEMFILES[id]||null;
}
async function fileDel(id){
  try{ if(window.storage)await window.storage.delete(FILEPREF+id); }catch(e){}
  delete MEMFILES[id];
}
function baixarDataUrl(nome,dataUrl){
  const a=document.createElement('a'); a.href=dataUrl; a.download=nome; a.click();
}
function fmtKB(bytes){ return bytes>=1048576? (bytes/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(bytes/1024))+' KB'; }
