/**
 * 我们的小窗 - 主窗口交互逻辑 v2
 * — 自定义确认弹窗、ESC关闭、时间线折叠、情绪语义色
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
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
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

  // ==================== Custom Confirm Dialog ====================
  // 替代 confirm()，支持危险操作输入确认码

  function showConfirm(options) {
    // options: { title, message, requireInput, onConfirm }
    var overlay = document.getElementById('confirmOverlay');
    var titleEl = document.getElementById('confirmTitle');
    var msgEl = document.getElementById('confirmMessage');
    var inputEl = document.getElementById('confirmInput');
    var okBtn = document.getElementById('confirmOk');
    var cancelBtn = document.getElementById('confirmCancel');

    titleEl.textContent = options.title || '确认操作';
    msgEl.textContent = options.message || '确定要执行此操作吗？';

    if (options.requireInput) {
      inputEl.style.display = 'block';
      inputEl.value = '';
      inputEl.placeholder = '输入"确认"以继续';
    } else {
      inputEl.style.display = 'none';
    }

    overlay.classList.add('show');

    // 清理旧监听
    var newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    var newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newCancel.addEventListener('click', function () {
      overlay.classList.remove('show');
    });

    newOk.addEventListener('click', function () {
      if (options.requireInput && inputEl.value.trim() !== '确认') {
        inputEl.style.borderColor = '#e85454';
        inputEl.focus();
        return;
      }
      overlay.classList.remove('show');
      if (options.onConfirm) options.onConfirm();
    });

    if (options.requireInput) {
      setTimeout(function () { inputEl.focus(); }, 100);
    }
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
    tabs.forEach(function (tab) {
      var isActive = tab.dataset.view === name;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    Object.entries(views).forEach(function (entry) {
      entry[1].classList.toggle('active', entry[0] === name);
    });
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
    myMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[myS.mood] || 'mood-none');
    document.getElementById('myFreeText').textContent = myS.freeText;

    // 对方状态
    var pS = data.status.partner;
    document.getElementById('partnerAvatar').textContent = data.partner.avatar;
    document.getElementById('partnerName').textContent = data.partner.name;
    document.getElementById('partnerStatusText').textContent = pS.quickStatus + ' · ' + pS.freeText.substring(0, 6);
    var pMoodPill = document.getElementById('partnerMoodPill');
    pMoodPill.textContent = pS.mood;
    pMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[pS.mood] || 'mood-none');
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
        cb.style.accentColor = 'var(--brand)';
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

  // ==================== Timeline Toggle ====================

  var timelineCollapsed = false;
  var btnToggleTimeline = document.getElementById('btnToggleTimeline');
  var timelineContent = document.getElementById('timelineContent');

  btnToggleTimeline.addEventListener('click', function () {
    timelineCollapsed = !timelineCollapsed;
    btnToggleTimeline.classList.toggle('collapsed', timelineCollapsed);
    btnToggleTimeline.setAttribute('aria-expanded', timelineCollapsed ? 'false' : 'true');

    if (timelineCollapsed) {
      timelineContent.style.maxHeight = '0';
      timelineContent.style.overflow = 'hidden';
      btnToggleTimeline.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> 展开';
    } else {
      timelineContent.style.maxHeight = 'none';
      timelineContent.style.overflow = 'visible';
      btnToggleTimeline.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> 收起';
    }
  });

  // ==================== Modal Helpers ====================

  var currentModalId = null;

  function openModal(id) {
    currentModalId = id;
    document.getElementById(id).classList.add('show');
    // Focus trap: focus first focusable element
    var modal = document.getElementById(id).querySelector('.modal');
    if (modal) {
      var focusable = modal.querySelector('input, textarea, button:not(.modal-close)');
      if (focusable) setTimeout(function () { focusable.focus(); }, 50);
    }
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    currentModalId = null;
  }

  // ESC 关闭 Modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentModalId) {
      closeModal(currentModalId);
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.closest('.modal-overlay').classList.remove('show');
      currentModalId = null;
    });
  });

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.closest('.modal-overlay').classList.remove('show');
      currentModalId = null;
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        currentModalId = null;
      }
    });
  });

  // ==================== Status Update ====================

  // 心情颜色映射（CSS变量值，用于pill圆点）
  var MOOD_CSS_COLORS = {
    '开心': 'var(--mood-happy)', '平静': 'var(--mood-calm)', '想念': 'var(--mood-miss)', '疲惫': 'var(--mood-tired)',
    '低落': 'var(--mood-sad)', '生气': 'var(--mood-angry)', '忙碌': 'var(--mood-busy)', '期待': 'var(--mood-excited)',
    '委屈': 'var(--mood-wronged)', '松弛': 'var(--mood-relaxed)', '想抱抱': 'var(--mood-hug)', 'emo': 'var(--mood-emo)', '有点烦': 'var(--mood-annoyed)',
  };

  document.querySelector('[data-target="me"]').addEventListener('click', function () {
    data = S.loadData();
    // 填充心情选择（带颜色圆点）
    var moodPicker = document.getElementById('moodPicker');
    moodPicker.innerHTML = '';
    var allMoods = [...S.MOODS, ...S.CUSTOM_MOODS, '未设置'];
    allMoods.forEach(function (mood) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill mood-pill-option' + (data.status.me.mood === mood ? ' selected' : '');
      btn.textContent = mood;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', data.status.me.mood === mood ? 'true' : 'false');
      // 设置圆点颜色
      if (mood !== '未设置' && MOOD_CSS_COLORS[mood]) {
        btn.style.setProperty('--pill-dot', MOOD_CSS_COLORS[mood]);
        btn.querySelector(':scope') || true; // force style calc
        // Use inline style for the ::before dot
        var styleTag = document.createElement('style');
        var uid = 'pill-' + mood.replace(/[^a-zA-Z\u4e00-\u9fff]/g, '');
        btn.classList.add(uid);
        styleTag.textContent = '.' + uid + '::before { background: ' + MOOD_CSS_COLORS[mood] + '; }';
        if (!document.getElementById('mood-dot-styles')) {
          var container = document.createElement('style');
          container.id = 'mood-dot-styles';
          document.head.appendChild(container);
        }
        var moodStyles = document.getElementById('mood-dot-styles');
        if (!moodStyles.textContent.includes(uid)) {
          moodStyles.textContent += '\n.' + uid + '::before { background: ' + MOOD_CSS_COLORS[mood] + '; }';
        }
      }
      btn.addEventListener('click', function () {
        moodPicker.querySelectorAll('.pill').forEach(function (p) {
          p.classList.remove('selected');
          p.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-checked', 'true');
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
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', data.status.me.quickStatus === status ? 'true' : 'false');
      btn.addEventListener('click', function () {
        statusPicker.querySelectorAll('.pill').forEach(function (p) {
          p.classList.remove('selected');
          p.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-checked', 'true');
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

    if (selectedMood) {
      var mood = selectedMood.textContent;
      if (mood === '未设置') {
        data.status.me.mood = '';
      } else {
        data.status.me.mood = mood;
      }
    }
    if (selectedStatus) data.status.me.quickStatus = selectedStatus.textContent;
    data.status.me.freeText = freeText;
    data.status.me.updatedAt = S.getNowTimeStr();

    // 添加时间线
    var moodText = data.status.me.mood || '无';
    data.timeline.unshift({
      id: S.genId(),
      type: '状态更新',
      content: data.me.name + '更新心情为"' + moodText + '"，状态为"' + data.status.me.quickStatus + '"。',
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
        delBtn.setAttribute('aria-label', '删除' + mem.title);
        delBtn.addEventListener('click', function () {
          showConfirm({
            title: '删除纪念日',
            message: '确定要删除"' + mem.title + '"吗？此操作不可撤销。',
            onConfirm: function () {
              data.memories = data.memories.filter(function (m) { return m.id !== mem.id; });
              S.saveData(data);
              renderMemories();
              renderHome();
              showToast('纪念日已删除');
            }
          });
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
        delBtnB.setAttribute('aria-label', '删除' + mem.title);
        delBtnB.addEventListener('click', function () {
          showConfirm({
            title: '删除纪念日',
            message: '确定要删除"' + mem.title + '"吗？此操作不可撤销。',
            onConfirm: function () {
              data.memories = data.memories.filter(function (m) { return m.id !== mem.id; });
              S.saveData(data);
              renderMemories();
              renderHome();
              showToast('纪念日已删除');
            }
          });
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
    document.getElementById('settingPartnerName').value = data.partner.name;
    document.getElementById('settingMeetupDate').value = data.meetup.date || '';
    document.getElementById('settingMeetupLocation').value = data.meetup.location || '';
    document.getElementById('settingMeetupNote').value = data.meetup.note || '';

    // 更新城市选择器显示
    var myCityDisplay = document.getElementById('myCityDisplay');
    var partnerCityDisplay = document.getElementById('partnerCityDisplay');
    if (data.me.city) {
      myCityDisplay.textContent = data.me.city;
      myCityDisplay.classList.remove('empty');
    } else {
      myCityDisplay.textContent = '选择城市';
      myCityDisplay.classList.add('empty');
    }
    if (data.partner.city) {
      partnerCityDisplay.textContent = data.partner.city;
      partnerCityDisplay.classList.remove('empty');
    } else {
      partnerCityDisplay.textContent = '选择城市';
      partnerCityDisplay.classList.add('empty');
    }
    document.getElementById('settingMyCity').value = data.me.city || '';
    document.getElementById('settingMyLat').value = data.me.lat || '';
    document.getElementById('settingMyLng').value = data.me.lng || '';
    document.getElementById('settingPartnerCity').value = data.partner.city || '';
    document.getElementById('settingPartnerLat').value = data.partner.lat || '';
    document.getElementById('settingPartnerLng').value = data.partner.lng || '';
  }

  document.getElementById('btnSaveSettings').addEventListener('click', function () {
    var myName = document.getElementById('settingMyName').value.trim();
    var myCity = document.getElementById('settingMyCity').value.trim();
    var myLat = parseFloat(document.getElementById('settingMyLat').value);
    var myLng = parseFloat(document.getElementById('settingMyLng').value);
    var partnerName = document.getElementById('settingPartnerName').value.trim();
    var partnerCity = document.getElementById('settingPartnerCity').value.trim();
    var partnerLat = parseFloat(document.getElementById('settingPartnerLat').value);
    var partnerLng = parseFloat(document.getElementById('settingPartnerLng').value);

    if (myName) {
      data.me.name = myName;
      data.me.avatar = myName.charAt(0);
    }
    if (myCity) {
      data.me.city = myCity;
      if (!isNaN(myLat) && !isNaN(myLng)) {
        data.me.lat = myLat;
        data.me.lng = myLng;
      }
    }
    if (partnerName) {
      data.partner.name = partnerName;
      data.partner.avatar = partnerName.charAt(0);
    }
    if (partnerCity) {
      data.partner.city = partnerCity;
      if (!isNaN(partnerLat) && !isNaN(partnerLng)) {
        data.partner.lat = partnerLat;
        data.partner.lng = partnerLng;
      }
    }
    data.meetup.date = document.getElementById('settingMeetupDate').value || data.meetup.date;
    data.meetup.location = document.getElementById('settingMeetupLocation').value.trim() || data.meetup.location;
    data.meetup.note = document.getElementById('settingMeetupNote').value.trim() || data.meetup.note;

    S.saveData(data);
    renderHome();
    showToast('设置已保存');
  });

  // 重置数据 — 使用自定义确认弹窗 + 输入确认码
  document.getElementById('btnResetData').addEventListener('click', function () {
    showConfirm({
      title: '重置所有数据',
      message: '此操作将清除所有留言、待办、纪念日和设置，且不可撤销。请输入"确认"以继续。',
      requireInput: true,
      onConfirm: function () {
        localStorage.removeItem('love-floating-window-data');
        data = S.loadData();
        renderHome();
        renderTodos();
        renderMemories();
        showToast('数据已重置');
      }
    });
  });

  // ==================== Global City Picker ====================

  var CITIES = window.WORLD_CITIES || [];

  function setupCityPicker(pickerId, hiddenInputId, latInputId, lngInputId, displayId) {
    var picker = document.getElementById(pickerId);
    var display = picker.querySelector('.city-picker-display');
    var displayValue = document.getElementById(displayId);
    var dropdown = picker.querySelector('.city-picker-dropdown');
    var searchInput = picker.querySelector('.city-picker-search');
    var listEl = picker.querySelector('.city-picker-list');
    var onlineEl = picker.querySelector('.city-picker-online');
    var tabBtns = picker.querySelectorAll('.city-tab');
    var currentRegion = 'hot';
    var searchTimer = null;

    function openPicker() {
      document.querySelectorAll('.city-picker.open').forEach(function (p) {
        if (p !== picker) p.classList.remove('open');
      });
      picker.classList.add('open');
      display.setAttribute('aria-expanded', 'true');
      searchInput.value = '';
      currentRegion = 'hot';
      tabBtns.forEach(function (b) {
        b.classList.toggle('active', b.dataset.region === 'hot');
        b.setAttribute('aria-selected', b.dataset.region === 'hot' ? 'true' : 'false');
      });
      renderList('hot');
      setTimeout(function () { searchInput.focus(); }, 50);
    }

    function closePicker() {
      picker.classList.remove('open');
      display.setAttribute('aria-expanded', 'false');
    }

    display.addEventListener('click', function (e) {
      e.stopPropagation();
      if (picker.classList.contains('open')) {
        closePicker();
      } else {
        openPicker();
      }
    });

    document.addEventListener('click', function (e) {
      if (!picker.contains(e.target)) closePicker();
    });

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentRegion = btn.dataset.region;
        tabBtns.forEach(function (b) {
          b.classList.toggle('active', b.dataset.region === currentRegion);
          b.setAttribute('aria-selected', b.dataset.region === currentRegion ? 'true' : 'false');
        });
        searchInput.value = '';
        renderList(currentRegion);
        onlineEl.style.display = 'none';
      });
    });

    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var val = searchInput.value.trim();
      if (!val) {
        renderList(currentRegion);
        onlineEl.style.display = 'none';
        return;
      }
      var results = CITIES.filter(function (c) {
        var ql = val.toLowerCase();
        return c[0].toLowerCase().includes(ql) || c[1].toLowerCase().includes(ql);
      });

      if (results.length > 0) {
        renderCityItems(results);
        onlineEl.style.display = results.length < 8 ? 'flex' : 'none';
      } else {
        listEl.innerHTML = '<div class="city-picker-loading" style="padding:12px">本地未找到匹配城市</div>';
        onlineEl.style.display = 'flex';
      }

      searchTimer = setTimeout(function () {
        if (val.length >= 2) searchOnline(val);
      }, 600);
    });

    function searchOnline(query) {
      var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=6&accept-language=zh';
      fetch(url, { headers: { 'User-Agent': 'LoveFloatingWindow/1.0' } })
        .then(function (r) { return r.json(); })
        .then(function (results) {
          if (!results || results.length === 0) return;
          var existingNames = {};
          CITIES.forEach(function (c) { existingNames[c[0]] = true; });
          var onlineItems = results.filter(function (r) {
            return r.display_name && !existingNames[r.display_name.split(',')[0]];
          }).slice(0, 5);

          if (onlineItems.length === 0) return;

          var sep = listEl.querySelector('.city-online-sep');
          if (sep) sep.remove();

          var separator = document.createElement('div');
          separator.className = 'city-online-sep';
          separator.style.cssText = 'padding:6px 14px;font-size:11px;color:var(--muted);background:var(--surface);border-top:1px solid var(--line);';
          separator.textContent = '在线搜索结果';
          listEl.appendChild(separator);

          onlineItems.forEach(function (item) {
            var nameParts = item.display_name.split(',');
            var cityName = nameParts[0].trim();
            var countryName = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : '';

            var el = document.createElement('div');
            el.className = 'city-online-item';
            el.setAttribute('role', 'option');
            el.innerHTML = '<div class="city-item-name"><span class="cn-name">' + escapeHTML(cityName) + '</span><span class="en-name">' + escapeHTML(countryName) + '</span></div><span class="online-badge">在线</span>';
            el.addEventListener('mousedown', function (e) {
              e.preventDefault();
              selectCity(cityName, parseFloat(item.lat), parseFloat(item.lon));
            });
            listEl.appendChild(el);
          });
        })
        .catch(function () { /* 静默失败 */ });
    }

    onlineEl.addEventListener('click', function () {
      var val = searchInput.value.trim();
      if (val.length >= 2) searchOnline(val);
    });

    function renderList(region) {
      var cities = CITIES.filter(function (c) { return c[5] === region; });
      renderCityItems(cities);
    }

    function renderCityItems(cities) {
      listEl.innerHTML = '';
      if (cities.length === 0) {
        listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted-soft);font-size:13px">暂无匹配城市</div>';
        return;
      }
      var currentValue = document.getElementById(hiddenInputId).value;
      cities.forEach(function (city) {
        var el = document.createElement('div');
        el.className = 'city-item' + (city[0] === currentValue ? ' selected' : '');
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', city[0] === currentValue ? 'true' : 'false');
        el.innerHTML = '<div class="city-item-name"><span class="cn-name">' + escapeHTML(city[0]) + '</span><span class="en-name">' + escapeHTML(city[1]) + '</span></div><span class="city-item-country">' + escapeHTML(city[2]) + '</span>';
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          selectCity(city[0], city[3], city[4]);
        });
        listEl.appendChild(el);
      });
    }

    function selectCity(name, lat, lng) {
      document.getElementById(hiddenInputId).value = name;
      document.getElementById(latInputId).value = lat;
      document.getElementById(lngInputId).value = lng;
      displayValue.textContent = name;
      displayValue.classList.remove('empty');
      closePicker();
    }

    renderList('hot');
  }

  setupCityPicker('myCityPicker', 'settingMyCity', 'settingMyLat', 'settingMyLng', 'myCityDisplay');
  setupCityPicker('partnerCityPicker', 'settingPartnerCity', 'settingPartnerLat', 'settingPartnerLng', 'partnerCityDisplay');

  // ==================== Auto Refresh ====================

  setInterval(function () {
    data = S.loadData();
    var syncEl = document.querySelector('.sync-status');
    if (syncEl) syncEl.textContent = '同步中 · ' + S.getNowTimeStr() + ' 更新';
  }, 10000);

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

  setTimeout(function () {
    if (window.AppMap) {
      window.AppMap.init();
    }
  }, 500);
})();
