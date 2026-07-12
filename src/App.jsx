import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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
  SpeakerHigh,
  SpeakerSlash,
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
  return <span className="function-seal"><span aria-hidden="true">印</span>白境-{children}</span>;
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
      <section className="canvas-intro">
        <h1>此刻，你更接近哪种状态？</h1>
        <p>不必判断得很准确，只选最接近的感受。</p>
        <FunctionSeal>状态调整</FunctionSeal>
      </section>

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
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const element = new Audio(`${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`);
    element.preload = "metadata";
    element.volume = volume;
    element.addEventListener("loadedmetadata", () => setDuration(element.duration || 0));
    element.addEventListener("timeupdate", () => setProgress(element.duration ? element.currentTime / element.duration * 100 : 0));
    element.addEventListener("ended", () => setPlaying(false));
    audioRef.current = element;
    return () => { element.pause(); element.src = ""; };
  }, [src]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  const play = () => {
    audioRef.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };
  return { playing, play, pause, muted, setMuted, progress, duration };
}

function MeditationPage() {
  const { stateId, sceneIndex } = useParams();
  const state = getState(stateId);
  const scene = state.scenes[Number(sceneIndex) || 0];
  const navigate = useNavigate();
  const { favorites, setFavorites, settings, setSettings } = useData();
  const audio = useGuidedAudio(state.audio, settings.voiceVolume);
  const favorite = favorites.includes(state.id);

  useEffect(() => {
    if (audio.progress >= 99.8) navigate(`/completion/${state.id}`);
  }, [audio.progress, navigate, state.id]);

  const toggleFavorite = () => {
    setFavorites((items) => favorite ? items.filter((id) => id !== state.id) : [...items, state.id]);
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
      <div className="player-controls">
        <button className="icon-button raised" onClick={() => audio.setMuted(!audio.muted)} aria-label={audio.muted ? "取消静音" : "静音"}>
          {audio.muted ? <SpeakerSlash size={22} /> : <SpeakerHigh size={22} />}
        </button>
        <button className="play-button" onClick={() => audio.playing ? audio.pause() : audio.play()} aria-label={audio.playing ? "暂停" : "播放"}>
          {audio.playing ? <Pause size={26} weight="fill" /> : <Play size={26} weight="fill" />}
        </button>
        <button className={`icon-button raised ${favorite ? "is-active" : ""}`} onClick={toggleFavorite} aria-label={favorite ? "取消收藏" : "收藏"}>
          <Heart size={22} weight={favorite ? "fill" : "regular"} />
        </button>
      </div>
      <button className="text-action" onClick={() => navigate(`/completion/${state.id}`)}>提前结束并记录感受</button>
    </main>
  );
}

function CompletionPage() {
  const { stateId } = useParams();
  const state = getState(stateId);
  const navigate = useNavigate();
  const { settings, setRecords } = useData();
  const [feedback, setFeedback] = useState(null);
  const options = [
    ["steadier", "稍微稳定一些"],
    ["same", "没有明显变化"],
    ["worse", "感觉更不舒服"],
  ];
  const finish = () => {
    if (settings.recordsEnabled && feedback) {
      setRecords((items) => [{ id: crypto.randomUUID(), type: "meditation", stateId, feedback, at: new Date().toISOString(), duration: 180 }, ...items]);
    }
    navigate("/");
  };
  return (
    <main className="screen completion-screen">
      <AppHeader title="完成" back />
      <div className="completion-mark"><Check size={28} /></div>
      <h1>现在，有稍微稳定一些吗？</h1>
      <p>没有标准答案，只记录此刻的变化。</p>
      <div className="feedback-options">
        {options.map(([value, label]) => (
          <button key={value} className={feedback === value ? "is-selected" : ""} onClick={() => setFeedback(value)}>
            <span>{label}</span>{feedback === value && <Check size={18} />}
          </button>
        ))}
      </div>
      {feedback && (
        <div className="next-suggestion">
          <span>接下来</span>
          <p>{feedback === "steadier" ? "可以回到首页，让这次体验停在这里。" : feedback === "same" ? "可以换一个具体场景，或先去写下并放下。" : "先停止体验、关掉声音，给自己一点没有任务的空间。"}</p>
        </div>
      )}
      <button className="primary-action" disabled={!feedback} onClick={finish}>返回白境 <ArrowRight size={21} /></button>
      <button className="text-action" onClick={() => navigate(`/states/${state.id}`)}>继续看看其他场景</button>
    </main>
  );
}

