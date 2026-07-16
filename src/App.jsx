import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
import { getFeedbackAudioState, getFeedbackHapticDuration, playInteractionFeedback, playRailFeedback, resolveInteractionFeedback, unlockFeedbackAudio } from "./audioFeedback.js";
import { encounterTracks, knowledgeTopics, states } from "./data.js";
import { guidedAudioPool } from "./guidedAudio.js";
import { isIOSSafari, lockPortraitOrientation, shouldOfferIOSInstall, splashDuration } from "./pwa.js";
import { createMeditationRecord, getFeedbackLabel, getRecordScene, getRecordState, getRecordSummary, getRecordTitle } from "./records.js";
import { useLocalStorage } from "./useLocalStorage.js";

const DataContext = createContext(null);

const defaultSettings = {
  theme: "dark",
  recordsEnabled: true,
  breathing: true,
  haptics: true,
  interfaceSounds: true,
  interfaceVolume: 0.95,
  playbackVolume: 1,
  audioProfileVersion: 3,
  reducedEffects: false,
  voiceVolume: 0.72,
  ambienceVolume: 0.42,
  fullscreen: false,
  burnInputLayout: "fixed",
};

function useAppData() {
  const [records, setRecords] = useLocalStorage("weiding:records", []);
  const [storedSettings, setSettings] = useLocalStorage("weiding:settings", defaultSettings);
  const needsAudioMigration = storedSettings.audioProfileVersion !== 3;
  const audioMigration = needsAudioMigration ? {
    interfaceVolume: defaultSettings.interfaceVolume,
    playbackVolume: defaultSettings.playbackVolume,
    audioProfileVersion: 3,
  } : null;
  const settings = { ...defaultSettings, ...storedSettings, ...audioMigration };
  useEffect(() => {
    if (!needsAudioMigration) return;
    setSettings((current) => ({ ...current, ...audioMigration }));
  }, [audioMigration, needsAudioMigration, setSettings]);
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

function BrandMark({ className = "", title = "微定标志" }) {
  return (
    <svg className={`brand-mark ${className}`} viewBox="0 0 512 512" role={title ? "img" : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : "true"}>
      <circle className="brand-mark-core" cx="256" cy="256" r="146" />
      <circle className="brand-mark-outer" cx="256" cy="256" r="170" pathLength="100" />
      <circle className="brand-mark-inner" cx="256" cy="256" r="104" pathLength="100" />
      <circle className="brand-mark-node" cx="337" cy="330" r="20" />
    </svg>
  );
}

function FunctionSeal({ children }) {
  return <span className="function-seal"><span aria-hidden="true"><BrandMark title="" /></span><b>-{children}</b></span>;
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

function AppHeader({ title = "微定", back = false, onBack, onMenu }) {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      {back ? (
        <button className="icon-button" onClick={onBack ?? (() => navigate(-1))} aria-label="返回">
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
  const lastTickRef = useRef(0);
  const navigate = useNavigate();
  const { settings } = useData();
  const reduceMotion = useReducedMotion();
  const selected = states[selectedIndex];

  const playRailTick = (index) => {
    if (lastTickRef.current === index) return;
    lastTickRef.current = index;
    if (settings.haptics && typeof navigator.vibrate === "function") {
      navigator.vibrate(index === 2 ? 14 : index === 5 ? 18 : 11);
    }
    if (settings.interfaceSounds === false) return;
    playRailFeedback(index, settings.interfaceVolume);
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
              data-feedback={selectedIndex === index ? "navigate" : "selectOn"}
              onClick={() => selectedIndex === index ? navigate(`/states/${state.id}`) : setSelectedIndex(index)}
            >
              <span className="state-name-line"><span>{state.title}</span></span>
              <small aria-hidden={selectedIndex !== index}>{state.shortDescription ?? state.description}</small>
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
          style={{ "--selected-index": selectedIndex }}
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
  const { settings } = useData();
  useEffect(() => {
    guidedAudioPool.reset(state.audio, settings.playbackVolume);
  }, [settings.playbackVolume, state.audio]);
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
          <button key={scene} disabled={index > 0} className={index > 0 ? "is-unavailable" : ""} onClick={() => {
            guidedAudioPool.prime(state.audio, settings.playbackVolume);
            navigate(`/meditation/${state.id}/${index}`);
          }}>
            <span>{scene}</span>
            {index === 0 ? <ArrowRight size={19} /> : <small><LockSimple size={13} />即将上线</small>}
          </button>
        ))}
      </div>
    </main>
  );
}

function useGuidedAudio(src, volume, autoStart = false) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const audioRef = useRef(null);
  const preparingTimerRef = useRef(null);
  const slowTimerRef = useRef(null);

  const clearLoadingTimers = useCallback(() => {
    window.clearTimeout(preparingTimerRef.current);
    window.clearTimeout(slowTimerRef.current);
  }, []);

  const finishLoading = useCallback(() => {
    clearLoadingTimers();
    setLoading(false);
    setPreparing(false);
    setSlowLoading(false);
  }, [clearLoadingTimers]);

  const beginLoading = useCallback(() => {
    clearLoadingTimers();
    setLoading(true);
    setPreparing(false);
    setSlowLoading(false);
    preparingTimerRef.current = window.setTimeout(() => setPreparing(true), 300);
    slowTimerRef.current = window.setTimeout(() => setSlowLoading(true), 5000);
  }, [clearLoadingTimers]);

  useEffect(() => {
    const entry = guidedAudioPool.attach(src, volume);
    const element = entry.element;
    element.volume = volume;
    const onMetadata = () => setDuration(element.duration || 0);
    const onTime = () => setProgress(element.duration ? element.currentTime / element.duration * 100 : 0);
    const onPlaying = () => {
      setPlaying(true);
      setAutoplayBlocked(false);
      finishLoading();
    };
    const onWaiting = () => {
      setPlaying(false);
      beginLoading();
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); finishLoading(); };
    const onError = () => { setAudioError(true); finishLoading(); setPlaying(false); };
    element.addEventListener("loadedmetadata", onMetadata);
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("playing", onPlaying);
    element.addEventListener("waiting", onWaiting);
    element.addEventListener("stalled", onWaiting);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    audioRef.current = element;
    if (Number.isFinite(element.duration) && element.duration > 0) setDuration(element.duration);
    if (element.duration > 0 && element.currentTime > 0) setProgress(element.currentTime / element.duration * 100);
    if (autoStart) {
      beginLoading();
      (entry.playPromise ?? element.play()).then(() => {
        if (!element.paused && element.readyState >= 2) onPlaying();
      }).catch((error) => {
        setPlaying(false);
        finishLoading();
        if (error?.name === "NotAllowedError") {
          setAutoplayBlocked(true);
          setAudioError(false);
        } else if (error?.name !== "AbortError") {
          setAudioError(true);
        }
      });
    }
    return () => {
      clearLoadingTimers();
      element.removeEventListener("loadedmetadata", onMetadata); element.removeEventListener("timeupdate", onTime); element.removeEventListener("playing", onPlaying); element.removeEventListener("waiting", onWaiting); element.removeEventListener("stalled", onWaiting); element.removeEventListener("pause", onPause); element.removeEventListener("ended", onEnded); element.removeEventListener("error", onError);
      guidedAudioPool.detach(entry);
    };
  }, [src, autoStart, beginLoading, clearLoadingTimers, finishLoading]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const play = () => {
    setAudioError(false); setAutoplayBlocked(false); beginLoading();
    audioRef.current?.play().then(() => {
      if (!audioRef.current?.paused && audioRef.current?.readyState >= 2) {
        setPlaying(true);
        finishLoading();
      }
    }).catch((error) => {
      setPlaying(false);
      finishLoading();
      if (error?.name === "NotAllowedError") setAutoplayBlocked(true);
      else if (error?.name !== "AbortError") setAudioError(true);
    });
  };

  const pause = () => {
    audioRef.current?.pause();
    finishLoading();
    setPlaying(false);
  };
  const seekBy = (seconds) => {
    const element = audioRef.current;
    if (!element) return;
    const next = Math.max(0, Math.min(element.duration || duration || 0, element.currentTime + seconds));
    element.currentTime = next;
    setProgress(element.duration ? next / element.duration * 100 : 0);
  };
  return { playing, play, pause, progress, duration, seekBy, audioError, autoplayBlocked, loading, preparing, slowLoading };
}

