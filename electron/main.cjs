const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let win = null;

const dataFile = () => path.join(app.getPath("userData"), "viajes-data.json");

ipcMain.handle("store:load", () => {
  try {
    return JSON.parse(fs.readFileSync(dataFile(), "utf8"));
  } catch (e) {
    return null;
  }
});

ipcMain.handle("store:save", (_event, data) => {
  // Escritura atómica: primero a un temporal y luego rename,
  // así un cierre brusco nunca deja el archivo a medias.
  const file = dataFile();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
  return true;
});

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    title: "Comparador de Viajes",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icon.ico")
      : path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.loadFile(path.join(__dirname, "..", "index.html"));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.on("closed", () => {
    win = null;
  });
}

// Solo una instancia a la vez: si se abre de nuevo, se enfoca la ventana existente
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