function HandwritingBurn() {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const timerRef = useRef(null);
  const burnFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext("2d"); context.scale(ratio, ratio); context.lineCap = "round"; context.lineJoin = "round";
    return () => { window.clearTimeout(timerRef.current); cancelAnimationFrame(burnFrameRef.current); };
  }, []);

  const point = (event) => { const rect = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top, pressure: event.pressure || .45 }; };
  const ignite = () => {
    const canvas = canvasRef.current; const context = canvas.getContext("2d"); const rect = canvas.getBoundingClientRect();
    const start = performance.now();
    const burn = (time) => {
      const progress = Math.min(1, (time - start) / 2300);
      context.save(); context.globalCompositeOperation = "destination-out";
      const count = 10 + Math.round(progress * 22);
      for (let i = 0; i < count; i += 1) {
        const x = (progress * rect.width) + (Math.random() - .5) * 80;
        const y = Math.random() * rect.height;
        context.beginPath(); context.arc(x, y, 3 + Math.random() * 16, 0, Math.PI * 2); context.fill();
      }
      context.restore();
      context.save(); context.globalCompositeOperation = "source-atop"; context.strokeStyle = `rgba(205,76,42,${1-progress})`; context.shadowColor = "#df6844"; context.shadowBlur = 12; context.lineWidth = 2; context.beginPath(); context.moveTo(progress * rect.width - 12, 0); context.lineTo(progress * rect.width + 8, rect.height); context.stroke(); context.restore();
      if (progress < 1) burnFrameRef.current = requestAnimationFrame(burn); else context.clearRect(0, 0, rect.width, rect.height);
    };
    burnFrameRef.current = requestAnimationFrame(burn);
  };
  const down = (event) => { drawingRef.current = true; canvasRef.current.setPointerCapture(event.pointerId); const context = canvasRef.current.getContext("2d"); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); };
  const move = (event) => { if (!drawingRef.current) return; const context = canvasRef.current.getContext("2d"); const p = point(event); context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink"); context.lineWidth = 1.5 + p.pressure * 4; context.lineTo(p.x, p.y); context.stroke(); };
  const up = () => { drawingRef.current = false; window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(ignite, 1500); };
  return <canvas ref={canvasRef} className="handwriting-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="手写区域，停止落笔后自动焚烧" />;
}

