// ==================== Datos ====================
const STORAGE_KEY = 'viajes-app-v1';

const CATEGORIES = [
  { id: 'pasajes',         label: 'Pasajes' },
  { id: 'arriendo',        label: 'Arriendo / Alojamiento' },
  { id: 'comida',          label: 'Comida' },
  { id: 'transporte',      label: 'Transporte local' },
  { id: 'entretenimiento', label: 'Entretenimiento' },
  { id: 'extras',          label: 'Gastos extras' },
  { id: 'otro',            label: 'Otro' },
];
const CAT_COLORS = {
  pasajes: '#5C769A', arriendo: '#f59e0b', comida: '#22c55e',
  transporte: '#6366f1', entretenimiento: '#ec4899', extras: '#a855f7', otro: '#94a3b8',
};

let state = load();
let currentTripId = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* datos corruptos: se parte de cero */ }
  return { trips: [] };
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-CL');
}
function catLabel(id) {
  const c = CATEGORIES.find(c => c.id === id);
  return c ? c.label : id;
}
function tripTotal(trip) {
  return trip.expenses.reduce((s, e) => s + e.amount, 0);
}
function tripByCat(trip) {
  const by = {};
  for (const e of trip.expenses) by[e.category] = (by[e.category] || 0) + e.amount;
  return by;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ==================== Navegación ====================
function showTab(tab) {
  document.getElementById('tab-viajes').style.display  = tab === 'viajes'  ? '' : 'none';
  document.getElementById('tab-detalle').style.display = tab === 'detalle' ? '' : 'none';
  document.getElementById('tab-comparar').style.display= tab === 'comparar'? '' : 'none';
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === (tab === 'detalle' ? 'viajes' : tab));
  });
  if (tab === 'viajes') renderTrips();
  if (tab === 'comparar') renderCompare();
  if (tab === 'detalle') renderDetail();
}

// ==================== Viajes ====================
document.getElementById('trip-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('trip-name').value.trim();
  const dest = document.getElementById('trip-dest').value.trim();
  if (!name) return;
  state.trips.push({ id: uid(), name, destination: dest, expenses: [] });
  save();
  e.target.reset();
  renderTrips();
});

function renderTrips() {
  const list = document.getElementById('trips-list');
  const empty = document.getElementById('trips-empty');
  list.innerHTML = '';
  empty.style.display = state.trips.length ? 'none' : '';

  const totals = state.trips.map(tripTotal);
  const withExpenses = state.trips.filter(t => t.expenses.length > 0);
  let cheapestId = null;
  if (withExpenses.length >= 2) {
    cheapestId = withExpenses.reduce((a, b) => tripTotal(a) <= tripTotal(b) ? a : b).id;
  }

  state.trips.forEach((trip, i) => {
    const card = document.createElement('div');
    card.className = 'trip-card' + (trip.id === cheapestId ? ' cheapest' : '');
    card.innerHTML = `
      ${trip.id === cheapestId ? '<span class="badge">Más económico</span>' : ''}
      <h3>${escapeHtml(trip.name)}</h3>
      <div class="dest">${trip.destination ? '📍 ' + escapeHtml(trip.destination) : '&nbsp;'}</div>
      <div class="total">${fmt(totals[i])}</div>
      <div class="count">${trip.expenses.length} gasto${trip.expenses.length === 1 ? '' : 's'}</div>
      <div class="trip-actions">
        <button class="btn-ghost btn-sm" data-act="open">Ver gastos</button>
        <button class="btn-ghost btn-sm" data-act="edit">✏️ Editar</button>
        <button class="btn-danger btn-sm" data-act="del">🗑️</button>
      </div>`;
    card.addEventListener('click', ev => {
      const act = ev.target.dataset && ev.target.dataset.act;
      if (act === 'edit') { editTrip(trip.id); return; }
      if (act === 'del')  { deleteTrip(trip.id); return; }
      openTrip(trip.id);
    });
    list.appendChild(card);
  });
}

function openTrip(id) {
  currentTripId = id;
  showTab('detalle');
}

function editTrip(id) {
  const trip = state.trips.find(t => t.id === id);
  openModal('Editar viaje', [
    { key: 'name', label: 'Nombre del viaje', type: 'text', value: trip.name },
    { key: 'destination', label: 'Destino', type: 'text', value: trip.destination },
  ], vals => {
    if (!vals.name.trim()) return;
    trip.name = vals.name.trim();
    trip.destination = vals.destination.trim();
    save();
    renderTrips();
    if (currentTripId === id) renderDetail();
  });
}

