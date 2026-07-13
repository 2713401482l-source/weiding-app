import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowClockwise,
  ArrowCounterClockwise,
  BookOpenText,
  CaretDown,
  Check,
  ClockCounterClockwise,
  DiceThree,
  GearSix,
  Heart,
  List,
  LockSimple,
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
  const [favorites, setFavorites] = useLocalStorage("baijing:favorites", []);
  const [records, setRecords] = useLocalStorage("baijing:records", []);
  const [settings, setSettings] = useLocalStorage("baijing:settings", {
    theme: "light",
    recordsEnabled: false,
    breathing: true,
    haptics: true,
    reducedEffects: false,
    voiceVolume: 0.72,
    ambienceVolume: 0.42,
    weather: false,
    fullscreen: false,
  });
  return { favorites, setFavorites, records, setRecords, settings, setSettings };
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
    ["/favorites", Heart, "收藏"],
    ["/emotion-index", BookOpenText, "情绪索引"],
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
  const reduceMotion = useReducedMotion();
  const selected = states[selectedIndex];

  const playRailTick = (index) => {
    if (lastTickRef.current === index) return;
    lastTickRef.current = index;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 460 + index * 24;
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.045);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.05);
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
      <TopLevelIntro title={["此刻，你更接近", "哪种状态？"]} subtitle="不必判断得很准确，只选最接近的感受。" section="状态调整" />

      <section className="state-selector vertical" aria-label="选择当前状态">
        <div className="state-list" role="listbox" aria-activedescendant={`state-${selected.id}`}>
          {states.map((state, index) => (
            <button
              id={`state-${state.id}`}
              key={state.id}
              role="option"
              aria-selected={selectedIndex === index}
              className={`state-title-row ${selectedIndex === index ? "is-selected" : ""}`}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => selectedIndex === index ? navigate(`/states/${state.id}`) : setSelectedIndex(index)}
            >
              <span>{state.title}</span>
              {selectedIndex === index && <small>{state.description}</small>}
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
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const element = new Audio(`${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`);
    element.preload = "metadata";
    element.volume = volume;
    element.addEventListener("loadedmetadata", () => setDuration(element.duration || 0));
    element.addEventListener("timeupdate", () => {
      setCurrentTime(element.currentTime || 0);
      setProgress(element.duration ? element.currentTime / element.duration * 100 : 0);
    });
    element.addEventListener("ended", () => setPlaying(false));
    audioRef.current = element;
    return () => { element.pause(); element.src = ""; };
  }, [src]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const play = () => {
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
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
    setCurrentTime(next);
    setProgress(element.duration ? next / element.duration * 100 : 0);
  };
  return { playing, play, pause, progress, duration, currentTime, seekBy };
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
      <button className="affirmation-stage" onClick={() => audio.playing ? audio.pause() : audio.play()} aria-label={audio.playing ? "暂停引导" : "播放引导"}>
        <span className={`breath-orb ${audio.playing && settings.breathing ? "is-breathing" : ""}`} aria-hidden="true" />
        <p>{state.affirmation}</p>
        <span className="tap-hint">轻触{audio.playing ? "暂停" : "继续"}</span>
      </button>
      <div className="progress-track" aria-label={`播放进度 ${Math.round(audio.progress)}%`}><span style={{ width: `${audio.progress}%` }} /></div>
      <div className="immersive-control-area">
        <AnimatePresence initial={false}>
          {controlsOpen && (
            <motion.div key="panel" className="immersive-controls" role="group" aria-label="播放控制" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0, transition: { duration: .1 } } : { opacity: 0, y: 8, scale: .99, transition: { duration: .18, ease: [.4, 0, 1, 1] } }} transition={{ duration: reduceMotion ? .1 : .26, ease: [0.22, 1, 0.36, 1] }}>
              <div className="transport-controls">
                <button onClick={() => keepControlsOpen(() => audio.seekBy(-15))} aria-label="后退15秒"><ArrowCounterClockwise size={23} /><span>15</span></button>
                <button className="play-button" onClick={() => keepControlsOpen(() => audio.playing ? audio.pause() : audio.play())} aria-label={audio.playing ? "暂停" : "播放"}>
                  {audio.playing ? <Pause size={25} weight="fill" /> : <Play size={25} weight="fill" />}
                </button>
                <button onClick={() => keepControlsOpen(() => audio.seekBy(15))} aria-label="前进15秒"><ArrowClockwise size={23} /><span>15</span></button>
              </div>
              <button className="end-session-action" data-feedback="confirm" onClick={() => navigate(`/completion/${state.id}`)}>提前结束本次体验</button>
            </motion.div>
          )}
        </AnimatePresence>
        <button className={`control-reveal ${controlsOpen ? "is-open" : ""}`} onClick={() => setControlsOpen((open) => !open)} aria-label={controlsOpen ? "收起播放控制" : "显示播放控制"} aria-expanded={controlsOpen}>
          <SlidersHorizontal size={21} />
          <span>{controlsOpen ? "收起控制" : "播放控制"}</span>
        </button>
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
      setRecords((items) => [{ id: crypto.randomUUID(), type: "meditation", stateId, feedback: value, at: new Date().toISOString(), duration: 180 }, ...items]);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    ratioRef.current = ratio;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext("2d"); context.scale(ratio, ratio); context.lineCap = "round"; context.lineJoin = "round";
    return () => cancelAnimationFrame(burnFrameRef.current);
  }, []);

  const point = (event) => { const rect = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top, pressure: event.pressure || .45 }; };
  useEffect(() => {
    if (!burning) return undefined;
    const canvas = canvasRef.current; const context = canvas.getContext("2d");
    const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
    const seeds = Array.from({ length: 16 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, delay: Math.random() * .38, size: (70 + Math.random() * 110) * ratioRef.current }));
    const start = performance.now();
    const burn = (time) => {
      const progress = Math.min(1, (time - start) / 2600);
      context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height); context.putImageData(snapshot, 0, 0);
      seeds.forEach((seed) => {
        const local = Math.max(0, Math.min(1, (progress - seed.delay) / (1 - seed.delay)));
        if (!local) return;
        const eased = 1 - Math.pow(1 - local, 2.4); const radius = eased * seed.size;
        context.save(); context.globalCompositeOperation = "source-atop";
        const glow = context.createRadialGradient(seed.x, seed.y, Math.max(0, radius - 14 * ratioRef.current), seed.x, seed.y, radius + 10 * ratioRef.current);
        glow.addColorStop(0, "rgba(66,49,43,0)"); glow.addColorStop(.62, "rgba(95,57,43,.54)"); glow.addColorStop(.84, "rgba(224,93,51,.92)"); glow.addColorStop(1, "rgba(245,171,103,0)");
        context.fillStyle = glow; context.fillRect(0, 0, canvas.width, canvas.height); context.restore();
        context.save(); context.globalCompositeOperation = "destination-out"; context.beginPath(); context.arc(seed.x, seed.y, Math.max(0, radius - 8 * ratioRef.current), 0, Math.PI * 2); context.fill(); context.restore();
      });
      if (progress < 1) burnFrameRef.current = requestAnimationFrame(burn);
      else { context.clearRect(0, 0, canvas.width, canvas.height); context.setTransform(ratioRef.current, 0, 0, ratioRef.current, 0, 0); onBurnComplete(); }
    };
    burnFrameRef.current = requestAnimationFrame(burn);
    return () => cancelAnimationFrame(burnFrameRef.current);
  }, [burning, onBurnComplete]);
  const down = (event) => { drawingRef.current = true; canvasRef.current.setPointerCapture(event.pointerId); const context = canvasRef.current.getContext("2d"); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); };
  const move = (event) => { if (!drawingRef.current || burning) return; const context = canvasRef.current.getContext("2d"); const p = point(event); context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink"); context.lineWidth = 1.5 + p.pressure * 4; context.lineTo(p.x, p.y); context.stroke(); onContent(true); };
  const up = () => { drawingRef.current = false; };
  return <canvas ref={canvasRef} className="handwriting-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="手写区域" />;
}

