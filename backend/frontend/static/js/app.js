/* Cylinder Management SPA — app.js */

const API = '/api';
let TOKEN = localStorage.getItem('token') || '';
let USER = JSON.parse(localStorage.getItem('user') || 'null');

// ── Auth ────────────────────────────────────────────────────────────────────

async function api(url, opts = {}) {
    const headers = { ...opts.headers };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    if (!(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(API + url, { ...opts, headers });
    if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Ошибка');
    }
    return res.json();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.set('username', document.getElementById('login-user').value);
    form.set('password', document.getElementById('login-pass').value);
    try {
        const data = await api('/auth/login', { method: 'POST', body: form, headers: {} });
        TOKEN = data.access_token;
        USER = data.user;
        localStorage.setItem('token', TOKEN);
        localStorage.setItem('user', JSON.stringify(USER));
        showApp();
    } catch (err) {
        toast(err.message, 'danger');
    }
});

function logout() {
    TOKEN = ''; USER = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.getElementById('sidebar').classList.add('d-none');
    document.getElementById('login-page').style.display = 'flex';
    const mc = document.getElementById('main-content');
    mc.style.marginLeft = '0';
    mc.style.alignItems = 'center';
    mc.style.justifyContent = 'center';
    document.getElementById('page-content').innerHTML = '';
}

function showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('sidebar').classList.remove('d-none');
    const mc = document.getElementById('main-content');
    mc.style.marginLeft = 'var(--sidebar-width)';
    mc.style.alignItems = 'flex-start';
    mc.style.justifyContent = 'flex-start';
    document.getElementById('sidebar-user').textContent = USER.full_name || USER.username;
    if (USER.role === 'admin') {
        document.getElementById('nav-users').classList.remove('d-none');
    }
    navigate('dashboard');
}

// ── Navigation ──────────────────────────────────────────────────────────────

document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.target.closest('.nav-link').classList.add('active');
        navigate(e.target.closest('.nav-link').dataset.page);
    });
});

function navigate(page) {
    const renderers = {
        dashboard: renderDashboard,
        fleets: renderFleets,
        buses: renderBuses,
        cylinders: renderCylinders,
        inspections: renderInspections,
        repairs: renderRepairs,
        stock: renderStock,
        reports: renderReports,
        users: renderUsers,
        settings: renderSettings,
    };
    const fn = renderers[page];
    if (fn) fn();
}

// ── Toast ───────────────────────────────────────────────────────────────────

function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    container.appendChild(el);
    new bootstrap.Toast(el, { delay: 4000 }).show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ── Modal helpers ───────────────────────────────────────────────────────────

