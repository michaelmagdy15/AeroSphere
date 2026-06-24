# AeroSphere Studio — Project Rules

## Workflow Plugins Active
The following plugins are configured for this project. Say **"boost my workflow"** to activate all four.

### Ponytail (Code Simplification)
Before writing any code, traverse this decision ladder — stop at the first rung:
1. Does it need to exist? → Skip it (YAGNI)
2. Does the stdlib do it? → Use it
3. Is there a native platform feature? → Use it  
4. Is there an existing dependency? → Use it
5. Can it be one line? → One line
6. Only then: Write the minimum that works

### Impeccable (Design Quality)
- No AI design slop: avoid Inter font, avoid nested cards, avoid gray-on-color
- Use OKLCH color palettes, fluid type scales, vertical rhythm
- Run `/impeccable audit` before finalizing any UI component

### Graphify (Codebase Knowledge)
- Run `graphify . --update` after significant code changes
- Use `graphify-out/GRAPH_REPORT.md` for architectural context
- Create `.graphifyignore` excluding `node_modules/`, `.git/`, `dist/`

### Obsidian / Session Logging
- Log key decisions and progress to `docs/dev-log.md`
- Capture architecture decisions in `docs/decisions/` directory

## Project-Specific Rules
- All SimConnect wrappers must be minimal — avoid over-abstraction
- Use TypeScript strict mode throughout
- Prefer `node-simconnect` pure-TS implementation over native C++ bindings
- Dark glassmorphism theme: HSL colors, Outfit font, `backdrop-filter: blur()`
- All IPC with WASM module goes through SimConnect Client Data areas
