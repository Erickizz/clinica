/* Sereno — Financeiro: lançamentos, fluxo de caixa e recibos */
/* =========================== FINANCEIRO =========================== */
let finMes=todayISO().slice(0,7);
function vFinanceiro(){
  const ts=DB.trans.filter(t=>t.data.slice(0,7)===finMes).sort((a,b)=>b.data.localeCompare(a.data));
  const rec=ts.filter(t=>t.tipo==='receita').reduce((s,t)=>s+t.valor,0);
  const desp=ts.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+t.valor,0);
  const pendencias=DB.apts.filter(a=>a.status==='realizada'&&!a.pago).reduce((s,a)=>s+a.valor,0);
  return `
  <div class="row between mb" style="flex-wrap:wrap;gap:10px">
    <input type="month" class="search" style="min-width:0" value="${finMes}" onchange="finMes=this.value;render()">
    <div class="row"><button class="btn btn-ghost btn-sm" onclick="lancModal('despesa')">+ Despesa</button>
    <button class="btn btn-primary btn-sm" onclick="lancModal('receita')">+ Receita</button></div></div>
  <div class="grid g3">
    <div class="card kpi"><div class="lbl">Receitas do mês</div><div class="num" style="color:var(--sage-deep)">${BRL(rec)}</div></div>
    <div class="card kpi"><div class="lbl">Despesas do mês</div><div class="num" style="color:var(--red)">${BRL(desp)}</div></div>
    <div class="card kpi"><div class="lbl">Resultado (fluxo de caixa)</div><div class="num">${BRL(rec-desp)}</div>
      <span class="delta ${pendencias?'down':'up'}">${pendencias?'A receber: '+BRL(pendencias):'Sem pendências de recebimento'}</span></div>
  </div>
  <div class="card mt" style="padding:0 18px"><table>
    <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th class="num">Valor</th><th></th></tr></thead><tbody>
    ${ts.map(t=>`<tr><td class="num">${fmtD(t.data)}</td><td>${esc(t.desc)}</td>
      <td><span class="pill ${t.tipo==='receita'?'p-sage':'p-red'}">${esc(t.cat)}</span></td><td>${esc(t.forma)}</td>
      <td class="num" style="color:${t.tipo==='receita'?'var(--sage-deep)':'var(--red)'}">${t.tipo==='receita'?'+':'−'} ${BRL(t.valor)}</td>
      <td style="text-align:right">${t.tipo==='receita'?`<button class="btn btn-ghost btn-sm" onclick="emitirRecibo('${t.id}')">Recibo</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty"><b>Sem lançamentos neste mês.</b></div></td></tr>'}
  </tbody></table></div>`;
}
function lancModal(tipo){
  openModal(`<h3>${tipo==='receita'?'Nova receita':'Nova despesa'}</h3>
  <div class="field"><label>Descrição</label><input id="lcDesc"></div>
  <div class="f2">
    <div class="field"><label>Data</label><input id="lcData" type="date" value="${todayISO()}"></div>
    <div class="field"><label>Valor (R$)</label><input id="lcVal" type="number" step="0.01"></div>
    <div class="field"><label>Categoria</label><select id="lcCat">${(tipo==='receita'?['Sessões','Avaliações','Supervisão','Outros']:['Aluguel','Serviços','Materiais','Impostos','Outros']).map(c=>`<option>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Forma</label><select id="lcForma">${['Pix','Cartão','Dinheiro','Transferência','Boleto'].map(f=>`<option>${f}</option>`).join('')}</select></div>
  </div>
  <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn btn-primary" onclick="(function(){const v=+$('#lcVal').value;if(!$('#lcDesc').value.trim()||!v)return toast('Preencha descrição e valor.');DB.trans.push({id:uid(),tipo:'${tipo}',data:$('#lcData').value,desc:$('#lcDesc').value,cat:$('#lcCat').value,valor:v,forma:$('#lcForma').value});audit('financeiro','${tipo==='receita'?'Receita':'Despesa'} lançada: '+$('#lcDesc').value);persist();closeModal();render();toast('Lançamento registrado.')})()">Salvar</button></div>`);
}
function emitirRecibo(transId,emissor){
  const t=DB.trans.find(x=>x.id===transId); const p=t.pacienteId?pById(t.pacienteId):null;
  const s=DB.settings; const num=String(DB.trans.indexOf(t)+1).padStart(4,'0');
  const quem=emissor||{nome:session.name,crp:session.crp};
  $('#printArea').innerHTML=`
    <h1>${esc(s.nomeClinica)}</h1>
    <p>${esc(s.endereco)}<br>CNPJ: ${esc(s.cnpj)}</p><hr>
    <h2 style="text-align:center;margin:10px 0">RECIBO Nº ${num}/${t.data.slice(0,4)}</h2>
    <p style="margin:16px 0;line-height:1.8">Recebi de <b>${p?esc(p.nome):'________________'}</b>${p&&p.cpf?`, CPF ${esc(p.cpf)}`:''},
    a importância de <b>${BRL(t.valor)}</b>, referente a <b>${esc(t.desc)}</b>, em ${fmtD(t.data)}, na forma de ${esc(t.forma)}.</p>
    <p>São Paulo, ${fmtD(todayISO())}.</p><br><br>
    <p style="text-align:center">_____________________________________<br>${esc(quem.nome)}${quem.crp?' · '+esc(quem.crp):''}</p>`;
  audit('financeiro',`Recibo nº ${num} emitido${p?' — '+p.nome:''}`);
  window.print();
}