function deleteTrip(id) {
  const trip = state.trips.find(t => t.id === id);
  if (!confirm(`¿Eliminar el viaje "${trip.name}" y sus ${trip.expenses.length} gastos?`)) return;
  state.trips = state.trips.filter(t => t.id !== id);
  if (currentTripId === id) currentTripId = null;
  save();
  renderTrips();
}

// ==================== Detalle / Gastos ====================
const catSelect = document.getElementById('exp-cat');
CATEGORIES.forEach(c => {
  const o = document.createElement('option');
  o.value = c.id; o.textContent = c.label;
  catSelect.appendChild(o);
});

document.getElementById('expense-form').addEventListener('submit', e => {
  e.preventDefault();
  const trip = state.trips.find(t => t.id === currentTripId);
  if (!trip) return;
  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!desc || isNaN(amount) || amount < 0) return;
  trip.expenses.push({ id: uid(), description: desc, category: catSelect.value, amount });
  save();
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-desc').focus();
  renderDetail();
});

function renderDetail() {
  const trip = state.trips.find(t => t.id === currentTripId);
  if (!trip) { showTab('viajes'); return; }

  document.getElementById('detail-title').textContent =
    trip.name + (trip.destination ? ' — ' + trip.destination : '');

  const by = tripByCat(trip);
  const chips = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `<span class="chip"><b>${catLabel(cat)}:</b> ${fmt(amt)}</span>`)
    .join('');
  document.getElementById('detail-summary').innerHTML = `
    <div class="total" style="font-size:26px;font-weight:700">Total: ${fmt(tripTotal(trip))}</div>
    <div class="summary-cats">${chips}</div>`;

  const body = document.getElementById('expenses-body');
  const empty = document.getElementById('expenses-empty');
  const table = document.getElementById('expenses-table');
  body.innerHTML = '';
  const has = trip.expenses.length > 0;
  table.style.display = has ? '' : 'none';
  empty.style.display = has ? 'none' : '';

  trip.expenses.forEach(exp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(exp.description)}</td>
      <td><span class="cat-pill cat-${exp.category}">${catLabel(exp.category)}</span></td>
      <td class="num">${fmt(exp.amount)}</td>
      <td style="text-align:right">
        <button class="btn-ghost btn-sm" data-act="edit">✏️</button>
        <button class="btn-danger btn-sm" data-act="del">🗑️</button>
      </td>`;
    tr.querySelector('[data-act="edit"]').addEventListener('click', () => editExpense(trip, exp.id));
    tr.querySelector('[data-act="del"]').addEventListener('click', () => deleteExpense(trip, exp.id));
    body.appendChild(tr);
  });
}

function editExpense(trip, expId) {
  const exp = trip.expenses.find(e => e.id === expId);
  openModal('Editar gasto', [
    { key: 'description', label: 'Descripción', type: 'text', value: exp.description },
    { key: 'category', label: 'Categoría', type: 'select', value: exp.category,
      options: CATEGORIES.map(c => ({ value: c.id, label: c.label })) },
    { key: 'amount', label: 'Monto', type: 'number', value: exp.amount },
  ], vals => {
    const amount = parseFloat(vals.amount);
    if (!vals.description.trim() || isNaN(amount) || amount < 0) return;
    exp.description = vals.description.trim();
    exp.category = vals.category;
    exp.amount = amount;
    save();
    renderDetail();
  });
}

function deleteExpense(trip, expId) {
  const exp = trip.expenses.find(e => e.id === expId);
  if (!confirm(`¿Eliminar el gasto "${exp.description}"?`)) return;
  trip.expenses = trip.expenses.filter(e => e.id !== expId);
  save();
  renderDetail();
}

// ==================== Comparar ====================
function renderCompare() {
  const barsEl = document.getElementById('compare-bars');
  const legendEl = document.getElementById('compare-legend');
  const bestEl = document.getElementById('compare-best');
  const emptyEl = document.getElementById('compare-empty');
  const tableCard = document.getElementById('compare-table-card');

  const trips = state.trips.filter(t => t.expenses.length > 0);
  barsEl.innerHTML = ''; legendEl.innerHTML = '';
  bestEl.style.display = 'none';

  if (trips.length === 0) {
    emptyEl.style.display = '';
    tableCard.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  tableCard.style.display = '';

  const totals = trips.map(tripTotal);
  const max = Math.max(...totals);

  trips.forEach((trip, i) => {
    const by = tripByCat(trip);
    const segs = CATEGORIES
      .filter(c => by[c.id])
      .map(c => {
        const w = (by[c.id] / max) * 100;
        return `<div class="bar-seg" style="width:${w}%;background:${CAT_COLORS[c.id]}" title="${c.label}: ${fmt(by[c.id])}"></div>`;
      }).join('');
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div title="${escapeHtml(trip.name)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(trip.name)}</div>
      <div class="bar-track">${segs}</div>
      <div class="bar-total">${fmt(totals[i])}</div>`;
    barsEl.appendChild(row);
  });

  const usedCats = CATEGORIES.filter(c => trips.some(t => tripByCat(t)[c.id]));
  legendEl.innerHTML = usedCats
    .map(c => `<span><i style="background:${CAT_COLORS[c.id]}"></i>${c.label}</span>`)
    .join('');

  if (trips.length >= 2) {
    const minTotal = Math.min(...totals);
    const maxTotal = Math.max(...totals);
    const best = trips[totals.indexOf(minTotal)];
    const worst = trips[totals.indexOf(maxTotal)];
    bestEl.style.display = '';
    bestEl.innerHTML = `🏆 <b>${escapeHtml(best.name)}</b> es el viaje más económico (${fmt(minTotal)}). ` +
      `Te ahorras <b>${fmt(maxTotal - minTotal)}</b> comparado con ${escapeHtml(worst.name)} (${fmt(maxTotal)}).`;
  }

  // Tabla comparativa por categoría
  const table = document.getElementById('compare-table');
  let html = '<thead><tr><th>Categoría</th>' +
    trips.map(t => `<th class="num">${escapeHtml(t.name)}</th>`).join('') + '</tr></thead><tbody>';

  usedCats.forEach(c => {
    const vals = trips.map(t => tripByCat(t)[c.id] || 0);
    const nonZero = vals.filter(v => v > 0);
    const minVal = nonZero.length >= 2 ? Math.min(...nonZero) : null;
    html += `<tr><td><span class="cat-pill cat-${c.id}">${c.label}</span></td>` +
      vals.map(v => `<td class="num ${v > 0 && v === minVal ? 'best' : ''}">${v ? fmt(v) : '—'}</td>`).join('') +
      '</tr>';
  });

  const minTotal2 = Math.min(...totals);
  html += `<tr style="font-weight:700"><td>TOTAL</td>` +
    totals.map(t => `<td class="num ${trips.length >= 2 && t === minTotal2 ? 'best' : ''}">${fmt(t)}</td>`).join('') +
    '</tr></tbody>';
  table.innerHTML = html;
}

