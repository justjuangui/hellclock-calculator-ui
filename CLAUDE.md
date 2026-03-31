# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hell Clock Calculator UI is a SvelteKit 5 application that provides a character build calculator for the Hell Clock ARPG game. The app runs a Rust WASM engine (via wasm-bindgen) in a Web Worker to calculate character stats from game data (GamePack JSONs).

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (includes JSON minification)
- `npm run preview` - Preview production build locally
- `npm run check` - Run Svelte type checking and sync
- `npm run check:watch` - Run type checking in watch mode
- `npm run lint` - Lint code with ESLint
- `npm run minify-json` - Minify JSON assets in static/assets/

## Architecture

### Core System
The application uses a Web Worker architecture where a Rust WASM engine (`/workers/worker.js` + `/wasm_bindings.js`) handles all game calculations while the UI remains responsive. The `Engine` class (`src/lib/engine/index.ts`) manages communication with the worker using a message-based API.

### Data Flow
1. GamePack JSONs are loaded from `static/assets/` on app startup
2. Helper classes (`StatsHelper`, `GearsHelper`, `SkillsHelper`) parse and provide access to game definitions
3. User selections (gear, skills) are stored in Svelte context APIs
4. The Engine evaluates stat calculations using the WASM worker
5. Results are displayed in real-time UI components

### Key Helper Classes
- **StatsHelper**: Manages stat definitions, formatting, and localization
- **GearsHelper**: Handles gear definitions, slot configurations, and item generation with rarity modifiers
- **SkillsHelper**: Manages skill definitions, upgrades, and calculation mappings

### Context Management
The app uses Svelte 5's context system with reactive APIs:
- `providedEquipped()` - For gear equipment state (blessed and trinket gear)
- `provideSkillEquipped()` - For skill slot management
- Global contexts for engine, gamepack, and helper classes

### UI Structure
- **Main Layout** (`+layout.svelte`): Handles app initialization, asset loading, and context provision
- **Main Page** (`+page.svelte`): Contains the calculator interface with tabbed sections for Stats/Calculations and Gear/Skills/etc
- **Component Library** (`src/lib/ui/`): Reusable UI components for gear selection, stat display, skill management

### Asset Processing
JSON assets in `static/assets/` are minified during build via `scripts/minify-json.js` to reduce bundle size. The app loads these at runtime to populate game definitions.

## Tech Stack
- **Framework**: SvelteKit 5 with TypeScript
- **Styling**: Tailwind CSS 4 + daisyUI components
- **Engine**: Rust WASM (wasm-bindgen) running in Web Worker
- **Build**: Vite with ESLint for code quality