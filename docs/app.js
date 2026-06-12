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

    // 见面修改者标注
    var meetupAuthorEl = document.getElementById('meetupAuthor');
    if (data.meetup && data.meetup.updatedBy) {
      var authorName = data.meetup.updatedBy === 'me' ? data.me.name : data.partner.name;
      var authorColor = data.meetup.updatedBy === 'me' ? 'var(--color-me)' : 'var(--color-partner)';
      meetupAuthorEl.innerHTML = '<span class="author-name" style="color:' + authorColor + '">' + escapeHTML(authorName) + '</span> 修改了见面计划' +
        (data.meetup.updatedAt ? '<span class="author-dot"></span>' + escapeHTML(data.meetup.updatedAt) : '');
      meetupAuthorEl.style.display = '';
    } else {
      meetupAuthorEl.style.display = 'none';
    }

    // 最新留言
    var latestMsgEl = document.getElementById('latestMessage');
    var latestMetaEl = document.getElementById('latestMessageMeta');
    if (data.messages && data.messages.length > 0) {
      var latest = data.messages[data.messages.length - 1];
      latestMsgEl.textContent = latest.content;
      var authorName = latest.author === 'me' ? data.me.name : data.partner.name;
      var authorColor = latest.author === 'me' ? 'var(--color-me)' : 'var(--color-partner)';
      latestMetaEl.innerHTML = '<span style="color:' + authorColor + ';font-weight:600">' + escapeHTML(authorName) + '</span>' +
        '<span class="author-dot"></span>' + escapeHTML(latest.time || '');
    } else {
      latestMsgEl.textContent = '还没有留言，点击下方给 TA 留第一句吧';
      latestMetaEl.textContent = '';
    }

    // 我的状态
    var myS = data.status.me;
    renderAvatar(document.getElementById('myAvatar'), data.me);
    document.getElementById('myName').textContent = data.me.name;
    document.getElementById('myStatusText').textContent = myS.quickStatus + ' · ' + myS.freeText.substring(0, 6);
    var myMoodPill = document.getElementById('myMoodPill');
    myMoodPill.textContent = myS.mood;
    myMoodPill.className = 'mood-pill ' + (S.MOOD_COLORS[myS.mood] || 'mood-none');
    document.getElementById('myFreeText').textContent = myS.freeText;

    // 对方状态
    var pS = data.status.partner;
    renderAvatar(document.getElementById('partnerAvatar'), data.partner);
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
      ...data.todos.me.map(function (t) { return Object.assign({}, t, { owner: data.me.name, ownerColor: 'var(--color-me)' }); }),
      ...data.todos.partner.map(function (t) { return Object.assign({}, t, { owner: data.partner.name, ownerColor: 'var(--color-partner)' }); }),
      ...data.todos.shared.map(function (t) { return Object.assign({}, t, { owner: '共同', ownerColor: '#5ec6a0' }); }),
    ];
    var completedCount = (data.completed ? data.completed.me.length : 0)
      + (data.completed ? data.completed.partner.length : 0)
      + (data.completed ? data.completed.shared.length : 0);
    if (allTodos.length === 0 && completedCount === 0) {
      previewEl.innerHTML = '<p class="empty-hint">暂无待办，去待办页添加吧</p>';
    } else {
      if (allTodos.length === 0) {
        previewEl.innerHTML = '<p class="empty-hint">所有待办已完成 🎉</p>';
      } else {
        allTodos.slice(0, 4).forEach(function (t) {
          var label = document.createElement('label');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = false;
          cb.disabled = true;
          cb.style.accentColor = 'var(--brand)';
          label.appendChild(cb);
          // 把所有文字包在一个 span 里，避免 grid 多 cell 问题
          var textWrap = document.createElement('span');
          textWrap.style.display = 'inline';
          var ownerSpan = document.createElement('span');
          ownerSpan.className = 'todo-owner';
          ownerSpan.style.color = t.ownerColor;
          ownerSpan.textContent = t.owner;
          textWrap.appendChild(document.createTextNode(' '));
          textWrap.appendChild(ownerSpan);
          textWrap.appendChild(document.createTextNode('：' + t.text));
          label.appendChild(textWrap);
          previewEl.appendChild(label);
        });
      }
      if (completedCount > 0) {
        var completedHint = document.createElement('p');
        completedHint.className = 'completed-hint';
        completedHint.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 12L3 9l1.4-1.4L6 9.2l5.6-5.6L13 5l-7 7z" fill="currentColor"/></svg> 已完成 ' + completedCount + ' 项，点击查看';
        completedHint.addEventListener('click', function () {
          setView('todos');
        });
        previewEl.appendChild(completedHint);
      }
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
      // 添加创建者标注
      if (t.author) {
        var authorName = t.author === 'me' ? data.me.name : data.partner.name;
        var authorColor = t.author === 'me' ? 'var(--color-me)' : 'var(--color-partner)';
        var authorEl = document.createElement('span');
        authorEl.className = 'timeline-author';
        authorEl.innerHTML = '<span style="color:' + authorColor + ';font-weight:600">' + escapeHTML(authorName) + '</span> 发布';
        div.appendChild(authorEl);
      }
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

  var timelineCollapsed = true;
  var btnToggleTimeline = document.getElementById('btnToggleTimeline');
  var timelineContent = document.getElementById('timelineContent');

  // 默认收起
  timelineContent.style.maxHeight = '0';
  timelineContent.style.overflow = 'hidden';
  btnToggleTimeline.classList.add('collapsed');
  btnToggleTimeline.setAttribute('aria-expanded', 'false');
  btnToggleTimeline.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> 展开';

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
      author: 'me',
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
      author: 'me',
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

    // 记录修改者
    data.meetup.updatedBy = 'me';
    data.meetup.updatedAt = S.getNowTimeStr();

    data.timeline.unshift({
      id: S.genId(),
      type: '见面计划变化',
      content: data.me.name + '更新了见面计划：' + date + ' · ' + (location || ''),
      time: S.getNowTimeStr(),
      date: S.getNowDateStr(),
      author: 'me',
    });

    S.saveData(data);
    closeModal('modalMeetup');
    renderHome();
    showToast('见面计划已更新');
  });

  // ==================== Todos ====================

  function renderTodos() {
    data = S.loadData();

    // 确保数据结构完整
    if (!data.completed) data.completed = { me: [], partner: [], shared: [] };

    renderAvatar(document.getElementById('todoMyAvatar'), data.me);
    document.getElementById('todoMyName').textContent = data.me.name + '的待办';
    renderAvatar(document.getElementById('todoPartnerAvatar'), data.partner);
    document.getElementById('todoPartnerName').textContent = data.partner.name + '的待办';

    renderTodoList('myTodoList', data.todos.me, 'me');
    renderTodoList('partnerTodoList', data.todos.partner, 'partner');
    renderTodoList('sharedTodoList', data.todos.shared, 'shared');

    // 已完成列表
    document.getElementById('completedMyName').textContent = data.me.name;
    document.getElementById('completedPartnerName').textContent = data.partner.name;
    renderCompletedList('myCompletedList', data.completed.me, 'me');
    renderCompletedList('partnerCompletedList', data.completed.partner, 'partner');
    renderCompletedList('sharedCompletedList', data.completed.shared, 'shared');

    // 清空按钮显示
    var totalCompleted = data.completed.me.length + data.completed.partner.length + data.completed.shared.length;
    document.getElementById('btnClearCompleted').style.display = totalCompleted > 0 ? 'inline-block' : 'none';
  }

  function renderTodoList(containerId, todos, category) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    if (todos.length === 0) {
      container.innerHTML = '<p class="empty-hint">暂无待办</p>';
      return;
    }

    todos.forEach(function (todo, idx) {
      var label = document.createElement('label');
      label.className = 'task';
      var canEdit = category === 'me' || category === 'shared';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = false; // 只显示未完成的
      if (!canEdit) cb.disabled = true;
      cb.addEventListener('change', function () {
        // 勾选 → 移到已完成
        var item = data.todos[category].splice(idx, 1)[0];
        item.completedAt = S.getNowTimeStr();
        item.completedBy = 'me';
        if (!data.completed) data.completed = { me: [], partner: [], shared: [] };
        data.completed[category].unshift(item);
        S.saveData(data);
        renderTodos();
        renderHome();
        showToast('已完成：' + item.text);
      });
      label.appendChild(cb);
      // 创建者标注
      var taskContent = document.createElement('div');
      taskContent.className = 'task-content';
      var taskMain = document.createElement('div');
      taskMain.className = 'task-main';
      taskMain.textContent = todo.text;
      if (todo.note) {
        var noteEl = document.createElement('span');
        noteEl.className = 'task-note';
        noteEl.textContent = todo.note;
        taskMain.appendChild(noteEl);
      }
      taskContent.appendChild(taskMain);
      // 创建者信息
      if (todo.createdBy) {
        var creatorName = todo.createdBy === 'me' ? data.me.name : data.partner.name;
        var creatorColor = todo.createdBy === 'me' ? 'var(--color-me)' : 'var(--color-partner)';
        var creatorEl = document.createElement('span');
        creatorEl.className = 'task-creator';
        creatorEl.innerHTML = '<span style="color:' + creatorColor + ';font-weight:600">' + escapeHTML(creatorName) + '</span> 添加' +
          (todo.createdAt ? '<span class="author-dot"></span>' + escapeHTML(todo.createdAt) : '');
        taskContent.appendChild(creatorEl);
      }
      label.appendChild(taskContent);
      container.appendChild(label);
    });
  }

  function renderCompletedList(containerId, items, category) {
    var container = document.getElementById(containerId);
    container.innerHTML = '';

    if (items.length === 0) {
      container.innerHTML = '<p class="empty-hint" style="padding:12px 8px;font-size:12px">暂无已完成</p>';
      return;
    }

    items.forEach(function (item, idx) {
      var div = document.createElement('div');
      div.className = 'completed-item';

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.addEventListener('change', function () {
        // 取消勾选 → 恢复到待办
        var restored = data.completed[category].splice(idx, 1)[0];
        delete restored.completedAt;
        delete restored.completedBy;
        data.todos[category].unshift(restored);
        S.saveData(data);
        renderTodos();
        renderHome();
        showToast('已恢复：' + restored.text);
      });

      var textWrap = document.createElement('div');
      textWrap.className = 'completed-text';
      textWrap.textContent = item.text;
      if (item.note) {
        var noteEl = document.createElement('span');
        noteEl.className = 'completed-note';
        noteEl.textContent = item.note;
        textWrap.appendChild(noteEl);
      }
      // 创建者标注
      if (item.createdBy) {
        var creatorName = item.createdBy === 'me' ? data.me.name : data.partner.name;
        var creatorColor = item.createdBy === 'me' ? 'var(--color-me)' : 'var(--color-partner)';
        var creatorEl = document.createElement('span');
        creatorEl.className = 'task-creator';
        creatorEl.innerHTML = '<span style="color:' + creatorColor + ';font-weight:600">' + escapeHTML(creatorName) + '</span> 添加';
        textWrap.appendChild(creatorEl);
      }

      var timeEl = document.createElement('span');
      timeEl.className = 'completed-time';
      // 显示完成者 + 时间
      if (item.completedBy) {
        var completerName = item.completedBy === 'me' ? data.me.name : data.partner.name;
        var completerColor = item.completedBy === 'me' ? 'var(--color-me)' : 'var(--color-partner)';
        timeEl.innerHTML = '<span style="color:' + completerColor + ';font-weight:600">' + escapeHTML(completerName) + '</span> 完成' +
          (item.completedAt ? '<span class="author-dot"></span>' + escapeHTML(item.completedAt) : '');
      } else {
        timeEl.textContent = item.completedAt || '';
      }

      div.appendChild(cb);
      div.appendChild(textWrap);
      div.appendChild(timeEl);
      container.appendChild(div);
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

    var newTodo = { id: S.genId(), text: text, note: note, createdBy: 'me', createdAt: S.getNowTimeStr() };
    data.todos[currentTodoTarget].push(newTodo);
    S.saveData(data);
    closeModal('modalTodo');
    renderTodos();
    renderHome();
    showToast('待办已添加');
  });

  // 清空已完成事项
  document.getElementById('btnClearCompleted').addEventListener('click', function () {
    showConfirm({
      title: '清空已完成事项',
      message: '确定要清空所有已完成的事项吗？此操作不可撤销。',
      onConfirm: function () {
        data.completed = { me: [], partner: [], shared: [] };
        S.saveData(data);
        renderTodos();
        renderHome();
        showToast('已完成事项已清空');
      }
    });
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
      author: 'me',
    });

    S.saveData(data);
    closeModal('modalMemory');
    renderMemories();
    renderHome();
    showToast('纪念日已添加');
  });

  // ==================== Avatar Module ====================

  // 全局头像渲染函数：根据 avatarImage 类型渲染到 .avatar 元素
  function renderAvatar(el, personData) {
    if (!el) return;
    var img = personData.avatarImage;
    // 清空之前的内容
    el.innerHTML = '';
    el.style.background = '';
    el.style.backgroundImage = '';
    el.style.backgroundSize = '';

    if (img && img.startsWith('emoji:')) {
      // emoji 头像
      var emoji = img.substring(6);
      el.textContent = '';
      el.style.background = 'var(--surface)';
      el.style.border = '2px solid var(--line)';
      var span = document.createElement('span');
      span.className = 'avatar-emoji';
      span.textContent = emoji;
      el.appendChild(span);
    } else if (img && img.startsWith('data:image')) {
      // 自定义图片头像
      var imgEl = document.createElement('img');
      imgEl.className = 'avatar-img';
      imgEl.src = img;
      imgEl.alt = personData.name;
      el.textContent = '';
      el.style.background = 'transparent';
      el.appendChild(imgEl);
    } else {
      // 文字头像（默认）
      var colorClass = personData.avatarColor || (personData === data.me ? 'blush' : 'lilac');
      el.textContent = personData.avatar || personData.name.charAt(0);
      el.className = el.className.replace(/\b(blush|lilac|sunset|ocean|mint|rose|sky|cocoa)\b/g, '').trim();
      el.classList.add(colorClass);
    }
  }

  // 渲染所有头像显示点
  function renderAllAvatars() {
    // 首页状态卡
    renderAvatar(document.getElementById('myAvatar'), data.me);
    renderAvatar(document.getElementById('partnerAvatar'), data.partner);
    // 待办页
    renderAvatar(document.getElementById('todoMyAvatar'), data.me);
    renderAvatar(document.getElementById('todoPartnerAvatar'), data.partner);
    // 设置页
    renderAvatar(document.getElementById('myAvatarSetting'), data.me);
    renderAvatar(document.getElementById('partnerAvatarSetting'), data.partner);
    // 设置页名称
    var myAvatarName = document.getElementById('myAvatarName');
    var partnerAvatarName = document.getElementById('partnerAvatarName');
    if (myAvatarName) myAvatarName.textContent = data.me.name;
    if (partnerAvatarName) partnerAvatarName.textContent = data.partner.name;
  }

  // 头像弹窗状态
  var avatarEditTarget = 'me'; // 'me' | 'partner'
  var avatarSelectedEmoji = null;
  var avatarSelectedColor = null;
  var avatarUploadedImage = null;

  function openAvatarModal(target) {
    avatarEditTarget = target;
    var person = target === 'me' ? data.me : data.partner;
    var currentImg = person.avatarImage;

    // 重置状态
    avatarSelectedEmoji = null;
    avatarSelectedColor = null;
    avatarUploadedImage = null;

    // 设置弹窗标题
    document.getElementById('modalAvatarTitle').textContent = '修改' + (target === 'me' ? '我的' : ' TA 的') + '头像';

    // 渲染当前头像预览
    var preview = document.getElementById('avatarModalCurrent');
    preview.className = 'avatar avatar-xl';
    renderAvatar(preview, person);

    // 渲染 emoji 网格
    var emojiGrid = document.getElementById('avatarEmojiGrid');
    emojiGrid.innerHTML = '';
    S.AVATAR_PRESETS.forEach(function (emoji) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'avatar-emoji-item';
      if (currentImg === 'emoji:' + emoji) {
        item.classList.add('selected');
        avatarSelectedEmoji = emoji;
      }
      item.textContent = emoji;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', currentImg === 'emoji:' + emoji ? 'true' : 'false');
      item.addEventListener('click', function () {
        emojiGrid.querySelectorAll('.avatar-emoji-item').forEach(function (i) {
          i.classList.remove('selected');
          i.setAttribute('aria-selected', 'false');
        });
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        avatarSelectedEmoji = emoji;
        avatarUploadedImage = null;
        // 实时预览
        preview.innerHTML = '';
        preview.style.background = 'var(--surface)';
        preview.style.border = '2px solid var(--line)';
        preview.textContent = '';
        var span = document.createElement('span');
        span.className = 'avatar-emoji';
        span.textContent = emoji;
        preview.appendChild(span);
      });
      emojiGrid.appendChild(item);
    });

    // 渲染颜色网格
    var colorGrid = document.getElementById('avatarColorGrid');
    colorGrid.innerHTML = '';
    S.AVATAR_BG_COLORS.forEach(function (c) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'avatar-color-item';
      if (!currentImg && person.avatarColor === c.key) {
        item.classList.add('selected');
        avatarSelectedColor = c.key;
      }
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', (!currentImg && person.avatarColor === c.key) ? 'true' : 'false');
      var swatch = document.createElement('div');
      swatch.className = 'avatar-color-swatch';
      swatch.style.background = c.value;
      var label = document.createElement('span');
      label.className = 'avatar-color-label';
      label.textContent = c.label;
      item.appendChild(swatch);
      item.appendChild(label);
      item.addEventListener('click', function () {
        colorGrid.querySelectorAll('.avatar-color-item').forEach(function (i) {
          i.classList.remove('selected');
          i.setAttribute('aria-selected', 'false');
        });
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        avatarSelectedColor = c.key;
        avatarSelectedEmoji = null;
        avatarUploadedImage = null;
        // 实时预览
        preview.className = 'avatar avatar-xl ' + c.key;
        preview.innerHTML = '';
        preview.style.background = '';
        preview.style.border = '';
        preview.textContent = person.avatar || person.name.charAt(0);
      });
      colorGrid.appendChild(item);
    });

    // 重置上传区域
    document.getElementById('avatarUploadPreview').style.display = 'none';
    document.getElementById('avatarUploadArea').style.display = '';
    document.getElementById('avatarFileInput').value = '';

    // 切换到对应面板
    var initialTab = 'text';
    if (currentImg && currentImg.startsWith('emoji:')) initialTab = 'emoji';
    else if (currentImg && currentImg.startsWith('data:image')) initialTab = 'upload';
    switchAvatarTab(initialTab);

    openModal('modalAvatar');
  }

  function switchAvatarTab(type) {
    document.querySelectorAll('.avatar-type-tab').forEach(function (tab) {
      var isActive = tab.dataset.type === type;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    document.getElementById('avatarPanelEmoji').classList.toggle('active', type === 'emoji');
    document.getElementById('avatarPanelText').classList.toggle('active', type === 'text');
    document.getElementById('avatarPanelUpload').classList.toggle('active', type === 'upload');
  }

  // 设置页头像卡片点击
  document.querySelectorAll('.avatar-edit-card').forEach(function (card) {
    card.addEventListener('click', function () {
      openAvatarModal(card.dataset.person);
    });
  });

  // 头像类型切换
  document.querySelectorAll('.avatar-type-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchAvatarTab(tab.dataset.type);
    });
  });

  // 图片上传
  var uploadArea = document.getElementById('avatarUploadArea');
  var fileInput = document.getElementById('avatarFileInput');

  uploadArea.addEventListener('click', function () {
    fileInput.click();
  });

  uploadArea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // 拖拽上传
  uploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  uploadArea.addEventListener('dragleave', function () {
    uploadArea.classList.remove('dragover');
  });
  uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    var files = e.dataTransfer.files;
    if (files.length > 0) handleAvatarFile(files[0]);
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleAvatarFile(fileInput.files[0]);
  });

  function handleAvatarFile(file) {
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      showToast('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('图片大小不能超过 2MB');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      // 压缩图片为 200x200 的 base64
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var size = 200;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        // 居中裁切为正方形
        var sw = img.width, sh = img.height;
        var sx = 0, sy = 0;
        if (sw > sh) { sx = (sw - sh) / 2; sw = sh; }
        else { sy = (sh - sw) / 2; sh = sw; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        avatarUploadedImage = dataUrl;
        avatarSelectedEmoji = null;

        // 显示上传预览
        document.getElementById('avatarUploadArea').style.display = 'none';
        document.getElementById('avatarUploadPreview').style.display = 'block';
        document.getElementById('avatarUploadImg').src = dataUrl;

        // 实时预览
        var preview = document.getElementById('avatarModalCurrent');
        preview.className = 'avatar avatar-xl';
        preview.innerHTML = '';
        preview.style.background = 'transparent';
        var imgEl = document.createElement('img');
        imgEl.className = 'avatar-img';
        imgEl.src = dataUrl;
        preview.appendChild(imgEl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 移除上传图片
  document.getElementById('avatarUploadRemove').addEventListener('click', function () {
    avatarUploadedImage = null;
    document.getElementById('avatarUploadPreview').style.display = 'none';
    document.getElementById('avatarUploadArea').style.display = '';
    document.getElementById('avatarFileInput').value = '';
    // 恢复默认预览
    var person = avatarEditTarget === 'me' ? data.me : data.partner;
    var preview = document.getElementById('avatarModalCurrent');
    preview.className = 'avatar avatar-xl';
    renderAvatar(preview, person);
  });

  // 保存头像
  document.getElementById('btnSaveAvatar').addEventListener('click', function () {
    var person = avatarEditTarget === 'me' ? data.me : data.partner;

    if (avatarSelectedEmoji) {
      person.avatarImage = 'emoji:' + avatarSelectedEmoji;
    } else if (avatarUploadedImage) {
      person.avatarImage = avatarUploadedImage;
    } else if (avatarSelectedColor) {
      // 文字头像 + 颜色
      person.avatarImage = null;
      person.avatarColor = avatarSelectedColor;
    }
    // 如果没选择任何东西，保持当前状态不变

    S.saveData(data);
    closeModal('modalAvatar');
    renderAllAvatars();
    renderHome();
    if (views.todos.classList.contains('active')) renderTodos();
    showToast('头像已更新');
  });

  // ==================== Settings ====================

  function fillSettings() {
    data = S.loadData();
    document.getElementById('settingMyName').value = data.me.name;
    document.getElementById('settingPartnerName').value = data.partner.name;
    document.getElementById('settingMeetupDate').value = data.meetup.date || '';
    document.getElementById('settingMeetupLocation').value = data.meetup.location || '';
    document.getElementById('settingMeetupNote').value = data.meetup.note || '';

    // 更新头像显示
    renderAvatar(document.getElementById('myAvatarSetting'), data.me);
    renderAvatar(document.getElementById('partnerAvatarSetting'), data.partner);
    document.getElementById('myAvatarName').textContent = data.me.name;
    document.getElementById('partnerAvatarName').textContent = data.partner.name;

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
      // 只在文字头像模式下更新首字
      if (!data.me.avatarImage) data.me.avatar = myName.charAt(0);
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
      if (!data.partner.avatarImage) data.partner.avatar = partnerName.charAt(0);
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

    // 如果见面计划有变动，记录修改者
    var newDate = document.getElementById('settingMeetupDate').value;
    var newLocation = document.getElementById('settingMeetupLocation').value.trim();
    var newNote = document.getElementById('settingMeetupNote').value.trim();
    if (newDate || newLocation || newNote) {
      data.meetup.updatedBy = 'me';
      data.meetup.updatedAt = S.getNowTimeStr();
    }

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