// ==================== Modal genérico ====================
let modalOnSave = null;

function openModal(title, fields, onSave) {
  document.getElementById('modal-title').textContent = title;
  const wrap = document.getElementById('modal-fields');
  wrap.innerHTML = '';
  fields.forEach(f => {
    const div = document.createElement('div');
    div.className = 'field';
    const inputId = 'mf-' + f.key;
    if (f.type === 'select') {
      div.innerHTML = `<label for="${inputId}">${f.label}</label>
        <select id="${inputId}">` +
        f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${o.label}</option>`).join('') +
        '</select>';
    } else {
      div.innerHTML = `<label for="${inputId}">${f.label}</label>
        <input id="${inputId}" type="${f.type}" ${f.type === 'number' ? 'min="0" step="any"' : ''}>`;
      div.querySelector('input').value = f.value;
    }
    wrap.appendChild(div);
  });
  modalOnSave = () => {
    const vals = {};
    fields.forEach(f => { vals[f.key] = document.getElementById('mf-' + f.key).value; });
    onSave(vals);
    closeModal();
  };
  document.getElementById('modal').classList.add('open');
  const first = wrap.querySelector('input, select');
  if (first) first.focus();
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  modalOnSave = null;
}
document.getElementById('modal-save').addEventListener('click', () => modalOnSave && modalOnSave());
document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modal').classList.contains('open')) {
    e.preventDefault();
    modalOnSave && modalOnSave();
  }
});

// ==================== Inicio ====================
document.getElementById('footer-year').textContent = new Date().getFullYear();
renderTrips();
