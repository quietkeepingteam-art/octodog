# OctoDog

A Chrome extension that puts a small circular hub, with an octopus in the middle, on any page. The hub has four extendable arrows. Each arrow is a click target you can place anywhere on the page and fire with a single key. Each arrow can also sprout two baby arrows, for up to 12 click targets in total.

Works on Chrome for Mac, Windows and Linux (Manifest V3).

## Install

1. Unzip the folder.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `octodog` folder.
5. Reload any tabs that were already open.

## Show or hide the hub

- Click the extension's toolbar icon, or
- Press **Alt+Shift+M** (**Option+Shift+M** on Mac).

## Keys

The hub is a 64px circle split into four wedges. Each wedge is one arrow, and each arrow has two baby arrows. Every target has its own key.

| Arrow | Main | Baby arrows |
|-------|------|-------------|
| 1 (up) | 1 | Q, W |
| 2 (right) | 2 | E, R |
| 3 (down) | 3 | A, S |
| 4 (left) | 4 | D, F |

## Using the hub

### The four main arrows

| Action | What it does |
|--------|--------------|
| Tap a wedge | Extends that arrow, putting a crosshair 110px out |
| Drag from a wedge | Aims the arrow at any spot on the page |
| Tap an extended wedge | Clicks at that arrow's target |
| Press **1**, **2**, **3** or **4** | Clicks at that arrow's target |
| Right-click or Shift+tap a wedge | Retracts that arrow and its baby arrows |

### The baby arrows

Baby arrows stay hidden until you ask for them, so the page doesn't get crowded. An arrow's crosshair has a dashed ring around it when its babies are hidden.

| Action | What it does |
|--------|--------------|
| Tap a main crosshair | Shows or hides its two baby arrows |
| Drag a main crosshair | Re-aims the arrow. Its baby arrows move with it |
| Drag a baby crosshair | Aims that baby arrow |
| Tap a baby crosshair | Clicks at that baby's target |
| Press a baby key (Q, W, E, R, A, S, D, F) | Clicks at that baby's target |
| Right-click a baby crosshair | Hides the baby arrows |
| Right-click a main crosshair | Retracts the arrow and its baby arrows |

### The octopus

| Action | What it does |
|--------|--------------|
| Tap the octopus | Fires every extended arrow and visible baby arrow, in order |
| Drag the octopus | Moves the hub (position is remembered) |
| Right-click the octopus | Retracts everything |

## Notes

- Keys only act on targets that are showing, and only when the hub is visible. Hidden baby arrows ignore their keys.
- Keys are ignored while you type in a text field, an input or a rich text editor.
- Keys pressed with Cmd, Ctrl, Alt or Shift are ignored, so Cmd/Ctrl+number still switches tabs.
- Baby arrows are placed relative to their main crosshair, so they follow it when you move it.
- Targets are fixed to the screen, so they stay put when you scroll.
- The extension can't run on `chrome://` pages or the Chrome Web Store.
- Clicks are sent as synthetic events. A few sites that ignore non-real clicks may not respond.
- Clicks land in the top page and in open shadow DOM. They can't reach inside cross-origin iframes.

## Files

- `manifest.json`: extension config
- `background.js`: toggles the hub when you click the toolbar icon
- `content.js`: the hub, octopus, arrows, baby arrows, keyboard aliases and click logic

## Customizing

Open `content.js` and look near the top:

- `ARROWS`: arrow colors and directions, plus each baby arrow's direction and key
- `DEFAULT_LEN`: how far a main arrow extends when tapped
- `BABY_LEN`: how far baby arrows sprout from their main crosshair
- `C`, `R_OUT`, `R_IN`: hub size

After editing, click the reload icon for the extension on `chrome://extensions`.
