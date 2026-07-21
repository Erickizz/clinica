/* Sereno — Relatórios e exportações CSV */
/* =========================== RELATÓRIOS =========================== */
function vRelatorios(){
  const mes=todayISO().slice(0,7);
  const tri=[...Array(3)].map((_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return isoOf(d).slice(0,7)});
  const aptsTri=DB.apts.filter(a=>tri.includes(a.data.slice(0,7)));
  /* atendimentos por profissional */
  const porProf=DB.users.filter(u=>u.role!=='secretaria').map(u=>({nome:nomeCurto(u.name),
    n:aptsTri.filter(a=>a.profissionalId===u.id&&a.status==='realizada').length}));
  const maxProf=Math.max(...porProf.map(x=>x.n),1);
  /* receita por categoria */
  const cats={}; DB.trans.filter(t=>t.tipo==='receita'&&tri.includes(t.data.slice(0,7))).forEach(t=>cats[t.cat]=(cats[t.cat]||0)+t.valor);
  const catArr=Object.entries(cats).sort((a,b)=>b[1]-a[1]); const maxCat=Math.max(...catArr.map(c=>c[1]),1);
  /* assiduidade */
  const fech=aptsTri.filter(a=>['realizada','faltou','cancelada'].includes(a.status));
  const contag={realizada:0,faltou:0,cancelada:0}; fech.forEach(a=>contag[a.status]++);
  const totalF=fech.length||1;
  return `
  <p class="muted mb">Consolidado do trimestre corrente. Use “Exportar CSV” para levar os dados à contabilidade.</p>
  <div class="grid g2">
    <div class="card"><h3>Atendimentos por profissional (trimestre)</h3>
      ${porProf.map(x=>`<div class="bar-row"><span>${esc(x.nome)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.n/maxProf*100}%"></div></div><span class="num" style="font-family:var(--font-mono)">${x.n}</span></div>`).join('')}</div>
    <div class="card"><h3>Receita por categoria (trimestre)</h3>
      ${catArr.map(([c,v])=>`<div class="bar-row"><span>${esc(c)}</span><div class="bar-track"><div class="bar-fill" style="width:${v/maxCat*100}%;background:var(--blue)"></div></div><span class="num" style="font-family:var(--font-mono)">${Math.round(v/1000)}k</span></div>`).join('')||'<p class="muted">Sem receitas no período.</p>'}</div>
    <div class="card"><h3>Assiduidade (trimestre)</h3>
      <div class="row" style="gap:22px;flex-wrap:wrap">
        <div class="kpi"><div class="num" style="color:var(--sage-deep)">${Math.round(contag.realizada/totalF*100)}%</div><div class="lbl">comparecimento</div></div>
        <div class="kpi"><div class="num" style="color:var(--ocre)">${Math.round(contag.faltou/totalF*100)}%</div><div class="lbl">faltas</div></div>
        <div class="kpi"><div class="num" style="color:var(--red)">${Math.round(contag.cancelada/totalF*100)}%</div><div class="lbl">cancelamentos</div></div>
      </div></div>
    <div class="card"><h3>Exportações</h3>
      <p class="muted">Arquivos CSV abrem no Excel e no Google Planilhas.</p>
      <div class="row mt" style="flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="exportCSV('fin')">Financeiro do mês (CSV)</button>
        <button class="btn btn-ghost btn-sm" onclick="exportCSV('apts')">Atendimentos do trimestre (CSV)</button>
      </div></div>
  </div>`;
}
function exportCSV(tipo){
  let csv='',nome='';
  if(tipo==='fin'){ nome=`financeiro-${todayISO().slice(0,7)}.csv`;
    csv='data;tipo;descricao;categoria;forma;valor\n'+DB.trans.filter(t=>t.data.slice(0,7)===todayISO().slice(0,7))
      .map(t=>[t.data,t.tipo,t.desc,t.cat,t.forma,String(t.valor).replace('.',',')].join(';')).join('\n');
  } else { nome='atendimentos-trimestre.csv';
    const tri=[...Array(3)].map((_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return isoOf(d).slice(0,7)});
    csv='data;hora;paciente;profissional;tipo;status;valor\n'+DB.apts.filter(a=>tri.includes(a.data.slice(0,7)))
      .map(a=>[a.data,a.hora,pById(a.pacienteId).nome,uById(a.profissionalId).name,a.tipo,a.status,String(a.valor).replace('.',',')].join(';')).join('\n');
  }
  download(nome,'\ufeff'+csv,'text/csv;charset=utf-8');
  audit('relatorio',`Exportação CSV — ${nome}`); toast('CSV gerado.');
}