function BurnPage() {
  const [mode, setMode] = useState("type");
  const [draft, setDraft] = useState("");
  const [embers, setEmbers] = useState([]);
  const [drawingPresent, setDrawingPresent] = useState(false);
  const [burning, setBurning] = useState(false);
  const [anchor, setAnchor] = useState({ x: 24, y: 34 });
  const inputRef = useRef(null);
  const ignite = (value = draft) => {
    const clean = value.trim();
    if (mode === "draw") { if (!drawingPresent || burning) return; setBurning(true); return; }
    if (!clean || burning) return;
    const id = crypto.randomUUID();
    const origins = Array.from({ length: Math.min(6, Math.max(3, Math.ceil(clean.length / 12))) }, () => Math.floor(Math.random() * clean.length));
    const chars = [...clean].map((char, index) => ({ char, delay: Math.min(...origins.map((origin) => Math.abs(origin - index) * (22 + Math.random() * 18))) + Math.random() * 180, driftX: Math.round((Math.random() - .5) * 28), driftY: -12 - Math.round(Math.random() * 30), rotate: Math.round((Math.random() - .5) * 16) }));
    setBurning(true); setEmbers([{ id, chars }]);
    setDraft("");
    window.setTimeout(() => { setEmbers([]); setBurning(false); }, 3000);
  };
  const placeCursor = (event) => {
    if (mode !== "type" || draft || burning || event.target.closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({ x: Math.max(12, Math.min(rect.width - 180, event.clientX - rect.left)), y: Math.max(18, Math.min(rect.height - 120, event.clientY - rect.top)) });
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  return (
    <main className="screen burn-screen">
      <TopLevelIntro title={["让它暂时", "离开脑海。"]} subtitle="不会保存，也不会发送。" section="阅后即焚" />
      <div className="burn-mode-switch" role="tablist" aria-label="输入方式"><button role="tab" aria-selected={mode === "type"} onClick={() => { setMode("type"); setBurning(false); setDrawingPresent(false); }}>键入</button><button role="tab" aria-selected={mode === "draw"} onClick={() => { setMode("draw"); setBurning(false); setDrawingPresent(false); }}>手写</button></div>
      <div className={`burn-canvas ${burning ? "is-burning" : ""}`} onPointerDown={placeCursor}>
        {mode === "type" ? <textarea ref={inputRef} value={draft} inputMode="text" onChange={(event) => setDraft(event.target.value)} aria-label="写下想放下的内容" autoComplete="off" spellCheck="false" placeholder="轻触任意位置，写下一句。" style={{ "--burn-x": `${anchor.x}px`, "--burn-y": `${anchor.y}px` }} /> : <HandwritingBurn burning={burning} onContent={setDrawingPresent} onBurnComplete={() => { setBurning(false); setDrawingPresent(false); }} />}
        {embers.map((ember) => <p className="burn-ember" key={ember.id} style={{ left: anchor.x, top: anchor.y }}>{ember.chars.map((item, index) => <span key={`${item.char}-${index}`} style={{ animationDelay: `${item.delay}ms`, "--drift-x": `${item.driftX}px`, "--drift-y": `${item.driftY}px`, "--burn-rotate": `${item.rotate}deg` }}>{item.char}</span>)}</p>)}
      </div>
      <AnimatePresence>{((mode === "type" && draft.trim()) || (mode === "draw" && drawingPresent)) && !burning && <motion.button className="ignite-action" data-feedback="confirm" onClick={() => ignite()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>让它消散</motion.button>}</AnimatePresence>
    </main>
  );
}

function EncounterPage() {
  const navigate = useNavigate();
  const { settings, setRecords } = useData();
  const initialTrack = useMemo(() => {
    const locked = sessionStorage.getItem("baijing:encounter");
    if (locked) return JSON.parse(locked);
    const track = encounterTracks[Math.floor(Math.random() * encounterTracks.length)];
    sessionStorage.setItem("baijing:encounter", JSON.stringify(track));
    return track;
  }, []);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setElapsed((value) => Math.min(value + 1, initialTrack.duration)), 1000);
    return () => clearInterval(timer);
  }, [playing, initialTrack.duration]);
  const leave = () => {
    if (settings.recordsEnabled) setRecords((items) => [{ id: crypto.randomUUID(), type: "encounter", at: new Date().toISOString(), duration: elapsed, completed: elapsed >= initialTrack.duration }, ...items]);
    navigate("/");
  };
  return (
    <main className="screen encounter-screen">
      <AppHeader title="声音盲盒" back />
      <div className="encounter-stage">
        <span>此刻遇见</span>
        <h1>{initialTrack.title}</h1>
        <p>{initialTrack.note}</p>
        <div className={`sound-rings ${playing ? "is-playing" : ""}`} aria-hidden="true"><span /><span /><span /></div>
      </div>
      <button className="play-button encounter-play" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" />}</button>
      <p className="encounter-rule">这次不提供快进或立即重抽。你可以随时暂停或离开。</p>
      <button className="text-action" onClick={leave}>结束并返回</button>
    </main>
  );
}

