import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowClockwise,
  ArrowCounterClockwise,
  BookOpenText,
  CaretRight,
  Check,
  ClockCounterClockwise,
  DiceThree,
  GearSix,
  List,
  LockSimple,
  MusicNotes,
  Moon,
  Pause,
  PencilSimple,
  Play,
  SlidersHorizontal,
  Sun,
  Trash,
  Waveform,
  X,
} from "@phosphor-icons/react";
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { encounterTracks, knowledgeTopics, states } from "./data.js";
import { useLocalStorage } from "./useLocalStorage.js";

const DataContext = createContext(null);

function useAppData() {
  const [records, setRecords] = useLocalStorage("baijing:records", []);
  const [settings, setSettings] = useLocalStorage("baijing:settings", {
    theme: "dark",
    recordsEnabled: false,
    breathing: true,
    haptics: true,
    reducedEffects: false,
    voiceVolume: 0.72,
    ambienceVolume: 0.42,
    fullscreen: false,
    burnInputLayout: "fixed",
  });
  return { records, setRecords, settings, setSettings };
}

function DataProvider({ children }) {
  const value = useAppData();
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData must be used inside DataProvider");
  return value;
}

function getState(id) {
  return states.find((state) => state.id === id) ?? states[0];
}

function createId() {
  const secureCrypto = globalThis.crypto;
  if (typeof secureCrypto?.randomUUID === "function") return secureCrypto.randomUUID();
  const values = new Uint32Array(4); secureCrypto?.getRandomValues?.(values);
  return `${Date.now().toString(36)}-${[...values].map((value) => value.toString(36)).join("")}-${Math.random().toString(36).slice(2, 8)}`;
}

function FunctionSeal({ children }) {
  return <span className="function-seal"><span aria-hidden="true">白</span><b>-{children}</b></span>;
}

function TopLevelIntro({ title, subtitle, section }) {
  return (
    <section className="top-level-intro">
      <h1>{title.map((line) => <span key={line}>{line}</span>)}</h1>
      <p>{subtitle}</p>
      <FunctionSeal>{section}</FunctionSeal>
    </section>
  );
}

function AppHeader({ title = "白境", back = false, onMenu }) {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      {back ? (
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="返回">
          <ArrowLeft size={22} weight="regular" />
        </button>
      ) : (
        <Link className="wordmark" to="/">{title}</Link>
      )}
      {back && <span className="sr-only">{title}</span>}
      {onMenu && (
        <button className="menu-button" onClick={onMenu}>
          <List size={20} />
          <span>菜单</span>
        </button>
      )}
    </header>
  );
}

function MenuPanel({ open, onClose }) {
  if (!open) return null;
  const links = [
    ["/records", ClockCounterClockwise, "体验记录"],
    ["/psychology-library", BookOpenText, "心理学文库"],
    ["/encounter", DiceThree, "声音盲盒"],
    ["/settings", GearSix, "设置与隐私"],
  ];
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <motion.aside
        className="menu-sheet"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        onClick={(event) => event.stopPropagation()}
        aria-label="功能菜单"
      >
        <div className="sheet-heading">
          <h2>这里还有</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭菜单"><X size={20} /></button>
        </div>
        <nav className="menu-links">
          {links.map(([to, Icon, label]) => (
            <Link key={to} to={to} onClick={onClose}>
              <Icon size={21} />
              <span>{label}</span>
              <ArrowRight size={17} />
            </Link>
          ))}
        </nav>
        <p className="privacy-note">免登录。你的偏好和记录只保存在这台设备上。</p>
      </motion.aside>
    </div>
  );
}

function CanvasPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const railRef = useRef(null);
  const audioContextRef = useRef(null);
  const lastTickRef = useRef(0);
  const navigate = useNavigate();
  const { settings } = useData();
  const reduceMotion = useReducedMotion();
  const selected = states[selectedIndex];

  const railSonicProfiles = [
    { frequency: 392, overtone: 1.5, type: "sine", duration: .07 },
    { frequency: 440, overtone: 1.25, type: "triangle", duration: .065 },
    { frequency: 523.25, overtone: 1.125, type: "triangle", duration: .045 },
    { frequency: 293.66, overtone: 1.5, type: "sine", duration: .085 },
    { frequency: 349.23, overtone: 1.25, type: "sine", duration: .095 },
    { frequency: 261.63, overtone: 2, type: "sine", duration: .11 },
  ];

  const playRailTick = (index) => {
    if (lastTickRef.current === index) return;
    lastTickRef.current = index;
    if (!settings.haptics) return;
    navigator.vibrate?.(index === 2 ? 7 : 10);
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    const sound = () => {
      const profile = railSonicProfiles[index];
      const now = context.currentTime;
      const gain = context.createGain();
      const primary = context.createOscillator();
      const overtone = context.createOscillator();
      primary.type = profile.type;
      overtone.type = "sine";
      primary.frequency.setValueAtTime(profile.frequency, now);
      overtone.frequency.setValueAtTime(profile.frequency * profile.overtone, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(index === 2 ? .014 : .021, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + profile.duration);
      primary.connect(gain); overtone.connect(gain); gain.connect(context.destination);
      primary.start(now); overtone.start(now);
      primary.stop(now + profile.duration + .01); overtone.stop(now + profile.duration + .01);
    };
    if (context.state === "suspended") context.resume().then(sound).catch(() => {}); else sound();
  };

  const updateFromPointer = (clientY) => {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const index = Math.round(ratio * (states.length - 1));
    setSelectedIndex(index);
    playRailTick(index);
  };

  const onPointerDown = (event) => {
    lastTickRef.current = -1;
    setDragging(true);
    railRef.current?.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientY);
  };

  const onPointerMove = (event) => {
    if (dragging) updateFromPointer(event.clientY);
  };

  const onPointerUp = (event) => {
    const rect = railRef.current?.getBoundingClientRect();
    const releasedIndex = rect ? Math.round(Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * (states.length - 1)) : selectedIndex;
    setDragging(false);
    railRef.current?.releasePointerCapture(event.pointerId);
    setSelectedIndex(releasedIndex);
    navigate(`/states/${states[releasedIndex].id}`);
  };

  const onKeyDown = (event) => {
    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % states.length);
    }
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + states.length) % states.length);
    }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      navigate(`/states/${selected.id}`);
    }
  };

  return (
    <main className="screen canvas-screen">
      <TopLevelIntro title={["此刻的感受", "更接近哪一种？"]} subtitle="不必判断得很准确，只选最接近的感受。" section="状态调整" />

      <section className="state-selector vertical" aria-label="选择当前状态">
        <div className="state-list" role="listbox" aria-label="六种状态" aria-activedescendant={`state-${selected.id}`}>
          {states.map((state, index) => (
            <button
              id={`state-${state.id}`}
              key={state.id}
              role="option"
              aria-selected={selectedIndex === index}
              className={`state-title-row ${selectedIndex === index ? "is-selected" : ""}`}
              onClick={() => selectedIndex === index ? navigate(`/states/${state.id}`) : setSelectedIndex(index)}
            >
              <span className="state-name-line"><span>{state.title}</span>{selectedIndex === index && <CaretRight className="state-enter-cue" size={17} aria-hidden="true" />}</span>
              {selectedIndex === index && <small>{state.shortDescription ?? state.description}</small>}
            </button>
          ))}
        </div>
        <div
          ref={railRef}
          data-feedback="none"
          className={`state-rail ${dragging ? "is-dragging" : ""}`}
          role="slider"
          tabIndex={0}
          aria-label="拖动选择状态"
          aria-valuemin="1"
          aria-valuemax={states.length}
          aria-valuenow={selectedIndex + 1}
          aria-valuetext={`${selected.title}，${selected.term}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={onKeyDown}
        >
          <span className="rail-line" aria-hidden="true" />
          {states.map((state, index) => <span key={state.id} className={`rail-stop ${selectedIndex === index ? "is-selected" : ""}`} style={{ top: `${((index + 0.5) / states.length) * 100}%` }} aria-hidden="true" />)}
        </div>
      </section>

      <p className="state-interaction-tip">拖动右侧滑杆，松手进入；也可轻触选择。</p>

      <AnimatePresence mode="wait"><motion.p className="selected-description" key={selected.id} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{selected.description}</motion.p></AnimatePresence>

    </main>
  );
}

function StateScenesPage() {
  const { stateId } = useParams();
  const state = getState(stateId);
  const navigate = useNavigate();
  return (
    <main className="screen detail-screen">
      <AppHeader title={state.title} back />
      <section className="detail-hero">
        <span className="term-label">{state.term}</span>
        <h1>哪一句，更像现在的处境？</h1>
        <p>{state.description}</p>
      </section>
      <div className="scene-list">
        {state.scenes.map((scene, index) => (
          <button key={scene} disabled={index > 0} className={index > 0 ? "is-unavailable" : ""} onClick={() => navigate(`/meditation/${state.id}/${index}`)}>
            <span>{scene}</span>
            {index === 0 ? <ArrowRight size={19} /> : <small><LockSimple size={13} />即将上线</small>}
          </button>
        ))}
      </div>
    </main>
  );
}

function useGuidedAudio(src, volume) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const element = new Audio(`${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`);
    element.preload = "metadata";
    element.volume = volume;
    const onMetadata = () => setDuration(element.duration || 0);
    const onTime = () => setProgress(element.duration ? element.currentTime / element.duration * 100 : 0);
    const onEnded = () => setPlaying(false);
    const onError = () => { setAudioError(true); setLoading(false); setPlaying(false); };
    element.addEventListener("loadedmetadata", onMetadata);
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    audioRef.current = element;
    return () => {
      element.pause();
      element.removeEventListener("loadedmetadata", onMetadata); element.removeEventListener("timeupdate", onTime); element.removeEventListener("ended", onEnded); element.removeEventListener("error", onError);
      element.removeAttribute("src"); element.load();
    };
  }, [src]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const play = () => {
    setAudioError(false); setLoading(true);
    audioRef.current?.play().then(() => { setPlaying(true); setLoading(false); }).catch(() => { setPlaying(false); setLoading(false); setAudioError(true); });
  };

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };
  const seekBy = (seconds) => {
    const element = audioRef.current;
    if (!element) return;
    const next = Math.max(0, Math.min(element.duration || duration || 0, element.currentTime + seconds));
    element.currentTime = next;
    setProgress(element.duration ? next / element.duration * 100 : 0);
  };
  return { playing, play, pause, progress, duration, seekBy, audioError, loading };
}

function MeditationPage() {
  const { stateId, sceneIndex } = useParams();
  const state = getState(stateId);
  const navigate = useNavigate();
  const { settings } = useData();
  const audio = useGuidedAudio(state.audio, settings.voiceVolume);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlActivity, setControlActivity] = useState(0);
  const hideControlsRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const controlLayoutTransition = reduceMotion ? { duration: 0.01 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] };
  const affirmationLines = state.affirmations?.length ? state.affirmations : [state.affirmation];
  const affirmationIndex = Math.min(affirmationLines.length - 1, Math.floor((audio.progress / 100) * affirmationLines.length));

  useEffect(() => {
    if (audio.progress >= 99.8) navigate(`/completion/${state.id}`);
  }, [audio.progress, navigate, state.id]);

  useEffect(() => {
    window.clearTimeout(hideControlsRef.current);
    if (controlsOpen) hideControlsRef.current = window.setTimeout(() => setControlsOpen(false), 4000);
    return () => window.clearTimeout(hideControlsRef.current);
  }, [controlsOpen, controlActivity]);

  const keepControlsOpen = (action) => {
    action?.();
    setControlsOpen(true);
    setControlActivity((value) => value + 1);
  };

  return (
    <main className="screen meditation-screen">
      <AppHeader title="闭眼冥想室" back />
      <div className="meditation-meta">
        <span>{state.title}</span>
        <span>{Math.max(1, Math.ceil((audio.duration * (1 - audio.progress / 100)) / 60))} 分钟</span>
      </div>
      <button className="affirmation-stage" disabled={audio.loading} aria-busy={audio.loading} onClick={() => audio.playing ? audio.pause() : audio.play()} aria-label={audio.loading ? "音频正在准备" : audio.playing ? "暂停引导" : "播放引导"}>
        <span className="affirmation-visual">
          <span className={`breath-orb ${audio.playing && settings.breathing ? "is-breathing" : ""}`} aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${state.id}-${affirmationIndex}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 5, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
              transition={{ duration: reduceMotion ? 0.12 : 0.72, ease: [0.22, 1, 0.36, 1] }}
              aria-live="polite"
            >{affirmationLines[affirmationIndex]}</motion.p>
          </AnimatePresence>
        </span>
      </button>
      {audio.audioError && <div className="audio-error" role="alert"><span>声音暂时没有加载出来。</span><button onClick={audio.play}>重新尝试</button></div>}
      <div className="immersive-control-area">
        <motion.div className="playback-status" layout transition={controlLayoutTransition}>
          <span className="tap-hint">轻触{audio.playing ? "暂停" : "继续"}</span>
          <div className="progress-track" aria-label={`播放进度 ${Math.round(audio.progress)}%`}><span style={{ width: `${audio.progress}%` }} /></div>
        </motion.div>
        <AnimatePresence initial={false}>
          {controlsOpen && (
            <motion.div layout key="panel" className="immersive-controls" role="group" aria-label="播放控制" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0, transition: { duration: .1 } } : { opacity: 0, y: 8, scale: .99, transition: { duration: .18, ease: [.4, 0, 1, 1] } }} transition={{ duration: reduceMotion ? .1 : .26, ease: [0.22, 1, 0.36, 1] }}>
              <div className="transport-controls">
                <button onClick={() => keepControlsOpen(() => audio.seekBy(-15))} aria-label="后退15秒"><ArrowCounterClockwise size={23} /><span>15</span></button>
                <button className="play-button" disabled={audio.loading} onClick={() => keepControlsOpen(() => audio.playing ? audio.pause() : audio.play())} aria-label={audio.loading ? "音频正在准备" : audio.playing ? "暂停" : "播放"}>
                  {audio.playing ? <Pause size={25} weight="fill" /> : <Play size={25} weight="fill" />}
                </button>
                <button onClick={() => keepControlsOpen(() => audio.seekBy(15))} aria-label="前进15秒"><ArrowClockwise size={23} /><span>15</span></button>
              </div>
              <button className="end-session-action" data-feedback="confirm" onClick={() => navigate(`/completion/${state.id}`)}>提前结束本次体验</button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button layout transition={controlLayoutTransition} className={`control-reveal ${controlsOpen ? "is-open" : ""}`} onClick={() => setControlsOpen((open) => !open)} aria-label={controlsOpen ? "收起播放控制" : "显示播放控制"} aria-expanded={controlsOpen}>
          <SlidersHorizontal size={21} />
          <span>{controlsOpen ? "收起控制" : "播放控制"}</span>
        </motion.button>
      </div>
    </main>
  );
}

function CompletionPage() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const { settings, setRecords } = useData();
  const [feedback, setFeedback] = useState(null);
  const recordedRef = useRef(false);
  const options = [
    ["steadier", "稍微稳定一些"],
    ["same", "没有明显变化"],
    ["worse", "感觉更不舒服"],
  ];
  const suggestions = {
    steadier: "把这一点稳定留在此刻就好。",
    same: "没有变化也没关系，你已经停下来照看了自己。",
    worse: "先离开这段体验，给自己一点安静和空间。",
  };
  const chooseFeedback = (value) => {
    if (feedback) return;
    setFeedback(value);
    if (settings.recordsEnabled && !recordedRef.current) {
      recordedRef.current = true;
      setRecords((items) => [{ id: createId(), type: "meditation", stateId, feedback: value, at: new Date().toISOString(), duration: 180 }, ...items]);
    }
  };
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => navigate("/"), 1500);
    return () => window.clearTimeout(timer);
  }, [feedback, navigate]);
  return (
    <main className="screen completion-screen">
      <AppHeader title="完成" back />
      <div className="completion-mark"><Check size={28} /></div>
      <h1>现在，有稍微稳定一些吗？</h1>
      <p>没有标准答案，只记录此刻的变化。</p>
      <AnimatePresence mode="wait" initial={false}>
        {!feedback ? (
          <motion.div key="options" className="feedback-options" exit={{ opacity: 0, y: -6 }} transition={{ duration: .16 }}>
            {options.map(([value, label]) => (
              <button key={value} data-feedback="confirm" onClick={() => chooseFeedback(value)}><span>{label}</span></button>
            ))}
          </motion.div>
        ) : (
          <motion.div key="suggestion" className="gentle-suggestion" role="status" aria-live="polite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, ease: [0.22, 1, 0.36, 1] }}>
            <Check size={20} />
            <p>{suggestions[feedback]}</p>
            <span>正在回到状态调整</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function HandwritingBurn({ burning, onContent, onBurnComplete }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const burnFrameRef = useRef(null);
  const ratioRef = useRef(1);
  const burningRef = useRef(burning);
  const completeRef = useRef(onBurnComplete);

  useEffect(() => { burningRef.current = burning; completeRef.current = onBurnComplete; }, [burning, onBurnComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    let resizeFrame;
    const resizeCanvas = () => {
      if (burningRef.current) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const previous = document.createElement("canvas"); previous.width = canvas.width; previous.height = canvas.height;
      if (canvas.width && canvas.height) previous.getContext("2d").drawImage(canvas, 0, 0);
      const economical = document.documentElement.classList.contains("low-power");
      const ratio = Math.min(window.devicePixelRatio || 1, economical ? 1.25 : 1.75);
      ratioRef.current = ratio; canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
      const context = canvas.getContext("2d"); context.setTransform(ratio, 0, 0, ratio, 0, 0); context.lineCap = "round"; context.lineJoin = "round";
      if (previous.width && previous.height) context.drawImage(previous, 0, 0, previous.width, previous.height, 0, 0, rect.width, rect.height);
    };
    const queueResize = () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resizeCanvas); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(queueResize) : null;
    resizeCanvas();
    if (observer) observer.observe(canvas); else window.addEventListener("resize", queueResize, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener("resize", queueResize); cancelAnimationFrame(resizeFrame); cancelAnimationFrame(burnFrameRef.current); };
  }, []);

  const point = (event) => { const rect = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top, pressure: event.pressure || .45 }; };
  useEffect(() => {
    if (!burning) return undefined;
    const canvas = canvasRef.current; const context = canvas.getContext("2d");
    const economical = document.documentElement.classList.contains("low-power");
    const snapshot = document.createElement("canvas"); snapshot.width = canvas.width; snapshot.height = canvas.height; snapshot.getContext("2d").drawImage(canvas, 0, 0);
    const pixels = snapshot.getContext("2d").getImageData(0, 0, snapshot.width, snapshot.height).data;
    const inkPoints = [];
    const stride = Math.max(2, Math.round(4 * ratioRef.current));
    for (let y = 0; y < snapshot.height; y += stride) {
      for (let x = 0; x < snapshot.width; x += stride) {
        if (pixels[(y * snapshot.width + x) * 4 + 3] > 28) inkPoints.push({ x, y });
      }
    }
    if (!inkPoints.length) { completeRef.current(); return undefined; }
    const seedCount = Math.min(economical ? 34 : 64, Math.max(20, Math.round(inkPoints.length / 16)));
    const seeds = Array.from({ length: seedCount }, (_, index) => {
      const pointOnInk = inkPoints[Math.floor(Math.random() * inkPoints.length)];
      return {
        ...pointOnInk,
        delay: Math.min(.64, index / seedCount * .44 + Math.random() * .2),
        size: (13 + Math.random() * 25) * ratioRef.current,
        wobble: Math.random() * Math.PI * 2,
      };
    });
    const start = performance.now();
    let lastPaint = 0;
    const burn = (time) => {
      if (economical && time - lastPaint < 30) { burnFrameRef.current = requestAnimationFrame(burn); return; }
      lastPaint = time;
      const progress = Math.min(1, (time - start) / 3000);
      context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.globalAlpha = progress > .76 ? Math.max(0, 1 - (progress - .76) / .24) : 1;
      context.drawImage(snapshot, 0, -progress * 5 * ratioRef.current);
      context.restore();
      seeds.forEach((seed) => {
        const local = Math.max(0, Math.min(1, (progress - seed.delay) / (1 - seed.delay)));
        if (!local) return;
        const eased = 1 - Math.pow(1 - local, 2.6); const radius = eased * seed.size;
        const x = seed.x + Math.sin(seed.wobble + local * 5) * 2.5 * ratioRef.current;
        const y = seed.y - local * 8 * ratioRef.current + Math.cos(seed.wobble + local * 4) * 2 * ratioRef.current;
        context.save(); context.globalCompositeOperation = "source-atop";
        const glow = context.createRadialGradient(x, y, Math.max(0, radius - 5 * ratioRef.current), x, y, radius + 7 * ratioRef.current);
        glow.addColorStop(0, "rgba(62,48,43,0)"); glow.addColorStop(.5, "rgba(118,61,43,.34)"); glow.addColorStop(.78, "rgba(225,91,49,.94)"); glow.addColorStop(1, "rgba(247,171,103,0)");
        context.fillStyle = glow; context.fillRect(0, 0, canvas.width, canvas.height); context.restore();
        context.save(); context.globalCompositeOperation = "destination-out"; context.beginPath();
        const points = economical ? 7 : 10;
        for (let i = 0; i < points; i += 1) {
          const angle = i / points * Math.PI * 2;
          const irregular = Math.max(0, radius - 3 * ratioRef.current) * (.72 + .3 * Math.sin(seed.wobble + i * 2.17));
          const px = x + Math.cos(angle) * irregular; const py = y + Math.sin(angle) * irregular;
          if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
        }
        context.closePath(); context.fill(); context.restore();
      });
      if (progress < 1) burnFrameRef.current = requestAnimationFrame(burn);
      else { context.clearRect(0, 0, canvas.width, canvas.height); context.setTransform(ratioRef.current, 0, 0, ratioRef.current, 0, 0); completeRef.current(); }
    };
    burnFrameRef.current = requestAnimationFrame(burn);
    return () => cancelAnimationFrame(burnFrameRef.current);
  }, [burning]);
  const down = (event) => { drawingRef.current = true; canvasRef.current.setPointerCapture(event.pointerId); const context = canvasRef.current.getContext("2d"); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); };
  const move = (event) => { if (!drawingRef.current || burning) return; const context = canvasRef.current.getContext("2d"); const p = point(event); context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink"); context.lineWidth = 1.5 + p.pressure * 4; context.lineTo(p.x, p.y); context.stroke(); onContent(true); };
  const up = () => { drawingRef.current = false; };
  return <canvas ref={canvasRef} className="handwriting-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="手写区域" />;
}

function BurnPage() {
  const { settings } = useData();
  const [mode, setMode] = useState("type");
  const [draft, setDraft] = useState("");
  const [embers, setEmbers] = useState([]);
  const [drawingPresent, setDrawingPresent] = useState(false);
  const [burning, setBurning] = useState(false);
  const [resetReady, setResetReady] = useState(true);
  const [anchor, setAnchor] = useState({ x: 24, y: 30, side: "left", width: 300, right: 0 });
  const inputRef = useRef(null);
  const ignite = (value = draft) => {
    const clean = value.trim();
    if (mode === "draw") { if (!drawingPresent || burning) return; setBurning(true); return; }
    if (!clean || burning) return;
    const id = createId();
    const origins = Array.from({ length: Math.min(6, Math.max(3, Math.ceil(clean.length / 12))) }, () => Math.floor(Math.random() * clean.length));
    const chars = [...clean].map((char, index) => ({ char, delay: Math.min(...origins.map((origin) => Math.abs(origin - index) * (22 + Math.random() * 18))) + Math.random() * 180, driftX: Math.round((Math.random() - .5) * 28), driftY: -12 - Math.round(Math.random() * 30), rotate: Math.round((Math.random() - .5) * 16) }));
    const burnDuration = Math.ceil(Math.max(...chars.map((item) => item.delay), 0) + 2550);
    setResetReady(false); setBurning(true); setEmbers([{ id, chars }]);
    setDraft("");
    window.setTimeout(() => {
      setEmbers([]); setBurning(false);
      window.setTimeout(() => setResetReady(true), 120);
    }, burnDuration);
  };
  const freePlacement = settings.burnInputLayout === "free";
  const placeCursor = (event) => {
    if (mode !== "type" || draft || burning || event.target.closest("button")) return;
    if (freePlacement) {
      const rect = event.currentTarget.getBoundingClientRect();
      const rawX = Math.max(16, Math.min(rect.width - 16, event.clientX - rect.left));
      const side = rawX > rect.width * .68 ? "right" : "left";
      const available = side === "right" ? rawX - 12 : rect.width - rawX - 12;
      setAnchor({ x: rawX, y: Math.max(18, Math.min(rect.height - 120, event.clientY - rect.top)), side, width: Math.max(120, Math.min(300, available)), right: Math.max(12, rect.width - rawX) });
    } else {
      setAnchor({ x: 24, y: 30, side: "left", width: 300, right: 0 });
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  return (
    <main className="screen burn-screen">
      <TopLevelIntro title={["写下再放下", "让它化作余烬"]} subtitle="不会保存，也不会发送。" section="阅后即焚" />
      <div className="burn-mode-switch" role="tablist" aria-label="输入方式"><button role="tab" aria-selected={mode === "type"} onClick={() => { setMode("type"); setBurning(false); setDrawingPresent(false); }}>键入</button><button role="tab" aria-selected={mode === "draw"} onClick={() => { setMode("draw"); setBurning(false); setDrawingPresent(false); }}>手写</button></div>
      <div className={`burn-canvas ${burning ? "is-burning" : ""} ${freePlacement ? "is-free-placement" : "is-fixed-placement"}`} onPointerDown={placeCursor}>
        {mode === "type" && !draft && !burning && resetReady && <span className={`burn-placeholder ${freePlacement ? "is-free" : "is-fixed"}`} aria-hidden="true">{freePlacement ? "轻触任意位置，写下一句。" : "从这里，写下想放下的内容。"}</span>}
        {mode === "type" ? <textarea ref={inputRef} value={draft} inputMode="text" onChange={(event) => setDraft(event.target.value)} aria-label="写下想放下的内容" autoComplete="off" spellCheck="false" placeholder="" style={{ "--burn-x": `${anchor.x}px`, "--burn-y": `${anchor.y}px`, "--burn-left": anchor.side === "right" ? "auto" : `${anchor.x}px`, "--burn-right": anchor.side === "right" ? `${anchor.right}px` : "auto", "--burn-width": `${anchor.width}px`, "--burn-text-align": anchor.side }} /> : <HandwritingBurn burning={burning} onContent={setDrawingPresent} onBurnComplete={() => { setBurning(false); setDrawingPresent(false); setResetReady(false); window.setTimeout(() => setResetReady(true), 180); }} />}
        {embers.map((ember) => <p className="burn-ember" key={ember.id} style={{ left: anchor.side === "right" ? "auto" : anchor.x, right: anchor.side === "right" ? `calc(100% - ${anchor.x}px)` : "auto", width: anchor.width, textAlign: anchor.side }}>{ember.chars.map((item, index) => <span key={`${item.char}-${index}`} style={{ animationDelay: `${item.delay}ms`, "--drift-x": `${item.driftX}px`, "--drift-y": `${item.driftY}px`, "--burn-rotate": `${item.rotate}deg` }}>{item.char}</span>)}</p>)}
      </div>
      <AnimatePresence>{((mode === "type" && draft.trim()) || (mode === "draw" && drawingPresent)) && !burning && <motion.button className="ignite-action" data-feedback="confirm" onClick={() => ignite()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>让它消散</motion.button>}</AnimatePresence>
    </main>
  );
}

function useEncounterAudio(track) {
  const audioRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!track) return undefined;
    const audio = new Audio(track.src);
    audio.preload = "metadata";
    audio.loop = Boolean(track.loop);
    audio.volume = track.category === "noise" ? .34 : .56;
    const onTime = () => setElapsed(audio.currentTime || 0);
    const onEnded = () => setPlaying(false);
    const clearLoadTimeout = () => {
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    };
    const onError = () => { clearLoadTimeout(); setPlaying(false); setLoading(false); setFailed(true); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audioRef.current = audio;
    setElapsed(0); setFailed(false); setPlaying(false);
    return () => {
      clearLoadTimeout();
      audio.pause(); audio.removeAttribute("src"); audio.load();
      audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnded); audio.removeEventListener("error", onError);
    };
  }, [track]);
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || loading) return;
    if (audio.paused) {
      setFailed(false); setLoading(true);
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = window.setTimeout(() => {
        audio.pause();
        setFailed(true); setPlaying(false); setLoading(false);
        loadTimeoutRef.current = null;
      }, 9000);
      audio.play().then(() => {
        if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
        setPlaying(true); setLoading(false);
      }).catch(() => {
        if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
        setFailed(true); setPlaying(false); setLoading(false);
      });
    } else { audio.pause(); setPlaying(false); }
  };
  return { playing, loading, failed, elapsed, toggle };
}

function EncounterPage() {
  const navigate = useNavigate();
  const { settings, setRecords } = useData();
  const [track, setTrack] = useState(null);
  const audio = useEncounterAudio(track);
  const choose = (category, excludeId) => {
    const pool = encounterTracks.filter((item) => item.category === category && item.id !== excludeId);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? encounterTracks.find((item) => item.category === category);
    setTrack(next);
  };
  const leave = () => {
    if (settings.recordsEnabled && track) setRecords((items) => [{ id: createId(), type: "encounter", at: new Date().toISOString(), duration: Math.round(audio.elapsed), completed: false }, ...items]);
    navigate("/");
  };
  return (
    <main className="screen encounter-screen">
      <AppHeader title="声音盲盒" back />
      {!track ? (
        <section className="encounter-choice">
          <FunctionSeal>声音盲盒</FunctionSeal>
          <h1>这一次，<br />想遇见哪一种声音？</h1>
          <p>选择一种类型，白境会从开放许可音源中随机抽取。</p>
          <div className="encounter-doors">
            <button onClick={() => choose("noise")}><Waveform size={24} /><span><strong>白噪音</strong><small>连续、均匀，遮住一点环境声</small></span><CaretRight size={18} /></button>
            <button onClick={() => choose("music")}><MusicNotes size={24} /><span><strong>纯音乐</strong><small>没有人声，让旋律慢慢经过</small></span><CaretRight size={18} /></button>
          </div>
        </section>
      ) : (
        <>
          <div className="encounter-stage">
            <span>{track.category === "noise" ? "白噪音" : "纯音乐"} · 随机遇见</span>
            <h1>{track.title}</h1>
            <p>{track.note}</p>
            <div className={`sound-rings ${audio.playing ? "is-playing" : ""}`} aria-hidden="true"><span /><span /><span /></div>
          </div>
          <button className="play-button encounter-play" disabled={audio.loading} onClick={audio.toggle} aria-label={audio.loading ? "正在连接音源" : audio.playing ? "暂停" : "播放"}>{audio.playing ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" />}</button>
          {audio.failed ? <div className="encounter-error" role="alert"><span>这个在线音源暂时无法播放。</span><button onClick={() => choose(track.category, track.id)}>换一个来源</button></div> : <p className="encounter-rule">在线播放，不保存音频。你可以随时暂停或离开。</p>}
          <a className="encounter-source" href={track.sourceUrl} target="_blank" rel="noreferrer">{track.source} · {track.license}</a>
          <button className="text-action" onClick={leave}>结束并返回</button>
        </>
      )}
    </main>
  );
}

const knowledgeEntries = knowledgeTopics.flatMap((topic) => topic.items.map((item) => ({ ...item, group: topic.group })));

function PsychologyLibraryPage() {
  return (
    <main className="screen index-screen">
      <AppHeader title="心理学文库" back />
      <section className="detail-hero compact psychology-library-hero">
        <FunctionSeal>心理学文库</FunctionSeal>
        <h1>理解正在发生什么，<br />不急着给自己下结论。</h1>
        <p>24 个心理学主题，整理自项目内 121 条研究、综述与权威公共资料。内容用于心理教育，不用于诊断。</p>
      </section>
      {knowledgeTopics.map((topic) => <section className="knowledge-group" key={topic.group}><h2>{topic.group}</h2><div className="term-list">{topic.items.map((item) => (
        <Link key={item.id} className="knowledge-link" to={`/psychology-library/${item.id}`}>
          <span><strong>{item.term}</strong><small>{item.summary}</small></span>
          <span className="knowledge-evidence">{item.evidence}</span>
          <CaretRight size={18} />
        </Link>
      ))}</div></section>)}
    </main>
  );
}

function PsychologyArticlePage() {
  const { articleId } = useParams();
  const item = knowledgeEntries.find((entry) => entry.id === articleId) ?? knowledgeEntries[0];
  return (
    <main className="screen psychology-article-screen">
      <AppHeader title={item.term} back />
      <article className="psychology-article">
        <header>
          <span>{item.group} · {item.evidence}</span>
          <h1>{item.term}</h1>
          <p>{item.summary}</p>
        </header>
        <section><h2>它如何发生</h2><p>{item.mechanism}</p></section>
        <section><h2>日常中可能怎样出现</h2><ul>{item.signs?.map((sign) => <li key={sign}>{sign}</li>)}</ul></section>
        <section><h2>可以尝试怎样观察</h2><p>{item.practice}</p></section>
        <aside><strong>常见误解</strong><p>{item.myth}</p></aside>
        <section><h2>需要保留的边界</h2><p>{item.boundary}</p></section>
        <footer>
          <span>主要参考</span>
          <cite>{item.source}</cite>
          <p>证据等级沿用项目文献库标注。本文是面向公众的概念解释，不构成医学或心理诊断。</p>
        </footer>
      </article>
    </main>
  );
}

function RecordsPage() {
  const { records, setRecords, settings } = useData();
  return (
    <main className="screen library-screen records-screen">
      <TopLevelIntro title={["时间会经过，", "不必留下痕迹。"]} subtitle="记录默认关闭，只有你主动开启后才会留下片刻。" section="时间流转" />
      {!settings.recordsEnabled ? (
        <div className="records-privacy-note"><ClockCounterClockwise size={25} /><p>白境会守护你的隐私。<br />需要时，可以在设置中主动开启记录。</p></div>
      ) : records.length === 0 ? (
        <div className="empty-state"><ClockCounterClockwise size={28} /><h1>还没有记录</h1><p>等你完成一次状态调整，这里才会留下时间与反馈。你在阅后即焚里写下的内容，始终不会被保存。</p></div>
      ) : (
        <div className="record-list">{records.map((record) => <article key={record.id}><div><strong>{record.type === "encounter" ? "声音盲盒" : getState(record.stateId).title}</strong><span>{new Date(record.at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div><button onClick={() => setRecords((items) => items.filter((item) => item.id !== record.id))} aria-label="删除记录"><Trash size={18} /></button></article>)}</div>
      )}
    </main>
  );
}

function Toggle({ checked, onChange, label }) {
  return <button className={`toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked} aria-label={label}><span /></button>;
}

function SettingsPage() {
  const { settings, setSettings, setRecords } = useData();
  const getFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const [fullscreenActive, setFullscreenActive] = useState(Boolean(getFullscreenElement()));
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  useEffect(() => {
    const syncFullscreen = () => setFullscreenActive(Boolean(getFullscreenElement()));
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => { document.removeEventListener("fullscreenchange", syncFullscreen); document.removeEventListener("webkitfullscreenchange", syncFullscreen); };
  }, []);
  const toggleFullscreen = async (enabled) => {
    try {
      if (enabled && !getFullscreenElement()) {
        const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
        if (!request) throw new Error("fullscreen unsupported");
        await request.call(document.documentElement);
      }
      if (!enabled && getFullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit?.call(document);
      }
      setFullscreenActive(Boolean(getFullscreenElement()));
      update("fullscreen", Boolean(getFullscreenElement()));
    } catch {
      setFullscreenActive(false);
      update("fullscreen", false);
    }
  };
  const clearData = () => {
    if (window.confirm("清除所有记录和偏好？这个操作不能撤销。")) {
      setRecords([]);
      localStorage.clear();
      window.location.reload();
    }
  };
  return (
    <main className="screen settings-screen">
      <TopLevelIntro title={["把体验调成", "更适合你的样子。"]} subtitle="声音、动效与隐私，都可以随时调整。" section="设置" />
      <section className="menu-hub" aria-label="其他功能">
        <h2>内容与工具</h2>
        <Link to="/encounter"><DiceThree size={20} /><span><strong>声音盲盒</strong><small>让此刻随机遇见一段声音</small></span><ArrowRight size={16} /></Link>
        <Link to="/psychology-library"><BookOpenText size={20} /><span><strong>心理学文库</strong><small>从研究与综述中理解心理概念</small></span><ArrowRight size={16} /></Link>
      </section>
      <section className="settings-group">
        <h2>外观与显示</h2>
        <div className="segmented-control">
          {[["system", "跟随系统", GearSix], ["light", "浅色", Sun], ["dark", "深色", Moon]].map(([value, label, Icon]) => <button key={value} className={settings.theme === value ? "is-selected" : ""} onClick={() => update("theme", value)}><Icon size={17} />{label}</button>)}
        </div>
        <div className="setting-row"><div><strong>全屏模式</strong><span>隐藏浏览器界面，更专注地体验</span></div><Toggle checked={fullscreenActive} onChange={toggleFullscreen} label="全屏模式" /></div>
      </section>
      <section className="settings-group">
        <h2>书写与交互</h2>
        <div className="setting-choice-row">
          <div><strong>键入位置</strong><span>阅后即焚中的文字起点</span></div>
          <div className="segmented-control compact" aria-label="阅后即焚键入位置">
            {[["fixed", "固定区域"], ["free", "自由落字"]].map(([value, label]) => {
              const selected = (settings.burnInputLayout ?? "fixed") === value;
              return <button key={value} aria-pressed={selected} className={selected ? "is-selected" : ""} onClick={() => update("burnInputLayout", value)}>{selected && <Check size={14} weight="bold" />}{label}</button>;
            })}
          </div>
        </div>
        {[["haptics", "轻触反馈"], ["breathing", "呼吸提示"], ["reducedEffects", "降低动效"]].map(([key, label]) => <div className="setting-row" key={key}><div><strong>{label}</strong><span>可随时调整</span></div><Toggle checked={settings[key]} onChange={(value) => update(key, value)} label={label} /></div>)}
      </section>
      <section className="settings-group privacy-block">
        <h2>记录与隐私</h2>
        <div className="setting-row"><div><strong>保存体验记录</strong><span>默认关闭，只记录完成信息</span></div><Toggle checked={settings.recordsEnabled} onChange={(value) => update("recordsEnabled", value)} label="保存体验记录" /></div>
        <p>数据只保存在当前浏览器。清除浏览器数据、卸载 PWA 或更换设备后无法恢复。</p>
        <button className="danger-action" onClick={clearData}><Trash size={18} />清除所有本地数据</button>
      </section>
    </main>
  );
}

function MobileEnvironmentEffect() {
  useEffect(() => {
    const root = document.documentElement;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const lowPower = Boolean(connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
    root.classList.toggle("low-power", lowPower);
    const updateViewport = () => {
      const viewport = window.visualViewport;
      const visibleHeight = viewport?.height || window.innerHeight;
      root.style.setProperty("--visual-viewport-height", `${Math.round(visibleHeight)}px`);
      const active = document.activeElement;
      const editing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.isContentEditable;
      root.classList.toggle("keyboard-open", Boolean(editing && viewport && viewport.scale === 1 && window.innerHeight - visibleHeight > 100));
    };
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport, { passive: true });
    window.visualViewport?.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("orientationchange", updateViewport, { passive: true });
    document.addEventListener("focusin", updateViewport);
    document.addEventListener("focusout", updateViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport); window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("orientationchange", updateViewport); document.removeEventListener("focusin", updateViewport); document.removeEventListener("focusout", updateViewport);
      root.classList.remove("keyboard-open", "low-power"); root.style.removeProperty("--visual-viewport-height");
    };
  }, []);
  return null;
}

