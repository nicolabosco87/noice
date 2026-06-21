const vscode = require('vscode');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Embedded base64 sounds (short beep tones generated as WAV)
// These are tiny PCM WAV files — no external dependencies
const SOUNDS = {
  default: generateBeepWav(880, 0.15),  // A5 note
  chime:   generateBeepWav(1047, 0.3),  // C6 note
  pop:     generateBeepWav(660, 0.08),  // E5 note
  glass:   generateBeepWav(1318, 0.25), // E6 note
  thud:    generateThudWav(),           // Low body + sub + noise click
};

function generateThudWav() {
  const sampleRate = 44100;
  const duration = 0.3;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 10);
    const body = Math.sin(2 * Math.PI * 80 * t);
    const sub = Math.sin(2 * Math.PI * 50 * t) * 0.6;
    const noise = i < 500 ? (Math.random() * 2 - 1) * (1 - i / 500) * 0.25 : 0;
    const s = (body * 0.6 + sub * 0.4 + noise) * env * 32767 * 0.7;
    buffer.writeInt16LE(Math.round(s), 44 + i * 2);
  }

  return buffer;
}

function generateBeepWav(freq, duration) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);   // PCM
  buffer.writeUInt16LE(1, 22);   // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // PCM samples with fade out
  for (let i = 0; i < numSamples; i++) {
    const fade = 1 - (i / numSamples);
    const sample = Math.sin(2 * Math.PI * freq * i / sampleRate) * 32767 * fade;
    buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
  }

  return buffer;
}

function playSound(soundName) {
  const tmpFile = path.join(os.tmpdir(), `noice_${soundName}.wav`);

  if (!fs.existsSync(tmpFile)) {
    fs.writeFileSync(tmpFile, SOUNDS[soundName] || SOUNDS.default);
  }

  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync(
        `powershell -c "(New-Object Media.SoundPlayer '${tmpFile}').PlaySync()"`,
        { timeout: 5000, windowsHide: true }
      );
    } else if (platform === 'darwin') {
      execSync(`afplay "${tmpFile}"`, { timeout: 5000 });
    } else {
      const players = ['paplay', 'aplay', 'sox', 'ffplay'];
      for (const player of players) {
        try {
          execSync(`${player} "${tmpFile}" 2>/dev/null`, { timeout: 5000 });
          break;
        } catch {}
      }
    }
  } catch (e) {
    // Silent fail — sound not critical
  }
}

let statusBarItem;
let terminalStartTimes = new Map();
let windowFocused = vscode.window.state ? vscode.window.state.focused : true;
let enabled = true;
let refreshStatusBar;

function activate(context) {
  const config = vscode.workspace.getConfiguration('noice');
  enabled = config.get('enabled', true);

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'noice.toggle';

  refreshStatusBar = () => {
    statusBarItem.text = enabled ? '🔔 Noice' : '🔕 Noice';

    const cfg = vscode.workspace.getConfiguration('noice');
    const onlyUnfocused = cfg.get('onlyWhenUnfocused', true);
    const dndEnabled = cfg.get('dnd.enabled', false);
    const dndStart = cfg.get('dnd.start', '09:00');
    const dndEnd = cfg.get('dnd.end', '18:00');

    const dndActive = dndEnabled && isInDnd(new Date(), dndStart, dndEnd);
    const willSilence = onlyUnfocused && windowFocused;

    const reasons = [];
    if (dndActive) reasons.push(`DND ${dndStart}–${dndEnd}`);
    if (willSilence) reasons.push('window focused');

    if (!enabled) {
      statusBarItem.color = '#666666';
      statusBarItem.tooltip = 'Noice: OFF — click to enable';
    } else if (reasons.length > 0) {
      statusBarItem.color = '#888888';
      statusBarItem.tooltip = `Noice: ON, currently muted (${reasons.join(', ')}) — click to mute`;
    } else {
      statusBarItem.color = '#4EC9B0';
      statusBarItem.tooltip = 'Noice: ON — click to mute';
    }
  };

  const refreshInterval = setInterval(refreshStatusBar, 30000);
  context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });

  context.subscriptions.push(
    vscode.commands.registerCommand('noice.toggle', () => {
      enabled = !enabled;
      vscode.workspace.getConfiguration('noice').update(
        'enabled', enabled, vscode.ConfigurationTarget.Global
      );
      refreshStatusBar();
      vscode.window.setStatusBarMessage(
        enabled ? '🔔 Noice enabled' : '🔕 Noice disabled',
        2000
      );
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(state => {
      windowFocused = state.focused;
      refreshStatusBar();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('noice.enabled')) {
        enabled = vscode.workspace.getConfiguration('noice').get('enabled', true);
      }
      if (e.affectsConfiguration('noice')) {
        refreshStatusBar();
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution(event => {
      if (!enabled) return;
      terminalStartTimes.set(event.terminal, Date.now());
    })
  );

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution(event => {
      if (!enabled) return;

      const startTime = terminalStartTimes.get(event.terminal);
      if (!startTime) return;

      const elapsed = (Date.now() - startTime) / 1000;
      terminalStartTimes.delete(event.terminal);

      const minDuration = vscode.workspace
        .getConfiguration('noice')
        .get('minDuration', 3);

      if (elapsed < minDuration) return;

      const onlyWhenUnfocused = vscode.workspace
        .getConfiguration('noice')
        .get('onlyWhenUnfocused', true);

      if (onlyWhenUnfocused && windowFocused) return;

      const dndEnabled = vscode.workspace
        .getConfiguration('noice')
        .get('dnd.enabled', false);

      if (dndEnabled) {
        const start = vscode.workspace.getConfiguration('noice').get('dnd.start', '09:00');
        const end = vscode.workspace.getConfiguration('noice').get('dnd.end', '18:00');
        if (isInDnd(new Date(), start, end)) return;
      }

      const sound = vscode.workspace
        .getConfiguration('noice')
        .get('sound', 'default');

      const exitCode = event.exitCode;
      const success = exitCode === 0 || exitCode === undefined;

      const failureSound = vscode.workspace
        .getConfiguration('noice')
        .get('failureSound', 'thud');

      playSound(success ? sound : failureSound);

      const showNotif = vscode.workspace
        .getConfiguration('noice')
        .get('showNotification', true);

      if (showNotif) {
        const seconds = elapsed.toFixed(1);
        const icon = success ? '✅' : '❌';
        const msg = `${icon} Command finished in ${seconds}s`;
        vscode.window.setStatusBarMessage(msg, 4000);
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidCloseTerminal(terminal => {
      terminalStartTimes.delete(terminal);
    })
  );
}

function updateStatusBar() {
  statusBarItem.text = enabled ? '🔔 Noice' : '🔕 Noice';
  statusBarItem.tooltip = enabled
    ? 'Noice: Sound ON — click to disable'
    : 'Noice: Sound OFF — click to enable';
  statusBarItem.color = enabled ? '#4EC9B0' : '#666666';
}

function deactivate() {
  terminalStartTimes.clear();
}

module.exports = { activate, deactivate };