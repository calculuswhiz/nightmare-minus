const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

let win = null;

function createWindow() {
  // Initialize the window to our specified dimensions
  win = new BrowserWindow({width: 1000, height: 900});
  
  win.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
  }));
  
  // Show dev tools
  // Remove this line before distributing
  // win.webContents.openDevTools();

  // Remove window once app is closed
  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', () => {
  createWindow();
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    app.quit();
  }
});