function ThemeEffect() {
  const { settings } = useData();
  const feedbackContextRef = useRef(null);
  const lastFeedbackRef = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle("reduce-effects", settings.reducedEffects);
    const darkPreference = window.matchMedia("(prefers-color-scheme: dark)");
    const updateChrome = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && darkPreference.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#171817" : "#fbfbfa");
    };
    updateChrome();
    if (darkPreference.addEventListener) darkPreference.addEventListener("change", updateChrome); else darkPreference.addListener?.(updateChrome);
    return () => { if (darkPreference.removeEventListener) darkPreference.removeEventListener("change", updateChrome); else darkPreference.removeListener?.(updateChrome); };
  }, [settings.theme, settings.reducedEffects]);

  useEffect(() => {
    const feedback = (event) => {
      if (!settings.haptics) return;
      const target = event.target instanceof Element ? event.target.closest("button, a, [role='option'], [role='tab'], [role='switch']") : null;
      if (!target || target.matches(":disabled, [aria-disabled='true']") || target.closest("[data-feedback='none']")) return;
      const now = Date.now();
      if (now - lastFeedbackRef.current < 70) return;
      lastFeedbackRef.current = now;
      const kind = target.dataset.feedback || "soft";
      const duration = kind === "confirm" ? 16 : kind === "selection" ? 11 : 8;
      navigator.vibrate?.(duration);
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = feedbackContextRef.current || new AudioContext();
      feedbackContextRef.current = context;
      if (context.state === "suspended") context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = kind === "confirm" ? 720 : 620;
      gain.gain.setValueAtTime(0.009, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.018);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.02);
    };
    document.addEventListener("click", feedback, true);
    return () => document.removeEventListener("click", feedback, true);
  }, [settings.haptics]);
  return null;
}