function EmotionIndexPage() {
  const [open, setOpen] = useState(null);
  return (
    <main className="screen index-screen">
      <AppHeader title="情绪索引" back />
      <section className="detail-hero compact">
        <FunctionSeal>心理知识索引</FunctionSeal>
        <h1>理解正在发生什么，<br />不急着给自己下结论。</h1>
      </section>
      {knowledgeTopics.map((topic) => <section className="knowledge-group" key={topic.group}><h2>{topic.group}</h2><div className="term-list">{topic.items.map((item) => (
        <article key={item.term} className={open === item.term ? "is-open" : ""}>
          <button onClick={() => setOpen(open === item.term ? null : item.term)} aria-expanded={open === item.term}><span>{item.term}</span><CaretDown size={18} /></button>
          {open === item.term && <div className="knowledge-entry"><p>{item.summary}</p><p className="knowledge-myth"><strong>常见误解</strong>{item.myth}</p><footer><span>{item.evidence}</span><cite>{item.source}</cite></footer></div>}
        </article>
      ))}</div></section>)}
    </main>
  );
}

function RecordsPage() {
  const { records, setRecords, settings } = useData();
  return (
    <main className="screen library-screen">
      <TopLevelIntro title={["时间会经过，", "不必留下痕迹。"]} subtitle="记录默认关闭，只有你主动开启后才会留下片刻。" section="时间流转" />
      {!settings.recordsEnabled ? (
        <div className="empty-state records-empty"><ClockCounterClockwise size={28} /><p>白境会守护你的隐私。需要时，你可以在设置中主动开启记录。</p><Link className="empty-cta" to="/settings">前往设置</Link></div>
      ) : records.length === 0 ? (
        <div className="empty-state"><ClockCounterClockwise size={28} /><h1>还没有记录</h1><p>等你完成一次状态调整，这里才会留下时间与反馈。你在阅后即焚里写下的内容，始终不会被保存。</p></div>
      ) : (
        <div className="record-list">{records.map((record) => <article key={record.id}><div><strong>{record.type === "encounter" ? "声音盲盒" : getState(record.stateId).title}</strong><span>{new Date(record.at).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div><button onClick={() => setRecords((items) => items.filter((item) => item.id !== record.id))} aria-label="删除记录"><Trash size={18} /></button></article>)}</div>
      )}
    </main>
  );
}

function FavoritesPage() {
  const { favorites, setFavorites } = useData();
  const items = states.filter((state) => favorites.includes(state.id));
  return (
    <main className="screen library-screen">
      <AppHeader title="收藏" back />
      {items.length === 0 ? <div className="empty-state"><Heart size={28} /><h1>还没有收藏</h1><p>在冥想室中收藏的内容会出现在这里。</p></div> : <div className="favorite-list">{items.map((state) => <article key={state.id}><div><span>{state.term}</span><strong>{state.title}</strong><p>{state.affirmation}</p></div><button onClick={() => setFavorites((ids) => ids.filter((id) => id !== state.id))} aria-label="取消收藏"><Heart size={20} weight="fill" /></button></article>)}</div>}
    </main>
  );
}

function Toggle({ checked, onChange, label }) {
  return <button className={`toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked} aria-label={label}><span /></button>;
}

function SettingsPage() {
  const { settings, setSettings, setRecords, setFavorites } = useData();
  const [fullscreenActive, setFullscreenActive] = useState(Boolean(document.fullscreenElement));
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  useEffect(() => {
    const syncFullscreen = () => setFullscreenActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  const toggleFullscreen = async (enabled) => {
    try {
      if (enabled && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!enabled && document.fullscreenElement) await document.exitFullscreen();
      setFullscreenActive(Boolean(document.fullscreenElement));
      update("fullscreen", Boolean(document.fullscreenElement));
    } catch {
      setFullscreenActive(false);
      update("fullscreen", false);
    }
  };
  const clearData = () => {
    if (window.confirm("清除所有记录、收藏和偏好？这个操作不能撤销。")) {
      setRecords([]); setFavorites([]);
      localStorage.clear();
      window.location.reload();
    }
  };
  return (
    <main className="screen settings-screen">
      <TopLevelIntro title={["把体验调成", "更适合你的样子。"]} subtitle="声音、动效与隐私，都可以随时调整。" section="设置" />
      <section className="menu-hub" aria-label="其他功能">
        <h2>基础功能</h2>
        <Link to="/encounter"><DiceThree size={20} /><span><strong>声音盲盒</strong><small>让此刻随机遇见一段声音</small></span><ArrowRight size={16} /></Link>
        <Link to="/favorites"><Heart size={20} /><span><strong>收藏</strong><small>保留想再次使用的内容</small></span><ArrowRight size={16} /></Link>
        <Link to="/emotion-index"><BookOpenText size={20} /><span><strong>情绪索引</strong><small>阅读克制、非诊断式的心理词条</small></span><ArrowRight size={16} /></Link>
      </section>
      <section className="settings-group">
        <h2>外观</h2>
        <div className="segmented-control">
          {[["system", "跟随系统", GearSix], ["light", "浅色", Sun], ["dark", "深色", Moon]].map(([value, label, Icon]) => <button key={value} className={settings.theme === value ? "is-selected" : ""} onClick={() => update("theme", value)}><Icon size={17} />{label}</button>)}
        </div>
      </section>
      <section className="settings-group">
        <h2>体验</h2>
        <div className="setting-row"><div><strong>全屏模式</strong><span>隐藏浏览器界面，更专注地体验</span></div><Toggle checked={fullscreenActive} onChange={toggleFullscreen} label="全屏模式" /></div>
        {[["breathing", "呼吸提示"], ["haptics", "轻触反馈"], ["reducedEffects", "降低动效"], ["weather", "盲盒使用天气信息"], ["recordsEnabled", "保存体验记录"]].map(([key, label]) => <div className="setting-row" key={key}><div><strong>{label}</strong><span>{key === "recordsEnabled" ? "默认关闭，只记录完成信息" : key === "weather" ? "需要时再请求定位权限" : "可随时调整"}</span></div><Toggle checked={settings[key]} onChange={(value) => update(key, value)} label={label} /></div>)}
      </section>
      <section className="settings-group privacy-block"><h2>你的数据</h2><p>数据只保存在当前浏览器。清除浏览器数据、卸载 PWA 或更换设备后无法恢复。</p><button className="danger-action" onClick={clearData}><Trash size={18} />清除所有本地数据</button></section>
    </main>
  );
}

function ThemeEffect() {
  const { settings } = useData();
  const feedbackContextRef = useRef(null);
  const lastFeedbackRef = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle("reduce-effects", settings.reducedEffects);
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
      if (typeof navigator.vibrate === "function" && navigator.vibrate(duration)) return;
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
        return <Link key={path} to={path} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
          {active && <motion.span className="tab-active-surface" layoutId="active-tab" transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }} />}
          <Icon size={21} weight="regular" /><span>{label}</span>
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
    swipeStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
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
      <ThemeEffect />
      <RouteFocus />
      <AnimatePresence mode="wait" initial={false}><motion.div className="route-stage" key={location.pathname} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -5 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}><Routes location={location}>
        <Route path="/" element={<CanvasPage />} />
        <Route path="/states/:stateId" element={<StateScenesPage />} />
        <Route path="/meditation/:stateId/:sceneIndex" element={<MeditationPage />} />
        <Route path="/completion/:stateId" element={<CompletionPage />} />
        <Route path="/burn" element={<BurnPage />} />
        <Route path="/encounter" element={<EncounterPage />} />
        <Route path="/emotion-index" element={<EmotionIndexPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
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
