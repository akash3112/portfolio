(function () {
  "use strict";

  const STORAGE_KEY = "terminal-bg-enabled";
  const TOGGLE_SHORTCUT_KEY = "b";
  const FORCE_BG_ATTR = "data-terminal-bg-force";
  const FONT_FAMILY =
    "'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace";

  const COLOR = {
    screenTop: "rgba(255, 255, 255, 0.06)",
    screenBottom: "rgba(255, 255, 255, 0.01)",
    prompt: "rgba(255, 255, 255, 0.72)",
    log: "rgba(196, 196, 196, 0.42)",
    boot: "rgba(255, 255, 255, 0.58)",
    info: "rgba(170, 170, 170, 0.48)",
    warn: "rgba(122, 122, 122, 0.54)",
    error: "rgba(226, 226, 226, 0.56)",
    success: "rgba(214, 214, 214, 0.52)",
    cursor: "rgba(255, 255, 255, 0.72)",
    glow: "rgba(255, 255, 255, 0)",
    matrixTrail: "rgba(255, 255, 255, 0.045)",
    matrixHead: "rgba(255, 255, 255, 0.11)",
    glitchTint: "rgba(255, 255, 255, 0.03)",
  };

  const BOOT_SEQUENCE = [
    { text: "[    0.000000] Linux version 6.8.0-cyber (gcc 13.2.0)", type: "boot" },
    { text: "[    0.123641] ACPI: PM-Timer IO Port: 0x1808", type: "log" },
    { text: "[    0.404112] systemd[1]: Starting Network Manager...", type: "info" },
    { text: "[    0.573554] kernel: nftables loaded with legacy bridge support", type: "log" },
    { text: "[    0.822116] audit[1]: service=sshd op=start result=success", type: "success" },
    { text: "[    1.021471] Starting OpenSSH Daemon...", type: "info" },
    { text: "[    1.248877] cloud-init[448]: Initializing cloud-final.target", type: "log" },
    { text: "[    1.535901] cron[580]: started, log level 8", type: "log" },
    { text: "[    1.948015] [  OK  ] Reached target Multi-User System.", type: "success" },
    { text: "akash@cyber:~$ session.attach --profile=portfolio --mode=prod", type: "prompt" },
  ];

  const COMMAND_DICTIONARY = [
    {
      cmd: "whoami",
      out: [{ text: "akash", type: "log" }],
      pause: 640,
    },
    {
      cmd: "uptime",
      out: [
        {
          text: "13:42:11 up 9 days, 03:17, 2 users, load average: 0.16, 0.21, 0.25",
          type: "info",
        },
      ],
      pause: 900,
    },
    {
      cmd: "journalctl -n 3 --no-pager",
      out: [
        { text: "nginx[902]: accepted secure connection from 10.14.0.22", type: "log" },
        { text: "fail2ban.actions[544]: Ban 185.220.101.4", type: "warn" },
        { text: "kernel: tcp: possible SYN flood on port 443", type: "warn" },
      ],
    },
    {
      cmd: "docker ps --format \"table {{.Names}}  {{.Status}}\"",
      out: [
        { text: "NAMES                STATUS", type: "info" },
        { text: "portfolio-api         Up 3 hours (healthy)", type: "success" },
        { text: "audit-queue           Up 3 hours", type: "log" },
      ],
      pause: 820,
    },
    {
      cmd: "nmap -sV 192.168.1.0/24 --open",
      out: [
        { text: "Nmap scan report for 192.168.1.42", type: "log" },
        { text: "22/tcp open  ssh", type: "success" },
        { text: "443/tcp open  https", type: "success" },
        { text: "Service Info: OS: Linux", type: "info" },
      ],
      pause: 1200,
    },
    {
      cmd: "git status --short",
      out: [
        { text: " M assets/css/main.css", type: "log" },
        { text: " M assets/js/terminal-background.js", type: "log" },
        { text: "?? logs/perf-session.txt", type: "info" },
      ],
      pause: 740,
    },
    {
      cmd: "tail -n 4 /var/log/auth.log",
      out: [
        { text: "sshd[1834]: Accepted publickey for root from 10.0.0.5", type: "success" },
        { text: "sudo: akash : TTY=pts/2 ; COMMAND=/usr/bin/systemctl restart", type: "info" },
        { text: "sudo: pam_unix(sudo:session): session opened for user root", type: "log" },
        { text: "sshd[1840]: Failed password for invalid user admin", type: "error" },
      ],
    },
    {
      cmd: "top -b -n 1 | head -n 5",
      out: [
        { text: "Tasks: 186 total, 1 running, 185 sleeping, 0 stopped, 0 zombie", type: "log" },
        { text: "%Cpu(s): 5.2 us, 2.4 sy, 0.0 ni, 90.9 id, 1.1 wa", type: "info" },
        { text: "MiB Mem : 15872 total, 8712 free, 3484 used, 3676 buff/cache", type: "log" },
      ],
      pause: 1020,
    },
  ];

  const PROMPTS = [
    "akash@cyber",
    "root@devnode",
    "secops@sentinel",
    "dev@portfolio",
  ];

  const MATRIX_CHARS = "01abcdef89#$%&*+-<>[]{}";

  const state = {
    initialized: false,
    running: false,
    enabled: readEnabledState(),
    reduceMotion: false,
    isMobile: false,
    layer: null,
    canvas: null,
    scanline: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    maxDpr: 1.8,
    fontSize: 14,
    lineHeight: 20,
    matrixSize: 12,
    paddingX: 24,
    paddingY: 22,
    maxBuffer: 140,
    targetFps: 60,
    frameStep: 1000 / 60,
    lastTick: 0,
    frameDebt: 0,
    rafId: 0,
    cursorOn: true,
    cursorClock: 0,
    scrollOffset: 0,
    glitchCountdown: 7000,
    glitchTime: 0,
    matrixStep: 14,
    matrixDrops: [],
    matrixSpeeds: [],
    lines: [],
    mode: "boot",
    bootIndex: 0,
    commandIndex: 0,
    promptIndex: 0,
    actionTimer: 0,
    typingTarget: "",
    typingChars: 0,
    typingCps: 48,
    activeCommand: null,
    outputIndex: 0,
  };

  const reduceMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

  function readEnabledState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "1";
    } catch (_error) {
      return true;
    }
  }

  function persistEnabledState(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(array, index) {
    return array[index % array.length];
  }

  function detectDeviceFlags() {
    state.isMobile =
      window.matchMedia("(max-width: 860px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;
    state.reduceMotion = reduceMotionMedia.matches;
  }

  function isForceEnabledByPage() {
    return (
      document.body &&
      document.body.getAttribute(FORCE_BG_ATTR) &&
      document.body.getAttribute(FORCE_BG_ATTR).toLowerCase() === "on"
    );
  }

  function applyPerformanceProfile() {
    detectDeviceFlags();
    state.maxDpr = state.isMobile ? 1.25 : 1.8;
    state.fontSize = state.isMobile ? 12 : 14;
    state.lineHeight = state.isMobile ? 17 : 20;
    state.matrixSize = state.isMobile ? 10 : 12;
    state.paddingX = state.isMobile ? 14 : 24;
    state.paddingY = state.isMobile ? 14 : 22;
    state.maxBuffer = state.isMobile ? 100 : 150;
    state.typingCps = state.isMobile ? 36 : 48;

    if (state.reduceMotion) {
      state.targetFps = 12;
      state.typingCps = 140;
    } else {
      state.targetFps = state.isMobile ? 45 : 60;
    }
    state.frameStep = 1000 / state.targetFps;
    applyLayerPresentation();
  }

  function applyLayerPresentation() {
    if (!state.layer) {
      return;
    }

    state.layer.style.opacity = state.reduceMotion ? "0.04" : "0.08";

    if (!state.scanline) {
      return;
    }

    if (state.reduceMotion) {
      state.scanline.style.animation = "none";
      state.scanline.style.opacity = "0.02";
    } else {
      state.scanline.style.animation = "terminal-scan 9s linear infinite";
      state.scanline.style.opacity = "0.03";
    }
  }

  function ensureRuntimeStyles() {
    if (document.getElementById("terminal-bg-runtime-styles")) {
      return;
    }

    const runtimeStyle = document.createElement("style");
    runtimeStyle.id = "terminal-bg-runtime-styles";
    runtimeStyle.textContent =
      "@keyframes terminal-scan{0%{transform:translateY(0)}100%{transform:translateY(4px)}}" +
      "body.terminal-bg-disabled .terminal-bg-layer{display:none!important;}";
    document.head.appendChild(runtimeStyle);
  }

  function createLayer() {
    ensureRuntimeStyles();

    const layer = document.createElement("div");
    layer.className = "terminal-bg-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "0";
    layer.style.overflow = "hidden";
    layer.style.background =
      "linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0))";

    const canvas = document.createElement("canvas");
    canvas.className = "terminal-bg-canvas";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.filter = "none";

    const scanline = document.createElement("div");
    scanline.className = "terminal-bg-scanlines";
    scanline.style.position = "absolute";
    scanline.style.inset = "0";
    scanline.style.pointerEvents = "none";
    scanline.style.mixBlendMode = "normal";
    scanline.style.background =
      "repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 1px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0) 4px)";

    layer.appendChild(canvas);
    layer.appendChild(scanline);
    document.body.prepend(layer);

    state.layer = layer;
    state.canvas = canvas;
    state.scanline = scanline;
    state.ctx =
      canvas.getContext("2d", { alpha: true, desynchronized: true }) ||
      canvas.getContext("2d");

    applyLayerPresentation();
  }

  function resizeCanvas() {
    if (!state.canvas || !state.ctx) {
      return;
    }

    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    state.dpr = Math.min(window.devicePixelRatio || 1, state.maxDpr);
    state.width = viewportWidth;
    state.height = viewportHeight;

    state.canvas.width = Math.floor(viewportWidth * state.dpr);
    state.canvas.height = Math.floor(viewportHeight * state.dpr);
    state.canvas.style.width = viewportWidth + "px";
    state.canvas.style.height = viewportHeight + "px";

    state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    rebuildMatrix();
  }

  function rebuildMatrix() {
    const columns = Math.max(
      12,
      Math.floor(state.width / Math.max(8, state.matrixSize * 1.35))
    );

    state.matrixStep = state.width / columns;
    state.matrixDrops = new Array(columns);
    state.matrixSpeeds = new Array(columns);

    for (let i = 0; i < columns; i += 1) {
      state.matrixDrops[i] = rand(-state.height, state.height);
      state.matrixSpeeds[i] = rand(state.isMobile ? 12 : 18, state.isMobile ? 26 : 42);
    }
  }

  function resetTerminal() {
    state.lines = [];
    state.scrollOffset = 0;
    state.cursorClock = 0;
    state.cursorOn = true;
    state.commandIndex = 0;
    state.promptIndex = 0;
    state.outputIndex = 0;
    state.typingTarget = "";
    state.typingChars = 0;
    state.activeCommand = null;
    state.glitchCountdown = rand(4600, 9800);
    state.glitchTime = 0;

    if (state.reduceMotion) {
      for (let i = 0; i < Math.min(6, BOOT_SEQUENCE.length); i += 1) {
        pushLine(BOOT_SEQUENCE[i].text, BOOT_SEQUENCE[i].type);
      }
      state.mode = "idle";
      state.actionTimer = 420;
      return;
    }

    state.mode = "boot";
    state.bootIndex = 0;
    state.actionTimer = 90;
  }

  function pushLine(text, type) {
    state.lines.push({ text: text, type: type || "log" });
    if (state.lines.length > state.maxBuffer) {
      state.lines.splice(0, state.lines.length - state.maxBuffer);
    }
    state.scrollOffset = Math.min(state.scrollOffset + state.lineHeight, state.lineHeight * 2.4);
  }

  function scheduleNextCommand() {
    state.activeCommand = pick(COMMAND_DICTIONARY, state.commandIndex);
    state.commandIndex += 1;
    const prompt = pick(PROMPTS, state.promptIndex);
    state.promptIndex += 1;
    state.typingTarget = prompt + ":~$ " + state.activeCommand.cmd;
    state.typingChars = 0;
    state.outputIndex = 0;

    if (state.reduceMotion) {
      pushLine(state.typingTarget, "prompt");
      state.mode = "output-fast";
      state.actionTimer = 40;
      return;
    }

    state.mode = "typing";
  }

  function updateTerminal(dt) {
    switch (state.mode) {
      case "boot":
        state.actionTimer -= dt;
        if (state.actionTimer <= 0) {
          const line = BOOT_SEQUENCE[state.bootIndex];
          pushLine(line.text, line.type);
          state.bootIndex += 1;
          if (state.bootIndex >= BOOT_SEQUENCE.length) {
            state.mode = "idle";
            state.actionTimer = 720;
          } else {
            state.actionTimer = rand(70, 185);
          }
        }
        break;

      case "idle":
        state.actionTimer -= dt;
        if (state.actionTimer <= 0) {
          scheduleNextCommand();
        }
        break;

      case "typing":
        state.typingChars += (state.typingCps * dt) / 1000;
        if (state.typingChars >= state.typingTarget.length) {
          pushLine(state.typingTarget, "prompt");
          state.mode = "output";
          state.outputIndex = 0;
          state.actionTimer = rand(80, 220);
        }
        break;

      case "output":
      case "output-fast":
        state.actionTimer -= dt;
        if (state.actionTimer <= 0 && state.activeCommand) {
          if (state.outputIndex < state.activeCommand.out.length) {
            const outputLine = state.activeCommand.out[state.outputIndex];
            pushLine(outputLine.text, outputLine.type || "log");
            state.outputIndex += 1;
            if (state.mode === "output-fast") {
              state.actionTimer = 60;
            } else {
              state.actionTimer = outputLine.delay || rand(80, 240);
            }
          } else {
            state.mode = "idle";
            state.actionTimer = state.activeCommand.pause || rand(600, 1400);
          }
        }
        break;

      default:
        state.mode = "idle";
        state.actionTimer = 800;
        break;
    }
  }

  function updateMotion(dt) {
    state.cursorClock += dt;
    if (state.cursorClock >= 520) {
      state.cursorClock = 0;
      state.cursorOn = !state.cursorOn;
    }

    if (state.scrollOffset > 0.15) {
      state.scrollOffset *= 0.82;
    } else {
      state.scrollOffset = 0;
    }

    if (!state.reduceMotion) {
      state.glitchCountdown -= dt;
      if (state.glitchCountdown <= 0) {
        state.glitchTime = rand(70, 150);
        state.glitchCountdown = rand(5000, 11000);
      }
      if (state.glitchTime > 0) {
        state.glitchTime -= dt;
      }
    } else {
      state.glitchTime = 0;
    }
  }

  function updateMatrix(dt) {
    if (state.reduceMotion || state.matrixDrops.length === 0) {
      return;
    }

    const factor = dt / 16.6667;
    for (let i = 0; i < state.matrixDrops.length; i += 1) {
      state.matrixDrops[i] += state.matrixSpeeds[i] * factor;
      if (state.matrixDrops[i] > state.height + state.matrixSize * 3 && Math.random() > 0.97) {
        state.matrixDrops[i] = rand(-state.height * 0.45, 0);
      }
    }
  }

  function lineColor(type) {
    switch (type) {
      case "prompt":
        return COLOR.prompt;
      case "success":
        return COLOR.success;
      case "warn":
        return COLOR.warn;
      case "error":
        return COLOR.error;
      case "info":
        return COLOR.info;
      case "boot":
        return COLOR.boot;
      default:
        return COLOR.log;
    }
  }

  function drawBackdrop() {
    const ctx = state.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, COLOR.screenTop);
    gradient.addColorStop(1, COLOR.screenBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawMatrix() {
    if (state.reduceMotion || state.matrixDrops.length === 0) {
      return;
    }

    const ctx = state.ctx;
    ctx.save();
    ctx.font = state.matrixSize + "px " + FONT_FAMILY;
    ctx.textBaseline = "top";

    for (let i = 0; i < state.matrixDrops.length; i += 1) {
      const x = i * state.matrixStep;
      const y = state.matrixDrops[i];
      const char = MATRIX_CHARS[(Math.random() * MATRIX_CHARS.length) | 0];

      ctx.fillStyle = COLOR.matrixTrail;
      ctx.fillText(char, x, y);

      ctx.fillStyle = COLOR.matrixHead;
      ctx.fillText(char, x, y - state.matrixSize);
    }
    ctx.restore();
  }

  function drawTerminalLines() {
    const ctx = state.ctx;
    ctx.save();
    ctx.font = state.fontSize + "px " + FONT_FAMILY;
    ctx.textBaseline = "top";
    ctx.shadowBlur = 0;
    ctx.shadowColor = COLOR.glow;

    const promptReserve = state.mode === "typing" || state.mode === "idle" ? state.lineHeight : 0;
    const availableHeight = state.height - state.paddingY * 2 - promptReserve;
    const maxVisibleLines = Math.max(6, Math.floor(availableHeight / state.lineHeight));
    const start = Math.max(0, state.lines.length - maxVisibleLines);
    const visibleLines = state.lines.slice(start);

    let y =
      state.height -
      state.paddingY -
      promptReserve -
      visibleLines.length * state.lineHeight +
      state.scrollOffset;
    if (y < state.paddingY) {
      y = state.paddingY;
    }

    for (let i = 0; i < visibleLines.length; i += 1) {
      const line = visibleLines[i];
      ctx.fillStyle = lineColor(line.type);
      ctx.fillText(line.text, state.paddingX, y);
      y += state.lineHeight;
    }

    if (state.mode === "typing" || state.mode === "idle") {
      const promptText =
        state.mode === "typing"
          ? state.typingTarget.slice(0, Math.floor(state.typingChars))
          : pick(PROMPTS, state.promptIndex) + ":~$ ";

      ctx.fillStyle = COLOR.prompt;
      ctx.fillText(promptText, state.paddingX, y);

      if (state.cursorOn || state.reduceMotion) {
        const cursorX = state.paddingX + ctx.measureText(promptText).width + 1;
        const cursorWidth = Math.max(2, Math.floor(state.fontSize * 0.56));
        ctx.fillStyle = COLOR.cursor;
        ctx.fillRect(cursorX, y + 2, cursorWidth, state.fontSize - 3);
      }
    }

    ctx.restore();
  }

  function drawGlitch() {
    if (state.reduceMotion || state.glitchTime <= 0) {
      return;
    }

    const ctx = state.ctx;
    const sliceCount = state.isMobile ? 2 : 4;

    ctx.save();
    ctx.globalAlpha = 0.11;
    for (let i = 0; i < sliceCount; i += 1) {
      const y = rand(0, state.height);
      const h = rand(1, state.isMobile ? 6 : 12);
      const offset = rand(-14, 14);
      ctx.drawImage(state.canvas, 0, y, state.width, h, offset, y, state.width, h);
    }
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = COLOR.glitchTint;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.restore();
  }

  function renderFrame() {
    if (!state.ctx) {
      return;
    }
    drawBackdrop();
    drawMatrix();
    drawTerminalLines();
    drawGlitch();
  }

  function tick(dt) {
    updateMotion(dt);
    updateTerminal(dt);
    updateMatrix(dt);
  }

  function loop(timestamp) {
    if (!state.running) {
      return;
    }

    if (state.lastTick === 0) {
      state.lastTick = timestamp;
    }

    const delta = Math.min(66, timestamp - state.lastTick);
    state.lastTick = timestamp;
    state.frameDebt = Math.min(120, state.frameDebt + delta);

    while (state.frameDebt >= state.frameStep) {
      tick(state.frameStep);
      state.frameDebt -= state.frameStep;
    }

    renderFrame();
    state.rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (!state.ctx || !state.layer || state.running) {
      return;
    }
    state.running = true;
    state.layer.style.display = "block";
    state.lastTick = 0;
    state.frameDebt = 0;
    state.rafId = window.requestAnimationFrame(loop);
    document.body.classList.remove("terminal-bg-disabled");
  }

  function stop() {
    state.running = false;
    if (state.rafId) {
      window.cancelAnimationFrame(state.rafId);
    }
    state.rafId = 0;
    if (state.layer) {
      state.layer.style.display = "none";
    }
    document.body.classList.add("terminal-bg-disabled");
  }

  function setEnabled(nextEnabled) {
    state.enabled = Boolean(nextEnabled);
    persistEnabledState(state.enabled);
    if (state.enabled) {
      start();
    } else {
      stop();
    }
  }

  function toggleEnabled() {
    setEnabled(!state.enabled);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (state.running && state.rafId) {
        window.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
      return;
    }

    if (state.enabled && !state.rafId && state.running) {
      state.lastTick = 0;
      state.rafId = window.requestAnimationFrame(loop);
    }
  }

  function onReduceMotionChange() {
    applyPerformanceProfile();
    resizeCanvas();
    resetTerminal();
  }

  function onResize() {
    applyPerformanceProfile();
    resizeCanvas();
  }

  function onKeyDown(event) {
    if (!event.ctrlKey || !event.shiftKey) {
      return;
    }
    if (event.key.toLowerCase() !== TOGGLE_SHORTCUT_KEY) {
      return;
    }
    event.preventDefault();
    toggleEnabled();
  }

  function attachEvents() {
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", onKeyDown);

    if (typeof reduceMotionMedia.addEventListener === "function") {
      reduceMotionMedia.addEventListener("change", onReduceMotionChange);
    } else if (typeof reduceMotionMedia.addListener === "function") {
      reduceMotionMedia.addListener(onReduceMotionChange);
    }
  }

  function initialize() {
    if (state.initialized) {
      return;
    }
    createLayer();
    if (!state.ctx) {
      return;
    }

    applyPerformanceProfile();
    resizeCanvas();
    resetTerminal();
    attachEvents();
    state.initialized = true;

    window.terminalBackground = {
      enable: function () {
        setEnabled(true);
      },
      disable: function () {
        setEnabled(false);
      },
      toggle: toggleEnabled,
      isEnabled: function () {
        return state.enabled;
      },
    };
  }

  function bootstrap() {
    initialize();
    if (!state.initialized) {
      return;
    }

    if (isForceEnabledByPage()) {
      setEnabled(true);
    }

    if (state.enabled) {
      start();
    } else {
      stop();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
