# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable Design Decisions

- Latest primary visual direction (2026-07-12): modern art museum restraint / “Typographic Silence”, grounded in `codex-clipboard-1374649e-f590-4a62-8c4a-6fc41c059a09.png`. Prefer editorial Chinese typography, very low density, near-white paper, hairline structures, one warm seal accent, and gallery-label hierarchy over conventional utility UI.
- Canvas now uses a draggable vertical six-stop state rail with an editorial state list. This supersedes the older circular selector decision while preserving direct tap, keyboard controls, and release-to-enter behavior.
- Canvas has no top wordmark or top menu. The bottom Settings tool is named “菜单” and its page combines records, favorites, emotion index, appearance, experience and privacy controls.
- Selected Canvas rows reveal the state description (not the professional term) over roughly 0.5 seconds before entering the scene page.
- All inner-page headers show only the back control; visible page-name titles are removed.
- Canvas rail provides a quiet Web Audio tick while crossing stops and shows a short slide-or-tap usage hint.
- Burn is a borderless tap-to-place writing field. Text or handwriting stays until the user taps the explicit “让它消散” action, then burns from randomized simultaneous origins; it must never disappear while the user is still composing.
- Meditation no longer exposes the voice/ambience mixer control.
- The selected-state rice-paper bitmap is light-theme only. Dark/system-dark mode uses a lightweight CSS accent wash, hairline and subtle inset glow so no white image rectangle appears.
- Superseding navigation decision (2026-07-13): four persistent primary tabs are State Adjustment (default), Burn, Records/Timeline, and Settings, in that order. Primary pages also support guarded horizontal swipes from non-interactive space. The tab bar is hidden on secondary scenes, meditation, completion, Encounter and knowledge articles.
- The rice-paper selection bitmap is removed in every theme. Both themes use the same lightweight CSS accent wash and hairline treatment; the global page texture is procedurally generated once on a small Canvas.
- Releasing the state rail only selects. First tap on another state selects it; tapping the already-selected state enters its scene list.
- Only the first representative scene for each state is playable in v1. The other five show an explicit unavailable state.
- The six `1_缩混.wav` masters remain untouched. Web playback uses compressed MP3 derivatives in `public/audio/`.
- Emotion Index is a six-topic, 24-entry scientific knowledge index sourced from the local literature map. It does not link directly to meditation audio.
- Burn has persistent typed and handwriting modes. Both require explicit ignition; IME composition and long-form typing must never race an automatic timer.
- Mobile-web compatibility is a first-class constraint: support 320–430px phones, long-screen devices, phone landscape, safe areas, dynamic browser chrome, virtual keyboards, reduced motion/transparency, low-power devices and audio byte-range playback. Preserve system edge gestures and keep all critical actions directly tappable.

- Primary visual source: `design/final-canvas-target.png`.
- Keep the reference's quiet monochrome soft-control material, circular selector, generous whitespace, fine strokes, subtle ambient elevation, and restrained 12-16px radii.
- Canvas uses a draggable six-stop circular selector. Dragging snaps to the nearest state; direct node clicks, keyboard arrows, Enter and Space must provide equivalent control.
- The six user-facing states are: 反复纠结、对未来没底、思绪过载、难以启动、情绪未平、精力不足.
- Selecting a state puts its professional term in the center and a short non-diagnostic explanation below the ring. There is no separate confirmation button: releasing a drag after snapping or directly tapping a node immediately opens scene selection. Keyboard arrows preview; Enter/Space opens the current state.
- Avoid therapy purple/green, beige, gradients, glass blur, oversized rounding, decorative illustration, card grids as the default layout, and medical claims.
- Canvas extension tools are icon-led rather than text-led. Keep accessible names, but visually reduce labels to avoid a dense, flat page.
- Use meaningful depth contrast: a lightly elevated selected-description surface, the circular selector as the primary visual object, and three raised icon controls at the bottom.
