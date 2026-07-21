/* Sereno — sessão, navegação, modais e inicialização */
/* ---------- Sessão / navegação ---------- */
function renderLogin(){
  const primeiro=DB.users.length===0;
  const pb=$('#portalLoginBox'); if(pb)pb.style.display='none';
  $('#setupBox').style.display=primeiro?'block':'none';
  $('#loginBox').style.display=primeiro?'none':'block';
  if(!primeiro)authTab('login');
}
function authTab(t){
  $('#tabLogin').classList.toggle('on',t==='login');
  $('#tabCad').classList.toggle('on',t==='cadastro');
  $('#authLogin').style.display=t==='login'?'block':'none';
  $('#authCad').style.display=t==='cadastro'?'block':'none';
  (t==='login'?$('#loginEmail'):$('#cdNome')).focus();
}
function cadastrarConta(){
  const nome=$('#cdNome').value.trim(), email=$('#cdEmail').value.trim().toLowerCase(),
        codigo=$('#cdCodigo').value.trim(), role=$('#cdRole').value;
  if(!nome||!email)return toast('Preencha nome e e-mail.');
  if(!codigo)return toast('Informe o código de cadastro fornecido pelo consultório.');
  if(codigo!==(DB.settings.codigoCadastro||''))return toast('Código de cadastro incorreto. Confirme com o administrador.');
  if(DB.users.some(u=>u.email.toLowerCase()===email))return toast('Já existe uma conta com este e-mail.');
  const u={id:uid(),name:nome,email,crp:$('#cdCrp').value.trim(),role,cor:'sage'};
  DB.users.push(u); persist();
  audit('usuarios',`Conta criada pela tela inicial — ${nome} (${ROLES[role].label})`);
  startSession(u); toast('Conta criada com sucesso!');
}
function criarPrimeiraConta(){
  const nome=$('#stNome').value.trim(), email=$('#stEmail').value.trim(), codigo=$('#stCodigo').value.trim();
  if(!nome||!email)return toast('Informe seu nome e e-mail.');
  if(codigo.length<4)return toast('Defina um código de cadastro com pelo menos 4 caracteres.');
  const u={id:uid(),name:nome,email,crp:$('#stCrp').value.trim(),role:'admin',cor:'sage'};
  DB.users.push(u);
  DB.settings.nomeClinica=$('#stClinica').value.trim()||'Meu Consultório';
  DB.settings.codigoCadastro=codigo;
  persist(); startSession(u);
  toast('Conta criada. Bem-vindo(a) ao Sereno!');
}
function quickLogin(id){ const u=DB.users.find(x=>x.id===id); if(u)startSession(u); }
function doLogin(){
  const em=$('#loginEmail').value.trim().toLowerCase();
  if(!em)return toast('Informe o e-mail cadastrado.');
  const u=DB.users.find(x=>x.email.toLowerCase()===em);
  if(!u)return toast('E-mail não encontrado. Peça acesso a um administrador.');
  startSession(u);
}
function startSession(u){
  session=u; audit('login',`Acesso de ${u.name} (${ROLES[u.role].label})`);
  $('#loginScreen').style.display='none'; $('#app').classList.add('on');
  $('#userName').textContent=u.name; $('#userRole').textContent=ROLES[u.role].label;
  $('#userAvatar').textContent=u.name.split(' ').filter(x=>x[0]===x[0].toUpperCase()).slice(0,2).map(x=>x[0]).join('');
  const h=new Date(); $('#todayLabel').textContent=`${DIAS[h.getDay()]}, ${h.getDate()} ${MESES[h.getMonth()]} ${h.getFullYear()}`;
  buildNav(); go('dashboard');
}
function logout(){ audit('logout',`Saída de ${session.name}`); session=null; $('#app').classList.remove('on'); $('#loginScreen').style.display='grid'; renderLogin(); }
const ICONS={
  dashboard:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  agenda:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  pacientes:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.7c2.2.6 3.6 2.3 4 5.3"/></svg>',
  financeiro:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.8c0 2.6-5 1.6-5 4.2 0 1.1 1 1.9 2.5 1.9s2.5-.7 2.5-1.8"/></svg>',
  relatorios:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
  config:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4L9.4 5.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L9.8 21h4l.8-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/></svg>'
};
function buildNav(){
  const items=[['dashboard','Início'],['agenda','Agenda'],['pacientes','Pacientes'],['financeiro','Financeiro']];
  if(can('relatorios'))items.push(['relatorios','Relatórios']);
  let html=items.map(([v,l])=>`<button data-v="${v}" onclick="go('${v}')">${ICONS[v]}<span>${l}</span></button>`).join('');
  if(can('config'))html+=`<div class="sep">Administração</div><button data-v="config" onclick="go('config')">${ICONS.config}<span>Configurações</span></button>`;
  $('#nav').innerHTML=html;
}
function go(v,params={}){ view=v; viewParams=params; document.querySelectorAll('.nav button').forEach(b=>{const on=b.dataset.v===v||(v==='paciente'&&b.dataset.v==='pacientes');b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}); render(); window.scrollTo(0,0); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); setTimeout(()=>t.classList.remove('on'),2600); }
let _lastFocus=null;
function openModal(html,wide){
  _lastFocus=document.activeElement;
  $('#modalBox').className='modal'+(wide?' wide':'');
  $('#modalBox').innerHTML=html;
  $('#modalBg').classList.add('on');
  const f=$('#modalBox').querySelector('input,select,textarea,button');
  if(f)f.focus();
}
function closeModal(){
  $('#modalBg').classList.remove('on');
  if(_lastFocus&&_lastFocus.focus)_lastFocus.focus();
}

/* ---------- helpers de dados ---------- */
const pById=id=>DB.pacientes.find(p=>p.id===id);
const uById=id=>DB.users.find(u=>u.id===id);
const nomeCurto=n=>n.split(' ').slice(0,2).join(' ');
function meusPacientes(){ return session.role==='psicologo'? DB.pacientes.filter(p=>p.profissionalId===session.id): DB.pacientes; }
function statusPill(s){ const m={agendada:['p-gray','Agendada'],confirmada:['p-sage','Confirmada'],realizada:['p-blue','Realizada'],faltou:['p-ocre','Faltou'],cancelada:['p-red','Cancelada']}; const[c,l]=m[s]; return `<span class="pill ${c}">${l}</span>`; }

/* ---------- Render principal ---------- */
function render(){
  const titles={dashboard:'Início',agenda:'Agenda',pacientes:'Pacientes',paciente:'Ficha do paciente',financeiro:'Financeiro',relatorios:'Relatórios',config:'Configurações'};
  $('#pageTitle').textContent=titles[view]||'Sereno';
  const c=$('#content');
  if(view==='dashboard')c.innerHTML=vDashboard();
  else if(view==='agenda')c.innerHTML=vAgenda();
  else if(view==='pacientes')c.innerHTML=vPacientes();
  else if(view==='paciente')c.innerHTML=vPaciente(viewParams.id,viewParams.tab||'dados');
  else if(view==='financeiro')c.innerHTML=vFinanceiro();
  else if(view==='relatorios')c.innerHTML=vRelatorios();
  else if(view==='config')c.innerHTML=vConfig(viewParams.tab||'clinica');
}


/* ---------- Inicialização ---------- */
(async function(){ await loadPrefs(); applyPrefs(); await loadDB(); renderLogin(); })();
document.addEventListener('keydown',e=>{ if(e.key==='Escape')closeModal(); });