function BurnPage() {
  const [mode, setMode] = useState("type");
  const [draft, setDraft] = useState("");
  const [embers, setEmbers] = useState([]);
  const inputRef = useRef(null);
  const burnTimerRef = useRef(null);
  const composingRef = useRef(false);
  const ignite = (value = draft) => {
    const clean = value.trim();
    if (!clean) return;
    const id = crypto.randomUUID();
    setEmbers((items) => [...items, { id, text: clean }]);
    setDraft("");
    window.setTimeout(() => setEmbers((items) => items.filter((item) => item.id !== id)), 2800);
  };
  useEffect(() => () => window.clearTimeout(burnTimerRef.current), []);
  return (
    <main className="screen burn-screen">
      <div className="primary-page-mark"><FunctionSeal>阅后即焚</FunctionSeal></div>
      <div className="burn-copy">
        <h1>让它暂时离开脑海。</h1>
        <span>不会保存，也不会发送</span>
      </div>
      <div className="burn-mode-switch" role="tablist" aria-label="输入方式"><button role="tab" aria-selected={mode === "type"} onClick={() => setMode("type")}>键入</button><button role="tab" aria-selected={mode === "draw"} onClick={() => setMode("draw")}>手写</button></div>
      <div className="burn-canvas" onPointerDown={() => mode === "type" && inputRef.current?.focus()}>
        {mode === "type" ? <textarea ref={inputRef} value={draft} inputMode="text" enterKeyHint="done" onCompositionStart={() => { composingRef.current = true; window.clearTimeout(burnTimerRef.current); }} onCompositionEnd={(event) => { composingRef.current = false; const value = event.currentTarget.value; window.clearTimeout(burnTimerRef.current); burnTimerRef.current = window.setTimeout(() => ignite(value), 1500); }} onChange={(event) => { const value = event.target.value; setDraft(value); window.clearTimeout(burnTimerRef.current); if (!composingRef.current) burnTimerRef.current = window.setTimeout(() => ignite(value), 1500); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); window.clearTimeout(burnTimerRef.current); ignite(); } }} aria-label="写下想放下的内容" autoComplete="off" spellCheck="false" placeholder=" " /> : <HandwritingBurn />}
        {embers.map((ember) => <p className="burn-ember" key={ember.id}>{[...ember.text].map((char, index) => <span key={`${char}-${index}`} style={{ animationDelay: `${index * 28}ms` }}>{char}</span>)}</p>)}
      </div>
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
      <div className="primary-page-mark"><FunctionSeal>时间流转</FunctionSeal></div>
      {!settings.recordsEnabled ? (
        <div className="empty-state"><ClockCounterClockwise size={28} /><h1>时间会经过，不必留下痕迹。</h1><p>为了守护你的隐私，白境默认不记录体验。只有你主动开启后，这里才会留下片刻。</p><Link className="empty-cta" to="/settings">前往设置</Link></div>
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
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  const clearData = () => {
    if (window.confirm("清除所有记录、收藏和偏好？这个操作不能撤销。")) {
      setRecords([]); setFavorites([]);
      localStorage.clear();
      window.location.reload();
    }
  };
  return (
    <main className="screen settings-screen">
      <div className="primary-page-mark"><FunctionSeal>设置</FunctionSeal></div>
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
        {[["breathing", "呼吸提示"], ["haptics", "轻触反馈"], ["reducedEffects", "降低动效"], ["weather", "盲盒使用天气信息"], ["recordsEnabled", "保存体验记录"]].map(([key, label]) => <div className="setting-row" key={key}><div><strong>{label}</strong><span>{key === "recordsEnabled" ? "默认关闭，只记录完成信息" : key === "weather" ? "需要时再请求定位权限" : "可随时调整"}</span></div><Toggle checked={settings[key]} onChange={(value) => update(key, value)} label={label} /></div>)}
      </section>
      <section className="settings-group privacy-block"><h2>你的数据</h2><p>数据只保存在当前浏览器。清除浏览器数据、卸载 PWA 或更换设备后无法恢复。</p><button className="danger-action" onClick={clearData}><Trash size={18} />清除所有本地数据</button></section>
    </main>
  );
}

function ThemeEffect() {
  const { settings } = useData();
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle("reduce-effects", settings.reducedEffects);
  }, [settings.theme, settings.reducedEffects]);
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
  ["/burn", PencilSimple, "阅后即焚"],
  ["/", Waveform, "状态调整"],
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
          {active && <motion.span className="tab-active-surface" layoutId="active-tab" transition={{ type: "spring", stiffness: 360, damping: 34 }} />}
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
  const reduceMotion = useReducedMotion();
  return (
    <div className="mobile-prototype">
      <AmbientTexture />
      <ThemeEffect />
      <RouteFocus />
      <AnimatePresence mode="wait" initial={false}><motion.div className="route-stage" key={location.pathname} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -5 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}><Routes location={location}>
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
