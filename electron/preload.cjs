const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopStore", {
  load: () => ipcRenderer.invoke("store:load"),
  save: (data) => ipcRenderer.invoke("store:save", data),
});
