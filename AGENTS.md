# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable Design Decisions

- Latest primary visual direction (2026-07-12): modern art museum restraint / “Typographic Silence”, grounded in `codex-clipboard-1374649e-f590-4a62-8c4a-6fc41c059a09.png`. Prefer editorial Chinese typography, very low density, near-white paper, hairline structures, one warm seal accent, and gallery-label hierarchy over conventional utility UI.
- Canvas now uses a draggable vertical six-stop state rail with an editorial state list. This supersedes the older circular selector decision while preserving direct tap, keyboard controls, and release-to-enter behavior.
- Canvas has no top wordmark or top menu. Settings combines the psychology library, appearance, writing/interaction and privacy controls; Favorites is removed completely.
- Selected Canvas rows reveal the state description (not the professional term) over roughly 0.5 seconds before entering the scene page.
- All inner-page headers show only the back control; visible page-name titles are removed.
- Canvas rail provides both a quiet Web Audio tick and vibration while crossing stops. Each of the six states uses a restrained, distinct pitch/timbre profile. A centered gray tip explains that releasing the rail enters the selected state.
- Burn is a borderless tap-to-place writing field. Text or handwriting stays until the user taps the explicit “让它消散” action, then burns from randomized simultaneous origins; it must never disappear while the user is still composing.
- Meditation no longer exposes the voice/ambience mixer control.
- The selected-state rice-paper bitmap is light-theme only. Dark/system-dark mode uses a lightweight CSS accent wash, hairline and subtle inset glow so no white image rectangle appears.
- Superseding navigation decision (2026-07-13): four persistent primary tabs are State Adjustment (default), Burn, Records/Timeline, and Settings, in that order. Primary pages also support guarded horizontal swipes from non-interactive space. The tab bar is hidden on secondary scenes, meditation, completion, Encounter and knowledge articles.
- The rice-paper selection bitmap is removed in every theme. Both themes use the same lightweight CSS accent wash and hairline treatment; the global page texture is procedurally generated once on a small Canvas.
- Superseding Canvas interaction (2026-07-14): releasing the state rail enters the selected scene list. First tap on another state selects it and reveals a chevron; tapping the already-selected state enters its scene list.
- Only the first representative scene for each state is playable in v1. The other five show an explicit unavailable state.
- The six `1_缩混.wav` masters remain untouched. Web playback uses compressed MP3 derivatives in `public/audio/`.
- “Emotion Index” is renamed “心理学文库”: a six-topic, 24-entry scientific knowledge library expanded from the local 121-source literature map. Articles explain mechanisms, signs, practices, misconceptions, boundaries and sources; they do not diagnose or link directly to meditation audio.
- Burn has persistent typed and handwriting modes. Both require explicit ignition; IME composition and long-form typing must never race an automatic timer.
- Mobile-web compatibility is a first-class constraint: support 320–430px phones, long-screen devices, phone landscape, safe areas, dynamic browser chrome, virtual keyboards, reduced motion/transparency, low-power devices and audio byte-range playback. Preserve system edge gestures and keep all critical actions directly tappable.
- Scene selection and meditation share the same compact secondary-page top rhythm. Meditation must show its complete closed or expanded control state within one viewport on common phone portrait and landscape sizes, with no vertical scrolling.
- Meditation copy rotates by equal audio-progress segments using an interruptible crossfade. Its breathing surface slowly shifts between system gray and the restrained brand orange, with a reduced-motion fallback.
- Canvas state names use the narrative serif stack. Selected subtitles use dedicated short copy and remain on one readable line inside a taller tonal selection surface.
- Burn typing defaults to a subtle fixed writing surface with a fixed start position. Settings can switch it to the existing free-placement behavior; handwriting is unaffected.
- New and reset installations default to dark appearance. Preserve any explicit saved light or system preference, and resolve system appearance before first paint to avoid a flash.
- Burn fixed-input placeholder, caret, typed copy and burning copy share the same 20px KaiTi narrative metrics and fixed origin. Burning may glow and fragment, but must never render a rectangular text boundary.
- Meditation breathing halos must remain fully inside the visible stage at 320px portrait, common long-screen phones and phone landscape. The breathing surface is visually centered while both collapsed and expanded controls remain above the bottom edge without scrolling.
- Meditation metadata is a quiet, two-line, right-aligned gray supplement aligned with the back control. The affirmation copy must share the exact optical center of the breathing surface.
- Meditation playback status, progress, expanded transport panel and reveal control form one bottom-anchored flow stack. The reveal control stays fixed; status/progress moves upward above the panel with 8-10px fixed gaps and never overlaps.
- Persistent primary tabs are icon-only visually, while retaining accessible names. Active state uses the accent icon plus a short underline; each target remains at least 44px tall.
- Settings order is: Content & Tools, Appearance & Display, Writing & Interaction, Environment Capabilities, Records & Privacy. Group by user intent and keep destructive local-data clearing last.
- Encounter has two explicit choices (white noise and pure instrumental music) and randomly plays from a curated open-license remote source list. Weather, time and location matching are removed; loading must time out into a clear alternate-source action.
- Favorites and every Favorites entry point, route, persistence field and clear-data reference are removed completely.
- Records has no “前往设置” CTA. Its quiet privacy icon/copy sits at the bottom as supplementary information.
- Burn's placeholder stays absent throughout ignition and returns only after the final ember finishes, with a fade. Free placement can use the full right side; handwriting ignition samples actual ink and uses randomized, multi-origin fragmentation comparable to typed burning.
- Canvas cards are 5–10% taller and selected subtitles 10–15% larger while remaining a single readable line and preserving the existing restrained hierarchy.

- Primary visual source: `design/final-canvas-target.png`.
- Keep the reference's quiet monochrome soft-control material, circular selector, generous whitespace, fine strokes, subtle ambient elevation, and restrained 12-16px radii.
- Historical circular-selector notes below are superseded by the current six-stop vertical state rail. Preserve direct tap, keyboard arrows, Enter and Space as equivalent controls.
- The six user-facing states are: 反复纠结、对未来没底、思绪过载、难以启动、情绪未平、精力不足.
- Selecting a state reveals its short descriptive subtitle and chevron within the row. There is no separate confirmation button: rail release enters; first direct tap selects; second direct tap, Enter or Space opens the current state.
- Avoid therapy purple/green, beige, gradients, glass blur, oversized rounding, decorative illustration, card grids as the default layout, and medical claims.
- Canvas extension tools are icon-led rather than text-led. Keep accessible names, but visually reduce labels to avoid a dense, flat page.
- Use meaningful depth contrast: a lightly elevated selected-description surface, the circular selector as the primary visual object, and three raised icon controls at the bottom.
