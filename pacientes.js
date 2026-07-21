/* Sereno — Pacientes, ficha, prontuário, documentos e LGPD */
/* =========================== PACIENTES =========================== */
let buscaPac='';
function filtrarPac(v){ buscaPac=v; render(); const i=$('#pacSearch'); i.focus(); i.setSelectionRange(i.value.length,i.value.length); }
function vPacientes(){
  const lista=meusPacientes().filter(p=>p.nome.toLowerCase().includes(buscaPac.toLowerCase()));
  return `
  <div class="row between mb" style="flex-wrap:wrap;gap:10px">
    <input class="search" id="pacSearch" placeholder="Buscar paciente…" value="${esc(buscaPac)}" oninput="filtrarPac(this.value)">
    <button class="btn btn-primary" onclick="openPacModal()">+ Novo paciente</button>
  </div>
  <div class="card" style="padding:0 18px">
  <table><thead><tr><th>Paciente</th><th>Idade</th><th>Contato</th><th>Profissional</th><th>Última sessão</th><th>LGPD</th><th>Status</th></tr></thead><tbody>
  ${lista.map(p=>{
    const ult=DB.apts.filter(a=>a.pacienteId===p.id&&a.status==='realizada').sort((a,b)=>b.data.localeCompare(a.data))[0];
    return `<tr class="click" onclick="go('paciente',{id:'${p.id}'})">
      <td><b>${esc(p.nome)}</b>${p.responsavel?`<br><span class="muted">Resp.: ${esc(p.responsavel)}</span>`:''}</td>
      <td>${idade(p.nasc)}</td><td>${esc(p.tel)}</td><td>${esc(nomeCurto(uById(p.profissionalId).name))}</td>
      <td class="num">${ult?fmtD(ult.data):'—'}</td>
      <td>${p.consentimentoLGPD?'<span class="pill p-sage">Consentiu</span>':'<span class="pill p-red">Pendente</span>'}</td>
      <td><span class="pill ${p.status==='ativo'?'p-blue':'p-gray'}">${p.status==='ativo'?'Ativo':'Arquivado'}</span></td></tr>`}).join('')||'<tr><td colspan="7"><div class="empty"><b>Nenhum paciente encontrado.</b></div></td></tr>'}
  </tbody></table></div>`;
}
function openPacModal(id){
  const p=id?pById(id):null;
  openModal(`
  <h3>${p?'Editar cadastro':'Novo paciente'}</h3>
  <div class="field"><label>Nome completo</label><input id="pcNome" value="${p?esc(p.nome):''}"></div>
  <div class="f2">
    <div class="field"><label>Nascimento</label><input id="pcNasc" type="date" value="${p?p.nasc:''}"></div>
    <div class="field"><label>CPF</label><input id="pcCpf" value="${p?esc(p.cpf):''}" placeholder="000.000.000-00"></div>
    <div class="field"><label>Telefone / WhatsApp</label><input id="pcTel" value="${p?esc(p.tel):''}"></div>
    <div class="field"><label>E-mail</label><input id="pcEmail" value="${p?esc(p.email):''}"></div>
    <div class="field"><label>Profissional responsável</label><select id="pcProf">${DB.users.filter(u=>u.role!=='secretaria').map(u=>`<option value="${u.id}" ${(p?p.profissionalId:session.id)===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Valor da sessão (R$)</label><input id="pcVal" type="number" value="${p?p.valorSessao:180}"></div>
  </div>
  <div class="field"><label>Responsável legal (se menor de idade)</label><input id="pcResp" value="${p?esc(p.responsavel):''}"></div>
  <div class="field"><label>Queixa inicial / motivo do encaminhamento</label><textarea id="pcQueixa">${p?esc(p.queixa):''}</textarea></div>
  <div class="field"><label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:.85rem">
    <input type="checkbox" id="pcLgpd" ${!p||p.consentimentoLGPD?'checked':''} style="width:auto">
    Titular (ou responsável) consentiu com o tratamento de dados — Termo LGPD assinado</label></div>
  <div class="modal-actions">
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="savePac('${p?p.id:''}')">Salvar</button>
  </div>`);
}
function savePac(id){
  const dados={nome:$('#pcNome').value.trim(),nasc:$('#pcNasc').value,cpf:$('#pcCpf').value,tel:$('#pcTel').value,
    email:$('#pcEmail').value,profissionalId:$('#pcProf').value,valorSessao:+$('#pcVal').value||0,
    responsavel:$('#pcResp').value,queixa:$('#pcQueixa').value,consentimentoLGPD:$('#pcLgpd').checked};
  if(!dados.nome)return toast('Informe o nome do paciente.');
  if(dados.consentimentoLGPD&&!(id&&pById(id).consentimentoLGPD))dados.consentimentoData=todayISO();
  if(id){ Object.assign(pById(id),dados); audit('paciente',`Cadastro editado — ${dados.nome}`); }
  else { DB.pacientes.push({id:uid(),status:'ativo',convenio:'Particular',endereco:'',criadoEm:Date.now(),...dados}); audit('paciente',`Paciente cadastrado — ${dados.nome}`); }
  persist(); closeModal(); render(); toast('Cadastro salvo.');
}

/* ---------- Ficha do paciente ---------- */
function vPaciente(id,tab){
  const p=pById(id); if(!p)return '<div class="empty">Paciente não encontrado.</div>';
  const tabs=[['dados','Dados'],['prontuario','Prontuário'],['docs','Documentos'],['fin','Financeiro'],['lgpd','LGPD']];
  const podePront=can('prontuario');
  return `
  <div class="row between mb" style="flex-wrap:wrap;gap:10px">
    <div class="row"><button class="btn btn-ghost btn-sm" onclick="go('pacientes')">← Pacientes</button>
      <h2 style="font-family:var(--font-display);font-size:1.35rem">${esc(p.nome)}</h2>
      <span class="pill ${p.status==='ativo'?'p-blue':'p-gray'}">${p.status==='ativo'?'Ativo':'Arquivado'}</span></div>
    <div class="row">
      <button class="btn btn-ghost btn-sm" onclick="openPacModal('${p.id}')">Editar cadastro</button>
      <button class="btn btn-primary btn-sm" onclick="openAptModal(null,'${todayISO()}','09:00','${p.id}')">Agendar</button></div>
  </div>
  <div class="tabs">${tabs.filter(([t])=>t!=='prontuario'||podePront).map(([t,l])=>`<button class="${tab===t?'on':''}" onclick="go('paciente',{id:'${p.id}',tab:'${t}'})">${l}</button>`).join('')}</div>
  ${tab==='dados'?tabDados(p): tab==='prontuario'?tabProntuario(p): tab==='docs'?tabDocs(p): tab==='fin'?tabFin(p): tabLGPD(p)}`;
}
function tabDados(p){
  const apts=DB.apts.filter(a=>a.pacienteId===p.id);
  const feitas=apts.filter(a=>a.status==='realizada').length, faltas=apts.filter(a=>a.status==='faltou').length;
  return `<div class="grid g2">
    <div class="card"><h3>Identificação</h3>
      <table><tbody>
      <tr><td class="muted">Nascimento</td><td>${p.nasc?fmtD(p.nasc):'—'} (${idade(p.nasc)})</td></tr>
      <tr><td class="muted">CPF</td><td>${esc(p.cpf)||'—'}</td></tr>
      <tr><td class="muted">Telefone</td><td>${esc(p.tel)||'—'}</td></tr>
      <tr><td class="muted">E-mail</td><td>${esc(p.email)||'—'}</td></tr>
      <tr><td class="muted">Responsável</td><td>${esc(p.responsavel)||'—'}</td></tr>
      <tr><td class="muted">Profissional</td><td>${esc(uById(p.profissionalId).name)}</td></tr>
      <tr><td class="muted">Valor da sessão</td><td class="num">${BRL(p.valorSessao)}</td></tr>
      </tbody></table></div>
    <div class="card"><h3>Resumo clínico-administrativo</h3>
      <p style="font-size:.92rem"><b>Queixa inicial:</b> ${esc(p.queixa)||'—'}</p>
      <div class="row mt" style="gap:22px">
        <div class="kpi"><div class="num">${feitas}</div><div class="lbl">sessões realizadas</div></div>
        <div class="kpi"><div class="num">${faltas}</div><div class="lbl">faltas</div></div>
      </div>
      <button class="btn btn-ghost btn-sm mt" onclick="p_arquivar('${p.id}')">${p.status==='ativo'?'Arquivar paciente':'Reativar paciente'}</button>
    </div></div>`;
}
function p_arquivar(id){ const p=pById(id); p.status=p.status==='ativo'?'arquivado':'ativo'; audit('paciente',`Paciente ${p.status==='ativo'?'reativado':'arquivado'} — ${p.nome}`); persist(); render(); }

function tabProntuario(p){
  if(!can('prontuario'))return '<div class="empty"><b>Acesso restrito.</b>Prontuários são visíveis apenas para psicólogos, conforme sigilo profissional.</div>';
  audit('prontuario',`Prontuário de ${p.nome} acessado`);
  const recs=DB.recs.filter(r=>r.pacienteId===p.id).sort((a,b)=>b.data.localeCompare(a.data));
  return `
  <div class="card mb"><h3>Nova evolução</h3>
    <div class="field"><textarea id="evTexto" placeholder="Registro da sessão: conteúdos trabalhados, evolução observada, combinados…"></textarea></div>
    <div class="row between"><span class="muted">Registro conforme Resolução CFP nº 11/2018. Após assinar, o texto fica travado e auditável.</span>
      <button class="btn btn-primary btn-sm" onclick="addEvolucao('${p.id}')">Salvar evolução</button></div></div>
  <div class="thread">
    ${recs.map(r=>`
    <div class="session ${r.locked?'locked':''}"><div class="s-card">
      <div class="s-head"><b>${fmtD(r.data)}</b>
        <span>${r.locked?'<span class="pill p-sage">Assinada</span>':`<span class="pill p-ocre">Rascunho</span>
          <button class="btn btn-ghost btn-sm" onclick="assinarEvolucao('${r.id}')">Assinar e travar</button>
          <button class="btn btn-ghost btn-sm" onclick="editarEvolucao('${r.id}')">Editar</button>`}</span></div>
      <div class="s-body">${esc(r.texto)}</div>
      ${r.sig?`<div class="sig">Assinado eletronicamente por ${esc(r.sig.por)} em ${fmtDT(r.sig.em)} · SHA-256: ${r.sig.hash}</div>`:''}
    </div></div>`).join('')||'<div class="empty"><b>Nenhuma evolução registrada.</b>A primeira sessão aparecerá aqui.</div>'}
  </div>`;
}
function addEvolucao(pid){
  const t=$('#evTexto').value.trim(); if(!t)return toast('Escreva o registro da sessão.');
  DB.recs.push({id:uid(),pacienteId:pid,data:todayISO(),autorId:session.id,texto:t,locked:false,sig:null});
  audit('prontuario',`Evolução criada — ${pById(pid).nome}`);
  persist(); render(); toast('Evolução salva como rascunho.');
}
function editarEvolucao(id){
  const r=DB.recs.find(x=>x.id===id); if(r.locked)return;
  openModal(`<h3>Editar evolução — ${fmtD(r.data)}</h3>
    <div class="field"><textarea id="evEdit" style="min-height:160px">${esc(r.texto)}</textarea></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="(function(){const r=DB.recs.find(x=>x.id==='${id}');r.texto=$('#evEdit').value;audit('prontuario','Evolução editada (rascunho)');persist();closeModal();render()})()">Salvar</button></div>`);
}
async function assinarEvolucao(id){
  const r=DB.recs.find(x=>x.id===id);
  let hash='';
  try{ const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.texto+session.id+Date.now()));
    hash=[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24)+'…'; }
  catch(e){ hash='hash-indisponível'; }
  r.locked=true; r.sig={por:session.name+(session.crp?` (${session.crp})`:''),em:Date.now(),hash};
  audit('prontuario',`Evolução assinada e travada — ${pById(r.pacienteId).nome}`);
  persist(); render(); toast('Evolução assinada. O registro está travado.');
}

/* ---------- Documentos / LGPD / Financeiro do paciente ---------- */
function tabDocs(p){
  const docs=DB.docs.filter(d=>d.pacienteId===p.id).sort((a,b)=>b.data.localeCompare(a.data));
  return `
  <div class="row between mb"><span class="muted">Laudos, contratos, encaminhamentos e anexos do paciente.</span>
    <button class="btn btn-primary btn-sm" onclick="addDocModal('${p.id}')">+ Adicionar documento</button></div>
  <div class="card" style="padding:0 18px"><table>
    <thead><tr><th>Documento</th><th>Tipo</th><th>Data</th><th>Autor</th><th>Assinatura</th><th></th></tr></thead><tbody>
    ${docs.map(d=>`<tr><td><b>${esc(d.nome)}</b>${d.temArquivo?`<br><span class="muted">${esc(d.mime||'arquivo')} · ${fmtKB(d.tamanho||0)}</span>`:''}</td><td><span class="pill p-violet">${esc(d.tipo)}</span></td>
      <td class="num">${fmtD(d.data)}</td><td>${esc(d.autor)}</td>
      <td>${d.assinado?'<span class="pill p-sage">Assinado</span>':`<button class="btn btn-ghost btn-sm" onclick="(function(){const d=DB.docs.find(x=>x.id==='${d.id}');d.assinado=true;audit('documento','Documento assinado: '+d.nome);persist();render();toast('Documento assinado eletronicamente.')})()">Assinar</button>`}</td>
      <td style="text-align:right">${d.temArquivo?`<button class="btn btn-ghost btn-sm" onclick="baixarDoc('${d.id}')">Baixar</button>`:''}<button class="btn btn-ghost btn-sm" onclick="removerDoc('${d.id}')">Remover</button></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty"><b>Nenhum documento anexado.</b></div></td></tr>'}
  </tbody></table></div>`;
}
function addDocModal(pid){
  openModal(`<h3>Adicionar documento</h3>
  <div class="field"><label for="dcFile">Anexar arquivo (PDF, imagem, DOC…)</label>
    <input id="dcFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt" onchange="if(this.files[0]&&!document.getElementById('dcNome').value)document.getElementById('dcNome').value=this.files[0].name">
    <p class="muted" style="margin-top:5px;font-size:.75rem">Limite de 2,5 MB por arquivo nesta versão local. Em produção, o upload vai para armazenamento criptografado (S3/GCS) com URL assinada e sem esse limite.</p></div>
  <div class="field"><label for="dcNome">Nome do documento</label><input id="dcNome" placeholder="Ex.: Laudo psicológico — jul/2026.pdf"></div>
  <div class="field"><label for="dcTipo">Tipo</label><select id="dcTipo">${['Laudo','Contrato','Encaminhamento','Declaração','Anexo'].map(t=>`<option>${t}</option>`).join('')}</select></div>
  <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn btn-primary" onclick="salvarDoc('${pid}')">Adicionar</button></div>`);
}
async function salvarDoc(pid){
  const nome=$('#dcNome').value.trim();
  const file=$('#dcFile').files[0];
  if(!nome&&!file)return toast('Anexe um arquivo ou dê um nome ao documento.');
  const doc={id:uid(),pacienteId:pid,nome:nome||file.name,tipo:$('#dcTipo').value,data:todayISO(),autor:session.name,assinado:false,temArquivo:false};
  if(file){
    if(file.size>2.5*1024*1024)return toast('Arquivo acima de 2,5 MB — reduza o tamanho ou registre apenas os metadados.');
    const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    const ok=await fileSave(doc.id,dataUrl);
    doc.temArquivo=true; doc.mime=file.type||'arquivo'; doc.tamanho=file.size;
    if(!ok)toast('Aviso: sem armazenamento disponível, o anexo vale só para esta sessão.');
  }
  DB.docs.push(doc);
  audit('documento',`Documento adicionado: ${doc.nome}${doc.temArquivo?' (com anexo)':''} — ${pById(pid).nome}`);
  persist(); closeModal(); render(); toast('Documento registrado.');
}
async function baixarDoc(id){
  const d=DB.docs.find(x=>x.id===id); if(!d)return;
  const dataUrl=await fileGet(id);
  if(!dataUrl)return toast('Anexo não encontrado no armazenamento.');
  baixarDataUrl(d.nome,dataUrl);
  audit('documento',`Anexo baixado: ${d.nome}`);
}
function removerDoc(id){
  const d=DB.docs.find(x=>x.id===id); if(!d)return;
  DB.docs=DB.docs.filter(x=>x.id!==id);
  if(d.temArquivo)fileDel(id);
  audit('documento',`Documento removido: ${d.nome}`);
  persist(); render();
}
function tabFin(p){
  const ts=DB.trans.filter(t=>t.pacienteId===p.id).sort((a,b)=>b.data.localeCompare(a.data));
  const pend=DB.apts.filter(a=>a.pacienteId===p.id&&a.status==='realizada'&&!a.pago);
  const total=ts.reduce((s,t)=>s+t.valor,0);
  return `
  ${pend.length?`<div class="card mb" style="border-color:var(--ocre);background:var(--ocre-tint)"><b>${pend.length} sessão(ões) realizadas sem pagamento registrado.</b>
    ${pend.map(a=>`<div class="row between mt"><span>${fmtD(a.data)} às ${a.hora} — ${BRL(a.valor)}</span>
    <button class="btn btn-primary btn-sm" onclick="registrarPagamento('${a.id}')">Registrar pagamento</button></div>`).join('')}</div>`:''}
  <div class="card" style="padding:0 18px"><table>
    <thead><tr><th>Data</th><th>Descrição</th><th>Forma</th><th class="num">Valor</th><th></th></tr></thead><tbody>
    ${ts.map(t=>`<tr><td class="num">${fmtD(t.data)}</td><td>${esc(t.desc)}</td><td>${esc(t.forma)}</td>
      <td class="num">${BRL(t.valor)}</td>
      <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="emitirRecibo('${t.id}')">Recibo</button></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty"><b>Nenhum recebimento.</b></div></td></tr>'}
    </tbody>${ts.length?`<tfoot><tr><td colspan="3"><b>Total recebido</b></td><td class="num"><b>${BRL(total)}</b></td><td></td></tr></tfoot>`:''}</table></div>`;
}
function tabLGPD(p){
  return `<div class="grid g2">
  <div class="card"><h3>Consentimento</h3>
    <p style="font-size:.92rem">${p.consentimentoLGPD?`Consentimento registrado em <b>${fmtD(p.consentimentoData||todayISO())}</b>. Base legal: consentimento do titular (art. 7º, I) e tutela da saúde (art. 11, II, "f").`:'<b>Consentimento pendente.</b> Regularize no cadastro do paciente.'}</p>
    <p class="muted mt">Dados clínicos são tratados como dados sensíveis (art. 5º, II, LGPD) com acesso restrito por perfil e registro de auditoria.</p></div>
  <div class="card"><h3>Direitos do titular</h3>
    <p class="muted">Atenda solicitações do titular diretamente por aqui:</p>
    <div class="row mt" style="flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="exportarDadosPaciente('${p.id}')">Exportar dados (portabilidade)</button>
      <button class="btn btn-ghost btn-sm" onclick="anonimizarPaciente('${p.id}')">Anonimizar cadastro</button>
    </div>
    <p class="muted mt">Obs.: prontuários possuem guarda mínima de 5 anos (Res. CFP nº 01/2009); a anonimização preserva registros clínicos sem identificação civil.</p></div>
  <div class="card" style="grid-column:1/-1"><h3>Acessos recentes a este paciente (auditoria)</h3>
    ${DB.audit.filter(l=>l.detail.includes(p.nome)).slice(0,8).map(l=>`<div class="audit-line">${fmtDT(l.ts)} · ${esc(l.user)} · ${esc(l.detail)}</div>`).join('')||'<p class="muted">Sem registros ainda.</p>'}</div></div>`;
}
function exportarDadosPaciente(id){
  const p=pById(id);
  const pacote={cadastro:p,consultas:DB.apts.filter(a=>a.pacienteId===id),
    documentos:DB.docs.filter(d=>d.pacienteId===id),financeiro:DB.trans.filter(t=>t.pacienteId===id),
    prontuario:can('prontuario')?DB.recs.filter(r=>r.pacienteId===id):'[restrito ao psicólogo responsável]'};
  download(`dados-${p.nome.toLowerCase().replace(/\s+/g,'-')}.json`,JSON.stringify(pacote,null,2),'application/json');
  audit('lgpd',`Exportação de dados (portabilidade) — ${p.nome}`); toast('Arquivo de dados gerado.');
}
function anonimizarPaciente(id){
  const p=pById(id);
  openModal(`<h3>Anonimizar cadastro</h3>
  <p>Os dados civis de <b>${esc(p.nome)}</b> serão substituídos por identificador anônimo. Os registros clínicos permanecem para cumprimento da guarda legal. <b>Esta ação não pode ser desfeita.</b></p>
  <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn btn-danger" onclick="(function(){const p=pById('${id}');audit('lgpd','Anonimização executada — '+p.nome);Object.assign(p,{nome:'Titular anonimizado '+p.id.slice(-4),cpf:'',tel:'',email:'',endereco:'',responsavel:'',status:'arquivado'});persist();closeModal();go('pacientes');toast('Cadastro anonimizado.')})()">Anonimizar</button></div>`);
}