function modal(title, bodyHtml, onSave) {
    const existing = document.getElementById('generic-modal');
    if (existing) existing.remove();
    const modalHtml = `
    <div class="modal fade" id="generic-modal" tabindex="-1">
      <div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">${title}</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
          <button class="btn btn-primary" id="modal-save-btn">Сохранить</button>
        </div>
      </div></div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('generic-modal');
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('modal-save-btn').addEventListener('click', async () => {
        await onSave();
        modal.hide();
    });
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    modal.show();
}

function confirmDelete(msg, onConfirm) {
    if (confirm(msg)) onConfirm();
}

// ── Dashboard ───────────────────────────────────────────────────────────────

async function renderDashboard() {
    const data = await api('/dashboard');
    document.getElementById('page-content').innerHTML = `
    <h4>Панель управления</h4>
    <div class="row g-3 mt-2">
      <div class="col-md-3"><div class="card card-stat"><div class="card-body"><small class="text-muted">Автопарки</small><h3>${data.total_fleets}</h3></div></div></div>
      <div class="col-md-3"><div class="card card-stat"><div class="card-body"><small class="text-muted">Автобусы</small><h3>${data.total_buses}</h3></div></div></div>
      <div class="col-md-3"><div class="card card-stat"><div class="card-body"><small class="text-muted">Баллоны</small><h3>${data.active_cylinders} / ${data.total_cylinders}</h3></div></div></div>
      <div class="col-md-3"><div class="card card-stat danger"><div class="card-body"><small class="text-muted">Просрочены</small><h3>${data.overdue_inspections}</h3></div></div></div>
      <div class="col-md-3"><div class="card card-stat warning"><div class="card-body"><small class="text-muted">Испытания (30 дн)</small><h3>${data.upcoming_30days}</h3></div></div></div>
      <div class="col-md-3"><div class="card card-stat"><div class="card-body"><small class="text-muted">Мало на складе</small><h3>${data.low_stock_items}</h3></div></div></div>
    </div>`;
}

// ── Fleets ──────────────────────────────────────────────────────────────────

async function renderFleets() {
    const fleets = await api('/fleets');
    const rows = fleets.map(f => `
        <tr>
            <td>${f.name}</td><td>${f.address || ''}</td><td>${f.responsible || ''}</td>
            <td>
                ${USER.role === 'admin' ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="editFleet(${f.id})"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('Удалить автопарк ${f.name}?', ()=>deleteFleet(${f.id}))"><i class="bi bi-trash"></i></button>` : ''}
            </td>
        </tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between align-items-center"><h4>Автопарки</h4>
        ${USER.role === 'admin' ? '<button class="btn btn-primary" onclick="addFleet()"><i class="bi bi-plus-lg"></i> Добавить</button>' : ''}
    </div>
    <table class="table table-hover mt-3"><thead><tr><th>Название</th><th>Адрес</th><th>Ответственный</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="text-muted">Нет автопарков</td></tr>'}</tbody></table>`;
}

function addFleet() {
    modal('Добавить автопарк', `
        <div class="mb-3"><label class="form-label">Название</label><input class="form-control" id="f-name" required></div>
        <div class="mb-3"><label class="form-label">Адрес / база</label><input class="form-control" id="f-addr"></div>
        <div class="mb-3"><label class="form-label">Ответственный</label><input class="form-control" id="f-resp"></div>
        <div class="mb-3"><label class="form-label">Комментарий</label><textarea class="form-control" id="f-comment"></textarea></div>
    `, async () => {
        await api('/fleets', { method: 'POST', body: JSON.stringify({
            name: $('#f-name').value, address: $('#f-addr').value,
            responsible: $('#f-resp').value, comment: $('#f-comment').value,
        })});
        renderFleets(); toast('Автопарк создан', 'success');
    });
}

async function editFleet(id) {
    const f = await api(`/fleets/${id}`);
    modal('Редактировать автопарк', `
        <div class="mb-3"><label class="form-label">Название</label><input class="form-control" id="f-name" value="${esc(f.name)}" required></div>
        <div class="mb-3"><label class="form-label">Адрес</label><input class="form-control" id="f-addr" value="${esc(f.address)}"></div>
        <div class="mb-3"><label class="form-label">Ответственный</label><input class="form-control" id="f-resp" value="${esc(f.responsible)}"></div>
        <div class="mb-3"><label class="form-label">Комментарий</label><textarea class="form-control" id="f-comment">${esc(f.comment)}</textarea></div>
    `, async () => {
        await api(`/fleets/${id}`, { method: 'PUT', body: JSON.stringify({
            name: $('#f-name').value, address: $('#f-addr').value,
            responsible: $('#f-resp').value, comment: $('#f-comment').value,
        })});
        renderFleets(); toast('Сохранено', 'success');
    });
}

async function deleteFleet(id) {
    await api(`/fleets/${id}`, { method: 'DELETE' });
    renderFleets(); toast('Автопарк удалён', 'success');
}

// ── Buses ───────────────────────────────────────────────────────────────────

async function renderBuses() {
    const [buses, fleets] = await Promise.all([api('/buses'), api('/fleets')]);
    const fleetMap = Object.fromEntries(fleets.map(f => [f.id, f.name]));
    const rows = buses.map(b => `
        <tr><td>${fleetMap[b.fleet_id] || '—'}</td><td>${b.gosnomer}</td><td>${b.board_number || ''}</td><td>${b.model || ''}</td><td>${b.year || ''}</td>
        <td><button class="btn btn-sm btn-outline-primary me-1" onclick="editBus(${b.id})"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('Удалить автобус?',()=>deleteBus(${b.id}))"><i class="bi bi-trash"></i></button></td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Автобусы</h4><button class="btn btn-primary" onclick="addBus()"><i class="bi bi-plus-lg"></i> Добавить</button></div>
    <table class="table table-hover mt-3"><thead><tr><th>Автопарк</th><th>Госномер</th><th>Борт. номер</th><th>Модель</th><th>Год</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="text-muted">Нет автобусов</td></tr>'}</tbody></table>`;
}

async function addBus() {
    const fleets = await api('/fleets');
    const opts = fleets.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    modal('Добавить автобус', `
        <div class="mb-3"><label class="form-label">Автопарк</label><select class="form-select" id="b-fleet">${opts}</select></div>
        <div class="mb-3"><label class="form-label">Госномер</label><input class="form-control" id="b-gosnomer" required></div>
        <div class="mb-3"><label class="form-label">Бортовой номер</label><input class="form-control" id="b-board"></div>
        <div class="mb-3"><label class="form-label">VIN</label><input class="form-control" id="b-vin"></div>
        <div class="mb-3"><label class="form-label">Модель</label><input class="form-control" id="b-model"></div>
        <div class="mb-3"><label class="form-label">Год выпуска</label><input class="form-control" type="number" id="b-year"></div>
    `, async () => {
        await api('/buses', { method: 'POST', body: JSON.stringify({
            fleet_id: +$('#b-fleet').value, gosnomer: $('#b-gosnomer').value, board_number: $('#b-board').value,
            vin: $('#b-vin').value, model: $('#b-model').value, year: $('#b-year').value ? +$('#b-year').value : null,
        })});
        renderBuses(); toast('Автобус добавлен', 'success');
    });
}

async function editBus(id) { /* similar to add, prefilled */ }

async function deleteBus(id) {
    await api(`/buses/${id}`, { method: 'DELETE' });
    renderBuses(); toast('Удалён', 'success');
}

// ── Cylinders ───────────────────────────────────────────────────────────────

async function renderCylinders() {
    const [cylinders, buses, fleets] = await Promise.all([
        api('/cylinders'), api('/buses'), api('/fleets')]);
    const fleetMap = Object.fromEntries(fleets.map(f => [f.id, f.name]));
    const busMap = Object.fromEntries(buses.map(b => [b.id, `${b.gosnomer}`]));
    const statusBadge = s => ({ active: 'success', in_stock: 'secondary', inspection: 'warning', rejected: 'danger', decommissioned: 'dark' }[s] || 'secondary');
    const rows = cylinders.map(c => `
        <tr><td>${fleetMap[c.fleet_id] || '—'}</td><td>${busMap[c.bus_id] || '—'}</td><td><strong>${esc(c.number)}</strong></td><td>${esc(c.stamp) || ''}</td><td>${esc(c.gas_type) || ''}</td><td><span class="badge bg-${statusBadge(c.status)}">${c.status}</span></td><td>${c.next_inspection_date || ''}</td>
        <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCylinder(${c.id})"><i class="bi bi-eye"></i></button>
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="editCylinder(${c.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('Удалить баллон?',()=>deleteCylinder(${c.id}))"><i class="bi bi-trash"></i></button>
        </td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Баллоны</h4><button class="btn btn-primary" onclick="addCylinder()"><i class="bi bi-plus-lg"></i> Добавить</button></div>
    <input class="form-control mt-3 w-50" placeholder="Поиск по номеру, клейму..." oninput="searchCylinders(this.value)">
    <table class="table table-hover mt-2"><thead><tr><th>Автопарк</th><th>Автобус</th><th>Номер</th><th>Клеймо</th><th>Газ</th><th>Статус</th><th>След. исп.</th><th></th></tr></thead><tbody id="cyl-tbody">${rows || '<tr><td colspan="8" class="text-muted">Нет баллонов</td></tr>'}</tbody></table>`;
}

async function searchCylinders(q) {
    if (!q.trim()) return renderCylinders();
    const cylinders = await api(`/cylinders?search=${encodeURIComponent(q)}`);
    const [buses, fleets] = await Promise.all([api('/buses'), api('/fleets')]);
    const fleetMap = Object.fromEntries(fleets.map(f => [f.id, f.name]));
    const busMap = Object.fromEntries(buses.map(b => [b.id, b.gosnomer]));
    const statusBadge = s => ({ active: 'success', in_stock: 'secondary', inspection: 'warning', rejected: 'danger' }[s] || 'secondary');
    const rows = cylinders.map(c => `
        <tr><td>${fleetMap[c.fleet_id] || ''}</td><td>${busMap[c.bus_id] || ''}</td><td><strong>${esc(c.number)}</strong></td><td>${esc(c.stamp) || ''}</td><td>${esc(c.gas_type) || ''}</td><td><span class="badge bg-${statusBadge(c.status)}">${c.status}</span></td><td>${c.next_inspection_date || ''}</td><td>...</td></tr>`).join('');
    document.getElementById('cyl-tbody').innerHTML = rows || '<tr><td colspan="8" class="text-muted">Ничего не найдено</td></tr>';
}

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function $(id) { return document.getElementById(id); }

async function addCylinder() {
    const [fleets, buses] = await Promise.all([api('/fleets'), api('/buses')]);
    const fopts = fleets.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    const bopts = '<option value="">— Без автобуса —</option>' + buses.map(b => `<option value="${b.id}">${b.gosnomer} (${b.model || ''})</option>`).join('');
    modal('Добавить баллон', `
        <div class="row">
            <div class="col-md-6 mb-3"><label class="form-label">Автопарк</label><select class="form-select" id="c-fleet">${fopts}</select></div>
            <div class="col-md-6 mb-3"><label class="form-label">Автобус</label><select class="form-select" id="c-bus">${bopts}</select></div>
            <div class="col-md-4 mb-3"><label class="form-label">Номер баллона</label><input class="form-control" id="c-number" required></div>
            <div class="col-md-4 mb-3"><label class="form-label">Клеймо</label><input class="form-control" id="c-stamp"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Серийный номер</label><input class="form-control" id="c-serial"></div>
            <div class="col-md-12 mb-3"><label class="form-label">Фото баллона</label><input class="form-control" type="file" id="c-photo" accept="image/*"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Тип газа</label><input class="form-control" id="c-gas" placeholder="КПГ / метан"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Дата изгот.</label><input class="form-control" type="date" id="c-mdate"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Объём, л</label><input class="form-control" type="number" step="0.1" id="c-capacity"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Раб. давление, МПа</label><input class="form-control" type="number" step="0.1" id="c-wpressure"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Пробное давление, МПа</label><input class="form-control" type="number" step="0.1" id="c-tpressure"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Масса, кг</label><input class="form-control" type="number" step="0.1" id="c-weight"></div>
            <div class="col-md-4 mb-3"><label class="form-label">След. освидетел.</label><input class="form-control" type="date" id="c-next"></div>
        </div>
    `, async () => {
        const res = await api('/cylinders', { method: 'POST', body: JSON.stringify({
            fleet_id: +$('#c-fleet').value, bus_id: $('#c-bus').value ? +$('#c-bus').value : null,
            number: $('#c-number').value, stamp: $('#c-stamp').value, serial_number: $('#c-serial').value,
            gas_type: $('#c-gas').value, manufactured_date: $('#c-mdate').value || null,
            capacity_liters: $('#c-capacity').value ? +$('#c-capacity').value : null,
            working_pressure: $('#c-wpressure').value ? +$('#c-wpressure').value : null,
            test_pressure: $('#c-tpressure').value ? +$('#c-tpressure').value : null,
            tare_weight: $('#c-weight').value ? +$('#c-weight').value : null,
            next_inspection_date: $('#c-next').value || null,
        })});
        // Upload photo if selected
        const photoInput = document.getElementById('c-photo');
        if (photoInput && photoInput.files[0]) {
            const fd = new FormData();
            fd.append('file', photoInput.files[0]);
            await fetch(API + `/cylinders/${res.id}/photo`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
        }
        renderCylinders(); toast('Баллон добавлен', 'success');
    });
}

async function viewCylinder(id) {
    const [cyl, inspections] = await Promise.all([
        api(`/cylinders`).then(r => r.find(c => c.id === id)),
        api(`/inspections?cylinder_id=${id}`)
    ]);
    const inspRows = inspections.map(i => `
        <tr><td>${i.inspection_date}</td><td>${i.inspection_type}</td><td><span class="badge bg-${i.result==='pass'?'success':i.result==='fail'?'danger':'warning'}">${i.result}</span></td><td>${i.inspector || ''}</td><td>${i.next_inspection_date || ''}</td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <h4>Баллон #${esc(cyl.number)} <button class="btn btn-sm btn-outline-secondary ms-2" onclick="renderCylinders()">← Назад</button></h4>
    <div class="row mt-3">
      <div class="col-md-6">
        <table class="table table-sm"><tbody>
          <tr><th>Клеймо</th><td>${esc(cyl.stamp)}</td></tr>
          <tr><th>Серийный номер</th><td>${esc(cyl.serial_number)}</td></tr>
          <tr><th>Тип газа</th><td>${esc(cyl.gas_type)}</td></tr>
          <tr><th>Объём</th><td>${cyl.capacity_liters || ''} л</td></tr>
          <tr><th>Рабочее давление</th><td>${cyl.working_pressure || ''} МПа</td></tr>
          <tr><th>Пробное давление</th><td>${cyl.test_pressure || ''} МПа</td></tr>
          <tr><th>Масса</th><td>${cyl.tare_weight || ''} кг</td></tr>
          <tr><th>Статус</th><td>${cyl.status}</td></tr>
          <tr><th>След. освидетел.</th><td>${cyl.next_inspection_date || ''}</td></tr>
        </tbody></table>
        ${cyl.photo_path ? `<img src="${cyl.photo_path}" class="photo-preview">` : ''}
      </div>
      <div class="col-md-6">
        <h5>История испытаний</h5>
        <table class="table table-sm"><thead><tr><th>Дата</th><th>Тип</th><th>Результат</th><th>Инспектор</th><th>След. исп.</th></tr></thead><tbody>${inspRows || '<tr><td colspan="5" class="text-muted">Нет испытаний</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

async function editCylinder(id) {
    const [cyl, fleets, buses] = await Promise.all([api(`/cylinders`).then(r => r.find(c => c.id === id)), api('/fleets'), api('/buses')]);
    const fopts = fleets.map(f => `<option value="${f.id}" ${f.id===cyl.fleet_id?'selected':''}>${f.name}</option>`).join('');
    const bopts = '<option value="">— Без автобуса —</option>' + buses.map(b => `<option value="${b.id}" ${b.id===cyl.bus_id?'selected':''}>${b.gosnomer} (${b.model || ''})</option>`).join('');
    modal('Редактировать баллон', `
        <div class="row">
            <div class="col-md-6 mb-3"><label class="form-label">Автопарк</label><select class="form-select" id="c-fleet">${fopts}</select></div>
            <div class="col-md-6 mb-3"><label class="form-label">Автобус</label><select class="form-select" id="c-bus">${bopts}</select></div>
            <div class="col-md-4 mb-3"><label class="form-label">Номер баллона</label><input class="form-control" id="c-number" value="${esc(cyl.number)}" required></div>
            <div class="col-md-4 mb-3"><label class="form-label">Клеймо</label><input class="form-control" id="c-stamp" value="${esc(cyl.stamp||'')}"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Серийный номер</label><input class="form-control" id="c-serial" value="${esc(cyl.serial_number||'')}"></div>
            <div class="col-md-12 mb-3"><label class="form-label">Фото баллона</label><input class="form-control" type="file" id="c-photo" accept="image/*">${cyl.photo_path ? `<div class="mt-1"><img src="${cyl.photo_path}" class="photo-preview"><br><small class="text-muted">Текущее фото</small></div>` : ''}</div>
            <div class="col-md-3 mb-3"><label class="form-label">Тип газа</label><input class="form-control" id="c-gas" value="${esc(cyl.gas_type||'')}" placeholder="КПГ / метан"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Дата изгот.</label><input class="form-control" type="date" id="c-mdate" value="${cyl.manufactured_date||''}"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Объём, л</label><input class="form-control" type="number" step="0.1" id="c-capacity" value="${cyl.capacity_liters||''}"></div>
            <div class="col-md-3 mb-3"><label class="form-label">Раб. давление, МПа</label><input class="form-control" type="number" step="0.1" id="c-wpressure" value="${cyl.working_pressure||''}"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Пробное давление, МПа</label><input class="form-control" type="number" step="0.1" id="c-tpressure" value="${cyl.test_pressure||''}"></div>
            <div class="col-md-4 mb-3"><label class="form-label">Масса, кг</label><input class="form-control" type="number" step="0.1" id="c-weight" value="${cyl.tare_weight||''}"></div>
            <div class="col-md-4 mb-3"><label class="form-label">След. освидетел.</label><input class="form-control" type="date" id="c-next" value="${cyl.next_inspection_date||''}"></div>
        </div>
    `, async () => {
        await api(`/cylinders/${id}`, { method: 'PUT', body: JSON.stringify({
            fleet_id: +$('#c-fleet').value, bus_id: $('#c-bus').value ? +$('#c-bus').value : null,
            number: $('#c-number').value, stamp: $('#c-stamp').value, serial_number: $('#c-serial').value,
            gas_type: $('#c-gas').value, manufactured_date: $('#c-mdate').value || null,
            capacity_liters: $('#c-capacity').value ? +$('#c-capacity').value : null,
            working_pressure: $('#c-wpressure').value ? +$('#c-wpressure').value : null,
            test_pressure: $('#c-tpressure').value ? +$('#c-tpressure').value : null,
            tare_weight: $('#c-weight').value ? +$('#c-weight').value : null,
            next_inspection_date: $('#c-next').value || null,
            status: cyl.status,
        })});
        const photoInput = document.getElementById('c-photo');
        if (photoInput && photoInput.files[0]) {
            const fd = new FormData();
            fd.append('file', photoInput.files[0]);
            await fetch(API + `/cylinders/${id}/photo`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: fd });
        }
        renderCylinders(); toast('Баллон обновлён', 'success');
    });
}
async function deleteCylinder(id) {
    await api(`/cylinders/${id}`, { method: 'DELETE' });
    renderCylinders(); toast('Удалён', 'success');
}

// ── Inspections ─────────────────────────────────────────────────────────────

async function renderInspections() {
    const insp = await api('/inspections');
    const rows = insp.map(i => `
        <tr><td>${i.inspection_date}</td><td>${i.inspection_type}</td><td><span class="badge bg-${i.result==='pass'?'success':i.result==='fail'?'danger':'warning'}">${i.result}</span></td><td>${i.inspector || ''}</td><td>${i.next_inspection_date || ''}</td><td>${i.notes || ''}</td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Испытания</h4><button class="btn btn-primary" onclick="addInspection()"><i class="bi bi-plus-lg"></i> Добавить</button></div>
    <table class="table table-hover mt-3"><thead><tr><th>Дата</th><th>Тип</th><th>Результат</th><th>Инспектор</th><th>След. исп.</th><th>Заметки</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="text-muted">Нет испытаний</td></tr>'}</tbody></table>`;
}

async function addInspection() {
    const cylinders = await api('/cylinders');
    const copts = cylinders.map(c => `<option value="${c.id}">${c.number} — ${c.stamp || ''}</option>`).join('');
    modal('Добавить испытание', `
        <div class="row">
            <div class="col-md-6 mb-3"><label class="form-label">Баллон</label><select class="form-select" id="i-cyl">${copts}</select></div>
            <div class="col-md-6 mb-3"><label class="form-label">Дата испытания</label><input class="form-control" type="date" id="i-date" required></div>
            <div class="col-md-4 mb-3"><label class="form-label">Тип</label><select class="form-select" id="i-type"><option value="standard">Стандартное</option><option value="extended">Расширенное</option><option value="hydraulic">Гидравлическое</option><option value="pneumatic">Пневматическое</option></select></div>
            <div class="col-md-4 mb-3"><label class="form-label">Результат</label><select class="form-select" id="i-result"><option value="pass">Пройдено</option><option value="fail">Не пройдено</option><option value="pending">На проверке</option></select></div>
            <div class="col-md-4 mb-3"><label class="form-label">След. освидетел.</label><input class="form-control" type="date" id="i-next"></div>
            <div class="col-md-6 mb-3"><label class="form-label">Инспектор</label><input class="form-control" id="i-inspector"></div>
            <div class="col-md-6 mb-3"><label class="form-label">Достигнутое давление (МПа)</label><input class="form-control" type="number" step="0.1" id="i-pressure"></div>
        </div>
        <h6 class="mt-2">Проведённые проверки:</h6>
        <div class="row">
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-visual"> Визуальный осмотр</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-hydro"> Гидроиспытание</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-pneumo"> Пневмоиспытание</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-weight"> Проверка массы</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-ultra"> УЗК толщины</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-defecto"> Дефектоскопия</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-powder"> Порошковая дефектоскопия</label></div>
            <div class="col-md-4"><label class="form-check-label"><input class="form-check-input" type="checkbox" id="i-magnetic"> Магнитная дефектоскопия</label></div>
        </div>
        <div class="mt-3"><label class="form-label">Заметки</label><textarea class="form-control" id="i-notes"></textarea></div>
    `, async () => {
        await api('/inspections', { method: 'POST', body: JSON.stringify({
            cylinder_id: +$('#i-cyl').value, inspection_date: $('#i-date').value,
            inspection_type: $('#i-type').value, result: $('#i-result').value,
            next_inspection_date: $('#i-next').value || null, inspector: $('#i-inspector').value,
            visual_inspection: $('#i-visual').checked, hydraulic_test: $('#i-hydro').checked,
            pneumatic_test: $('#i-pneumo').checked, weight_check: $('#i-weight').checked,
            ultrasonic_thickness: $('#i-ultra').checked, defectoscopy: $('#i-defecto').checked,
            powder_test: $('#i-powder').checked, magnetic_test: $('#i-magnetic').checked,
            pressure_achieved: $('#i-pressure').value ? +$('#i-pressure').value : null,
            notes: $('#i-notes').value,
        })});
        renderInspections(); toast('Испытание записано', 'success');
    });
}

// ── Repairs ─────────────────────────────────────────────────────────────────

async function renderRepairs() {
    const repairs = await api('/repairs');
    const rows = repairs.map(r => `
        <tr><td>${r.repair_date}</td><td>${esc(r.description)}</td><td>${r.cost || ''}</td><td>${r.technician || ''}</td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Ремонт</h4><button class="btn btn-primary" onclick="addRepair()"><i class="bi bi-plus-lg"></i> Добавить</button></div>
    <table class="table table-hover mt-3"><thead><tr><th>Дата</th><th>Описание</th><th>Стоимость</th><th>Техник</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="text-muted">Нет ремонтов</td></tr>'}</tbody></table>`;
}

async function addRepair() {
    const [fleets, buses, cylinders] = await Promise.all([api('/fleets'), api('/buses'), api('/cylinders')]);
    const fopts = fleets.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    const bopts = '<option value="">—</option>' + buses.map(b => `<option value="${b.id}">${b.gosnomer}</option>`).join('');
    const copts = '<option value="">—</option>' + cylinders.map(c => `<option value="${c.id}">${c.number}</option>`).join('');
    modal('Добавить ремонт', `
        <div class="mb-3"><label class="form-label">Автопарк</label><select class="form-select" id="r-fleet">${fopts}</select></div>
        <div class="mb-3"><label class="form-label">Автобус</label><select class="form-select" id="r-bus">${bopts}</select></div>
        <div class="mb-3"><label class="form-label">Баллон</label><select class="form-select" id="r-cyl">${copts}</select></div>
        <div class="mb-3"><label class="form-label">Дата</label><input class="form-control" type="date" id="r-date" required></div>
        <div class="mb-3"><label class="form-label">Описание</label><textarea class="form-control" id="r-desc" required></textarea></div>
        <div class="mb-3"><label class="form-label">Заменённые детали</label><input class="form-control" id="r-parts"></div>
        <div class="row"><div class="col-md-6 mb-3"><label class="form-label">Стоимость</label><input class="form-control" type="number" step="0.01" id="r-cost"></div><div class="col-md-6 mb-3"><label class="form-label">Техник</label><input class="form-control" id="r-tech"></div></div>
        <div class="mb-3"><label class="form-label">Заметки</label><textarea class="form-control" id="r-notes"></textarea></div>
    `, async () => {
        await api('/repairs', { method: 'POST', body: JSON.stringify({
            fleet_id: +$('#r-fleet').value, bus_id: $('#r-bus').value ? +$('#r-bus').value : null,
            cylinder_id: $('#r-cyl').value ? +$('#r-cyl').value : null,
            repair_date: $('#r-date').value, description: $('#r-desc').value,
            parts_replaced: $('#r-parts').value, cost: $('#r-cost').value ? +$('#r-cost').value : null,
            technician: $('#r-tech').value, notes: $('#r-notes').value,
        })});
        renderRepairs(); toast('Ремонт записан', 'success');
    });
}

// ── Stock ───────────────────────────────────────────────────────────────────

let stockFleetFilter = null;

async function renderStock() {
    const qs = stockFleetFilter ? `?fleet_id=${stockFleetFilter}` : '';
    const [items, fleets] = await Promise.all([api(`/stock${qs}`), api('/fleets')]);
    const fleetMap = Object.fromEntries(fleets.map(f => [f.id, f.name]));
    const rows = items.map(it => `
        <tr class="${it.quantity <= it.min_quantity ? 'table-warning' : ''}">
            <td>${fleetMap[it.fleet_id] || ''}</td><td>${esc(it.name)}</td><td>${it.category || ''}</td>
            <td>${it.quantity} ${it.unit}</td><td>${it.min_quantity}</td><td>${it.price || ''}</td>
            <td>
                <button class="btn btn-sm btn-outline-success me-1" onclick="stockTx(${it.id},'in')" title="Приход">+</button>
                <button class="btn btn-sm btn-outline-danger me-1" onclick="stockTx(${it.id},'out')" title="Расход">−</button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editStockItem(${it.id})"><i class="bi bi-pencil"></i></button>
            </td>
        </tr>`).join('');
    const fopts = '<option value="">Все автопарки</option>' + fleets.map(f => `<option value="${f.id}" ${stockFleetFilter === f.id ? 'selected' : ''}>${f.name}</option>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Склад</h4><button class="btn btn-primary" onclick="addStockItem()"><i class="bi bi-plus-lg"></i> Добавить</button></div>
    <div class="row mt-3"><div class="col-md-4"><select class="form-select" id="stock-fleet-filter" onchange="stockFleetFilter=this.value?+this.value:null;renderStock()">${fopts}</select></div></div>
    <table class="table table-hover mt-2"><thead><tr><th>Автопарк</th><th>Название</th><th>Категория</th><th>Кол-во</th><th>Мин.</th><th>Цена</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="text-muted">Склад пуст</td></tr>'}</tbody></table>`;
}

async function addStockItem() {
    const fleets = await api('/fleets');
    const fopts = fleets.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    modal('Добавить товар', `
        <div class="mb-3"><label>Автопарк</label><select class="form-select" id="si-fleet">${fopts}</select></div>
        <div class="mb-3"><label>Название</label><input class="form-control" id="si-name" required></div>
        <div class="mb-3"><label>Категория</label><input class="form-control" id="si-cat"></div>
        <div class="row"><div class="col-md-4 mb-3"><label>Количество</label><input class="form-control" type="number" step="0.01" id="si-qty" value="0"></div>
        <div class="col-md-4 mb-3"><label>Ед. изм.</label><input class="form-control" id="si-unit" value="шт"></div>
        <div class="col-md-4 mb-3"><label>Мин. остаток</label><input class="form-control" type="number" id="si-min" value="0"></div></div>
        <div class="mb-3"><label>Цена</label><input class="form-control" type="number" step="0.01" id="si-price"></div>
    `, async () => {
        await api('/stock', { method: 'POST', body: JSON.stringify({
            fleet_id: +$('#si-fleet').value, name: $('#si-name').value, category: $('#si-cat').value,
            quantity: +$('#si-qty').value, unit: $('#si-unit').value, min_quantity: +$('#si-min').value,
            price: $('#si-price').value ? +$('#si-price').value : null,
        })});
        renderStock(); toast('Товар добавлен', 'success');
    });
}

async function stockTx(itemId, type) {
    const qty = prompt(`Количество (${type === 'in' ? 'приход' : 'расход'}):`);
    if (!qty) return;
    await api('/stock/transaction', { method: 'POST', body: JSON.stringify({
        stock_item_id: itemId, fleet_id: stockFleetFilter || (await api('/fleets'))[0]?.id,
        transaction_type: type, quantity: +qty,
    })});
    renderStock(); toast('Операция выполнена', 'success');
}

async function editStockItem(id) { /* pattern */ }

// ── Reports ─────────────────────────────────────────────────────────────────

async function renderReports() {
    const [summary, upcoming] = await Promise.all([
        api('/reports/summary'), api('/reports/upcoming-inspections?days=90')
    ]);
    const sRows = summary.map(s => `
        <tr><td>${s.fleet_name}</td><td>${s.buses}</td><td>${s.cylinders}</td><td class="text-danger fw-bold">${s.overdue_inspections}</td><td>${s.total_repair_cost.toLocaleString()} ₽</td><td>${s.stock_items} / ${s.low_stock_items}<span class="text-warning">⚠</span></td></tr>`).join('');
    const uRows = upcoming.map(c => `
        <tr><td>${esc(c.number)}</td><td>${esc(c.stamp) || ''}</td><td>${esc(c.gas_type) || ''}</td><td>${c.next_inspection_date}</td><td>${c.status}</td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Отчёты</h4><button class="btn btn-success" onclick="exportExcel()"><i class="bi bi-file-earmark-excel"></i> Экспорт Excel</button></div>
    <h5 class="mt-4">Сводка по автопаркам</h5>
    <table class="table table-hover"><thead><tr><th>Автопарк</th><th>Автобусы</th><th>Баллоны</th><th>Просрочены</th><th>Затраты на ремонт</th><th>Склад (всего / ↓)</th></tr></thead><tbody>${sRows || '<tr><td colspan="6" class="text-muted">Нет данных</td></tr>'}</tbody></table>
    <h5 class="mt-4">Предстоящие испытания (90 дней)</h5>
    <table class="table table-hover"><thead><tr><th>Баллон</th><th>Клеймо</th><th>Газ</th><th>Дата</th><th>Статус</th></tr></thead><tbody>${uRows || '<tr><td colspan="5" class="text-muted">Нет предстоящих</td></tr>'}</tbody></table>`;
}

async function exportExcel() {
    const data = await api('/reports/export');
    const blob = new Blob([new Uint8Array(data.data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = data.filename || 'cylinders.xlsx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast('Отчёт скачан', 'success');
}

// ── Users ───────────────────────────────────────────────────────────────────

async function renderUsers() {
    const users = await api('/auth/users');
    const rows = users.map(u => `
        <tr><td>${esc(u.username)}</td><td>${esc(u.full_name)}</td><td><span class="badge bg-${u.role==='admin'?'danger':u.role==='worker'?'primary':'secondary'}">${u.role}</span></td><td>${u.fleet_id || '—'}</td><td>${u.is_active ? '✓' : '✗'}</td></tr>`).join('');
    document.getElementById('page-content').innerHTML = `
    <div class="d-flex justify-content-between"><h4>Пользователи</h4><button class="btn btn-primary" onclick="addUser()"><i class="bi bi-person-plus"></i> Добавить</button></div>
    <table class="table table-hover mt-3"><thead><tr><th>Логин</th><th>ФИО</th><th>Роль</th><th>Автопарк</th><th>Активен</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function addUser() {
    const fleets = await api('/fleets');
    const fopts = '<option value="">— Все —</option>' + fleets.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    modal('Добавить пользователя', `
        <div class="mb-3"><label>Логин</label><input class="form-control" id="u-login" required></div>
        <div class="mb-3"><label>Пароль</label><input class="form-control" type="password" id="u-pass" required></div>
        <div class="mb-3"><label>ФИО</label><input class="form-control" id="u-name"></div>
        <div class="mb-3"><label>Роль</label><select class="form-select" id="u-role"><option value="worker">Работник</option><option value="observer">Наблюдатель</option><option value="admin">Администратор</option></select></div>
        <div class="mb-3"><label>Автопарк</label><select class="form-select" id="u-fleet">${fopts}</select></div>
    `, async () => {
        await api('/auth/users', { method: 'POST', body: JSON.stringify({
            username: $('#u-login').value, password: $('#u-pass').value, full_name: $('#u-name').value,
            role: $('#u-role').value, fleet_id: $('#u-fleet').value ? +$('#u-fleet').value : null,
        })});
        renderUsers(); toast('Пользователь создан', 'success');
    });
}

// ── Settings ─────────────────────────────────────────────────────────────────

async function renderSettings() {
    const ns = await api('/notifications/settings');
    document.getElementById('page-content').innerHTML = `
    <h4>Настройки уведомлений</h4>
    <div class="card mt-3"><div class="card-body">
        <div class="mb-3"><label class="form-label">Telegram Bot Token</label><input class="form-control" id="ns-token" value="${esc(ns.telegram_bot_token||'')}" placeholder="123456:ABC-DEF..."></div>
        <div class="mb-3"><label class="form-label">Telegram Chat ID</label><input class="form-control" id="ns-chat" value="${esc(ns.telegram_chat_id||'')}" placeholder="123456789"></div>
        <hr>
        <h6>Напоминания о повторном освидетельствовании:</h6>
        <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="ns-3m" ${ns.notify_3months?'checked':''}><label class="form-check-label">За 3 месяца</label></div>
        <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="ns-1m" ${ns.notify_1month?'checked':''}><label class="form-check-label">За 1 месяц</label></div>
        <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="ns-1w" ${ns.notify_1week?'checked':''}><label class="form-check-label">За 1 неделю</label></div>
        <div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="ns-overdue" ${ns.notify_overdue?'checked':''}><label class="form-check-label">Просроченные (ежедневно)</label></div>
        <button class="btn btn-primary mt-3" onclick="saveSettings()">Сохранить</button>
    </div></div>`;
}

async function saveSettings() {
    await api('/notifications/settings', { method: 'PUT', body: JSON.stringify({
        telegram_bot_token: $('#ns-token').value, telegram_chat_id: $('#ns-chat').value,
        notify_3months: $('#ns-3m').checked, notify_1month: $('#ns-1m').checked,
        notify_1week: $('#ns-1w').checked, notify_overdue: $('#ns-overdue').checked,
    })});
    toast('Настройки сохранены', 'success');
}

// ── Init ────────────────────────────────────────────────────────────────────

if (TOKEN && USER) { showApp(); }

// ── Auto-login on page load ─────────────────────────────────────────────────
(function() {
    if (TOKEN && USER) {
        // Verify token is still valid
        api('/auth/me').then(() => {
            showApp();
        }).catch(() => {
            logout();
        });
    }
})();