function MeditationPage() {
  const { stateId, sceneIndex } = useParams();
  const state = getState(stateId);
  const navigate = useNavigate();
  const { settings } = useData();
  const audio = useGuidedAudio(state.audio, settings.playbackVolume, true);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controlActivity, setControlActivity] = useState(0);
  const hideControlsRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const controlLayoutTransition = reduceMotion ? { duration: 0.01 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] };
  const affirmationLines = state.affirmations?.length ? state.affirmations : [state.affirmation];
  const affirmationIndex = Math.min(affirmationLines.length - 1, Math.floor((audio.progress / 100) * affirmationLines.length));
  const playbackHint = audio.autoplayBlocked
    ? "轻触开始"
    : audio.slowLoading
      ? "连接比平时久一些"
      : audio.preparing
        ? "正在准备声音"
        : `轻触${audio.playing ? "暂停" : "继续"}`;

  const goToCompletion = useCallback((finished = false) => {
    const listenedDuration = finished
      ? audio.duration
      : audio.duration * Math.min(1, Math.max(0, audio.progress / 100));
    navigate(`/completion/${state.id}`, {
      state: {
        sceneIndex: Number(sceneIndex) || 0,
        duration: Math.max(1, Math.round(listenedDuration || 1)),
      },
    });
  }, [audio.duration, audio.progress, navigate, sceneIndex, state.id]);

  useEffect(() => {
    if (audio.progress >= 99.8) goToCompletion(true);
  }, [audio.progress, goToCompletion]);

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

  const closeControlsBeforePageAction = (event) => {
    if (!controlsOpen) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".immersive-controls,.control-reveal")) return;
    event.preventDefault();
    event.stopPropagation();
    setControlsOpen(false);
  };

  return (
    <main className={`screen meditation-screen ${controlsOpen ? "controls-open" : ""}`} onClickCapture={closeControlsBeforePageAction}>
      <AppHeader title="闭眼冥想室" back />
      <div className="meditation-meta">
        <span>{state.title}</span>
        <span>{Math.max(1, Math.ceil((audio.duration * (1 - audio.progress / 100)) / 60))} 分钟</span>
      </div>
      <button className="affirmation-stage" disabled={audio.loading && !audio.slowLoading} aria-busy={audio.loading} onClick={() => audio.playing ? audio.pause() : audio.play()} aria-label={audio.loading ? "音频正在准备" : audio.playing ? "暂停引导" : "播放引导"}>
        <span className="affirmation-visual">
          <span className={`breath-orb ${audio.playing && settings.breathing ? "is-breathing" : ""}`} aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={`${state.id}-${affirmationIndex}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 3, transition: { duration: 1.2, ease: [0.4, 0, 0.7, 0.2] } }}
              transition={reduceMotion
                ? { duration: 0.12 }
                : { opacity: { duration: 1.65, delay: 0.38, ease: [0.22, 1, 0.36, 1] }, y: { duration: 1.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              aria-live="polite"
            >{affirmationLines[affirmationIndex]}</motion.p>
          </AnimatePresence>
        </span>
      </button>
      <div className="immersive-control-area">
        {(audio.audioError || audio.slowLoading) && <div className="audio-recovery" role="alert"><span>{audio.audioError ? "声音暂时没有加载出来。" : "网络似乎有些慢。"}</span><span className="audio-recovery-actions"><button onClick={audio.play}>重新尝试</button><button onClick={() => navigate(-1)}>返回</button></span></div>}
        <motion.div className="playback-status" layout transition={controlLayoutTransition}>
          <span className="tap-hint" aria-live="polite">{playbackHint}</span>
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
              <button className="end-session-action" data-feedback="confirm" onClick={() => goToCompletion(false)}>提前结束本次体验</button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button layout transition={controlLayoutTransition} className={`control-reveal ${controlsOpen ? "is-open" : ""}`} data-feedback={controlsOpen ? "dismiss" : "selectOn"} onClick={() => setControlsOpen((open) => !open)} aria-label={controlsOpen ? "收起播放控制" : "显示播放控制"} aria-expanded={controlsOpen}>
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
  const location = useLocation();
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
    try { localStorage.setItem("weiding:install-eligible", "1"); } catch {}
    if (settings.recordsEnabled && !recordedRef.current) {
      recordedRef.current = true;
      setRecords((items) => [createMeditationRecord({
        id: createId(),
        stateId,
        sceneIndex: location.state?.sceneIndex ?? 0,
        feedback: value,
        duration: location.state?.duration ?? 0,
      }), ...items]);
    }
  };
  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => navigate("/records"), 1500);
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
            <span>正在前往时间流转</span>
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

function useAmbientDetails(track, playing, reducedEffects) {
  useEffect(() => {
    if (!playing || track?.category !== "nature" || reducedEffects || document.documentElement.classList.contains("low-power")) return undefined;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return undefined;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = .032;
    master.connect(context.destination);
    let timer;
    let stopped = false;
    const profiles = {
      rain: { min: 900, max: 2400, duration: [.08, .2], filter: "highpass", frequency: 2100, level: .12 },
      thunder: { min: 6500, max: 12500, duration: [1.5, 2.8], filter: "lowpass", frequency: 260, level: .055 },
      fire: { min: 520, max: 1700, duration: [.045, .13], filter: "highpass", frequency: 1450, level: .18 },
      waves: { min: 2900, max: 5200, duration: [1.7, 2.8], filter: "lowpass", frequency: 560, level: .052 },
      water: { min: 1100, max: 2600, duration: [.12, .32], filter: "bandpass", frequency: 1650, level: .1 },
      wind: { min: 3400, max: 6800, duration: [1.4, 2.5], filter: "lowpass", frequency: 760, level: .045 },
    };
    const profile = profiles[track.detail] ?? profiles.wind;
    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const makeDetail = () => {
      if (stopped || context.state === "closed") return;
      const duration = randomBetween(...profile.duration);
      const frameCount = Math.max(1, Math.round(context.sampleRate * duration));
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const channel = buffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < channel.length; index += 1) {
        const white = Math.random() * 2 - 1;
        previous = previous * .72 + white * .28;
        const envelope = Math.sin(Math.PI * index / channel.length);
        channel[index] = (profile.filter === "lowpass" ? previous : white) * envelope;
      }
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      filter.type = profile.filter;
      filter.frequency.value = profile.frequency * randomBetween(.82, 1.18);
      if (profile.filter === "bandpass") filter.Q.value = .72;
      const now = context.currentTime;
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(profile.level * randomBetween(.62, 1), now + Math.min(.08, duration * .28));
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(master);
      source.start(now); source.stop(now + duration + .02);
      timer = window.setTimeout(makeDetail, randomBetween(profile.min, profile.max));
    };
    context.resume().then(() => { timer = window.setTimeout(makeDetail, randomBetween(650, 1600)); }).catch(() => {});
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      master.disconnect();
      context.close().catch(() => {});
    };
  }, [playing, reducedEffects, track?.category, track?.detail, track?.id]);
}

let primedEncounterAudio = null;

function createEncounterAudio(track, playbackVolume = 1) {
  const audio = new Audio(track.src);
  audio.preload = "metadata";
  audio.loop = Boolean(track.loop);
  audio.volume = Math.min(1, Math.max(0, playbackVolume * (track.category === "nature" ? .96 : 1)));
  return audio;
}

function primeEncounterAudio(track, playbackVolume) {
  if (primedEncounterAudio?.audio) {
    if (primedEncounterAudio.cleanupTimer) window.clearTimeout(primedEncounterAudio.cleanupTimer);
    primedEncounterAudio.audio.pause();
    primedEncounterAudio.audio.removeAttribute("src");
    primedEncounterAudio.audio.load();
  }
  const audio = createEncounterAudio(track, playbackVolume);
  const playPromise = audio.play();
  primedEncounterAudio = { trackId: track.id, audio, playPromise, cleanupTimer: null };
  playPromise.catch(() => {});
}

function useEncounterAudio(track, playbackVolume) {
  const audioRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!track) return undefined;
    const primed = primedEncounterAudio?.trackId === track.id ? primedEncounterAudio : null;
    const audio = primed?.audio ?? createEncounterAudio(track, playbackVolume);
    audio.volume = Math.min(1, Math.max(0, playbackVolume * (track.category === "nature" ? .96 : 1)));
    if (primed?.cleanupTimer) {
      window.clearTimeout(primed.cleanupTimer);
      primed.cleanupTimer = null;
    }
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
    setElapsed(0); setFailed(false); setPlaying(false); setLoading(Boolean(primed));
    if (primed) {
      loadTimeoutRef.current = window.setTimeout(() => {
        audio.pause();
        setPlaying(false);
        setLoading(false);
        setFailed(true);
        loadTimeoutRef.current = null;
      }, 9000);
      primed.playPromise.then(() => {
        clearLoadTimeout();
        if (primedEncounterAudio?.audio === audio) primedEncounterAudio = null;
        setPlaying(true);
        setLoading(false);
      }).catch((error) => {
        clearLoadTimeout();
        if (primedEncounterAudio?.audio === audio) primedEncounterAudio = null;
        setPlaying(false);
        setLoading(false);
        if (error?.name !== "NotAllowedError") setFailed(true);
      });
    }
    return () => {
      clearLoadTimeout();
      audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnded); audio.removeEventListener("error", onError);
      const releaseAudio = () => {
        audio.pause(); audio.removeAttribute("src"); audio.load();
      };
      // React StrictMode mounts effects twice in development. Keep a just-primed
      // audio instance alive for one task so the second mount can adopt it and
      // the original user gesture is not lost.
      if (primedEncounterAudio?.audio === audio) {
        primedEncounterAudio.cleanupTimer = window.setTimeout(() => {
          if (primedEncounterAudio?.audio === audio) primedEncounterAudio = null;
          releaseAudio();
        }, 0);
      } else {
        releaseAudio();
      }
    };
  }, [playbackVolume, track]);
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
  const audio = useEncounterAudio(track, settings.playbackVolume);
  useAmbientDetails(track, audio.playing, settings.reducedEffects);
  const choose = (category, excludeId) => {
    const pool = encounterTracks.filter((item) => item.category === category && item.id !== excludeId);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? encounterTracks.find((item) => item.category === category);
    primeEncounterAudio(next, settings.playbackVolume);
    setTrack(next);
  };
  const leave = () => {
    if (settings.recordsEnabled && track) setRecords((items) => [{ id: createId(), type: "encounter", at: new Date().toISOString(), duration: Math.round(audio.elapsed), completed: false }, ...items]);
    navigate("/");
  };
  return (
    <main className="screen encounter-screen">
      <AppHeader title="声音盲盒" back onBack={track ? () => setTrack(null) : undefined} />
      {!track ? (
        <section className="encounter-choice">
          <FunctionSeal>声音盲盒</FunctionSeal>
          <h1>这一次，<br />想遇见哪一种声音？</h1>
          <p>选择一种类型。自然声来自精选实录，每次播放还会有一点不重复的细节。</p>
          <div className="encounter-doors">
            <button data-feedback="confirm" onClick={() => choose("nature")}><Waveform size={24} /><span><strong>自然声</strong><small>细雨、篝火、海浪与林间声音</small></span><CaretRight size={18} /></button>
            <button data-feedback="confirm" onClick={() => choose("music")}><MusicNotes size={24} /><span><strong>纯音乐</strong><small>没有人声，让旋律慢慢经过</small></span><CaretRight size={18} /></button>
          </div>
        </section>
      ) : (
        <>
          <div className="encounter-stage">
            <span>{track.category === "nature" ? "自然声" : "纯音乐"} · 随机遇见</span>
            <h1>{track.title}</h1>
            <p>{track.note}</p>
            <div className={`sound-rings ${audio.playing ? "is-playing" : ""}`} aria-hidden="true"><span /><span /><span /></div>
          </div>
          <button className="play-button encounter-play" disabled={audio.loading} onClick={audio.toggle} aria-label={audio.loading ? "正在连接音源" : audio.playing ? "暂停" : "播放"}>{audio.playing ? <Pause size={28} weight="fill" /> : <Play size={28} weight="fill" />}</button>
          {audio.failed && <div className="encounter-error" role="alert"><span>这个声音暂时没有准备好。</span><button onClick={() => choose(track.category, track.id)}>换一个声音</button></div>}
          <button className="text-action" data-feedback="dismiss" onClick={leave}>结束并回到主页</button>
        </>
      )}
    </main>
  );
}

const knowledgeEntries = knowledgeTopics.flatMap((topic) => topic.items.map((item) => ({ ...item, group: topic.group })));

const evidenceTypes = {
  "Level A+": { label: "权威综合证据", detail: "来自权威指南、伞状综述或个体数据荟萃分析。" },
  "Level A": { label: "综合研究", detail: "主要依据荟萃分析或对多项荟萃分析的综合回顾。" },
  "Level B": { label: "系统综述", detail: "主要依据系统综述或高质量叙述性综述。" },
  "Level C": { label: "实验研究", detail: "主要依据随机对照研究或其他实验研究。" },
  "Level D": { label: "观察研究", detail: "主要依据观察性研究、测量研究或机制研究。" },
  "Level E": { label: "理论基础", detail: "主要依据奠基性理论、概念论文或专业著作。" },
  "Public Resource": { label: "公共专业资料", detail: "主要依据公共卫生机构或专业组织发布的资料。" },
};

function getEvidenceType(level) {
  return evidenceTypes[level] ?? { label: "研究资料", detail: "依据项目文献库中对应主题的研究资料整理。" };
}

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
          <span className="knowledge-evidence">{getEvidenceType(item.evidence).label}</span>
          <CaretRight size={18} />
        </Link>
      ))}</div></section>)}
    </main>
  );
}

function PsychologyArticlePage() {
  const { articleId } = useParams();
  const item = knowledgeEntries.find((entry) => entry.id === articleId) ?? knowledgeEntries[0];
  const { settings } = useData();
  const prefersReducedMotion = useReducedMotion();
  const [readingMode, setReadingMode] = useState("quick");
  const evidence = getEvidenceType(item.evidence);
  const reduceReadingMotion = prefersReducedMotion || settings.reducedEffects;
  useEffect(() => setReadingMode("quick"), [item.id]);
  const moveReadingTab = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const nextMode = readingMode === "quick" ? "deep" : "quick";
    setReadingMode(nextMode);
    window.requestAnimationFrame(() => document.getElementById(`reading-${nextMode}-tab`)?.focus());
  };
  return (
    <main className="screen psychology-article-screen">
      <AppHeader title={item.term} back />
      <article className="psychology-article">
        <header>
          <span>{item.group} · {evidence.label}</span>
          <h1>{item.term}</h1>
          <p>{item.summary}</p>
        </header>
        <div className="article-reading-switch" role="tablist" aria-label="阅读深度">
          <button type="button" role="tab" id="reading-quick-tab" aria-selected={readingMode === "quick"} aria-controls="reading-quick-panel" tabIndex={readingMode === "quick" ? 0 : -1} onKeyDown={moveReadingTab} onClick={() => setReadingMode("quick")}>
            <strong>30秒理解</strong><span>先抓住核心</span>
          </button>
          <button type="button" role="tab" id="reading-deep-tab" aria-selected={readingMode === "deep"} aria-controls="reading-deep-panel" tabIndex={readingMode === "deep" ? 0 : -1} onKeyDown={moveReadingTab} onClick={() => setReadingMode("deep")}>
            <strong>深入阅读</strong><span>机制与证据</span>
          </button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="article-reading-layer"
            key={readingMode}
            id={`reading-${readingMode}-panel`}
            role="tabpanel"
            aria-labelledby={`reading-${readingMode}-tab`}
            initial={reduceReadingMotion ? false : { opacity: 0, y: 7, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceReadingMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: "blur(2px)" }}
            transition={{ duration: reduceReadingMotion ? .08 : .24, ease: [0.22, 1, 0.36, 1] }}
          >
            {readingMode === "quick" ? (
              <>
                <section><h2>日常中可能怎样出现</h2><ul>{item.signs?.map((sign) => <li key={sign}>{sign}</li>)}</ul></section>
                <section className="article-practice"><h2>可以先怎样观察</h2><p>{item.practice}</p></section>
                <aside><strong>别急着这样理解</strong><p>{item.myth}</p></aside>
                <p className="reading-layer-note">这里提供的是理解线索，不是对你个人情况的判断。</p>
              </>
            ) : (
              <>
                <section><h2>它如何发生</h2><p>{item.mechanism}</p></section>
                <section><h2>需要保留的边界</h2><p>{item.boundary}</p></section>
                <section className="evidence-explainer" aria-labelledby="evidence-heading">
                  <h2 id="evidence-heading">这篇内容依据什么</h2>
                  <div><span>{item.evidence}</span><strong>{evidence.label}</strong></div>
                  <p>{evidence.detail}</p>
                  <small>等级描述的是资料类型，不代表它能直接判断某个人，也不等同于治疗效果等级。</small>
                </section>
                <footer>
                  <span>主要参考</span>
                  <cite>{item.source}</cite>
                  <p>内容沿用项目文献库整理，仅用于心理教育，不构成医学或心理诊断。</p>
                </footer>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </article>
    </main>
  );
}

function formatRecordTime(at, includeYear = false) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", {
    ...(includeYear ? { year: "numeric" } : {}),
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRecordDuration(duration) {
  const seconds = Math.max(0, Math.round(Number(duration) || 0));
  if (!seconds) return "未记录";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes} 分 ${remainder.toString().padStart(2, "0")} 秒` : `${remainder} 秒`;
}

function RecordsPage() {
  const { records, setRecords, settings } = useData();
  const removeRecord = (record) => {
    if (!window.confirm(`删除“${getRecordTitle(record)}”？这个操作不能撤销。`)) return;
    setRecords((items) => items.filter((item) => item.id !== record.id));
  };
  return (
    <main className="screen library-screen records-screen">
      <TopLevelIntro title={["时间会经过，", "不必留下痕迹。"]} subtitle="完成后的片刻，只保存在当前设备。" section="时间流转" />
      {!settings.recordsEnabled ? (
        <div className="records-privacy-note"><ClockCounterClockwise size={25} /><p>记录已关闭。<br />你可以随时在设置中重新开启。</p></div>
      ) : records.length === 0 ? (
        <div className="empty-state"><ClockCounterClockwise size={28} /><h1>还没有记录</h1><p>完成一次状态调整后，这里会留下时间与反馈。阅后即焚中的内容始终不会进入记录。</p></div>
      ) : (
        <div className="record-list">{records.map((record) => (
          <article key={record.id}>
            <Link className="record-list-content" to={`/records/${record.id}`}>
              <strong>{getRecordTitle(record)}</strong>
              <p>{getRecordSummary(record)}</p>
              <span>{formatRecordTime(record.at)}</span>
            </Link>
            <div className="record-row-actions">
              <Link to={`/records/${record.id}`} state={{ editing: true }} aria-label={`编辑${getRecordTitle(record)}`}><PencilSimple size={18} /></Link>
              <button onClick={() => removeRecord(record)} aria-label={`删除${getRecordTitle(record)}`}><Trash size={18} /></button>
            </div>
          </article>
        ))}</div>
      )}
    </main>
  );
}

function RecordDetailPage() {
  const { recordId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { records, setRecords } = useData();
  const record = records.find((item) => item.id === recordId);
  const [editing, setEditing] = useState(Boolean(location.state?.editing));
  const [draft, setDraft] = useState(record?.note ?? "");

  useEffect(() => {
    setDraft(record?.note ?? "");
  }, [record?.id, record?.note]);

  if (!record) return <Navigate to="/records" replace />;
  const state = record.type === "meditation" ? getRecordState(record) : null;
  const saveNote = () => {
    setRecords((items) => items.map((item) => item.id === record.id ? { ...item, note: draft.trim() } : item));
    setEditing(false);
  };
  const removeRecord = () => {
    if (!window.confirm("删除这次记录？这个操作不能撤销。")) return;
    setRecords((items) => items.filter((item) => item.id !== record.id));
    navigate("/records", { replace: true });
  };

  return (
    <main className="screen record-detail-screen">
      <AppHeader title="一次记录" back />
      <article className="record-detail">
        <header>
          <span>{formatRecordTime(record.at, true)}</span>
          <h1>{getRecordTitle(record)}</h1>
          <p>{state ? `${state.title} · ${getFeedbackLabel(record.feedback)}` : "声音盲盒"}</p>
        </header>
        <section className="record-note-section">
          <div><h2>写给这一次</h2>{!editing && <button onClick={() => setEditing(true)}><PencilSimple size={16} />编辑</button>}</div>
          {editing ? (
            <>
              <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="写下你想为这次体验留下的话……" aria-label="记录文字" />
              <div className="record-edit-actions"><button onClick={() => { setDraft(record.note ?? ""); setEditing(false); }}>取消</button><button className="is-primary" onClick={saveNote}><Check size={16} />保存</button></div>
            </>
          ) : <p className={!record.note?.trim() ? "is-default" : ""}>{getRecordSummary(record)}</p>}
        </section>
        <dl className="record-facts">
          {state && <><div><dt>状态</dt><dd>{state.title}<small>{state.term}</small></dd></div><div><dt>当时的处境</dt><dd>{getRecordScene(record)}</dd></div></>}
          <div><dt>完成反馈</dt><dd>{getFeedbackLabel(record.feedback)}</dd></div>
          <div><dt>体验时长</dt><dd>{formatRecordDuration(record.duration)}</dd></div>
        </dl>
        <button className="record-delete-action" onClick={removeRecord}><Trash size={17} />删除这次记录</button>
      </article>
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
  const [soundTestStatus, setSoundTestStatus] = useState("");
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  const testInterfaceSound = async () => {
    setSoundTestStatus("正在检查声音……");
    try {
      const unlocked = await unlockFeedbackAudio();
      const played = unlocked && await playInteractionFeedback("confirm", settings.interfaceVolume);
      setSoundTestStatus(played ? "试听音已播放" : `声音尚未解锁（${getFeedbackAudioState()}）`);
    } catch {
      setSoundTestStatus("当前浏览器暂未提供提示音");
    }
    window.setTimeout(() => setSoundTestStatus(""), 2600);
  };
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
          {[["system", "跟随系统", GearSix], ["light", "浅色", Sun], ["dark", "深色", Moon]].map(([value, label, Icon]) => <button key={value} data-feedback="selectOn" className={settings.theme === value ? "is-selected" : ""} onClick={() => update("theme", value)}><Icon size={17} />{label}</button>)}
        </div>
        <div className="setting-row"><div><strong>全屏模式</strong><span>隐藏浏览器界面，更专注地体验</span></div><Toggle checked={fullscreenActive} onChange={toggleFullscreen} label="全屏模式" /></div>
        <div className="setting-row"><div><strong>降低动效</strong><span>减少动态细节与视觉变化</span></div><Toggle checked={settings.reducedEffects} onChange={(value) => update("reducedEffects", value)} label="降低动效" /></div>
      </section>
      <section className="settings-group">
        <h2>声音与反馈</h2>
        <div className="volume-setting">
          <div><strong>播放音量</strong><span>冥想人声、自然声与纯音乐</span></div>
          <div className="volume-control"><input type="range" min="0.45" max="1" step="0.05" value={settings.playbackVolume} onChange={(event) => update("playbackVolume", Number(event.target.value))} aria-label="播放音量" /><output>{Math.round(settings.playbackVolume * 100)}%</output></div>
        </div>
        <div className="volume-setting">
          <div><strong>提示音量</strong><span>按钮与状态滑杆的轻触声音</span></div>
          <div className="volume-control"><input type="range" min="0.35" max="1" step="0.05" value={settings.interfaceVolume} onChange={(event) => update("interfaceVolume", Number(event.target.value))} aria-label="提示音量" /><output>{Math.round(settings.interfaceVolume * 100)}%</output></div>
        </div>
        <div className="sound-test-row"><button type="button" data-feedback="none" onClick={testInterfaceSound}>试听提示音</button><span role="status" aria-live="polite">{soundTestStatus}</span></div>
        {[
          ["interfaceSounds", "界面音效", "状态滑杆与必要的操作提示音"],
          ["haptics", "触感反馈", typeof navigator.vibrate === "function" ? "滑动与点击时使用手机振动" : "当前设备使用声音与视觉反馈"],
          ["breathing", "呼吸提示", "播放时显示缓慢呼吸变化"],
        ].map(([key, label, description]) => <div className="setting-row" key={key}><div><strong>{label}</strong><span>{description}</span></div><Toggle checked={settings[key] ?? (key === "interfaceSounds")} onChange={(value) => update(key, value)} label={label} /></div>)}
      </section>
      <section className="settings-group">
        <h2>书写</h2>
        <div className="setting-choice-row">
          <div><strong>键入位置</strong><span>阅后即焚中的文字起点</span></div>
          <div className="segmented-control compact" aria-label="阅后即焚键入位置">
            {[["fixed", "固定区域"], ["free", "自由落字"]].map(([value, label]) => {
              const selected = (settings.burnInputLayout ?? "fixed") === value;
              return <button key={value} data-feedback="selectOn" aria-pressed={selected} className={selected ? "is-selected" : ""} onClick={() => update("burnInputLayout", value)}>{selected && <Check size={14} weight="bold" />}{label}</button>;
            })}
          </div>
        </div>
      </section>
      <section className="settings-group privacy-block">
        <h2>记录与隐私</h2>
        <div className="setting-row"><div><strong>保存体验记录</strong><span>新用户默认开启，可随时关闭</span></div><Toggle checked={settings.recordsEnabled} onChange={(value) => update("recordsEnabled", value)} label="保存体验记录" /></div>
        <p>数据只保存在当前浏览器。清除浏览器数据、卸载 PWA 或更换设备后无法恢复。</p>
        <button className="danger-action" onClick={clearData}><Trash size={18} />清除所有本地数据</button>
      </section>
      {isIOSSafari() && !navigator.standalone && (
        <section className="settings-group install-setting">
          <h2>桌面使用</h2>
          <button className="install-setting-action" onClick={() => window.dispatchEvent(new CustomEvent("weiding:show-install-guide"))}>
            <span><strong>添加到主屏幕</strong><small>像普通 App 一样从桌面打开微定</small></span>
            <CaretRight size={17} />
          </button>
        </section>
      )}
    </main>
  );
}

function BrandSplash() {
  const [visible, setVisible] = useState(() => {
    try { return sessionStorage.getItem("weiding:splash-seen") !== "1"; } catch { return true; }
  });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!visible) return undefined;
    try { sessionStorage.setItem("weiding:splash-seen", "1"); } catch {}
    const timer = window.setTimeout(() => setVisible(false), splashDuration(Boolean(reduced)));
    return () => window.clearTimeout(timer);
  }, [reduced, visible]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className={`brand-splash ${reduced ? "is-reduced" : ""}`} role="status" aria-label="微定正在打开" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? .15 : .24 }}>
          <div className="brand-splash-lockup">
            <BrandMark className="brand-splash-mark" title="" />
            <div className="brand-splash-wordmark">微定</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IOSInstallCoachmark() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const evaluate = () => {
      let eligible = false;
      let dismissedAt = 0;
      try {
        eligible = localStorage.getItem("weiding:install-eligible") === "1";
        dismissedAt = Number(localStorage.getItem("weiding:install-dismissed-at") || 0);
      } catch {}
      if (location.pathname === "/" && shouldOfferIOSInstall({ eligible, dismissedAt })) setOpen(true);
    };
    const forceOpen = () => { if (isIOSSafari() && !navigator.standalone) { setExpanded(true); setOpen(true); } };
    evaluate();
    window.addEventListener("weiding:show-install-guide", forceOpen);
    return () => window.removeEventListener("weiding:show-install-guide", forceOpen);
  }, [location.pathname]);
  const dismiss = () => {
    try { localStorage.setItem("weiding:install-dismissed-at", String(Date.now())); } catch {}
    setOpen(false);
    setExpanded(false);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.aside className={`install-coachmark ${expanded ? "is-expanded" : ""}`} aria-label="添加微定到主屏幕" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .24, ease: [0.22, 1, 0.36, 1] }}>
          <button className="install-dismiss" onClick={dismiss} aria-label="暂不添加"><X size={17} /></button>
          <BrandMark className="install-brand-mark" title="" />
          <div className="install-coachmark-copy">
            <strong>如果愿意，可以把微定留在桌面。</strong>
            {!expanded ? <button onClick={() => setExpanded(true)}>查看方法</button> : (
              <ol>
                <li><span>1</span>轻触 Safari 的“分享”按钮</li>
                <li><span>2</span>选择“添加到主屏幕”</li>
                <li><span>3</span>开启“作为网页 App 打开”并添加</li>
              </ol>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
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
    const lockPortrait = () => {
      if (document.visibilityState === "hidden") return;
      lockPortraitOrientation();
    };
    const lockPortraitWhenVisible = () => { if (document.visibilityState === "visible") lockPortrait(); };
    updateViewport();
    lockPortrait();
    window.visualViewport?.addEventListener("resize", updateViewport, { passive: true });
    window.visualViewport?.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("orientationchange", updateViewport, { passive: true });
    window.addEventListener("pageshow", lockPortrait);
    document.addEventListener("visibilitychange", lockPortraitWhenVisible);
    document.addEventListener("pointerdown", lockPortrait, { once: true, passive: true });
    document.addEventListener("focusin", updateViewport);
    document.addEventListener("focusout", updateViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport); window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("orientationchange", updateViewport); window.removeEventListener("pageshow", lockPortrait);
      document.removeEventListener("visibilitychange", lockPortraitWhenVisible); document.removeEventListener("pointerdown", lockPortrait);
      document.removeEventListener("focusin", updateViewport); document.removeEventListener("focusout", updateViewport);
      root.classList.remove("keyboard-open", "low-power"); root.style.removeProperty("--visual-viewport-height");
    };
  }, []);
  return null;
}

