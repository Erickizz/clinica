/* Sereno — Painel inicial: indicadores e consultas do dia */
/* =========================== DASHBOARD =========================== */
function vDashboard(){
  const hoje=todayISO(); const mesAtual=hoje.slice(0,7);
  const mesPassado=(()=>{const d=new Date();d.setMonth(d.getMonth()-1);return isoOf(d).slice(0,7)})();
  const aptsMes=DB.apts.filter(a=>a.data.slice(0,7)===mesAtual);
  const realizadasMes=aptsMes.filter(a=>a.status==='realizada').length;
  const realizadasAnt=DB.apts.filter(a=>a.data.slice(0,7)===mesPassado&&a.status==='realizada').length;
  const faltasMes=aptsMes.filter(a=>a.status==='faltou').length;
  const totalFech=realizadasMes+faltasMes;
  const txFalta=totalFech? Math.round(faltasMes/totalFech*100):0;
  const recMes=DB.trans.filter(t=>t.tipo==='receita'&&t.data.slice(0,7)===mesAtual).reduce((s,t)=>s+t.valor,0);
  const despMes=DB.trans.filter(t=>t.tipo==='despesa'&&t.data.slice(0,7)===mesAtual).reduce((s,t)=>s+t.valor,0);
  const ativos=meusPacientes().filter(p=>p.status==='ativo').length;
  const hojeApts=DB.apts.filter(a=>a.data===hoje&&!['cancelada'].includes(a.status)&&(session.role!=='psicologo'||a.profissionalId===session.id)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const pendentes=DB.apts.filter(a=>a.status==='agendada'&&a.data>=hoje&&a.data<=addDays(hoje,3)).length;
  /* série de 6 meses p/ gráfico */
  const serie=[];
  for(let m=5;m>=0;m--){ const d=new Date(); d.setMonth(d.getMonth()-m); const key=isoOf(d).slice(0,7);
    serie.push({lbl:MESES[d.getMonth()],
      sess:DB.apts.filter(a=>a.data.slice(0,7)===key&&a.status==='realizada').length,
      rec:DB.trans.filter(t=>t.tipo==='receita'&&t.data.slice(0,7)===key).reduce((s,t)=>s+t.valor,0)});
  }
  const maxSess=Math.max(...serie.map(s=>s.sess),1), maxRec=Math.max(...serie.map(s=>s.rec),1);
  const bars=serie.map((s,i)=>{const h=Math.round(s.sess/maxSess*110); const x=20+i*62;
    return `<g><rect x="${x}" y="${130-h}" width="34" height="${h}" rx="5" fill="var(--sage-mid)"/>
    <text x="${x+17}" y="${124-h}" text-anchor="middle" font-size="10" font-family="var(--font-mono)" fill="var(--ink-soft)">${s.sess}</text>
    <text x="${x+17}" y="147" text-anchor="middle" font-size="10" fill="var(--ink-faint)">${s.lbl}</text></g>`}).join('');
  const pts=serie.map((s,i)=>`${37+i*62},${130-Math.round(s.rec/maxRec*105)}`).join(' ');
  return `
  <div class="grid g4">
    <div class="card kpi"><div class="lbl">Sessões realizadas no mês</div><div class="num">${realizadasMes}</div>
      <span class="delta ${realizadasMes>=realizadasAnt?'up':'down'}">${realizadasMes>=realizadasAnt?'▲':'▼'} ${Math.abs(realizadasMes-realizadasAnt)} vs. mês anterior</span></div>
    <div class="card kpi"><div class="lbl">Receita do mês</div><div class="num">${BRL(recMes)}</div>
      <span class="delta up">Despesas: ${BRL(despMes)}</span></div>
    <div class="card kpi"><div class="lbl">Taxa de falta</div><div class="num">${txFalta}%</div>
      <span class="delta ${txFalta<=12?'up':'down'}">${faltasMes} falta(s) em ${totalFech} sessões</span></div>
    <div class="card kpi"><div class="lbl">Pacientes ativos</div><div class="num">${ativos}</div>
      <span class="delta up">${pendentes} consulta(s) aguardando confirmação</span></div>
  </div>
  <div class="grid g2 mt">
    <div class="card"><h3>Sessões realizadas · últimos 6 meses</h3>
      <svg viewBox="0 0 400 155" width="100%" role="img" aria-label="Gráfico de sessões por mês">${bars}</svg></div>
    <div class="card"><h3>Receita mensal (R$)</h3>
      <svg viewBox="0 0 400 155" width="100%" role="img" aria-label="Gráfico de receita mensal">
        <polyline points="${pts}" fill="none" stroke="var(--sage-deep)" stroke-width="2.5" stroke-linejoin="round"/>
        ${serie.map((s,i)=>`<circle cx="${37+i*62}" cy="${130-Math.round(s.rec/maxRec*105)}" r="4" fill="var(--sage-deep)"/>
          <text x="${37+i*62}" y="147" text-anchor="middle" font-size="10" fill="var(--ink-faint)">${s.lbl}</text>
          <text x="${37+i*62}" y="${118-Math.round(s.rec/maxRec*105)}" text-anchor="middle" font-size="9" font-family="var(--font-mono)" fill="var(--ink-soft)">${Math.round(s.rec/1000)}k</text>`).join('')}
      </svg></div>
  </div>
  <div class="card mt"><div class="row between"><h3 style="margin:0">Consultas de hoje</h3>
    <button class="btn btn-primary btn-sm" onclick="openAptModal()">+ Nova consulta</button></div>
    ${hojeApts.length? `<table class="mt"><thead><tr><th>Hora</th><th>Paciente</th><th>Profissional</th><th>Status</th><th></th></tr></thead><tbody>
      ${hojeApts.map(a=>{const p=pById(a.pacienteId);return `<tr class="click" onclick="go('paciente',{id:'${p.id}'})">
        <td class="num">${a.hora}</td><td><b>${esc(p.nome)}</b></td><td>${esc(nomeCurto(uById(a.profissionalId).name))}</td>
        <td>${statusPill(a.status)}</td>
        <td style="text-align:right">${a.status==='agendada'?`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();confirmarModal('${a.id}')">Enviar confirmação</button>`:''}
        ${['agendada','confirmada'].includes(a.status)?`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();setAptStatus('${a.id}','realizada')">Marcar realizada</button>`:''}</td></tr>`}).join('')}
    </tbody></table>`:`<div class="empty"><b>Nenhuma consulta hoje.</b>Use o botão acima para agendar a primeira.</div>`}
  </div>`;
}

