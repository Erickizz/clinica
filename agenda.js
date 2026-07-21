/* Sereno — Agenda semanal, confirmações e exportação .ics */
/* =========================== AGENDA =========================== */
function weekStart(iso){ const d=new Date(iso+'T12:00'); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return isoOf(d); }
function vAgenda(){
  if(!agendaStart)agendaStart=weekStart(todayISO());
  const dias=[...Array(6)].map((_,i)=>addDays(agendaStart,i)); // seg–sáb
  const horas=[...Array(14)].map((_,i)=>7+i); // 07h–20h
  const semana=DB.apts.filter(a=>dias.includes(a.data)&&(session.role!=='psicologo'||a.profissionalId===session.id));
  const head=dias.map(d=>{const dt=new Date(d+'T12:00');
    return `<div class="ag-day ${d===todayISO()?'today':''}">${DIAS[dt.getDay()]}<b>${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}</b></div>`}).join('');
  const rows=horas.map(h=>{
    const hh=`${String(h).padStart(2,'0')}:00`;
    return `<div class="ag-hour">${hh}</div>`+dias.map(d=>{
      const cell=semana.filter(a=>a.data===d&&a.hora===hh).sort((a,b)=>a.hora.localeCompare(b.hora));
      return `<div class="ag-cell" onclick="if(event.target===this||event.target.classList.contains('add'))openAptModal(null,'${d}','${hh}')">
        <button class="add" aria-label="Agendar ${d} ${hh}">+</button>
        ${cell.map(a=>{const p=pById(a.pacienteId);return `<button class="apt ${a.status}" onclick="aptModal('${a.id}')"><b>${esc(nomeCurto(p.nome))}</b><small>${a.hora} · ${esc(nomeCurto(uById(a.profissionalId).name))}</small></button>`}).join('')}
      </div>`}).join('');
  }).join('');
  const range=`${fmtD(dias[0]).slice(0,5)} – ${fmtD(dias[5])}`;
  return `
  <div class="agenda-head">
    <div class="row">
      <button class="btn btn-ghost btn-sm" onclick="agendaStart=addDays(agendaStart,-7);render()">←</button>
      <b style="font-family:var(--font-mono);font-size:.95rem">${range}</b>
      <button class="btn btn-ghost btn-sm" onclick="agendaStart=addDays(agendaStart,7);render()">→</button>
      <button class="btn btn-ghost btn-sm" onclick="agendaStart=weekStart(todayISO());render()">Hoje</button>
    </div>
    <div class="row">
      <button class="btn btn-ghost btn-sm" onclick="exportICS()">Exportar p/ Google Agenda (.ics)</button>
      <button class="btn btn-primary btn-sm" onclick="openAptModal()">+ Nova consulta</button>
    </div>
  </div>
  <div class="agenda-grid"><div class="ag-corner"></div>${head}${rows}</div>
  <div class="legend">
    <span><i class="lg-agendada"></i>Agendada</span><span><i class="lg-confirmada"></i>Confirmada</span>
    <span><i class="lg-realizada"></i>Realizada</span><span><i class="lg-faltou"></i>Faltou</span>
    <span><i class="lg-cancelada"></i>Cancelada</span>
  </div>`;
}
function openAptModal(aptId,data,hora,pacId){
  if(DB.pacientes.length===0){ toast('Cadastre um paciente antes de agendar.'); go('pacientes'); return; }
  const a=aptId? DB.apts.find(x=>x.id===aptId):null;
  const sel=a?a.pacienteId:(pacId||'');
  const ps=meusPacientes().filter(p=>p.status==='ativo'||p.id===sel);
  openModal(`
  <h3>${a?'Editar consulta':'Nova consulta'}</h3>
  <div class="field"><label>Paciente</label><select id="apPac">${ps.map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select></div>
  <div class="f2">
    <div class="field"><label>Data</label><input id="apData" type="date" value="${a?a.data:(data||todayISO())}"></div>
    <div class="field"><label>Hora</label><input id="apHora" type="time" value="${a?a.hora:(hora||'09:00')}"></div>
    <div class="field"><label>Duração (min)</label><input id="apDur" type="number" value="${a?a.dur:50}"></div>
    <div class="field"><label>Valor (R$)</label><input id="apVal" type="number" value="${a?a.valor:180}"></div>
    <div class="field"><label>Profissional</label><select id="apProf">${DB.users.filter(u=>u.role!=='secretaria').map(u=>`<option value="${u.id}" ${(a?a.profissionalId:session.id)===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Tipo</label><select id="apTipo">${['Sessão individual','Sessão de casal','Avaliação psicológica','Devolutiva','Sessão on-line'].map(t=>`<option ${a&&a.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div>
  </div>
  <div class="field"><label>Observações internas</label><textarea id="apObs">${a?esc(a.obs):''}</textarea></div>
  <div class="modal-actions">
    ${a?`<button class="btn btn-ghost" onclick="setAptStatus('${a.id}','cancelada');closeModal()">Cancelar consulta</button>`:''}
    <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
    <button class="btn btn-primary" onclick="saveApt('${a?a.id:''}')">${a?'Salvar alterações':'Agendar'}</button>
  </div>`);
}
function saveApt(id){
  const dados={pacienteId:$('#apPac').value,data:$('#apData').value,hora:$('#apHora').value,dur:+$('#apDur').value||50,
    valor:+$('#apVal').value||0,profissionalId:$('#apProf').value,tipo:$('#apTipo').value,obs:$('#apObs').value};
  if(!dados.data||!dados.hora)return toast('Informe data e hora.');
  const conflito=DB.apts.find(a=>a.id!==id&&a.data===dados.data&&a.hora===dados.hora&&a.profissionalId===dados.profissionalId&&!['cancelada','faltou'].includes(a.status));
  if(conflito)return toast('Conflito: o profissional já tem consulta neste horário.');
  if(id){ Object.assign(DB.apts.find(a=>a.id===id),dados); audit('agenda',`Consulta editada — ${pById(dados.pacienteId).nome} ${fmtD(dados.data)} ${dados.hora}`); }
  else { DB.apts.push({id:uid(),status:'agendada',pago:false,...dados}); audit('agenda',`Consulta criada — ${pById(dados.pacienteId).nome} ${fmtD(dados.data)} ${dados.hora}`); }
  persist(); closeModal(); render(); toast('Consulta salva.');
}
function aptModal(id){
  const a=DB.apts.find(x=>x.id===id); const p=pById(a.pacienteId);
  openModal(`
  <h3>${esc(p.nome)}</h3>
  <p class="muted" style="margin-top:-8px">${fmtD(a.data)} às ${a.hora} · ${a.dur} min · ${esc(a.tipo)} · ${esc(uById(a.profissionalId).name)}</p>
  <p class="mt">${statusPill(a.status)} &nbsp; <span class="pill ${a.pago?'p-sage':'p-ocre'}">${a.pago?'Pago':'Pagamento pendente'}</span> &nbsp; <b style="font-family:var(--font-mono)">${BRL(a.valor)}</b></p>
  ${a.obs?`<p class="mt muted">Obs.: ${esc(a.obs)}</p>`:''}
  <div class="modal-actions" style="flex-wrap:wrap;justify-content:flex-start">
    ${a.status==='agendada'?`<button class="btn btn-primary btn-sm" onclick="confirmarModal('${a.id}')">Enviar confirmação</button>`:''}
    ${['agendada','confirmada'].includes(a.status)?`<button class="btn btn-ghost btn-sm" onclick="setAptStatus('${a.id}','realizada')">Realizada</button>
      <button class="btn btn-ghost btn-sm" onclick="setAptStatus('${a.id}','faltou')">Faltou</button>`:''}
    ${a.status==='realizada'&&!a.pago?`<button class="btn btn-ghost btn-sm" onclick="registrarPagamento('${a.id}')">Registrar pagamento</button>`:''}
    ${a.status==='realizada'&&a.pago?`<button class="btn btn-ghost btn-sm" onclick="reciboDaConsulta('${a.id}')">Emitir recibo</button>`:''}
    <button class="btn btn-ghost btn-sm" onclick="openAptModal('${a.id}')">Editar</button>
    ${can('prontuario')?`<button class="btn btn-ghost btn-sm" onclick="closeModal();go('paciente',{id:'${p.id}',tab:'prontuario'})">Abrir prontuário</button>`:''}
    <button class="btn btn-ghost btn-sm" onclick="closeModal()">Fechar</button>
  </div>`);
}
function setAptStatus(id,st){
  const a=DB.apts.find(x=>x.id===id); a.status=st;
  audit('agenda',`Consulta de ${pById(a.pacienteId).nome} em ${fmtD(a.data)} marcada como "${st}"`);
  persist(); closeModal(); render(); toast('Status atualizado.');
}
function confirmarModal(id){
  const a=DB.apts.find(x=>x.id===id); const p=pById(a.pacienteId);
  const s=DB.settings; const prof=uById(a.profissionalId);
  const msg=`Olá, ${p.nome.split(' ')[0]}! 🌿\nAqui é do ${s.nomeClinica}.\n\nLembrando sua sessão com ${prof.name} em ${fmtD(a.data)} às ${a.hora}.\n\nResponda:\n1 — Confirmar\n2 — Reagendar\n\nEndereço: ${s.endereco}`;
  openModal(`
  <h3>Confirmação automática</h3>
  <p class="muted">Em produção, esta mensagem é enviada automaticamente ${s.lembreteHoras}h antes pela API oficial do WhatsApp Business (ou e-mail). Nesta versão local, o envio é simulado.</p>
  <div class="wa-preview">${esc(msg)}</div>
  <p class="muted">Destino: ${esc(p.tel||p.email||'—')}</p>
  <div class="modal-actions">
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="enviarConfirmacao('${id}')">Enviar agora</button>
  </div>`);
}
function enviarConfirmacao(id){
  const a=DB.apts.find(x=>x.id===id); a.status='confirmada';
  audit('mensagem',`Confirmação enviada a ${pById(a.pacienteId).nome} (${fmtD(a.data)} ${a.hora})`);
  persist(); closeModal(); render(); toast('Mensagem enviada — consulta confirmada.');
}
function registrarPagamento(id){
  const a=DB.apts.find(x=>x.id===id); const p=pById(a.pacienteId);
  a.pago=true;
  DB.trans.push({id:uid(),tipo:'receita',data:todayISO(),desc:`Sessão — ${nomeCurto(p.nome)}`,cat:'Sessões',valor:a.valor,forma:'Pix',aptId:a.id,pacienteId:p.id});
  audit('financeiro',`Recebimento de ${BRL(a.valor)} — ${p.nome}`);
  persist(); closeModal(); render(); toast('Pagamento registrado.');
}
function exportICS(){
  const fut=DB.apts.filter(a=>a.data>=todayISO()&&!['cancelada'].includes(a.status));
  let ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sereno//PT-BR\r\n';
  fut.forEach(a=>{const p=pById(a.pacienteId);const dt=a.data.replace(/-/g,'')+'T'+a.hora.replace(':','')+'00';
    const fim=new Date(a.data+'T'+a.hora); fim.setMinutes(fim.getMinutes()+a.dur);
    const dtf=isoOf(fim).replace(/-/g,'')+'T'+String(fim.getHours()).padStart(2,'0')+String(fim.getMinutes()).padStart(2,'0')+'00';
    ics+=`BEGIN:VEVENT\r\nUID:${a.id}@sereno\r\nDTSTART:${dt}\r\nDTEND:${dtf}\r\nSUMMARY:${a.tipo} — ${p.nome}\r\nLOCATION:${DB.settings.endereco}\r\nEND:VEVENT\r\n`;});
  ics+='END:VCALENDAR';
  download('agenda-sereno.ics',ics,'text/calendar');
  audit('agenda','Agenda exportada em formato .ics'); toast('Arquivo .ics gerado — importe no Google Agenda.');
}
function download(nome,conteudo,mime){
  const b=new Blob([conteudo],{type:mime}); const u=URL.createObjectURL(b);
  const a=document.createElement('a'); a.href=u; a.download=nome; a.click(); URL.revokeObjectURL(u);
}