function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    document.querySelector("main h1")?.focus?.();
  }, [location.pathname]);
  return null;
}

const primaryTabs = [
  ["/", Waveform, "状态调整"],
  ["/burn", PencilSimple, "阅后即焚"],
  ["/records", ClockCounterClockwise, "时间流转"],
  ["/settings", GearSix, "设置"],
];

function PersistentTabBar() {
  const location = useLocation();
  if (!primaryTabs.some(([path]) => path === location.pathname)) return null;
  return (
    <nav className="persistent-tabs" aria-label="主要功能">
      {primaryTabs.map(([path, Icon, label]) => {
        const active = location.pathname === path;
        return <Link key={path} to={path} className={active ? "is-active" : ""} aria-label={label} aria-current={active ? "page" : undefined}>
          {active && <motion.span className="tab-active-surface" layoutId="active-tab" transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }} />}
          <Icon size={22} weight="regular" /><span className="sr-only">{label}</span>
        </Link>;
      })}
    </nav>
  );
}

function AmbientTexture() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;
    const size = 180;
    canvas.width = size; canvas.height = size;
    const image = context.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random() > 0.92 ? Math.random() * 18 : Math.random() * 5;
      image.data[i] = 80; image.data[i + 1] = 76; image.data[i + 2] = 70; image.data[i + 3] = value;
    }
    context.putImageData(image, 0, 0);
    context.globalAlpha = 0.035;
    context.strokeStyle = "#77736c";
    for (let i = 0; i < 18; i += 1) {
      context.beginPath(); context.moveTo(Math.random() * size, Math.random() * size); context.quadraticCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size); context.stroke();
    }
  }, []);
  return <canvas className="ambient-texture" ref={ref} aria-hidden="true" />;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const swipeStartRef = useRef(null);
  const onSwipeStart = (event) => {
    if (event.touches.length !== 1 || !primaryTabs.some(([path]) => path === location.pathname)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button,a,input,textarea,canvas,[role='option'],[role='slider'],.state-selector,.burn-canvas")) return;
    const x = event.touches[0].clientX;
    if (x < 28 || x > window.innerWidth - 28) return;
    swipeStartRef.current = { x, y: event.touches[0].clientY };
  };
  const onSwipeEnd = (event) => {
    const start = swipeStartRef.current; swipeStartRef.current = null;
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x; const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    const index = primaryTabs.findIndex(([path]) => path === location.pathname);
    const nextIndex = dx < 0 ? Math.min(primaryTabs.length - 1, index + 1) : Math.max(0, index - 1);
    if (nextIndex !== index) navigate(primaryTabs[nextIndex][0]);
  };
  return (
    <div className="mobile-prototype">
      <AmbientTexture />
      <MobileEnvironmentEffect />
      <ThemeEffect />
      <RouteFocus />
      <AnimatePresence mode="wait" initial={false}><motion.div className="route-stage" key={location.pathname} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -5 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}><Routes location={location}>
        <Route path="/" element={<CanvasPage />} />
        <Route path="/states/:stateId" element={<StateScenesPage />} />
        <Route path="/meditation/:stateId/:sceneIndex" element={<MeditationPage />} />
        <Route path="/completion/:stateId" element={<CompletionPage />} />
        <Route path="/burn" element={<BurnPage />} />
        <Route path="/encounter" element={<EncounterPage />} />
        <Route path="/psychology-library" element={<PsychologyLibraryPage />} />
        <Route path="/psychology-library/:articleId" element={<PsychologyArticlePage />} />
        <Route path="/emotion-index" element={<Navigate to="/psychology-library" replace />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes></motion.div></AnimatePresence>
      <PersistentTabBar />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <DataProvider><AppRoutes /></DataProvider>
    </HashRouter>
  );
}
