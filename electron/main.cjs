/**
 * Electron 메인 프로세스: Next 정적 산출물(out/)을 로컬 HTTP로 제공해
 * file:// 이슈 없이 동일한 UI로 로드합니다.
 */
const { app, BrowserWindow, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const handler = require("serve-handler");

/** `build/icon.ico` 또는 `build/icon.png`가 있으면 창·작업 표시줄 아이콘으로 사용 */
function resolveWindowIcon() {
  const base = path.join(__dirname, "..", "build");
  const ico = path.join(base, "icon.ico");
  const png = path.join(base, "icon.png");
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return undefined;
}

/** 패키징 후에도 asar 안의 out/ 경로 */
function getOutDir() {
  return path.join(__dirname, "..", "out");
}

function startStaticServer(staticDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handler(req, res, {
        public: staticDir,
        cleanUrls: true,
        trailingSlash: true,
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, port });
    });
    server.on("error", reject);
  });
}

let staticServer = null;

async function createWindow() {
  const outDir = getOutDir();
  const { server, port } = await startStaticServer(outDir);
  staticServer = server;

  const icon = resolveWindowIcon();

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Breadboard AI Builder",
    /** 로딩 전 흰 화면 깜빡임 줄이기 (캔버스 다크 톤에 맞춤) */
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  win.once("ready-to-show", () => win.show());
  await win.loadURL(`http://127.0.0.1:${port}/`);

  win.on("closed", () => {
    if (staticServer) {
      staticServer.close();
      staticServer = null;
    }
  });
}

app.whenReady().then(() => {
  try {
    nativeTheme.themeSource = "dark";
  } catch {
    /* ignore */
  }
  createWindow().catch((err) => {
    console.error(err);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch(console.error);
  }
});
