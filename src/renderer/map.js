/**
 * 我们的小窗 - 地图模块
 * 基于 Leaflet.js + 高德地图瓦片，中文城市标注
 */

window.AppMap = (function () {
  var map = null;
  var meMarker = null;
  var partnerMarker = null;
  var routeLine = null;
  var currentTileLayer = null;

  /**
   * 创建带城市名标签的标记图标（支持文字/emoji/图片头像）
   */
  function createMarkerIcon(type, avatarData) {
    var color = type === 'me' ? '#e85d91' : '#a987df';
    var bgColor = type === 'me' ? '#ffe3ee' : '#f0e6ff';
    var avatar = avatarData.avatar || avatarData.name.charAt(0);
    var cityName = avatarData.city || (type === 'me' ? '我' : 'TA');
    var avatarImg = avatarData.avatarImage;
    var avatarHtml = '';

    if (avatarImg && avatarImg.startsWith('emoji:')) {
      var emoji = avatarImg.substring(6);
      avatarHtml = '<span style="font-size:15px;font-style:normal">' + emoji + '</span>';
    } else if (avatarImg && avatarImg.startsWith('data:image')) {
      avatarHtml = '<img src="' + avatarImg + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="' + avatarData.name + '">';
    } else {
      avatarHtml = avatar;
    }

    return L.divIcon({
      className: '',
      html:
        '<div class="custom-marker-wrap">' +
          '<div class="map-marker ' + type + '">' + avatarHtml + '</div>' +
          '<div class="marker-label" style="background:' + bgColor + ';color:' + color + ';border-color:' + color + '">' +
            cityName +
          '</div>' +
        '</div>',
      iconSize: [32, 50],
      iconAnchor: [16, 50],
      popupAnchor: [0, -52],
    });
  }

  /**
   * 加载高德地图瓦片（纯中文标注）
   */
  function addTileLayer() {
    if (currentTileLayer && map) {
      map.removeLayer(currentTileLayer);
    }

    // 高德地图 - 纯中文标注标准地图
    var gaodeStandard = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}',
      {
        maxZoom: 18,
        subdomains: '1234',
        attribution: '',
      }
    );

    // 高德卫星图层（备用）
    var gaodeSatellite = L.tileLayer(
      'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      {
        maxZoom: 18,
        subdomains: '1234',
        attribution: '',
      }
    );

    // 高德路网标注层（覆盖在卫星图上）
    var gaodeRoadLabel = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      {
        maxZoom: 18,
        subdomains: '1234',
        attribution: '',
      }
    );

    // 默认使用标准地图
    currentTileLayer = gaodeStandard;
    currentTileLayer.addTo(map);

    // 超时后切换 OSM 备用
    var loadTimeout = setTimeout(function () {
      console.log('[Map] Gaode tiles timeout, trying OSM...');
      if (currentTileLayer && map) {
        map.removeLayer(currentTileLayer);
      }
      currentTileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 18, subdomains: 'abc', attribution: '' }
      );
      currentTileLayer.addTo(map);
    }, 8000);

    currentTileLayer.once('load', function () {
      clearTimeout(loadTimeout);
      console.log('[Map] Gaode tiles loaded successfully');
    });
  }

  function init() {
    if (map) return;

    if (typeof L === 'undefined') {
      console.error('[Map] Leaflet not loaded');
      return;
    }

    var S = window.AppStore;
    var data = S.loadData();

    var meLat = data.me.lat || 29.7069;
    var meLng = data.me.lng || 120.2362;
    var pLat = data.partner.lat || 39.9042;
    var pLng = data.partner.lng || 116.4074;

    var centerLat = (meLat + pLat) / 2;
    var centerLng = (meLng + pLng) / 2;

    try {
      map = L.map('meetupMap', {
        center: [centerLat, centerLng],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: false,
        touchZoom: true,
      });
    } catch (e) {
      console.error('[Map] Failed to create map:', e);
      return;
    }

    // 加载高德瓦片
    addTileLayer();

    // 缩放控件
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 标记和路线
    updateMarkers(data);

    // 适配视图
    fitBounds(meLat, meLng, pLat, pLng);

    // 更新距离
    updateDistanceInfo(data);

    // 确保 DOM 布局完成后再刷新尺寸
    setTimeout(function () {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
  }

  function updateMarkers(data) {
    if (!map) return;

    var meLat = data.me.lat || 29.7069;
    var meLng = data.me.lng || 120.2362;
    var pLat = data.partner.lat || 39.9042;
    var pLng = data.partner.lng || 116.4074;

    var meCity = data.me.city || '我';
    var pCity = data.partner.city || 'TA';

    // 清除旧标记
    if (meMarker) { map.removeLayer(meMarker); meMarker = null; }
    if (partnerMarker) { map.removeLayer(partnerMarker); partnerMarker = null; }
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

    // 我的位置 - 带城市名标签
    meMarker = L.marker([meLat, meLng], {
      icon: createMarkerIcon('me', data.me),
    }).addTo(map);
    meMarker.bindPopup(
      '<div style="text-align:center">' +
        '<strong style="color:#e85d91;font-size:15px">' + data.me.name + '</strong><br>' +
        '<span style="color:#81717e;font-size:12px">📍 ' + meCity + '</span>' +
      '</div>'
    );

    // TA 的位置 - 带城市名标签
    partnerMarker = L.marker([pLat, pLng], {
      icon: createMarkerIcon('partner', data.partner),
    }).addTo(map);
    partnerMarker.bindPopup(
      '<div style="text-align:center">' +
        '<strong style="color:#a987df;font-size:15px">' + data.partner.name + '</strong><br>' +
        '<span style="color:#81717e;font-size:12px">📍 ' + pCity + '</span>' +
      '</div>'
    );

    // 贝塞尔弧线连接两人
    var curvePoints = [];
    var steps = 40;
    var midLat = (meLat + pLat) / 2 + (pLng - meLng) * 0.12;
    var midLng = (meLng + pLng) / 2 - (pLat - meLat) * 0.12;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var lat = (1 - t) * (1 - t) * meLat + 2 * (1 - t) * t * midLat + t * t * pLat;
      var lng = (1 - t) * (1 - t) * meLng + 2 * (1 - t) * t * midLng + t * t * pLng;
      curvePoints.push([lat, lng]);
    }
    routeLine = L.polyline(curvePoints, {
      color: '#e85d91',
      weight: 3,
      opacity: 0.7,
      dashArray: '8 8',
      className: 'route-curve',
    }).addTo(map);

    // 在路线中间添加距离标签
    var midIdx = Math.floor(steps / 2);
    var midPoint = curvePoints[midIdx];
    var S = window.AppStore;
    var distance = S.calcDistance(meLat, meLng, pLat, pLng);
    var distLabel = L.divIcon({
      className: '',
      html: '<div class="distance-badge">' +
        '<span class="dist-icon">❤️</span>' +
        '<span>直线 ' + distance.toLocaleString() + ' km</span>' +
      '</div>',
      iconSize: [120, 28],
      iconAnchor: [60, 14],
    });
    L.marker(midPoint, { icon: distLabel, interactive: false }).addTo(map);
  }

  function fitBounds(lat1, lng1, lat2, lng2) {
    if (!map) return;
    var bounds = L.latLngBounds(
      [Math.min(lat1, lat2) - 1, Math.min(lng1, lng2) - 1],
      [Math.max(lat1, lat2) + 1, Math.max(lng1, lng2) + 1]
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
  }

  function updateDistanceInfo(data) {
    var S = window.AppStore;
    var meLat = data.me.lat || 29.7069;
    var meLng = data.me.lng || 120.2362;
    var pLat = data.partner.lat || 39.9042;
    var pLng = data.partner.lng || 116.4074;

    var distance = S.calcDistance(meLat, meLng, pLat, pLng);

    var el = document.getElementById('mapDistance');
    if (el) el.textContent = '直线 ' + distance.toLocaleString() + ' km';

    var elMe = document.getElementById('mapCityMe');
    if (elMe) elMe.textContent = data.me.city || '我';

    var elP = document.getElementById('mapCityPartner');
    if (elP) elP.textContent = data.partner.city || 'TA';
  }

  function refresh() {
    var S = window.AppStore;
    var data = S.loadData();

    if (!map) {
      init();
      return;
    }

    updateMarkers(data);
    updateDistanceInfo(data);

    var meLat = data.me.lat || 29.7069;
    var meLng = data.me.lng || 120.2362;
    var pLat = data.partner.lat || 39.9042;
    var pLng = data.partner.lng || 116.4074;
    fitBounds(meLat, meLng, pLat, pLng);
  }

  function invalidateSize() {
    if (map) {
      setTimeout(function () { map.invalidateSize(); }, 100);
    }
  }

  return { init: init, refresh: refresh, invalidateSize: invalidateSize };
})();
