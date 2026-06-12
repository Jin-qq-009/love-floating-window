/**
 * 我们的小窗 - 地图模块
 * 基于 Leaflet.js 的真实交互地图，高德瓦片 + OSM 备用
 */

window.AppMap = (function () {
  var map = null;
  var meMarker = null;
  var partnerMarker = null;
  var routeLine = null;
  var currentTileLayer = null;

  function createMarkerIcon(type, avatar) {
    return L.divIcon({
      className: '',
      html: '<div class="map-marker ' + type + '">' + avatar + '</div>',
      iconSize: [32, 38],
      iconAnchor: [16, 38],
      popupAnchor: [0, -40],
    });
  }

  function addTileLayer() {
    if (currentTileLayer && map) {
      map.removeLayer(currentTileLayer);
    }

    // 高德地图瓦片（国内最稳定，中文地名）
    currentTileLayer = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_en&size=1&style=7&x={x}&y={y}&z={z}',
      {
        maxZoom: 18,
        subdomains: '1234',
        attribution: '',
      }
    );

    var loadTimeout = setTimeout(function () {
      // 高德加载超时，切换到 OSM
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
      console.log('[Map] Tiles loaded successfully');
    });

    currentTileLayer.addTo(map);
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

    // 创建地图实例
    try {
      map = L.map('meetupMap', {
        center: [centerLat, centerLng],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: true,
      });
    } catch (e) {
      console.error('[Map] Failed to create map:', e);
      return;
    }

    // 加载瓦片
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

    // 清除旧标记
    if (meMarker) { map.removeLayer(meMarker); meMarker = null; }
    if (partnerMarker) { map.removeLayer(partnerMarker); partnerMarker = null; }
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

    // 我的位置
    meMarker = L.marker([meLat, meLng], {
      icon: createMarkerIcon('me', data.me.avatar),
    }).addTo(map);
    meMarker.bindPopup(
      '<strong style="color:#e85d91">' + data.me.name + '</strong><br>' +
      '<span style="color:#81717e">' + (data.me.city || '我的城市') + '</span>'
    );

    // TA 的位置
    partnerMarker = L.marker([pLat, pLng], {
      icon: createMarkerIcon('partner', data.partner.avatar),
    }).addTo(map);
    partnerMarker.bindPopup(
      '<strong style="color:#a987df">' + data.partner.name + '</strong><br>' +
      '<span style="color:#81717e">' + (data.partner.city || 'TA的城市') + '</span>'
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
  }

  function fitBounds(lat1, lng1, lat2, lng2) {
    if (!map) return;
    var bounds = L.latLngBounds(
      [Math.min(lat1, lat2) - 1, Math.min(lng1, lng2) - 1],
      [Math.max(lat1, lat2) + 1, Math.max(lng1, lng2) + 1]
    );
    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 8 });
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
