/**
 * 我们的小窗 - 数据层（浏览器兼容版）
 * 使用 localStorage 模拟后端数据存储
 */

window.AppStore = (function () {
  const STORAGE_KEY = 'love-floating-window-data';

  // 默认 Mock 数据
  function getDefaultData() {
    return {
      me: {
        name: '倩倩',
        avatar: '倩',
        avatarColor: 'blush',
        avatarImage: null,
        city: '诸暨',
        lat: 29.7069,
        lng: 120.2362,
      },
      partner: {
        name: '胖胖磨叽',
        avatar: '胖',
        avatarColor: 'lilac',
        avatarImage: null,
        city: '北京',
        lat: 39.9042,
        lng: 116.4074,
      },
      meetup: {
        date: '2026-06-24',
        location: '北京南站',
        note: '周五晚上到，记得提前看天气。',
        updatedBy: 'me',
        updatedAt: '12:10',
      },
      status: {
        me: {
          mood: '开心',
          quickStatus: '工作中',
          freeText: '今天效率不错，晚上 22:30 可以视频。',
          updatedAt: '09:20',
        },
        partner: {
          mood: '想念',
          quickStatus: '路上',
          freeText: '在地铁上，信号可能不太好，晚点认真回你。',
          updatedAt: '18:30',
        },
      },
      todos: {
        me: [
          { id: 'm1', text: '确认见面那天的时间', note: '这个今天有空再看', done: false, createdBy: 'me', createdAt: '09:00' },
          { id: 'm2', text: '给胖胖磨叽留一句晚安', note: '不需要很长', done: false, createdBy: 'me', createdAt: '09:05' },
        ],
        partner: [
          { id: 'p1', text: '回家后报平安', note: '已完成归档', done: false, createdBy: 'partner', createdAt: '18:30' },
          { id: 'p2', text: '早点休息', note: '今天别熬太晚', done: false, createdBy: 'partner', createdAt: '18:32' },
        ],
        shared: [
          { id: 's1', text: '晚上视频 20 分钟', note: '聊一下周末安排', done: false, createdBy: 'me', createdAt: '10:00' },
          { id: 's2', text: '确认见面当天晚餐', note: '想吃热乎一点的', done: false, createdBy: 'me', createdAt: '10:05' },
        ],
      },
      completed: {
        me: [],
        partner: [],
        shared: [],
      },
      memories: [
        {
          id: 'mem1',
          title: '异地第 100 天',
          date: '2026-06-18',
          content: '',
          remind: true,
          remindRule: '前一天 + 当天',
        },
        {
          id: 'mem2',
          title: '下次小惊喜',
          date: '2026-06-30',
          content: '准备一封短短的手写信，不用太正式。',
          remind: true,
          remindRule: '当天',
        },
        {
          id: 'mem3',
          title: '第一次一起看展',
          date: '2026-07-12',
          content: '备注：想把那天的票根留着。',
          remind: false,
          remindRule: '',
        },
        {
          id: 'mem4',
          title: '见面纪念日',
          date: '每月 24 日',
          content: '当天系统通知，提醒说一句认真想念。',
          remind: true,
          remindRule: '循环提醒',
        },
      ],
      messages: [
        {
          id: 'msg1',
          author: 'partner',
          content: '今天有点忙，但想到快见面了，就觉得还能再坚持一下。',
          time: '18:42',
          date: '2026-06-12',
        },
      ],
      timeline: [
        {
          id: 'tl1',
          type: '留言',
          content: '胖胖磨叽：今天有点忙，但想到快见面了，就觉得还能再坚持一下。',
          time: '18:42',
          date: '2026-06-12',
          author: 'partner',
        },
        {
          id: 'tl2',
          type: '见面计划变化',
          content: '倩倩把地点更新为"北京南站"，备注：周五晚上到。',
          time: '12:10',
          date: '2026-06-12',
          author: 'me',
        },
        {
          id: 'tl3',
          type: '状态更新',
          content: '倩倩更新心情为"开心"，状态为"工作中"。',
          time: '09:20',
          date: '2026-06-12',
          author: 'me',
        },
      ],
      playlist: [
        { id: 'pl1', title: '小幸运', artist: 'Hebe Tien' },
        { id: 'pl2', title: '往后余生', artist: '马良' },
        { id: 'pl3', title: '慢慢喜欢你', artist: 'Karen Mok' },
        { id: 'pl4', title: '就是爱你', artist: 'David Tao' },
        { id: 'pl5', title: '遇见', artist: 'Stefanie Sun' },
        { id: 'pl6', title: '告白气球', artist: 'Jay Chou' },
        { id: 'pl7', title: '刚好遇见你', artist: '李玉刚' },
        { id: 'pl8', title: '想把我唱给你听', artist: '老狼 / 王婧' },
      ],
      currentSongIndex: 0,
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // 迁移旧数据：补上城市字段和对象昵称
        if (!data.me.city) { data.me.city = '诸暨'; data.me.lat = 29.7069; data.me.lng = 120.2362; }
        if (!data.partner.city) { data.partner.city = '北京'; data.partner.lat = 39.9042; data.partner.lng = 116.4074; }
        if (data.partner.name === '阿远') { data.partner.name = '胖胖磨叽'; }
        if (data.partner.avatar === '远') { data.partner.avatar = '胖'; }
        // 迁移：补上 completed 字段
        if (!data.completed) { data.completed = { me: [], partner: [], shared: [] }; }
        // 迁移：补上 avatarImage 字段
        if (!data.me.hasOwnProperty('avatarImage')) { data.me.avatarImage = null; }
        if (!data.partner.hasOwnProperty('avatarImage')) { data.partner.avatarImage = null; }
        // 迁移：补上 meetup.updatedBy / updatedAt 字段
        if (data.meetup && !data.meetup.hasOwnProperty('updatedBy')) { data.meetup.updatedBy = null; }
        if (data.meetup && !data.meetup.hasOwnProperty('updatedAt')) { data.meetup.updatedAt = null; }
        // 迁移：为旧待办补上 createdBy
        ['me', 'partner', 'shared'].forEach(function (key) {
          if (data.todos && data.todos[key]) {
            data.todos[key].forEach(function (t) {
              if (!t.createdBy) { t.createdBy = (key === 'partner' ? 'partner' : 'me'); }
              if (!t.createdAt) { t.createdAt = ''; }
            });
          }
        });
        // 迁移：为旧时间线补上 author
        if (data.timeline) {
          data.timeline.forEach(function (t) {
            if (!t.author) {
              // 从内容推测作者
              if (t.content && (t.content.indexOf('倩倩') !== -1 || t.content.indexOf(data.me.name) !== -1)) {
                t.author = 'me';
              } else if (t.content && (t.content.indexOf('胖胖磨叽') !== -1 || t.content.indexOf(data.partner.name) !== -1)) {
                t.author = 'partner';
              } else {
                t.author = 'me';
              }
            }
          });
        }
        // 迁移：补上 playlist 字段
        if (!data.playlist || !Array.isArray(data.playlist)) {
          data.playlist = getDefaultData().playlist;
        }
        if (!data.hasOwnProperty('currentSongIndex')) { data.currentSongIndex = 0; }
        // 迁移：把已勾选的待办移到 completed
        ['me', 'partner', 'shared'].forEach(function (key) {
          if (data.todos && data.todos[key]) {
            var doneItems = data.todos[key].filter(function (t) { return t.done; });
            var pendingItems = data.todos[key].filter(function (t) { return !t.done; });
            data.todos[key] = pendingItems.map(function (t) { t.done = false; return t; });
            if (doneItems.length > 0) {
              data.completed[key] = data.completed[key].concat(
                doneItems.map(function (t) { delete t.done; t.completedAt = t.completedAt || getNowTimeStr(); return t; })
              );
            }
          }
        });
        saveData(data);
        return data;
      }
    } catch (e) {
      console.error('读取数据失败:', e);
    }
    const data = getDefaultData();
    saveData(data);
    return data;
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (window.electronAPI && window.electronAPI.notifyDataUpdated) {
        window.electronAPI.notifyDataUpdated();
      }
    } catch (e) {
      console.error('保存数据失败:', e);
    }
  }

  function getMeetupDays(meetup) {
    if (!meetup || !meetup.date) return null;
    const target = new Date(meetup.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  function getNowTimeStr() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  function getNowDateStr() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  }

  const MOODS = ['开心', '平静', '想念', '疲惫', '低落', '生气', '忙碌', '期待'];
  const CUSTOM_MOODS = ['委屈', '松弛', '想抱抱', 'emo', '有点烦'];
  const QUICK_STATUSES = ['工作中', '休息中', '通勤中', '忙碌中', '可聊天', '勿扰', '睡觉中', '路上', '吃饭中'];

  const MOOD_COLORS = {
    '开心': 'mood-happy', '平静': 'mood-calm', '想念': 'mood-miss', '疲惫': 'mood-tired',
    '低落': 'mood-sad', '生气': 'mood-angry', '忙碌': 'mood-busy', '期待': 'mood-excited',
    '委屈': 'mood-wronged', '松弛': 'mood-relaxed', '想抱抱': 'mood-hug', 'emo': 'mood-emo', '有点烦': 'mood-annoyed',
  };

  // 常用城市坐标库
  const CITY_COORDS = {
    '北京': [39.9042, 116.4074], '上海': [31.2304, 121.4737],
    '广州': [23.1291, 113.2644], '深圳': [22.5431, 114.0579],
    '杭州': [30.2741, 120.1551], '南京': [32.0603, 118.7969],
    '成都': [30.5728, 104.0668], '武汉': [30.5928, 114.3055],
    '重庆': [29.4316, 106.9123], '西安': [34.3416, 108.9398],
    '长沙': [28.2282, 112.9388], '天津': [39.3434, 117.3616],
    '苏州': [31.2990, 120.5853], '郑州': [34.7466, 113.6253],
    '青岛': [36.0671, 120.3826], '大连': [38.9140, 121.6147],
    '厦门': [24.4798, 118.0894], '昆明': [25.0389, 102.7183],
    '合肥': [31.8206, 117.2272], '济南': [36.6512, 116.9972],
    '沈阳': [41.8057, 123.4315], '哈尔滨': [45.8038, 126.5350],
    '福州': [26.0745, 119.2965], '南宁': [22.8170, 108.3665],
    '贵阳': [26.6470, 106.6302], '石家庄': [38.0428, 114.5149],
    '太原': [37.8706, 112.5489], '兰州': [36.0611, 103.8343],
    '乌鲁木齐': [43.8256, 87.6168], '拉萨': [29.6500, 91.1000],
    '呼和浩特': [40.8424, 111.7491], '海口': [20.0174, 110.3492],
    '银川': [38.4872, 106.2309], '西宁': [36.6171, 101.7782],
    '诸暨': [29.7069, 120.2362], '绍兴': [30.0303, 120.5803],
    '宁波': [29.8683, 121.5440], '温州': [28.0006, 120.6720],
    '无锡': [31.4908, 120.3119], '常州': [31.8106, 119.9741],
    '南通': [31.9808, 120.8943], '扬州': [32.3942, 119.4126],
    '徐州': [34.2616, 117.1847], '珠海': [22.2710, 113.5767],
    '东莞': [23.0208, 113.7518], '佛山': [23.0218, 113.1218],
    '洛阳': [34.6197, 112.4540], '保定': [38.8739, 115.4646],
    '烟台': [37.4638, 121.4479], '威海': [37.5091, 122.1164],
  };

  function getCityCoords(cityName) {
    // 先从旧库查
    if (CITY_COORDS[cityName]) return CITY_COORDS[cityName];
    // 再从全球城市库查
    if (window.WORLD_CITIES) {
      for (var i = 0; i < window.WORLD_CITIES.length; i++) {
        if (window.WORLD_CITIES[i][0] === cityName) {
          return [window.WORLD_CITIES[i][3], window.WORLD_CITIES[i][4]];
        }
      }
    }
    return null;
  }

  function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // 预设头像 Emoji 列表
  var AVATAR_PRESETS = [
    '🐱','🐶','🐰','🐻','🦊','🐼','🐨','🐸',
    '🌸','🌙','⭐','🎀','💎','🌈','☀️','🍀',
    '🧸','🐧','🦋','🐳','🦄','🌺','🍓','🍕',
  ];

  // 预设头像背景色
  var AVATAR_BG_COLORS = [
    { key: 'blush',  label: '玫粉', value: 'var(--color-me)' },
    { key: 'lilac',  label: '紫藤', value: 'var(--color-partner)' },
    { key: 'sunset', label: '日落', value: '#f78c35' },
    { key: 'ocean',  label: '海洋', value: '#5b6abf' },
    { key: 'mint',   label: '薄荷', value: '#5ec6a0' },
    { key: 'rose',   label: '玫瑰', value: '#f5a0b8' },
    { key: 'sky',    label: '天空', value: '#5b9bd5' },
    { key: 'cocoa',  label: '可可', value: '#a0785a' },
  ];

  return {
    loadData, saveData, getDefaultData, getMeetupDays,
    genId, getNowTimeStr, getNowDateStr,
    MOODS, CUSTOM_MOODS, QUICK_STATUSES, MOOD_COLORS,
    CITY_COORDS, getCityCoords, calcDistance,
    AVATAR_PRESETS, AVATAR_BG_COLORS,
  };
})();
