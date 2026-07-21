/* Sereno — Configurações, usuários, auditoria e backup */
/* =========================== CONFIGURAÇÕES =========================== */
function vConfig(tab){
  const tabs=[['clinica','Consultório'],['usuarios','Usuários e permissões'],['auditoria','Auditoria'],['backup','Backup e LGPD']];
  return `<div class="tabs">${tabs.map(([t,l])=>`<button class="${tab===t?'on':''}" onclick="go('config',{tab:'${t}'})">${l}</button>`).join('')}</div>
  ${tab==='clinica'?cfgClinica():tab==='usuarios'?cfgUsuarios():tab==='auditoria'?cfgAuditoria():cfgBackup()}`;
}
function cfgClinica(){
  const s=DB.settings;
  return `<div class="card" style="max-width:560px">
    <div class="field"><label>Nome do consultório</label><input id="cfNome" value="${esc(s.nomeClinica)}"></div>
    <div class="f2">
      <div class="field"><label>CNPJ</label><input id="cfCnpj" value="${esc(s.cnpj)}"></div>
      <div class="field"><label>Lembrete automático (horas antes)</label><input id="cfHoras" type="number" value="${s.lembreteHoras}"></div>
    </div>
    <div class="field"><label>Endereço</label><input id="cfEnd" value="${esc(s.endereco)}"></div>
    <div class="field"><label>Código de cadastro da equipe</label><input id="cfCodigo" value="${esc(s.codigoCadastro||'')}">
      <p class="muted" style="margin-top:5px;font-size:.75rem">Exigido na tela inicial para criar novas contas de psicólogo(a) ou secretária(o).</p></div>
    <div class="field"><label>Canal padrão de confirmação</label><select id="cfCanal">
      <option value="whatsapp" ${s.canalPadrao==='whatsapp'?'selected':''}>WhatsApp</option>
      <option value="email" ${s.canalPadrao==='email'?'selected':''}>E-mail</option></select></div>
    <button class="btn btn-primary" onclick="(function(){Object.assign(DB.settings,{nomeClinica:$('#cfNome').value,cnpj:$('#cfCnpj').value,endereco:$('#cfEnd').value,lembreteHoras:+$('#cfHoras').value||24,canalPadrao:$('#cfCanal').value,codigoCadastro:$('#cfCodigo').value.trim()});audit('config','Dados do consultório atualizados');persist();toast('Configurações salvas.')})()">Salvar</button>
  </div>`;
}
function cfgUsuarios(){
  return `<div class="row between mb"><span class="muted">Perfis definem o que cada pessoa vê — secretárias não acessam prontuários.</span>
    <button class="btn btn-primary btn-sm" onclick="userModal()">+ Novo usuário</button></div>
  <div class="card" style="padding:0 18px"><table>
  <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Registro</th><th></th></tr></thead><tbody>
  ${DB.users.map(u=>`<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td>
    <td><span class="pill ${u.role==='admin'?'p-violet':u.role==='psicologo'?'p-sage':'p-ocre'}">${ROLES[u.role].label}</span></td>
    <td>${esc(u.crp)||'—'}</td>
    <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="userModal('${u.id}')">Editar</button></td></tr>`).join('')}
  </tbody></table></div>
  <div class="card mt"><h3>O que cada perfil acessa</h3><table>
    <thead><tr><th>Recurso</th><th>Admin</th><th>Psicólogo(a)</th><th>Secretária(o)</th></tr></thead><tbody>
    ${[['Agenda e pacientes','✓','✓ (apenas os seus)','✓'],['Prontuário eletrônico','✓','✓ (apenas os seus)','—'],['Financeiro e recibos','✓','✓','✓'],['Relatórios','✓','✓','—'],['Usuários, auditoria e backup','✓','—','—']].map(r=>`<tr>${r.map((c,i)=>`<td ${i?'style="text-align:center"':''}>${c}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}
function userModal(id){
  const u=id?uById(id):null;
  openModal(`<h3>${u?'Editar usuário':'Novo usuário'}</h3>
  <div class="field"><label>Nome</label><input id="usNome" value="${u?esc(u.name):''}"></div>
  <div class="f2"><div class="field"><label>E-mail</label><input id="usEmail" value="${u?esc(u.email):''}"></div>
  <div class="field"><label>CRP (se psicólogo)</label><input id="usCrp" value="${u?esc(u.crp):''}"></div></div>
  <div class="field"><label>Perfil</label><select id="usRole">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${u&&u.role===k?'selected':''}>${v.label}</option>`).join('')}</select></div>
  <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn btn-primary" onclick="(function(){const d={name:$('#usNome').value.trim(),email:$('#usEmail').value.trim(),crp:$('#usCrp').value,role:$('#usRole').value};if(!d.name||!d.email)return toast('Preencha nome e e-mail.');if('${id||''}'){Object.assign(uById('${id}'),d);audit('usuarios','Usuário editado: '+d.name)}else{DB.users.push({id:uid(),cor:'sage',...d});audit('usuarios','Usuário criado: '+d.name)}persist();closeModal();render();toast('Usuário salvo.')})()">Salvar</button></div>`);
}
function cfgAuditoria(){
  return `<div class="card"><h3>Trilha de auditoria — quem fez o quê</h3>
  <p class="muted mb">Requisito da LGPD (art. 46/49): todo acesso a dados sensíveis fica registrado. Em produção, os registros são imutáveis (append-only).</p>
  ${DB.audit.slice(0,60).map(l=>`<div class="audit-line">${fmtDT(l.ts)} · <b>${esc(l.user)}</b> · [${esc(l.action)}] ${esc(l.detail)}</div>`).join('')||'<p class="muted">Sem eventos.</p>'}</div>`;
}
function cfgBackup(){
  return `<div class="grid g2">
  <div class="card"><h3>Backup dos dados</h3>
    <p class="muted">Os dados são gravados automaticamente a cada alteração. Exporte um arquivo completo por segurança e restaure quando precisar. Em produção: backup automático diário criptografado, com retenção de 30 dias e teste de restauração mensal.</p>
    <div class="row mt" style="flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="exportBackup()">Baixar backup (.json)</button>
      <button class="btn btn-ghost btn-sm" onclick="$('#importFile').click()">Restaurar backup</button>
      <button class="btn btn-danger btn-sm" onclick="apagarTudo()">Apagar todos os dados</button>
    </div></div>
  <div class="card"><h3>Conformidade LGPD — checklist</h3>
    ${['Consentimento registrado por paciente','Perfis de acesso com privilégio mínimo','Trilha de auditoria de acessos','Exportação de dados do titular (portabilidade)','Anonimização sob demanda','Criptografia em repouso e em trânsito (produção)','Prazo de guarda de prontuário respeitado (CFP)'].map(i=>`<div class="row" style="margin-bottom:7px"><span class="pill p-sage">✓</span><span style="font-size:.88rem">${i}</span></div>`).join('')}</div></div>`;
}
async function exportBackup(){
  const pacote=JSON.parse(JSON.stringify(DB));
  pacote.__arquivos={};
  try{
    if(window.storage){
      const l=await window.storage.list(FILEPREF);
      for(const k of (l&&l.keys)||[]){
        try{ const r=await window.storage.get(k); if(r&&r.value)pacote.__arquivos[k.slice(FILEPREF.length)]=r.value; }catch(e){}
      }
    }
  }catch(e){}
  Object.assign(pacote.__arquivos,MEMFILES);
  download(`backup-sereno-${todayISO()}.json`,JSON.stringify(pacote),'application/json');
  audit('backup','Backup completo exportado (dados + anexos)'); toast('Backup gerado com anexos incluídos.');
}
function importBackup(input){
  const f=input.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=async ()=>{ try{ const d=JSON.parse(r.result);
      if(!d.pacientes||!d.apts)throw new Error('estrutura inválida');
      const arqs=d.__arquivos||{}; delete d.__arquivos;
      DB=d; persist();
      for(const [id,dataUrl] of Object.entries(arqs)){ await fileSave(id,dataUrl); }
      audit('backup','Backup restaurado a partir de arquivo'); render(); toast('Backup restaurado (dados e anexos).'); }
    catch(e){ toast('Arquivo inválido — não foi possível restaurar.'); } };
  r.readAsText(f); input.value='';
}
function apagarTudo(){
  openModal(`<h3>Apagar todos os dados</h3>
  <p>Pacientes, consultas, prontuários, documentos, financeiro e usuários serão <b>removidos definitivamente</b>. Recomendamos baixar um backup antes. Deseja continuar?</p>
  <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn btn-danger" onclick="(async function(){try{if(window.storage){const l=await window.storage.list(FILEPREF);for(const k of (l&&l.keys)||[]){try{await window.storage.delete(k)}catch(e){}}}}catch(e){};for(const k in MEMFILES)delete MEMFILES[k];DB=emptyDB();persist();closeModal();session=null;document.getElementById('app').classList.remove('on');document.getElementById('loginScreen').style.display='grid';renderLogin();toast('Sistema zerado.')})()">Apagar tudo</button></div>`);
}

