/* Sereno — Área do paciente: consultas, documentos e recibos (somente leitura)
   O paciente acessa com o e-mail ou telefone cadastrados pelo consultório.
   Por sigilo profissional, o prontuário NUNCA é exibido nesta área. */
"use strict";
let portalPac=null;

function abrirPortal(){
  $('#loginBox').style.display='none';
  $('#setupBox').style.display='none';
  $('#portalLoginBox').style.display='block';
  $('#ptId').focus();
}
function fecharPortalLogin(){
  $('#portalLoginBox').style.display='none';
  renderLogin();
}
function portalEntrar(){
  const q=$('#ptId').value.trim().toLowerCase();
  if(!q)return toast('Informe o e-mail ou telefone cadastrado.');
  const dig=q.replace(/\D/g,'');
  const p=DB.pacientes.find(p=>
    (p.email&&p.email.toLowerCase()===q) ||
    (dig.length>=8&&p.tel&&p.tel.replace(/\D/g,'').endsWith(dig)));
  if(!p)return toast('Cadastro não encontrado. Confirme seus dados com o consultório.');
  portalPac=p;
  audit('portal',`Área do paciente acessada — ${p.nome}`);
  $('#loginScreen').style.display='none';
  $('#portal').classList.add('on');
  renderPortal();
  window.scrollTo(0,0);
}
function portalSair(){
  audit('portal',`Área do paciente encerrada — ${portalPac.nome}`);
  portalPac=null;
  $('#portal').classList.remove('on');
  $('#loginScreen').style.display='grid';
  fecharPortalLogin();
}
function renderPortal(){
  const p=portalPac; const hoje=todayISO();
  $('#portalClinica').textContent=DB.settings.nomeClinica;
  const prox=DB.apts.filter(a=>a.pacienteId===p.id&&a.data>=hoje&&!['cancelada','realizada','faltou'].includes(a.status))
    .sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
  const hist=DB.apts.filter(a=>a.pacienteId===p.id&&a.status==='realizada')
    .sort((a,b)=>b.data.localeCompare(a.data));
  const docs=DB.docs.filter(d=>d.pacienteId===p.id).sort((a,b)=>b.data.localeCompare(a.data));
  const recibos=DB.trans.filter(t=>t.pacienteId===p.id&&t.tipo==='receita').sort((a,b)=>b.data.localeCompare(a.data));
  const prof=uById(p.profissionalId);
  $('#portalBody').innerHTML=`
  <div class="card"><h3>Olá, ${esc(p.nome.split(' ')[0])}</h3>
    <p style="font-size:.92rem">Acompanhamento com <b>${esc(prof?prof.name:'—')}</b>${prof&&prof.crp?` · ${esc(prof.crp)}`:''}. Para reagendar ou tirar dúvidas, fale com o consultório${DB.settings.endereco?`: ${esc(DB.settings.endereco)}`:'.'}</p></div>

  <div class="card"><h3>Próximas consultas</h3>
    ${prox.map(a=>`<div class="portal-apt"><div><b>${fmtD(a.data)} às ${a.hora}</b><br><span class="muted">${esc(a.tipo)} · ${a.dur} min</span></div>${statusPill(a.status)}</div>`).join('')
      ||'<div class="empty"><b>Nenhuma consulta agendada.</b>Entre em contato com o consultório para agendar.</div>'}</div>

  <div class="card"><h3>Histórico de sessões</h3>
    ${hist.length?`<p class="muted mb">${hist.length} sessão(ões) realizadas.</p>`+hist.slice(0,8).map(a=>`<div class="portal-apt"><b>${fmtD(a.data)}</b><span class="muted">${esc(a.tipo)}</span></div>`).join(''):'<div class="empty"><b>Ainda não há sessões realizadas.</b></div>'}</div>

  <div class="card"><h3>Meus documentos</h3>
    ${docs.map(d=>`<div class="portal-apt"><div><b style="font-family:var(--font-body)">${esc(d.nome)}</b><br><span class="muted">${esc(d.tipo)} · ${fmtD(d.data)}</span></div><span class="row">${d.assinado?'<span class="pill p-sage">Assinado</span>':'<span class="pill p-gray">Disponível</span>'}${d.temArquivo?`<button class="btn btn-ghost btn-sm" onclick="portalBaixar('${d.id}')">Baixar</button>`:''}</span></div>`).join('')
      ||'<div class="empty"><b>Nenhum documento disponível.</b></div>'}</div>

  <div class="card"><h3>Pagamentos e recibos</h3>
    ${recibos.map(t=>`<div class="portal-apt"><div><b>${fmtD(t.data)}</b><br><span class="muted">${esc(t.desc)} · ${esc(t.forma)}</span></div>
      <div class="row"><b style="font-family:var(--font-mono)">${BRL(t.valor)}</b>
      <button class="btn btn-ghost btn-sm" onclick="portalRecibo('${t.id}')">Recibo</button></div></div>`).join('')
      ||'<div class="empty"><b>Nenhum pagamento registrado.</b></div>'}</div>

  <p class="muted" style="font-size:.78rem">Seus dados são tratados conforme a LGPD. Para solicitar cópia, correção ou exclusão dos seus dados, fale com o consultório — sua solicitação será registrada e atendida.</p>`;
}
function portalRecibo(tid){
  const prof=uById(portalPac.profissionalId);
  emitirRecibo(tid,{nome:prof?prof.name:DB.settings.nomeClinica,crp:prof?prof.crp:''});
}

async function portalBaixar(id){
  const d=DB.docs.find(x=>x.id===id);
  if(!d||d.pacienteId!==portalPac.id)return;
  const dataUrl=await fileGet(id);
  if(!dataUrl)return toast('Arquivo indisponível — fale com o consultório.');
  baixarDataUrl(d.nome,dataUrl);
  audit('portal',`Paciente baixou o documento: ${d.nome} — ${portalPac.nome}`);
}
