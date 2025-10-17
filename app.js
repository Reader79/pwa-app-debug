document.addEventListener('DOMContentLoaded', () => {
  const settingsButton = document.getElementById('settingsButton');
  const settingsDialog = document.getElementById('settingsDialog');
  const closeSettings = document.getElementById('closeSettings');
  const settingsForm = settingsDialog?.querySelector('form');
  
  // Элементы экспорта/импорта
  const exportData = document.getElementById('exportData');
  const selectFile = document.getElementById('selectFile');
  const importFile = document.getElementById('importFile');
  const importData = document.getElementById('importData');
  const importStatus = document.getElementById('importStatus');

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
  
  // Элементы диалога добавления записи
  const addRecordDialog = document.getElementById('addRecordDialog');
  const closeAddRecord = document.getElementById('closeAddRecord');
  const recordDate = document.getElementById('recordDate');
  const shiftTypeDisplay = document.getElementById('shiftTypeDisplay');
  const recordMachine = document.getElementById('recordMachine');
  const recordPart = document.getElementById('recordPart');
  const recordOperation = document.getElementById('recordOperation');
  const recordMachineTime = document.getElementById('recordMachineTime');
  const recordExtraTime = document.getElementById('recordExtraTime');
  const recordQuantity = document.getElementById('recordQuantity');
  const totalTimeDisplay = document.getElementById('totalTimeDisplay');
  const addRecordEntry = document.getElementById('addRecordEntry');
  const saveRecord = document.getElementById('saveRecord');
  const entriesList = document.getElementById('entriesList');
  const entriesContainer = document.getElementById('entriesContainer');

  // Data storage
  const STORAGE_KEY = 'pwa-settings-v1';
  const defaultState = {
    main: { operatorName: '', shiftNumber: 1, baseTime: 600 },
    machines: [],
    parts: [], // each: { id, name, operations: [{name, machineTime, extraTime}] }
    records: [] // each: { id, date, shiftType, entries: [{machine, part, operation, machineTime, extraTime, quantity, totalTime}] }
  };
  let state = loadState();
  
  // Переменные для работы с записями
  let currentRecord = null;
  let currentEntries = [];
  let selectedDate = null;

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const s = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...s };
    } catch { return structuredClone(defaultState); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  // Функции для работы с записями
  function getShiftTypeForRecord(date, shiftNumber) {
    // Логика определения типа смены по дате и номеру смены
    // 16-дневный цикл: [D,D,O,O,D,D,O,O,N,N,O,O,N,N,O,O]
    const anchorDate = new Date('2025-10-11'); // Якорная дата
    const targetDate = new Date(date);
    const daysDiff = Math.floor((targetDate - anchorDate) / (1000 * 60 * 60 * 24));
    const cyclePosition = ((daysDiff % 16) + 16) % 16;
    
    const cycle = ['D','D','O','O','D','D','O','O','N','N','O','O','N','N','O','O'];
    const shiftOffset = (shiftNumber - 1) * 4; // Смещение для разных смен
    const actualPosition = (cyclePosition + shiftOffset) % 16;
    
    return cycle[actualPosition];
  }

  function calculateTotalTime(machineTime, extraTime, quantity) {
    return (machineTime + extraTime) * quantity;
  }

  function calculateCoefficient(totalTime, baseTime) {
    return Math.round((totalTime / baseTime) * 100) / 100;
  }

  // Функции для работы с диалогом добавления записи
  function openAddRecordDialog(date = null) {
    addRecordDialog.showModal();
    currentRecord = null;
    currentEntries = [];
    
    if (date) {
      recordDate.value = date;
    } else {
      recordDate.value = new Date().toISOString().split('T')[0];
    }
    
    updateShiftType();
    updateMachineOptions();
    updatePartOptions();
    updateOperationOptions();
    updateTotalTime();
    hideEntriesList();
  }

  function updateShiftType() {
    const date = recordDate.value;
    const shiftNumber = state.main.shiftNumber;
    const shiftType = getShiftType(new Date(date));
    
    let displayText = '';
    switch(shiftType) {
      case 'D': displayText = 'Дневная смена'; break;
      case 'N': displayText = 'Ночная смена'; break;
      case 'O': displayText = 'Выходной день'; break;
    }
    
    shiftTypeDisplay.textContent = displayText;
  }

  function updateMachineOptions() {
    recordMachine.innerHTML = '<option value="">Выберите станок</option>';
    state.machines.forEach(machine => {
      const option = document.createElement('option');
      option.value = machine;
      option.textContent = machine;
      recordMachine.appendChild(option);
    });
  }

  function updatePartOptions() {
    recordPart.innerHTML = '<option value="">Выберите деталь</option>';
    state.parts.forEach(part => {
      const option = document.createElement('option');
      option.value = part.id;
      option.textContent = part.name;
      recordPart.appendChild(option);
    });
  }

  function updateOperationOptions() {
    recordOperation.innerHTML = '<option value="">Выберите операцию</option>';
    const selectedPartId = recordPart.value;
    if (selectedPartId) {
      const part = state.parts.find(p => p.id === selectedPartId);
      if (part && part.operations) {
        part.operations.forEach(op => {
          const option = document.createElement('option');
          option.value = op.name;
          option.textContent = op.name;
          option.dataset.machineTime = op.machineTime || 0;
          option.dataset.extraTime = op.extraTime || 0;
          recordOperation.appendChild(option);
        });
      }
    }
  }

  function updateTotalTime() {
    const machineTime = parseFloat(recordMachineTime.value) || 0;
    const extraTime = parseFloat(recordExtraTime.value) || 0;
    const quantity = parseInt(recordQuantity.value) || 0;
    const total = calculateTotalTime(machineTime, extraTime, quantity);
    totalTimeDisplay.textContent = `${total} мин`;
  }

  function showEntriesList() {
    entriesList.style.display = 'block';
  }

  function hideEntriesList() {
    entriesList.style.display = 'none';
  }

  function renderEntries() {
    entriesContainer.innerHTML = '';
    currentEntries.forEach((entry, index) => {
      const entryDiv = document.createElement('div');
      entryDiv.style.cssText = 'padding: 12px; margin: 8px 0; background: var(--card); border-radius: var(--border-radius-sm); border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';
      
      entryDiv.innerHTML = `
        <div>
          <strong>${entry.machine}</strong> - ${entry.part} - ${entry.operation}<br>
          <small>Время: ${entry.machineTime}+${entry.extraTime} мин × ${entry.quantity} = ${entry.totalTime} мин</small>
        </div>
        <button type="button" class="icon-only" onclick="window.removeEntry(${index})" title="Удалить">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="currentColor" d="M9 3a1 1 0 0 0-1 1v1H5v2h14V5h-3V4a1 1 0 0 0-1-1H9Zm-3 6h12l-1 9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l-1-9Zm4 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z"/>
          </svg>
        </button>
      `;
      
      entriesContainer.appendChild(entryDiv);
    });
  }

  function removeEntry(index) {
    currentEntries.splice(index, 1);
    renderEntries();
    if (currentEntries.length === 0) {
      hideEntriesList();
    }
  }
  
  // Делаем функцию глобальной
  window.removeEntry = removeEntry;

  // Функции для отображения результатов
  function showResults(date) {
    console.log('showResults called with date:', date);
    const resultsSection = document.getElementById('resultsSection');
    const resultsTitle = document.getElementById('resultsTitle');
    const resultsContainer = document.getElementById('resultsContainer');
    
    console.log('Elements found:', { resultsSection, resultsTitle, resultsContainer });
    
    if (!resultsSection || !resultsTitle || !resultsContainer) {
      console.error('Required elements not found');
      return;
    }
    
    console.log('Looking for record with date:', date);
    console.log('Available records:', state.records);
    
    const record = state.records.find(r => r.date === date);
    console.log('Found record:', record);
    
    if (!record) {
      console.log('No record found, hiding results section');
      resultsSection.style.display = 'none';
      return;
    }
    
    const shiftTypeText = record.shiftType === 'D' ? 'Дневная смена' : 
                         record.shiftType === 'N' ? 'Ночная смена' : 
                         record.shiftType === 'O' ? 'Выходной день' : 'Неизвестно';
    
    resultsTitle.textContent = `Результаты работы - ${formatDate(date)}, ${shiftTypeText}`;
    resultsContainer.innerHTML = '';
    
    // Группировка по станкам
    const machineGroups = {};
    record.entries.forEach(entry => {
      if (!machineGroups[entry.machine]) {
        machineGroups[entry.machine] = [];
      }
      machineGroups[entry.machine].push(entry);
    });
    
    // Создание таблиц для каждого станка
    Object.keys(machineGroups).forEach(machine => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'machine-group';
      
      const title = document.createElement('h4');
      title.className = 'machine-title';
      title.textContent = `Станок: ${machine}`;
      groupDiv.appendChild(title);
      
      const table = document.createElement('table');
      table.className = 'results-table';
      
      // Заголовок таблицы
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Деталь</th>
          <th>Операция</th>
          <th>Машинное время (мин)</th>
          <th>Доп. время (мин)</th>
          <th>Количество</th>
          <th>Общее время (мин)</th>
          <th>Коэффициент</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Тело таблицы
      const tbody = document.createElement('tbody');
      let machineTotalTime = 0;
      
      machineGroups[machine].forEach(entry => {
        const coefficient = calculateCoefficient(entry.totalTime, state.main.baseTime);
        machineTotalTime += entry.totalTime;
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${entry.part}</td>
          <td>${entry.operation}</td>
          <td>${entry.machineTime}</td>
          <td>${entry.extraTime}</td>
          <td>${entry.quantity}</td>
          <td class="total-time">${entry.totalTime}</td>
          <td class="coefficient">${coefficient}</td>
        `;
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      groupDiv.appendChild(table);
      resultsContainer.appendChild(groupDiv);
    });
    
    // Итоговая таблица
    const totalTime = record.entries.reduce((sum, entry) => sum + entry.totalTime, 0);
    const totalCoefficient = calculateCoefficient(totalTime, state.main.baseTime);
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'machine-group';
    
    const summaryTitle = document.createElement('h4');
    summaryTitle.className = 'machine-title';
    summaryTitle.textContent = 'Итоговые показатели';
    summaryDiv.appendChild(summaryTitle);
    
    const summaryTable = document.createElement('table');
    summaryTable.className = 'results-table summary-table';
    
    summaryTable.innerHTML = `
      <thead>
        <tr>
          <th>Общее время всех деталей (мин)</th>
          <th>Коэффициент рабочего времени</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="total-time">${totalTime}</td>
          <td class="coefficient">${totalCoefficient}</td>
        </tr>
      </tbody>
    `;
    
    summaryDiv.appendChild(summaryTable);
    resultsContainer.appendChild(summaryDiv);
    
    resultsSection.style.display = 'block';
  }
  
  function formatDate(dateString) {
    // Парсим дату без учета часового пояса
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

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
      // Операция
      const opNameWrap = document.createElement('div');
      const opNameLabel = document.createElement('label'); 
      opNameLabel.textContent='Операция'; 
      opNameLabel.style.marginBottom = '4px'; 
      opNameLabel.style.display = 'block';
      opNameLabel.style.fontSize = '14px';
      opNameLabel.style.color = 'var(--muted)';
      opNameLabel.style.fontWeight = '500';
      const opName = document.createElement('input'); 
      opName.type='text'; 
      opName.placeholder='Операция'; 
      opName.value = op.name;
      opNameWrap.appendChild(opNameLabel); 
      opNameWrap.appendChild(opName);
      opName.addEventListener('input', () => { op.name = opName.value; saveState(); });
      
      // Машинное время
      const machineTimeWrap = document.createElement('div');
      const machineTimeLabel = document.createElement('label'); 
      machineTimeLabel.textContent='Машинное время (мин)'; 
      machineTimeLabel.style.marginBottom = '4px'; 
      machineTimeLabel.style.display = 'block';
      machineTimeLabel.style.fontSize = '14px';
      machineTimeLabel.style.color = 'var(--muted)';
      machineTimeLabel.style.fontWeight = '500';
      const machineTime = document.createElement('input'); 
      machineTime.type='number'; 
      machineTime.placeholder='Машинное время (мин)'; 
      machineTime.value = String(op.machineTime||0);
      machineTimeWrap.appendChild(machineTimeLabel); 
      machineTimeWrap.appendChild(machineTime);
      machineTime.addEventListener('input', () => { op.machineTime = Number(machineTime.value||0); saveState(); });
      
      // Дополнительное время
      const extraTimeWrap = document.createElement('div');
      const extraTimeLabel = document.createElement('label'); 
      extraTimeLabel.textContent='Доп. время (мин)'; 
      extraTimeLabel.style.marginBottom = '4px'; 
      extraTimeLabel.style.display = 'block';
      extraTimeLabel.style.fontSize = '14px';
      extraTimeLabel.style.color = 'var(--muted)';
      extraTimeLabel.style.fontWeight = '500';
      const extraTime = document.createElement('input'); 
      extraTime.type='number'; 
      extraTime.placeholder='Доп. время (мин)'; 
      extraTime.value = String(op.extraTime||0);
      extraTimeWrap.appendChild(extraTimeLabel); 
      extraTimeWrap.appendChild(extraTime);
      extraTime.addEventListener('input', () => { op.extraTime = Number(extraTime.value||0); saveState(); });
      
      // Ячейка с суммой
      const totalWrap = document.createElement('div');
      const totalLabel = document.createElement('label'); 
      totalLabel.textContent='Итого (мин)'; 
      totalLabel.style.marginBottom = '4px'; 
      totalLabel.style.display = 'block';
      totalLabel.style.fontSize = '14px';
      totalLabel.style.color = 'var(--muted)';
      totalLabel.style.fontWeight = '500';
      const totalDisplay = document.createElement('div'); 
      totalDisplay.style.padding = '12px';
      totalDisplay.style.background = 'var(--card)';
      totalDisplay.style.border = '1px solid rgba(255,255,255,0.1)';
      totalDisplay.style.borderRadius = 'var(--border-radius-sm)';
      totalDisplay.style.fontWeight = '600';
      totalDisplay.style.color = 'var(--primary)';
      totalDisplay.style.textAlign = 'center';
      totalDisplay.style.height = '44px';
      totalDisplay.style.display = 'flex';
      totalDisplay.style.alignItems = 'center';
      totalDisplay.style.justifyContent = 'center';
      totalWrap.appendChild(totalLabel); 
      totalWrap.appendChild(totalDisplay);
      
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
      
      // Добавляем обработчик клика для выбора даты
      cell.addEventListener('click', () => {
        // Исправляем проблему с часовыми поясами
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        selectedDate = dateString;
        console.log('Selected date:', dateString);
        
        // Показываем кнопку добавления записи
        const addRecordBtn = document.getElementById('addRecordFromCalendar');
        if (addRecordBtn) {
          addRecordBtn.style.display = 'inline-block';
          addRecordBtn.textContent = `Добавить запись на ${formatDate(dateString)}`;
        }
        
        // Показываем результаты, если есть
        showResults(dateString);
      });
      
      // Добавляем курсор для интерактивности
      cell.style.cursor = 'pointer';
      
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

  // Функции экспорта/импорта данных
  function exportAppData() {
    try {
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          main: state.main,
          machines: state.machines,
          parts: state.parts,
          records: state.records
        }
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pwa-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Данные экспортированы успешно');
    } catch (error) {
      console.error('Ошибка экспорта:', error);
    }
  }

  function importAppData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          // Проверяем структуру файла
          if (!importData.data || !importData.version) {
            throw new Error('Неверный формат файла');
          }
          
          // Импортируем данные
          state.main = importData.data.main || defaultState.main;
          state.machines = importData.data.machines || defaultState.machines;
          state.parts = importData.data.parts || defaultState.parts;
          state.records = importData.data.records || defaultState.records;
          
          // Сохраняем в localStorage
          localStorage.setItem('pwa-state', JSON.stringify(state));
          
          // Обновляем UI
          hydrateMain();
          renderMachines();
          renderParts();
          
          resolve('Данные успешно импортированы');
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  function showImportStatus(message, type = 'info') {
    importStatus.textContent = message;
    importStatus.className = `import-status ${type}`;
    importStatus.style.display = 'block';
    
    setTimeout(() => {
      importStatus.style.display = 'none';
    }, 5000);
  }

  // Обработчики событий для экспорта/импорта
  exportData?.addEventListener('click', exportAppData);
  
  selectFile?.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importData.disabled = false;
      importData.textContent = `Импортировать (${file.name})`;
    }
  });
  
  importData?.addEventListener('click', async () => {
    const file = importFile.files[0];
    if (!file) return;
    
    try {
      importData.disabled = true;
      importData.textContent = 'Импорт...';
      
      const result = await importAppData(file);
      showImportStatus(result, 'success');
      
      // Сбрасываем форму
      importFile.value = '';
      importData.disabled = true;
      importData.textContent = 'Импортировать';
      
    } catch (error) {
      showImportStatus(`Ошибка импорта: ${error.message}`, 'error');
      importData.disabled = false;
      importData.textContent = 'Импортировать';
    }
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


  // Обработчики событий для диалога добавления записи
  const addRecordFromCalendar = document.getElementById('addRecordFromCalendar');
  addRecordFromCalendar?.addEventListener('click', () => {
    if (selectedDate) {
      openAddRecordDialog(selectedDate);
    }
  });
  closeAddRecord?.addEventListener('click', () => addRecordDialog.close());
  
  recordDate?.addEventListener('change', updateShiftType);
  recordPart?.addEventListener('change', updateOperationOptions);
  recordOperation?.addEventListener('change', () => {
    const selectedOption = recordOperation.options[recordOperation.selectedIndex];
    if (selectedOption.dataset.machineTime) {
      recordMachineTime.value = selectedOption.dataset.machineTime;
    }
    if (selectedOption.dataset.extraTime) {
      recordExtraTime.value = selectedOption.dataset.extraTime;
    }
    updateTotalTime();
  });
  
  recordMachineTime?.addEventListener('input', updateTotalTime);
  recordExtraTime?.addEventListener('input', updateTotalTime);
  recordQuantity?.addEventListener('input', updateTotalTime);
  
  addRecordEntry?.addEventListener('click', () => {
    if (!recordMachine.value || !recordPart.value || !recordOperation.value || !recordMachineTime.value || !recordQuantity.value) {
      alert('Заполните все обязательные поля');
      return;
    }
    
    const part = state.parts.find(p => p.id === recordPart.value);
    const entry = {
      machine: recordMachine.value,
      part: part.name,
      operation: recordOperation.value,
      machineTime: parseFloat(recordMachineTime.value),
      extraTime: parseFloat(recordExtraTime.value) || 0,
      quantity: parseInt(recordQuantity.value),
      totalTime: calculateTotalTime(parseFloat(recordMachineTime.value), parseFloat(recordExtraTime.value) || 0, parseInt(recordQuantity.value))
    };
    
    currentEntries.push(entry);
    renderEntries();
    showEntriesList();
    
    // Очистка формы
    recordMachine.value = '';
    recordPart.value = '';
    recordOperation.innerHTML = '<option value="">Выберите операцию</option>';
    recordMachineTime.value = '';
    recordExtraTime.value = '0';
    recordQuantity.value = '1';
    updateTotalTime();
  });
  
  saveRecord?.addEventListener('click', () => {
    if (currentEntries.length === 0) {
      alert('Добавьте хотя бы одну запись');
      return;
    }
    
    const date = recordDate.value;
    const shiftType = getShiftType(new Date(date));
    
    if (shiftType === 'O') {
      alert('Нельзя добавлять записи в выходной день');
      return;
    }
    
    const recordId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
    
    const record = {
      id: recordId,
      date: date,
      shiftType: shiftType,
      entries: [...currentEntries]
    };
    
    // Удаляем старую запись на эту дату, если есть
    state.records = state.records.filter(r => r.date !== date);
    
    // Добавляем новую запись
    state.records.push(record);
    saveState();
    
    alert('Запись сохранена');
    addRecordDialog.close();
  });

  // Init
  hydrateMain();
  bindMain();
  renderMachines();
  renderParts();
});