# Noice 🔔

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=Qubasehq.noice)
[![Install](https://img.shields.io/badge/Install-VS%20Code-0098FF)](vscode:extension/Qubasehq.noice)

Sound for terminal commands — only when you step away.

Plays a chime when a long-running terminal command finishes, a low thud when it fails. Silent while you watch; loud when you've walked away to grab a coffee. Sound calls you back.

## The point

You're focused on code. You run a build, switch to your browser, forget about it. Five minutes later noice chimes — your build's done. If you never left, noice stays silent. The sound is a signal that **needs you**, not noise.

## Features

- **Only when unfocused** — if VS Code has focus, no sound. Step away → sound. Watch it → silent.
- **Mute toggle** — click `🔔 Noice` in the status bar to toggle on/off.
- **Min duration** — commands under N seconds never trigger (default 3s). Fast commands don't beep.
- **Failure sound** — success plays a chime, failure plays a low thud. You know without looking.
- **Do Not Disturb hours** — set a window (e.g. 09:00–18:00) where noice is silent. After hours, it beeps when you step away.

## Settings

| Setting | Default | Description |
|---|---|---|
| `noice.enabled` | `true` | Master toggle |
| `noice.onlyWhenUnfocused` | `true` | Play only when window not focused |
| `noice.minDuration` | `3` | Min seconds before triggering |
| `noice.volume` | `0.5` | Per-extension volume (0–1) |
| `noice.sound` | `default` | Success sound: `default`, `chime`, `pop`, `glass` |
| `noice.failureSound` | `thud` | Failure sound: `thud`, `pop`, `default`, `glass` |
| `noice.showNotification` | `true` | Status bar message with elapsed time |
| `noice.dnd.enabled` | `false` | Enable DND hours |
| `noice.dnd.start` | `09:00` | DND start (HH:MM) |
| `noice.dnd.end` | `18:00` | DND end (HH:MM, wraps midnight if earlier) |

## Commands

- **Noice: Toggle Sound Notifications** — flip master switch
- **Noice: Test Sound** — play chime immediately, useful for diagnosing audio
- **Noice: Show Diagnostic Log** — open the Noice output channel for event tracing

## Requirements

- VS Code 1.87+
- Cross-platform: Windows (PowerShell), macOS (`afplay`), Linux (`paplay` / `aplay` / `sox` / `ffplay`)

## License

MIT © Qubasehq

## Links

- Marketplace: https://marketplace.visualstudio.com/items?itemName=Qubasehq.noice
- Repository: https://github.com/qubasehq/noice
- Issues: https://github.com/qubasehq/noice/issues