const { app, BrowserWindow } = require("electron");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    icon: __dirname+"/assets/copycode_logo.png",
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false, // Meilleure sécurité
      contextIsolation: true,
    }
  });

  // Charge l'application React en mode développement
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.setMenu(null);
});
