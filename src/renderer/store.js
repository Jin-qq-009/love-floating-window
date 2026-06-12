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
        city: '诸暨',
        lat: 29.7069,
        lng: 120.2362,
      },
      partner: {
        name: '胖胖磨叽',
        avatar: '胖',
        avatarColor: 'lilac',
        city: '北京',
        lat: 39.9042,
        lng: 116.4074,
      },
      meetup: {
        date: '2026-06-24',
        location: '北京南站',
        note: '周五晚上到，记得提前看天气。',
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
          { id: 'm1', text: '确认见面那天的时间', note: '这个今天有空再看', done: false },
          { id: 'm2', text: '给胖胖磨叽留一句晚安', note: '不需要很长', done: false },
        ],
        partner: [
          { id: 'p1', text: '回家后报平安', note: '已完成归档', done: true },
          { id: 'p2', text: '早点休息', note: '今天别熬太晚', done: false },
        ],
        shared: [
          { id: 's1', text: '晚上视频 20 分钟', note: '聊一下周末安排', done: false },
          { id: 's2', text: '确认见面当天晚餐', note: '想吃热乎一点的', done: false },
        ],
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
        },
        {
          id: 'tl2',
          type: '见面计划变化',
          content: '倩倩把地点更新为"北京南站"，备注：周五晚上到。',
          time: '12:10',
          date: '2026-06-12',
        },
        {
          id: 'tl3',
          type: '状态更新',
          content: '倩倩更新心情为"开心"，状态为"工作中"。',
          time: '09:20',
          date: '2026-06-12',
        },
      ],
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
    '开心': 'pink', '平静': 'blue', '想念': 'peach', '疲惫': 'lilac',
    '低落': 'lilac', '生气': 'pink', '忙碌': 'peach', '期待': 'pink',
    '委屈': 'lilac', '松弛': 'mint', '想抱抱': 'pink', 'emo': 'lilac', '有点烦': 'peach',
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
    return CITY_COORDS[cityName] || null;
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

  return {
    loadData, saveData, getDefaultData, getMeetupDays,
    genId, getNowTimeStr, getNowDateStr,
    MOODS, CUSTOM_MOODS, QUICK_STATUSES, MOOD_COLORS,
    CITY_COORDS, getCityCoords, calcDistance,
  };
})();
