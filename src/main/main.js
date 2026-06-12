const { app, BrowserWindow, ipcMain, screen, Tray, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let floatWindow = null;
let tray = null;

const MAIN_WIDTH = 780;
const MAIN_HEIGHT = 620;
const MAIN_MIN_WIDTH = 520;
const MAIN_MIN_HEIGHT = 560;

const FLOAT_WIDTH = 168;
const FLOAT_HEIGHT = 58;
const FLOAT_EXPANDED_WIDTH = 260;
const FLOAT_EXPANDED_HEIGHT = 120;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    minWidth: MAIN_MIN_WIDTH,
    minHeight: MAIN_MIN_HEIGHT,
    frame: false,
    transparent: false,
    backgroundColor: '#fff8fb',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    resizable: true,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 关闭时隐藏到悬浮窗而非退出
  mainWindow.on('close', (e) => {
    if (app.isQuitting) return;
    e.preventDefault();
    mainWindow.hide();
    if (!floatWindow || floatWindow.isDestroyed()) {
      createFloatWindow();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFloatWindow() {
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.show();
    return;
  }

  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  floatWindow = new BrowserWindow({
    width: FLOAT_WIDTH,
    height: FLOAT_HEIGHT,
    x: screenWidth - FLOAT_WIDTH - 20,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatWindow.loadFile(path.join(__dirname, '..', 'renderer', 'float.html'));

  floatWindow.on('closed', () => {
    floatWindow = null;
  });
}

function createTray() {
  // 创建一个简单的托盘图标（粉色圆点）
  const size = 16;
  const img = nativeImage.createEmpty();
  // 使用 data URL 创建图标
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mP4z8BQz4AEwDhiAEGD' +
      'BgwMABADgJgE3ygF1AAAAAElFTkSuQmCC',
      'base64'
    )
  );
  tray = new Tray(icon);
  tray.setToolTip('我们的小窗');

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });

  tray.on('right-click', () => {
    app.isQuitting = true;
    app.quit();
  });
}

// App 生命周期
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  setupIpc();
});

app.on('window-all-closed', () => {
  // macOS 不退出，保持托盘
});

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  } else {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

function setupIpc() {
  // 打开主窗口
  ipcMain.on('open-main-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
    // 隐藏悬浮窗
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.hide();
    }
  });

  // 关闭主窗口到悬浮窗
  ipcMain.on('hide-to-float', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    if (!floatWindow || floatWindow.isDestroyed()) {
      createFloatWindow();
    } else {
      floatWindow.show();
    }
  });

  // 退出应用
  ipcMain.on('quit-app', () => {
    app.isQuitting = true;
    app.quit();
  });

  // 悬浮窗拖拽移动
  ipcMain.on('float-move', (_event, { deltaX, deltaY }) => {
    if (floatWindow && !floatWindow.isDestroyed()) {
      const [x, y] = floatWindow.getPosition();
      floatWindow.setPosition(x + deltaX, y + deltaY);
    }
  });

  // 悬浮窗松手吸附屏幕边缘
  ipcMain.on('float-snap', () => {
    if (floatWindow && !floatWindow.isDestroyed()) {
      const [x, y] = floatWindow.getPosition();
      const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
      const [floatW] = floatWindow.getSize();
      const centerX = x + floatW / 2;
      const snapX = centerX < screenWidth / 2 ? 10 : screenWidth - floatW - 10;
      floatWindow.setPosition(snapX, y);
    }
  });

  // 悬浮窗尺寸切换（小形态 / 展开态）
  ipcMain.on('float-resize', (_event, expanded) => {
    if (floatWindow && !floatWindow.isDestroyed()) {
      if (expanded) {
        floatWindow.setSize(FLOAT_EXPANDED_WIDTH, FLOAT_EXPANDED_HEIGHT);
      } else {
        floatWindow.setSize(FLOAT_WIDTH, FLOAT_HEIGHT);
      }
    }
  });

  // 数据同步：主窗口和悬浮窗共享 localStorage
  ipcMain.on('data-updated', () => {
    // 通知悬浮窗刷新数据
    if (floatWindow && !floatWindow.isDestroyed()) {
      floatWindow.webContents.send('refresh-data');
    }
    // 通知主窗口刷新数据
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('refresh-data');
    }
  });
}
