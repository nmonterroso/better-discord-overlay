# Better Overlay

A small Electron app that shows a Discord mute indicator and a system microphone mute block (Windows only). The mic can be toggled via a global hotkey.

## Install

- Ensure prerequisites (Windows):
  - Node.js (LTS recommended)
  - C/C++ Build Tools (Visual Studio Build Tools or Visual Studio with "Desktop development with C++")
    - choco install visualstudio2022-workload-vctools -y (elevated shell)
  - Windows 10/11 SDK
  - Python 3.11+, or use the included node-gyp v10 override. If using Python directly, you can set: `npm config set python "py -3.11"`

- Install dependencies:
  - `npm install`

## Rebuild Native Modules

This project uses a native module (`win-audio`) for Windows mic control and needs to be rebuilt against Electron.

- Rebuild after install or when Electron/Node changes:
  - `npm run rebuild`

If you run into node-gyp errors (e.g., missing `distutils`), ensure the prerequisites above are installed and that the node-gyp version resolves to v10 (added via `overrides` in package.json), or point npm to Python 3.11: `npm config set python "py -3.11"`.

## Run

- Start the app:
  - `npm start`

## Notes

- Global hotkey defaults to `Control+Alt+M` and can be changed in the app settings file (`mute-indicator.json`) under your Electron userData directory.
- Additional setup details (e.g., exact toolchain versions) can be added here as needed.
