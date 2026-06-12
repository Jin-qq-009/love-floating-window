/**
 * 我们的小窗 - 主窗口交互逻辑
 */

(function () {
  const S = window.AppStore;
  let data = S.loadData();
  let currentTodoTarget = 'me'; // 'me' | 'partner' | 'shared'

  // ==================== Tab Navigation ====================

  const tabs = document.querySelectorAll('.tabs .tab');
  const views = {
    home: document.getElementById('homeView'),
    todos: document.getElementById('todosView'),
    memories: document.getElementById('memoriesView'),
    settings: document.getElementById('settingsView'),
  };

  function setView(name) {
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === name));
    Object.entries(views).forEach(([key, view]) => view.classList.toggle('active', key === name));
    // 切换到待办页时刷新
    if (name === 'todos') renderTodos();
    if (name === 'memories') renderMemories();
    if (name === 'settings') fillSettings();
    // 切换回首页时刷新地图尺寸
    if (name === 'home' && window.AppMap) {
      setTimeout(function () { window.AppMap.invalidateSize(); }, 100);
    }
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));

  document.querySelectorAll('[data-jump]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.jump));
  });

  // ==================== Window Controls ====================

  document.getElementById('btnMinimize').addEventListener('click', () => {
    if (window.electronAPI) window.electronAPI.hideToFloat();
  });

  document.getElementById('btnClose').addEventListener('click', () => {
    if (window.electronAPI) window.electronAPI.hideToFloat();
  });

  // ==================== Render Home ====================

  function renderHome() {
    data = S.loadData();

    // 见面倒计时
    const days = S.getMeetupDays(data.meetup);
    document.getElementById('meetupDays').textContent = days !== null ? days : '--';
    const meetupInfo = data.meetup
      ? `${data.meetup.date} · ${data.meetup.location || ''} · ${data.meetup.note || ''}`
      : '暂无见面计划';
    document.getElementById('meetupInfo').textContent = meetupInfo;

    // 最新留言
    if (data.messages && data.messages.length > 0) {
      const latest = data.messages[data.messages.length - 1];
      document.getElementById('latestMessage').textContent = latest.content;
      const authorName = latest.author === 'me' ? data.me.name : data.partner.name;
      document.getElementById('latestMessageMeta').textContent = `${authorName} · ${latest.time}`;
    }

    // 我的状态
    const myS = data.status.me;
    document.getElementById('myAvatar').textContent = data.me.avatar;
    document.getElementById('myName').textContent = data.me.name;
    document.getElementById('myStatusText').textContent = `${myS.quickStatus} · ${myS.freeText.substring(0, 6)}`;
    const myMoodPill = document.getElementById('myMoodPill');
    myMoodPill.textContent = myS.mood;
    myMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[myS.mood] || 'pink');
    document.getElementById('myFreeText').textContent = myS.freeText;

    // 对方状态
    const pS = data.status.partner;
    document.getElementById('partnerAvatar').textContent = data.partner.avatar;
    document.getElementById('partnerName').textContent = data.partner.name;
    document.getElementById('partnerStatusText').textContent = `${pS.quickStatus} · ${pS.freeText.substring(0, 6)}`;
    const pMoodPill = document.getElementById('partnerMoodPill');
    pMoodPill.textContent = pS.mood;
    pMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[pS.mood] || 'peach');
    document.getElementById('partnerFreeText').textContent = pS.freeText;

    // 待办摘要
    const previewEl = document.getElementById('todoPreview');
    previewEl.innerHTML = '';
    const allTodos = [
      ...data.todos.me.map((t) => ({ ...t, owner: data.me.name })),
      ...data.todos.partner.map((t) => ({ ...t, owner: data.partner.name })),
      ...data.todos.shared.map((t) => ({ ...t, owner: '共同' })),
    ];
    allTodos.slice(0, 4).forEach((t) => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" ${t.done ? 'checked' : ''} disabled> ${t.owner}：${t.text}`;
      previewEl.appendChild(label);
    });

    // 纪念日提醒
    const memMini = document.getElementById('memoryMiniList');
    memMini.innerHTML = '';
    data.memories.slice(0, 2).forEach((m) => {
      const d = document.createElement('div');
      d.className = 'memory-mini';
      const daysTo = S.getMeetupDays({ date: m.date });
      d.innerHTML = `<strong>${m.title}</strong><span>还有 ${daysTo !== null ? daysTo : '?'} 天 · ${m.remind ? '已开启提醒' : '未开启提醒'}</span>`;
      memMini.appendChild(d);
    });

    // 时间线
    renderTimeline();

    // 地图
    if (window.AppMap) {
      window.AppMap.refresh();
    }
  }

  function renderTimeline() {
    const timelineEl = document.getElementById('timelineList');
    timelineEl.innerHTML = '';
    const month = document.getElementById('timelineMonth').value;
    const filtered = month === 'all'
      ? data.timeline
      : data.timeline.filter((t) => t.date && t.date.startsWith(month));

    filtered.forEach((t) => {
      const article = document.createElement('article');
      article.innerHTML = `<time>${t.time}</time><div><strong>${t.type}</strong><p>${t.content}</p></div>`;
      timelineEl.appendChild(article);
    });

    // 填充月份选项
    const select = document.getElementById('timelineMonth');
    const months = [...new Set(data.timeline.map((t) => t.date ? t.date.substring(0, 7) : null).filter(Boolean))];
    if (select.options.length <= 1) {
      months.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m.replace('-', ' 年 ') + ' 月';
        select.appendChild(opt);
      });
    }
  }

  document.getElementById('timelineMonth').addEventListener('change', renderTimeline);

  // ==================== Modal Helpers ====================

  function openModal(id) {
    document.getElementById(id).classList.add('show');
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('show');
  }

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('show');
    });
  });

  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.remove('show');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });

  // ==================== Status Update ====================

  document.querySelector('[data-target="me"]').addEventListener('click', () => {
    data = S.loadData();
    // 填充心情选择
    const moodPicker = document.getElementById('moodPicker');
    moodPicker.innerHTML = '';
    const allMoods = [...S.MOODS, ...S.CUSTOM_MOODS];
    allMoods.forEach((mood) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (data.status.me.mood === mood ? ' selected' : '');
      btn.textContent = mood;
      btn.addEventListener('click', () => {
        moodPicker.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
        btn.classList.add('selected');
      });
      moodPicker.appendChild(btn);
    });

    // 填充快捷状态选择
    const statusPicker = document.getElementById('statusPicker');
    statusPicker.innerHTML = '';
    S.QUICK_STATUSES.forEach((status) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (data.status.me.quickStatus === status ? ' selected' : '');
      btn.textContent = status;
      btn.addEventListener('click', () => {
        statusPicker.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
        btn.classList.add('selected');
      });
      statusPicker.appendChild(btn);
    });

    document.getElementById('freeTextInput').value = data.status.me.freeText;
    openModal('modalStatus');
  });

  document.getElementById('btnSaveStatus').addEventListener('click', () => {
    const selectedMood = document.querySelector('#moodPicker .pill.selected');
    const selectedStatus = document.querySelector('#statusPicker .pill.selected');
    const freeText = document.getElementById('freeTextInput').value.trim();

    if (selectedMood) data.status.me.mood = selectedMood.textContent;
    if (selectedStatus) data.status.me.quickStatus = selectedStatus.textContent;
    if (freeText) data.status.me.freeText = freeText;
    data.status.me.updatedAt = S.getNowTimeStr();

    // 添加时间线
    data.timeline.unshift({
      id: S.genId(),
      type: '状态更新',
      content: `${data.me.name}更新心情为"${data.status.me.mood}"，状态为"${data.status.me.quickStatus}"。`,
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalStatus');
    renderHome();
  });

  // ==================== Message ====================

  document.getElementById('btnLeaveMessage').addEventListener('click', () => {
    document.getElementById('messageInput').value = '';
    openModal('modalMessage');
  });

  document.getElementById('btnSendMessage').addEventListener('click', () => {
    const content = document.getElementById('messageInput').value.trim();
    if (!content) return;

    data.messages.push({
      id: S.genId(),
      author: 'me',
      content: content,
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    data.timeline.unshift({
      id: S.genId(),
      type: '留言',
      content: `${data.me.name}：${content}`,
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalMessage');
    renderHome();
  });

  // ==================== Meetup Edit ====================

  document.querySelector('.edit-meetup').addEventListener('click', () => {
    data = S.loadData();
    document.getElementById('meetupDateInput').value = data.meetup.date || '';
    document.getElementById('meetupLocationInput').value = data.meetup.location || '';
    document.getElementById('meetupNoteInput').value = data.meetup.note || '';
    openModal('modalMeetup');
  });

  document.getElementById('btnSaveMeetup').addEventListener('click', () => {
    const date = document.getElementById('meetupDateInput').value;
    const location = document.getElementById('meetupLocationInput').value.trim();
    const note = document.getElementById('meetupNoteInput').value.trim();

    if (date) data.meetup.date = date;
    if (location) data.meetup.location = location;
    if (note) data.meetup.note = note;

    data.timeline.unshift({
      id: S.genId(),
      type: '见面计划变化',
      content: `${data.me.name}更新了见面计划：${date} · ${location || ''}`,
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalMeetup');
    renderHome();
  });

  // ==================== Todos ====================

  function renderTodos() {
    data = S.loadData();

    document.getElementById('todoMyAvatar').textContent = data.me.avatar;
    document.getElementById('todoMyName').textContent = data.me.name + '的待办';
    document.getElementById('todoPartnerAvatar').textContent = data.partner.avatar;
    document.getElementById('todoPartnerName').textContent = data.partner.name + '的待办';

    renderTodoList('myTodoList', data.todos.me, 'me');
    renderTodoList('partnerTodoList', data.todos.partner, 'partner');
    renderTodoList('sharedTodoList', data.todos.shared, 'shared');
  }

  function renderTodoList(containerId, todos, category) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    todos.forEach((todo) => {
      const label = document.createElement('label');
      label.className = 'task';
      const canEdit = category === 'me' || category === 'shared';
      label.innerHTML = `
        <input type="checkbox" ${todo.done ? 'checked' : ''} ${!canEdit ? 'disabled' : ''}>
        ${todo.text}
        <span>${todo.note || ''}</span>
      `;
      const checkbox = label.querySelector('input');
      checkbox.addEventListener('change', () => {
        todo.done = checkbox.checked;
        S.saveData(data);
        renderTodos();
        renderHome();
      });
      container.appendChild(label);
    });
  }

  // Add todo buttons
  document.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTodoTarget = btn.dataset.add;
      document.getElementById('todoTextInput').value = '';
      document.getElementById('todoNoteInput').value = '';
      const titles = { me: '添加我的待办', partner: '给 TA 添加建议', shared: '添加共同待办' };
      document.getElementById('todoModalTitle').textContent = titles[currentTodoTarget] || '新增待办';
      openModal('modalTodo');
    });
  });

  document.getElementById('btnSaveTodo').addEventListener('click', () => {
    const text = document.getElementById('todoTextInput').value.trim();
    const note = document.getElementById('todoNoteInput').value.trim();
    if (!text) return;

    const newTodo = { id: S.genId(), text, note, done: false };
    data.todos[currentTodoTarget].push(newTodo);
    S.saveData(data);
    closeModal('modalTodo');
    renderTodos();
    renderHome();
  });

  // ==================== Memories ====================

  function renderMemories() {
    data = S.loadData();
    const grid = document.getElementById('memoryGrid');
    grid.innerHTML = '';

    data.memories.forEach((mem, idx) => {
      const card = document.createElement('article');
      card.className = 'memory-card' + (idx === 0 ? ' featured' : '');
      card.style.position = 'relative';

      const daysTo = S.getMeetupDays({ date: mem.date });

      if (idx === 0) {
        card.innerHTML = `
          <p class="eyebrow">最近提醒</p>
          <h3>${mem.title}</h3>
          <strong>${daysTo !== null ? daysTo : '?'} 天</strong>
          <p>${mem.remind ? '系统通知：' + mem.remindRule : ''}</p>
          <button class="del-btn" data-del-memory="${mem.id}">&times;</button>
        `;
      } else {
        card.innerHTML = `
          <span class="memory-date">${mem.date}</span>
          <h3>${mem.title}</h3>
          <p>${mem.content || ''}</p>
          <em>${daysTo !== null ? '还有 ' + daysTo + ' 天' : mem.remindRule || ''}</em>
          <button class="del-btn" data-del-memory="${mem.id}">&times;</button>
        `;
      }

      grid.appendChild(card);
    });

    // Delete memory
    grid.querySelectorAll('[data-del-memory]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delMemory;
        data.memories = data.memories.filter((m) => m.id !== id);
        S.saveData(data);
        renderMemories();
        renderHome();
      });
    });
  }

  document.getElementById('btnAddMemory').addEventListener('click', () => {
    document.getElementById('memoryTitleInput').value = '';
    document.getElementById('memoryDateInput').value = '';
    document.getElementById('memoryContentInput').value = '';
    document.getElementById('memoryRemindInput').checked = true;
    openModal('modalMemory');
  });

  document.getElementById('btnSaveMemory').addEventListener('click', () => {
    const title = document.getElementById('memoryTitleInput').value.trim();
    const date = document.getElementById('memoryDateInput').value;
    const content = document.getElementById('memoryContentInput').value.trim();
    const remind = document.getElementById('memoryRemindInput').checked;

    if (!title || !date) return;

    data.memories.push({
      id: S.genId(),
      title, date, content,
      remind,
      remindRule: remind ? '当天' : '',
    });

    data.timeline.unshift({
      id: S.genId(),
      type: '纪念日 / 小惊喜',
      content: `${data.me.name}添加了纪念日"${title}"。`,
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalMemory');
    renderMemories();
    renderHome();
  });

  // ==================== Settings ====================

  function fillSettings() {
    data = S.loadData();
    document.getElementById('settingMyName').value = data.me.name;
    document.getElementById('settingMyCity').value = data.me.city || '';
    document.getElementById('settingPartnerName').value = data.partner.name;
    document.getElementById('settingPartnerCity').value = data.partner.city || '';
    document.getElementById('settingMeetupDate').value = data.meetup.date || '';
    document.getElementById('settingMeetupLocation').value = data.meetup.location || '';
    document.getElementById('settingMeetupNote').value = data.meetup.note || '';
  }

  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    const myName = document.getElementById('settingMyName').value.trim();
    const myCity = document.getElementById('settingMyCity').value.trim();
    const partnerName = document.getElementById('settingPartnerName').value.trim();
    const partnerCity = document.getElementById('settingPartnerCity').value.trim();

    if (myName) {
      data.me.name = myName;
      data.me.avatar = myName.charAt(0);
    }
    if (myCity) {
      data.me.city = myCity;
      const coords = S.getCityCoords(myCity);
      if (coords) {
        data.me.lat = coords[0];
        data.me.lng = coords[1];
      }
    }
    if (partnerName) {
      data.partner.name = partnerName;
      data.partner.avatar = partnerName.charAt(0);
    }
    if (partnerCity) {
      data.partner.city = partnerCity;
      const coords = S.getCityCoords(partnerCity);
      if (coords) {
        data.partner.lat = coords[0];
        data.partner.lng = coords[1];
      }
    }
    data.meetup.date = document.getElementById('settingMeetupDate').value || data.meetup.date;
    data.meetup.location = document.getElementById('settingMeetupLocation').value.trim() || data.meetup.location;
    data.meetup.note = document.getElementById('settingMeetupNote').value.trim() || data.meetup.note;

    S.saveData(data);
    renderHome();
    alert('设置已保存');
  });

  document.getElementById('btnResetData').addEventListener('click', () => {
    if (confirm('确定要重置所有数据吗？此操作不可撤销。')) {
      localStorage.removeItem('love-floating-window-data');
      data = S.loadData();
      renderHome();
      renderTodos();
      renderMemories();
    }
  });

  // ==================== Auto Refresh ====================

  setInterval(() => {
    data = S.loadData();
    document.querySelector('.sync-status').textContent = '同步中 · ' + S.getNowTimeStr() + ' 更新';
  }, 10000);

  // Listen for data updates from other windows
  if (window.electronAPI && window.electronAPI.onDataUpdated) {
    window.electronAPI.onDataUpdated(() => {
      data = S.loadData();
      renderHome();
      if (views.todos.classList.contains('active')) renderTodos();
      if (views.memories.classList.contains('active')) renderMemories();
    });
  }

  // ==================== Init ====================

  renderHome();

  // 地图需要 DOM 完全就绪后才能正确计算容器尺寸
  setTimeout(function () {
    if (window.AppMap) {
      window.AppMap.init();
    }
  }, 500);
})();
