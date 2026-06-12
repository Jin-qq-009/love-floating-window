/**
 * 我们的小窗 - 主窗口交互逻辑
 */

(function () {
  const S = window.AppStore;
  let data = S.loadData();
  let currentTodoTarget = 'me'; // 'me' | 'partner' | 'shared'

  // ==================== Toast 通知 ====================

  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 400);
    }, 2000);
  }

  // ==================== 安全工具 ====================

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== Tab Navigation ====================

  var tabs = document.querySelectorAll('.tabs .tab');
  var views = {
    home: document.getElementById('homeView'),
    todos: document.getElementById('todosView'),
    memories: document.getElementById('memoriesView'),
    settings: document.getElementById('settingsView'),
  };

  function setView(name) {
    tabs.forEach(function (tab) { tab.classList.toggle('active', tab.dataset.view === name); });
    Object.entries(views).forEach(function (entry) { entry[1].classList.toggle('active', entry[0] === name); });
    if (name === 'todos') renderTodos();
    if (name === 'memories') renderMemories();
    if (name === 'settings') fillSettings();
    if (name === 'home' && window.AppMap) {
      setTimeout(function () { window.AppMap.invalidateSize(); }, 100);
    }
  }

  tabs.forEach(function (tab) { tab.addEventListener('click', function () { setView(tab.dataset.view); }); });

  document.querySelectorAll('[data-jump]').forEach(function (btn) {
    btn.addEventListener('click', function () { setView(btn.dataset.jump); });
  });

  // ==================== Window Controls ====================

  document.getElementById('btnMinimize').addEventListener('click', function () {
    if (window.electronAPI) window.electronAPI.hideToFloat();
  });

  document.getElementById('btnClose').addEventListener('click', function () {
    if (window.electronAPI) window.electronAPI.hideToFloat();
  });

  // ==================== Render Home ====================

  function renderHome() {
    data = S.loadData();

    // 见面倒计时
    var days = S.getMeetupDays(data.meetup);
    document.getElementById('meetupDays').textContent = days !== null ? days : '--';
    var meetupInfo = data.meetup
      ? data.meetup.date + ' · ' + (data.meetup.location || '') + ' · ' + (data.meetup.note || '')
      : '暂无见面计划';
    document.getElementById('meetupInfo').textContent = meetupInfo;

    // 最新留言
    var latestMsgEl = document.getElementById('latestMessage');
    var latestMetaEl = document.getElementById('latestMessageMeta');
    if (data.messages && data.messages.length > 0) {
      var latest = data.messages[data.messages.length - 1];
      latestMsgEl.textContent = latest.content;
      var authorName = latest.author === 'me' ? data.me.name : data.partner.name;
      latestMetaEl.textContent = authorName + ' · ' + latest.time;
    } else {
      latestMsgEl.textContent = '还没有留言，点击下方给 TA 留第一句吧';
      latestMetaEl.textContent = '';
    }

    // 我的状态
    var myS = data.status.me;
    document.getElementById('myAvatar').textContent = data.me.avatar;
    document.getElementById('myName').textContent = data.me.name;
    document.getElementById('myStatusText').textContent = myS.quickStatus + ' · ' + myS.freeText.substring(0, 6);
    var myMoodPill = document.getElementById('myMoodPill');
    myMoodPill.textContent = myS.mood;
    myMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[myS.mood] || 'pink');
    document.getElementById('myFreeText').textContent = myS.freeText;

    // 对方状态
    var pS = data.status.partner;
    document.getElementById('partnerAvatar').textContent = data.partner.avatar;
    document.getElementById('partnerName').textContent = data.partner.name;
    document.getElementById('partnerStatusText').textContent = pS.quickStatus + ' · ' + pS.freeText.substring(0, 6);
    var pMoodPill = document.getElementById('partnerMoodPill');
    pMoodPill.textContent = pS.mood;
    pMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[pS.mood] || 'peach');
    document.getElementById('partnerFreeText').textContent = pS.freeText;

    // 待办摘要
    var previewEl = document.getElementById('todoPreview');
    previewEl.innerHTML = '';
    var allTodos = [
      ...data.todos.me.map(function (t) { return Object.assign({}, t, { owner: data.me.name }); }),
      ...data.todos.partner.map(function (t) { return Object.assign({}, t, { owner: data.partner.name }); }),
      ...data.todos.shared.map(function (t) { return Object.assign({}, t, { owner: '共同' }); }),
    ];
    if (allTodos.length === 0) {
      previewEl.innerHTML = '<p class="empty-hint">暂无待办，去待办页添加吧</p>';
    } else {
      allTodos.slice(0, 4).forEach(function (t) {
        var label = document.createElement('label');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = t.done;
        cb.disabled = true;
        cb.style.accentColor = 'var(--pink)';
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + t.owner + '：' + t.text));
        previewEl.appendChild(label);
      });
    }

    // 纪念日提醒
    var memMini = document.getElementById('memoryMiniList');
    memMini.innerHTML = '';
    if (data.memories.length === 0) {
      memMini.innerHTML = '<p class="empty-hint">还没有纪念日，去添加吧</p>';
    } else {
      data.memories.slice(0, 2).forEach(function (m) {
        var d = document.createElement('div');
        d.className = 'memory-mini';
        var daysTo = S.getMeetupDays({ date: m.date });
        d.innerHTML = '<strong>' + escapeHTML(m.title) + '</strong><span>还有 ' + (daysTo !== null ? daysTo : '?') + ' 天 · ' + (m.remind ? '已开启提醒' : '未开启提醒') + '</span>';
        memMini.appendChild(d);
      });
    }

    // 时间线
    renderTimeline();

    // 地图
    if (window.AppMap) {
      window.AppMap.refresh();
    }
  }

  function renderTimeline() {
    var timelineEl = document.getElementById('timelineList');
    timelineEl.innerHTML = '';
    var month = document.getElementById('timelineMonth').value;
    var filtered = month === 'all'
      ? data.timeline
      : data.timeline.filter(function (t) { return t.date && t.date.startsWith(month); });

    if (filtered.length === 0) {
      timelineEl.innerHTML = '<p class="empty-hint">暂无动态记录</p>';
      return;
    }

    filtered.forEach(function (t) {
      var article = document.createElement('article');
      var timeEl = document.createElement('time');
      timeEl.textContent = t.time;
      var div = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = t.type;
      var p = document.createElement('p');
      p.textContent = t.content;
      div.appendChild(strong);
      div.appendChild(p);
      article.appendChild(timeEl);
      article.appendChild(div);
      timelineEl.appendChild(article);
    });

    // 填充月份选项
    var select = document.getElementById('timelineMonth');
    var months = [...new Set(data.timeline.map(function (t) { return t.date ? t.date.substring(0, 7) : null; }).filter(Boolean))];
    if (select.options.length <= 1) {
      months.forEach(function (m) {
        var opt = document.createElement('option');
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

  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.closest('.modal-overlay').classList.remove('show');
    });
  });

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.closest('.modal-overlay').classList.remove('show');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });

  // ==================== Status Update ====================

  document.querySelector('[data-target="me"]').addEventListener('click', function () {
    data = S.loadData();
    // 填充心情选择
    var moodPicker = document.getElementById('moodPicker');
    moodPicker.innerHTML = '';
    var allMoods = [...S.MOODS, ...S.CUSTOM_MOODS];
    allMoods.forEach(function (mood) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (data.status.me.mood === mood ? ' selected' : '');
      btn.textContent = mood;
      btn.addEventListener('click', function () {
        moodPicker.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('selected'); });
        btn.classList.add('selected');
      });
      moodPicker.appendChild(btn);
    });

    // 填充快捷状态选择
    var statusPicker = document.getElementById('statusPicker');
    statusPicker.innerHTML = '';
    S.QUICK_STATUSES.forEach(function (status) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (data.status.me.quickStatus === status ? ' selected' : '');
      btn.textContent = status;
      btn.addEventListener('click', function () {
        statusPicker.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('selected'); });
        btn.classList.add('selected');
      });
      statusPicker.appendChild(btn);
    });

    document.getElementById('freeTextInput').value = data.status.me.freeText;
    openModal('modalStatus');
  });

  document.getElementById('btnSaveStatus').addEventListener('click', function () {
    var selectedMood = document.querySelector('#moodPicker .pill.selected');
    var selectedStatus = document.querySelector('#statusPicker .pill.selected');
    var freeText = document.getElementById('freeTextInput').value.trim();

    if (selectedMood) data.status.me.mood = selectedMood.textContent;
    if (selectedStatus) data.status.me.quickStatus = selectedStatus.textContent;
    if (freeText) data.status.me.freeText = freeText;
    data.status.me.updatedAt = S.getNowTimeStr();

    // 添加时间线
    data.timeline.unshift({
      id: S.genId(),
      type: '状态更新',
      content: data.me.name + '更新心情为"' + data.status.me.mood + '"，状态为"' + data.status.me.quickStatus + '"。',
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalStatus');
    renderHome();
    showToast('状态已更新');
  });

  // ==================== Message ====================

  document.getElementById('btnLeaveMessage').addEventListener('click', function () {
    document.getElementById('messageInput').value = '';
    openModal('modalMessage');
  });

  document.getElementById('btnSendMessage').addEventListener('click', function () {
    var content = document.getElementById('messageInput').value.trim();
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
      content: data.me.name + '：' + content,
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalMessage');
    renderHome();
    showToast('留言已发送');
  });

  // ==================== Meetup Edit ====================

  document.querySelector('.edit-meetup').addEventListener('click', function () {
    data = S.loadData();
    document.getElementById('meetupDateInput').value = data.meetup.date || '';
    document.getElementById('meetupLocationInput').value = data.meetup.location || '';
    document.getElementById('meetupNoteInput').value = data.meetup.note || '';
    openModal('modalMeetup');
  });

  document.getElementById('btnSaveMeetup').addEventListener('click', function () {
    var date = document.getElementById('meetupDateInput').value;
    var location = document.getElementById('meetupLocationInput').value.trim();
    var note = document.getElementById('meetupNoteInput').value.trim();

    if (date) data.meetup.date = date;
    if (location) data.meetup.location = location;
    if (note) data.meetup.note = note;

    data.timeline.unshift({
      id: S.genId(),
      type: '见面计划变化',
      content: data.me.name + '更新了见面计划：' + date + ' · ' + (location || ''),
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalMeetup');
    renderHome();
    showToast('见面计划已更新');
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
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    if (todos.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无待办</p>';
      return;
    }

    todos.forEach(function (todo) {
      var label = document.createElement('label');
      label.className = 'task';
      var canEdit = category === 'me' || category === 'shared';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = todo.done;
      if (!canEdit) cb.disabled = true;
      cb.addEventListener('change', function () {
        todo.done = cb.checked;
        S.saveData(data);
        renderTodos();
        renderHome();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + todo.text + ' '));
      if (todo.note) {
        var span = document.createElement('span');
        span.textContent = todo.note;
        label.appendChild(span);
      }
      container.appendChild(label);
    });
  }

  // Add todo buttons
  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentTodoTarget = btn.dataset.add;
      document.getElementById('todoTextInput').value = '';
      document.getElementById('todoNoteInput').value = '';
      var titles = { me: '添加我的待办', partner: '给 TA 添加建议', shared: '添加共同待办' };
      document.getElementById('todoModalTitle').textContent = titles[currentTodoTarget] || '新增待办';
      openModal('modalTodo');
    });
  });

  document.getElementById('btnSaveTodo').addEventListener('click', function () {
    var text = document.getElementById('todoTextInput').value.trim();
    var note = document.getElementById('todoNoteInput').value.trim();
    if (!text) return;

    var newTodo = { id: S.genId(), text: text, note: note, done: false };
    data.todos[currentTodoTarget].push(newTodo);
    S.saveData(data);
    closeModal('modalTodo');
    renderTodos();
    renderHome();
    showToast('待办已添加');
  });

  // ==================== Memories ====================

  function renderMemories() {
    data = S.loadData();
    var grid = document.getElementById('memoryGrid');
    grid.innerHTML = '';

    if (data.memories.length === 0) {
      grid.innerHTML = '<p class="empty-hint">还没有纪念日，点击右上角添加吧</p>';
      return;
    }

    data.memories.forEach(function (mem, idx) {
      var card = document.createElement('article');
      card.className = 'memory-card' + (idx === 0 ? ' featured' : '');
      card.style.position = 'relative';

      var daysTo = S.getMeetupDays({ date: mem.date });

      if (idx === 0) {
        var eyebrow = document.createElement('p');
        eyebrow.className = 'eyebrow';
        eyebrow.textContent = '最近提醒';
        card.appendChild(eyebrow);

        var h3 = document.createElement('h3');
        h3.textContent = mem.title;
        card.appendChild(h3);

        var strong = document.createElement('strong');
        strong.textContent = (daysTo !== null ? daysTo : '?') + ' 天';
        card.appendChild(strong);

        var p = document.createElement('p');
        p.textContent = mem.remind ? '系统通知：' + mem.remindRule : '';
        card.appendChild(p);

        var delBtn = document.createElement('button');
        delBtn.className = 'del-btn';
        delBtn.dataset.delMemory = mem.id;
        delBtn.textContent = '×';
        delBtn.addEventListener('click', function () {
          if (confirm('确定删除"' + mem.title + '"吗？')) {
            data.memories = data.memories.filter(function (m) { return m.id !== mem.id; });
            S.saveData(data);
            renderMemories();
            renderHome();
            showToast('纪念日已删除');
          }
        });
        card.appendChild(delBtn);
      } else {
        var dateSpan = document.createElement('span');
        dateSpan.className = 'memory-date';
        dateSpan.textContent = mem.date;
        card.appendChild(dateSpan);

        var h3b = document.createElement('h3');
        h3b.textContent = mem.title;
        card.appendChild(h3b);

        var pb = document.createElement('p');
        pb.textContent = mem.content || '';
        card.appendChild(pb);

        var em = document.createElement('em');
        em.textContent = daysTo !== null ? '还有 ' + daysTo + ' 天' : mem.remindRule || '';
        card.appendChild(em);

        var delBtnB = document.createElement('button');
        delBtnB.className = 'del-btn';
        delBtnB.dataset.delMemory = mem.id;
        delBtnB.textContent = '×';
        delBtnB.addEventListener('click', function () {
          if (confirm('确定删除"' + mem.title + '"吗？')) {
            data.memories = data.memories.filter(function (m) { return m.id !== mem.id; });
            S.saveData(data);
            renderMemories();
            renderHome();
            showToast('纪念日已删除');
          }
        });
        card.appendChild(delBtnB);
      }

      grid.appendChild(card);
    });
  }

  document.getElementById('btnAddMemory').addEventListener('click', function () {
    document.getElementById('memoryTitleInput').value = '';
    document.getElementById('memoryDateInput').value = '';
    document.getElementById('memoryContentInput').value = '';
    document.getElementById('memoryRemindInput').checked = true;
    openModal('modalMemory');
  });

  document.getElementById('btnSaveMemory').addEventListener('click', function () {
    var title = document.getElementById('memoryTitleInput').value.trim();
    var date = document.getElementById('memoryDateInput').value;
    var content = document.getElementById('memoryContentInput').value.trim();
    var remind = document.getElementById('memoryRemindInput').checked;

    if (!title || !date) return;

    data.memories.push({
      id: S.genId(),
      title: title,
      date: date,
      content: content,
      remind: remind,
      remindRule: remind ? '当天' : '',
    });

    data.timeline.unshift({
      id: S.genId(),
      type: '纪念日 / 小惊喜',
      content: data.me.name + '添加了纪念日"' + title + '"。',
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
    });

    S.saveData(data);
    closeModal('modalMemory');
    renderMemories();
    renderHome();
    showToast('纪念日已添加');
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

  document.getElementById('btnSaveSettings').addEventListener('click', function () {
    var myName = document.getElementById('settingMyName').value.trim();
    var myCity = document.getElementById('settingMyCity').value.trim();
    var partnerName = document.getElementById('settingPartnerName').value.trim();
    var partnerCity = document.getElementById('settingPartnerCity').value.trim();

    if (myName) {
      data.me.name = myName;
      data.me.avatar = myName.charAt(0);
    }
    if (myCity) {
      data.me.city = myCity;
      var coords = S.getCityCoords(myCity);
      if (coords) {
        data.me.lat = coords[0];
        data.me.lng = coords[1];
      } else {
        showToast('未找到"' + myCity + '"的坐标，地图可能无法显示');
      }
    }
    if (partnerName) {
      data.partner.name = partnerName;
      data.partner.avatar = partnerName.charAt(0);
    }
    if (partnerCity) {
      data.partner.city = partnerCity;
      var coords2 = S.getCityCoords(partnerCity);
      if (coords2) {
        data.partner.lat = coords2[0];
        data.partner.lng = coords2[1];
      } else {
        showToast('未找到"' + partnerCity + '"的坐标，地图可能无法显示');
      }
    }
    data.meetup.date = document.getElementById('settingMeetupDate').value || data.meetup.date;
    data.meetup.location = document.getElementById('settingMeetupLocation').value.trim() || data.meetup.location;
    data.meetup.note = document.getElementById('settingMeetupNote').value.trim() || data.meetup.note;

    S.saveData(data);
    renderHome();
    showToast('设置已保存');
  });

  document.getElementById('btnResetData').addEventListener('click', function () {
    if (confirm('确定要重置所有数据吗？此操作不可撤销。')) {
      localStorage.removeItem('love-floating-window-data');
      data = S.loadData();
      renderHome();
      renderTodos();
      renderMemories();
      showToast('数据已重置');
    }
  });

  // ==================== City Autocomplete ====================

  function setupCityAutocomplete(inputId) {
    var input = document.getElementById(inputId);
    var listEl = document.createElement('div');
    listEl.className = 'city-suggestions';
    listEl.style.display = 'none';
    input.parentNode.appendChild(listEl);

    input.addEventListener('input', function () {
      var val = input.value.trim();
      if (!val) {
        listEl.style.display = 'none';
        return;
      }
      var cities = Object.keys(S.CITY_COORDS);
      var matches = cities.filter(function (c) { return c.includes(val); }).slice(0, 6);
      if (matches.length === 0) {
        listEl.style.display = 'none';
        return;
      }
      listEl.innerHTML = '';
      matches.forEach(function (city) {
        var item = document.createElement('div');
        item.className = 'city-suggestion-item';
        item.textContent = city;
        item.addEventListener('mousedown', function (e) {
          e.preventDefault();
          input.value = city;
          listEl.style.display = 'none';
        });
        listEl.appendChild(item);
      });
      listEl.style.display = 'block';
    });

    input.addEventListener('blur', function () {
      setTimeout(function () { listEl.style.display = 'none'; }, 200);
    });

    input.addEventListener('focus', function () {
      if (listEl.children.length > 0) listEl.style.display = 'block';
    });
  }

  setupCityAutocomplete('settingMyCity');
  setupCityAutocomplete('settingPartnerCity');

  // ==================== Auto Refresh ====================

  setInterval(function () {
    data = S.loadData();
    var syncEl = document.querySelector('.sync-status');
    if (syncEl) syncEl.textContent = '同步中 · ' + S.getNowTimeStr() + ' 更新';
  }, 10000);

  // Listen for data updates from other windows
  if (window.electronAPI && window.electronAPI.onDataUpdated) {
    window.electronAPI.onDataUpdated(function () {
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
