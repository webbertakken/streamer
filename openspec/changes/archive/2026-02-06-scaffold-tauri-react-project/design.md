## Context

Greenfield project. No existing code, dependencies, or constraints beyond the decisions we've already made.

## Goals / Non-Goals

**Goals:**
- Working Tauri v2 + React + TypeScript scaffold
- Transparent overlay window configured from the start
- Tailwind, Zustand, and widget registry ready for development

**Non-goals:**
- No actual widgets yet
- No Twitch connectivity
- No YAML config system (just the scaffold)

## Decisions

### Decision 1: Project structure

```
streamer/
├── src/                    # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── widgets/
│   │   └── registry.ts    # Widget registry
│   └── stores/             # Zustand stores
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── vite.config.ts
└── LICENCE
```

### Decision 2: Vite as bundler

Tauri v2 recommends Vite for React projects. Fast HMR, good TypeScript support.

### Decision 3: Transparent window config

Set in `tauri.conf.json`: transparent background, decorations off, always on top. The React app renders on a transparent canvas.
