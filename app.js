document.addEventListener('DOMContentLoaded', () => {
  const settingsButton = document.getElementById('settingsButton');
  const settingsDialog = document.getElementById('settingsDialog');
  const closeSettings = document.getElementById('closeSettings');
  const settingsForm = settingsDialog?.querySelector('form');

  const actionOne = document.getElementById('actionOne');
  const actionTwo = document.getElementById('actionTwo');
  const actionThree = document.getElementById('actionThree');

  // Settings elements
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const operatorName = document.getElementById('operatorName');
  const shiftNumber = document.getElementById('shiftNumber');
  const baseTime = document.getElementById('baseTime');
  const addMachine = document.getElementById('addMachine');
  const newMachine = document.getElementById('newMachine');
  const machinesList = document.getElementById('machinesList');
  const addPart = document.getElementById('addPart');
  const newPart = document.getElementById('newPart');
  const partsContainer = document.getElementById('partsContainer');
  const operationsDialog = document.getElementById('operationsDialog');
  const closeOperations = document.getElementById('closeOperations');
  const operationsContainer = document.getElementById('operationsContainer');

  // Data storage
  const STORAGE_KEY = 'pwa-settings-v1';
  const defaultState = {
    main: { operatorName: '', shiftNumber: 1, baseTime: 600 },
    machines: [],
    parts: [] // each: { id, name, operations: [{name, machineTime, extraTime}] }
  };
  let state = loadState();

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const s = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...s };
    } catch { return structuredClone(defaultState); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function hydrateMain(){
    operatorName.value = state.main.operatorName || '';
    shiftNumber.value = String(state.main.shiftNumber || 1);
    baseTime.value = String(state.main.baseTime || '');
  }
  function bindMain(){
    operatorName.addEventListener('input', () => { state.main.operatorName = operatorName.value; saveState(); renderCalendar(); });
    shiftNumber.addEventListener('change', () => { state.main.shiftNumber = Number(shiftNumber.value); saveState(); renderCalendar(); });
    baseTime.addEventListener('input', () => { state.main.baseTime = Number(baseTime.value || 0); saveState(); });
    // На мобильных при нажатии Enter может происходить submit формы — предотвращаем
    [operatorName, baseTime].forEach(el => el && el.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); }));
  }

  // Tabs logic
  tabs.forEach(tab => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  function selectTab(key){
    tabs.forEach(t => { t.classList.toggle('active', t.dataset.tab === key); t.setAttribute('aria-selected', String(t.dataset.tab === key)); });
    panels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== key));
  }

  // Machines CRUD
  function renderMachines(){
    machinesList.innerHTML = '';
    state.machines = state.machines.slice().sort((a,b)=>a.localeCompare(b,'ru'));
    state.machines.forEach((name, idx) => {
      const li = document.createElement('li');
      const input = document.createElement('input');
      input.value = name; input.type = 'text';
      input.addEventListener('input', () => { state.machines[idx] = input.value; saveState(); });
      const actions = document.createElement('div'); actions.className = 'actions';
      const del = document.createElement('button'); del.type='button'; del.className='icon-only'; del.title='Удалить';
      del.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M9 3a1 1 0 0 0-1 1v1H5v2h14V5h-3V4a1 1 0 0 0-1-1H9Zm-3 6h12l-1 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l-1-9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/></svg>';
      del.addEventListener('click', () => { state.machines.splice(idx,1); saveState(); renderMachines(); });
      actions.appendChild(del);
      li.appendChild(input); li.appendChild(actions);
      machinesList.appendChild(li);
    });
  }
  addMachine?.addEventListener('click', () => {
    const name = (newMachine.value||'').trim(); if (!name) return;
    state.machines.push(name); newMachine.value=''; saveState(); renderMachines();
  });
  newMachine?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addMachine.click(); } });

  // Parts CRUD
  function renderParts(){
    partsContainer.innerHTML = '';
    state.parts = state.parts.slice().sort((a,b)=> (a.name||'').localeCompare(b.name||'', 'ru'));
    state.parts.forEach((part, pIndex) => {
      const item = document.createElement('div'); item.className='part-simple';
      const name = document.createElement('div'); name.className='name'; name.textContent = part.name;
      const actions = document.createElement('div'); actions.className='actions';
      
      const editBtn = document.createElement('button'); editBtn.type='button'; editBtn.className='icon-only'; editBtn.title='Редактировать операции';
      editBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
      editBtn.addEventListener('click', () => { openOperationsDialog(pIndex); });
      
      const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.className='icon-only'; delBtn.title='Удалить деталь';
      delBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M9 3a1 1 0 0 0-1 1v1H5v2h14V5h-3V4a1 1 0 0 0-1-1H9Zm-3 6h12l-1 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l-1-9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/></svg>';
      delBtn.addEventListener('click', () => { state.parts.splice(pIndex,1); saveState(); renderParts(); });
      
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      item.appendChild(name); item.appendChild(actions);
      partsContainer.appendChild(item);
    });
  }

  let currentPartIndex = -1;
  function openOperationsDialog(partIndex){
    currentPartIndex = partIndex;
    const part = state.parts[partIndex];
    document.getElementById('operationsTitle').textContent = `Редактирование: ${part.name}`;
    operationsDialog.showModal();
    renderOperations();
  }

  function renderOperations(){
    if (currentPartIndex === -1) return;
    operationsContainer.innerHTML = '';
    const part = state.parts[currentPartIndex];
    
    // Поле для редактирования названия детали
    const nameRow = document.createElement('div'); 
    nameRow.style.marginBottom = '20px';
    nameRow.style.padding = '16px';
    nameRow.style.backgroundColor = '#1f2937';
    nameRow.style.borderRadius = '8px';
    nameRow.style.border = '1px solid #374151';
    
    const nameLabel = document.createElement('label'); 
    nameLabel.textContent = 'Название детали:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '8px';
    nameLabel.style.fontWeight = '600';
    nameLabel.style.color = '#e5e7eb';
    
    const nameInput = document.createElement('input'); 
    nameInput.type = 'text'; 
    nameInput.placeholder = 'Введите название детали'; 
    nameInput.value = part.name;
    nameInput.style.width = '100%';
    nameInput.style.padding = '12px';
    nameInput.style.fontSize = '16px';
    nameInput.style.fontWeight = 'bold';
    nameInput.style.backgroundColor = '#0f172a';
    nameInput.style.border = '1px solid #374151';
    nameInput.style.borderRadius = '6px';
    nameInput.style.color = '#e5e7eb';
    
    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameInput);
    
    nameInput.addEventListener('input', () => { 
      part.name = nameInput.value; 
      saveState(); 
      // Обновляем заголовок диалога
      document.getElementById('operationsTitle').textContent = `Редактирование: ${part.name}`;
      // Обновляем список деталей
      renderParts();
    });
    
    operationsContainer.appendChild(nameRow);
    
    // Заголовок для операций
    const operationsHeader = document.createElement('div');
    operationsHeader.style.marginTop = '24px';
    operationsHeader.style.marginBottom = '16px';
    operationsHeader.style.fontSize = '18px';
    operationsHeader.style.fontWeight = '600';
    operationsHeader.style.color = '#e5e7eb';
    operationsHeader.textContent = 'Операции:';
    operationsContainer.appendChild(operationsHeader);
    
    part.operations.forEach((op, oIndex) => {
      const row = document.createElement('div'); row.className='op-row';
      const opNameWrap = document.createElement('div'); opNameWrap.className='field-inline';
      const opNameLabel = document.createElement('label'); opNameLabel.textContent='Операция';
      const opName = document.createElement('input'); opName.type='text'; opName.placeholder='Операция'; opName.value = op.name;
      opNameWrap.appendChild(opNameLabel); opNameWrap.appendChild(opName);
      opName.addEventListener('input', () => { op.name = opName.value; saveState(); });
      
      const machineTimeWrap = document.createElement('div'); machineTimeWrap.className='field-inline';
      const machineTimeLabel = document.createElement('label'); machineTimeLabel.textContent='Машинное время (мин)';
      const machineTime = document.createElement('input'); machineTime.type='number'; machineTime.placeholder='Машинное время (мин)'; machineTime.value = String(op.machineTime||0);
      machineTimeWrap.appendChild(machineTimeLabel); machineTimeWrap.appendChild(machineTime);
      machineTime.addEventListener('input', () => { op.machineTime = Number(machineTime.value||0); saveState(); });
      
      const extraTimeWrap = document.createElement('div'); extraTimeWrap.className='field-inline';
      const extraTimeLabel = document.createElement('label'); extraTimeLabel.textContent='Доп. время (мин)';
      const extraTime = document.createElement('input'); extraTime.type='number'; extraTime.placeholder='Доп. время (мин)'; extraTime.value = String(op.extraTime||0);
      extraTimeWrap.appendChild(extraTimeLabel); extraTimeWrap.appendChild(extraTime);
      extraTime.addEventListener('input', () => { op.extraTime = Number(extraTime.value||0); saveState(); });
      
      // Ячейка с суммой
      const totalWrap = document.createElement('div'); totalWrap.className='field-inline';
      const totalLabel = document.createElement('label'); totalLabel.textContent='Итого (мин)';
      const totalDisplay = document.createElement('div'); 
      totalDisplay.style.padding = '12px';
      totalDisplay.style.background = 'var(--card)';
      totalDisplay.style.border = '1px solid rgba(255,255,255,0.1)';
      totalDisplay.style.borderRadius = 'var(--border-radius-sm)';
      totalDisplay.style.fontWeight = '600';
      totalDisplay.style.color = 'var(--primary)';
      totalDisplay.style.textAlign = 'center';
      totalWrap.appendChild(totalLabel); totalWrap.appendChild(totalDisplay);
      
      // Функция обновления суммы
      const updateTotal = () => {
        const machine = Number(machineTime.value||0);
        const extra = Number(extraTime.value||0);
        totalDisplay.textContent = machine + extra;
      };
      
      machineTime.addEventListener('input', updateTotal);
      extraTime.addEventListener('input', updateTotal);
      updateTotal(); // Инициализация
      
      const del = document.createElement('button'); del.type='button'; del.className='icon-only'; del.title='Удалить операцию';
      del.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M9 3a1 1 0 0 0-1 1v1H5v2h14V5h-3V4a1 1 0 0 0-1-1H9Zm-3 6h12l-1 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l-1-9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/></svg>';
      del.addEventListener('click', () => { part.operations.splice(oIndex,1); saveState(); renderOperations(); });
      
      row.appendChild(opNameWrap); row.appendChild(machineTimeWrap); row.appendChild(extraTimeWrap); row.appendChild(totalWrap); row.appendChild(del);
      operationsContainer.appendChild(row);
    });
    
    // Кнопка добавления операции
    const addRow = document.createElement('div'); addRow.className='op-row';
    const addBtn = document.createElement('button'); addBtn.type='button'; addBtn.className='primary'; addBtn.textContent='Добавить операцию';
    addBtn.addEventListener('click', () => { 
      part.operations.push({ name:'', machineTime:0, extraTime:0 }); 
      saveState(); 
      renderOperations(); 
    });
    addRow.appendChild(addBtn);
    operationsContainer.appendChild(addRow);
  }

  addPart?.addEventListener('click', () => {
    const name = (newPart.value||'').trim(); if (!name) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
    state.parts.push({ id, name, operations: [] });
    newPart.value=''; saveState(); renderParts();
  });
  newPart?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPart.click(); } });

  // Calendar (shift schedule)
  const dataDialog = document.getElementById('dataDialog');
  const closeData = document.getElementById('closeData');
  const monthLabel = document.getElementById('monthLabel');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');
  const calendar = document.getElementById('calendar');

  let current = new Date();
  current.setDate(1);

  function openDataEntry(){
    dataDialog.showModal();
    renderCalendar();
  }

  function formatMonth(date){
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  // Shift cycle mapping based on description
  // Cycle days (14): D,D,Off,Off,D,D,Off,Off,N,N,Off,Off,N,N,Off,Off (16 actually) -> per spec two day (2D) +2 off +2 day +2 off +2 night +2 off +2 night +2 off = 16 days
  // We'll implement 16-day cycle: [D,D,O,O,D,D,O,O,N,N,O,O,N,N,O,O]
  const CYCLE = ['D','D','O','O','D','D','O','O','N','N','O','O','N','N','O','O'];
  const ANCHOR = new Date(Date.UTC(2025, 9, 11)); // 11 Oct 2025 UTC to avoid TZ
  // For shiftNumber 1-4 at anchor day: shift1 starts with first night (N), shift2 first day (D), shift3 off (O), shift4 off (O)
  const SHIFT_OFFSETS = { 1: 8, 2: 0, 3: 2, 4: 3 }; // choose offsets so that on 2025-10-11: 1->N, 2->D

  function getShiftType(date){
    // compute days since anchor
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const days = Math.floor((d - ANCHOR) / (24*3600*1000));
    const baseIndex = ((days % CYCLE.length) + CYCLE.length) % CYCLE.length;
    const shiftIdx = (baseIndex + (SHIFT_OFFSETS[state.main.shiftNumber]||0)) % CYCLE.length;
    return CYCLE[shiftIdx];
  }

  function renderCalendar(){
    if (!calendar || !monthLabel) return;
    monthLabel.textContent = formatMonth(current);
    calendar.innerHTML = '';
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // make Monday=0
    const daysInMonth = new Date(year, month+1, 0).getDate();

    // Weekday headers
    const weekDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    weekDays.forEach(w => {
      const h = document.createElement('div'); h.className='cell header'; h.textContent = w; calendar.appendChild(h);
    });

    for (let i=0;i<startWeekday;i++) {
      const empty = document.createElement('div'); empty.className='cell empty'; calendar.appendChild(empty);
    }
    for (let day=1; day<=daysInMonth; day++){
      const date = new Date(year, month, day);
      const type = getShiftType(date);
      const cell = document.createElement('div'); cell.className='cell';
      cell.classList.add(type==='D' ? 'day' : type==='N' ? 'night' : 'off');
      const today = new Date();
      if (today.getFullYear()===year && today.getMonth()===month && today.getDate()===day){
        cell.classList.add('today');
      }
      const d = document.createElement('div'); d.className='date'; d.textContent = String(day);
      const mark = document.createElement('sup');
      if (type === 'D') { mark.textContent = 'Д'; mark.className = 'shift-mark day'; }
      else if (type === 'N') { mark.textContent = 'Н'; mark.className = 'shift-mark night'; }
      d.appendChild(mark);
      cell.appendChild(d);
      if (isHoliday(date)){
        const corner = document.createElement('div'); corner.className='holiday-corner'; cell.appendChild(corner);
      }
      calendar.appendChild(cell);
    }
  }

  // Производственный календарь РФ (нерабочие праздничные дни + переносы). Пока набор для 2025.
  const HOLIDAYS_BY_YEAR = new Map([
    [2025, new Set([
      // Январские каникулы
      '2025-01-01','2025-01-02','2025-01-03','2025-01-04','2025-01-05','2025-01-06','2025-01-07','2025-01-08',
      // Февраль: сам праздник 23.02 (вс), перенос на 08.05
      '2025-02-23',
      // Март: 08.03 (сб), перенос на 13.06
      '2025-03-08',
      // Май: 01.05, 02.05 (перенос с 04.01), 08.05 (перенос с 23.02), 09.05
      '2025-05-01','2025-05-02','2025-05-08','2025-05-09',
      // Июнь: 12.06 и перенос 13.06 (с 08.03)
      '2025-06-12','2025-06-13',
      // Ноябрь: 03.11 (перенос с 01.11), 04.11
      '2025-11-03','2025-11-04',
      // Перенос с 05.01 на 31.12
      '2025-12-31'
    ])]
  ]);

  function fmtDateISO(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function addDays(date, n){ const d = new Date(date); d.setDate(d.getDate()+n); return d; }

  // Генерация набора праздников по общим правилам для лет, где нет явной таблицы.
  function computeDefaultHolidays(year){
    const set = new Set();
    // 1-8 января — всегда нерабочие
    for(let d=1; d<=8; d++) set.add(`${year}-01-${String(d).padStart(2,'0')}`);
    const base = ['-02-23','-03-08','-05-01','-05-09','-06-12','-11-04'];
    base.forEach(suf => {
      const date = new Date(`${year}${suf}T00:00:00`);
      set.add(fmtDateISO(date));
      const dow = date.getDay(); // 0=Sun 6=Sat
      if (dow === 0) { // воскресенье → перенос на понедельник
        set.add(fmtDateISO(addDays(date,1)));
      } else if (dow === 6) { // суббота → перенос на понедельник
        set.add(fmtDateISO(addDays(date,2)));
      }
    });
    return set;
  }

  function isHoliday(date){
    const year = date.getFullYear();
    let set = HOLIDAYS_BY_YEAR.get(year);
    if (!set) {
      set = computeDefaultHolidays(year);
      HOLIDAYS_BY_YEAR.set(year, set);
    }
    return set.has(fmtDateISO(date));
  }

  prevMonth?.addEventListener('click', () => { current.setMonth(current.getMonth()-1); renderCalendar(); });
  nextMonth?.addEventListener('click', () => { current.setMonth(current.getMonth()+1); renderCalendar(); });

  // Settings dialog open/close
  settingsButton?.addEventListener('click', () => {
    if (!settingsDialog.open) settingsDialog.showModal();
  });
  closeSettings?.addEventListener('click', () => settingsDialog.close());
  // Only close via explicit buttons (Save/Cancel). Disable backdrop auto-close.
  // Prevent implicit form submissions inside the dialog unless Save/Cancel pressed.
  settingsForm?.addEventListener('submit', (e) => {
    const submitter = e.submitter; // modern browsers
    const isExplicit = submitter && (submitter.value === 'default' || submitter.value === 'cancel');
    if (!isExplicit) e.preventDefault();
  });

  const dataForm = dataDialog?.querySelector('form');
  dataForm?.addEventListener('submit', (e) => {
    const submitter = e.submitter;
    const isExplicit = submitter && (submitter.value === 'cancel');
    if (!isExplicit) e.preventDefault();
  });
  closeData?.addEventListener('click', () => dataDialog.close());

  const operationsForm = operationsDialog?.querySelector('form');
  operationsForm?.addEventListener('submit', (e) => {
    const submitter = e.submitter;
    const isExplicit = submitter && (submitter.value === 'cancel');
    if (!isExplicit) e.preventDefault();
  });
  closeOperations?.addEventListener('click', () => operationsDialog.close());

  // Stubs for future functions
  actionOne?.addEventListener('click', () => {
    selectTab('main');
    openDataEntry();
  });
  actionTwo?.addEventListener('click', () => {
    console.log('Действие 2: заглушка');
  });
  actionThree?.addEventListener('click', () => {
    console.log('Действие 3: заглушка');
  });


  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((registration) => {
        console.log('SW registered successfully');
        
        // Проверяем обновления при загрузке
        registration.addEventListener('updatefound', () => {
          console.log('New SW version found, updating...');
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('New SW activated, reloading...');
              location.reload();
            }
          });
        });
      }).catch((err) => {
        console.warn('SW registration failed', err);
      });
    });
    
    // Слушаем сообщения от Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('Service Worker updated, reloading page...');
        location.reload();
      }
    });
  }


  // Init
  hydrateMain();
  bindMain();
  renderMachines();
  renderParts();
});