function ThemeEffect() {
  const { settings } = useData();
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
    if (settings.interfaceSounds === false) return undefined;
    const unlock = () => { unlockFeedbackAudio(); };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("touchend", unlock, true);
    document.addEventListener("keydown", unlock, true);
    window.addEventListener("pageshow", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("touchend", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      window.removeEventListener("pageshow", unlock);
    };
  }, [settings.interfaceSounds]);

  useEffect(() => {
    const feedback = (event) => {
      if (!settings.haptics && settings.interfaceSounds === false) return;
      const target = event.target instanceof Element ? event.target.closest("button, a, [role='option'], [role='tab'], [role='switch']") : null;
      if (!target || target.matches(":disabled, [aria-disabled='true']") || target.closest("[data-feedback='none']")) return;
      const now = Date.now();
      if (now - lastFeedbackRef.current < 70) return;
      lastFeedbackRef.current = now;
      const kind = resolveInteractionFeedback({
        explicit: target.dataset.feedback,
        disabled: target.matches(":disabled, [aria-disabled='true']"),
        role: target.getAttribute("role") || "",
        ariaLabel: target.getAttribute("aria-label") || "",
        text: target.textContent || "",
        className: typeof target.className === "string" ? target.className : "",
        href: target.getAttribute("href") || "",
        checked: target.getAttribute("aria-checked") === "true" || target.getAttribute("aria-selected") === "true",
      });
      if (!kind) return;
      const duration = getFeedbackHapticDuration(kind);
      if (settings.haptics) navigator.vibrate?.(duration);
      if (settings.interfaceSounds === false) return;
      playInteractionFeedback(kind, settings.interfaceVolume);
    };
    document.addEventListener("click", feedback, true);
    return () => document.removeEventListener("click", feedback, true);
  }, [settings.haptics, settings.interfaceSounds, settings.interfaceVolume]);
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
        <Route path="/records/:recordId" element={<RecordDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes></motion.div></AnimatePresence>
      <IOSInstallCoachmark />
      <PersistentTabBar />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <DataProvider><AppRoutes /><BrandSplash /></DataProvider>
    </HashRouter>
  );
}
