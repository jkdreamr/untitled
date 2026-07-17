"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface PlayerTrack {
  id: string;
  title: string;
  artistName: string;
  artistHandle: string;
  url: string;
  peaks: number[] | null;
  duration: number | null;
  href: string;
}

interface PlayerApi {
  current: PlayerTrack | null;
  queue: PlayerTrack[];
  playing: boolean;
  time: number;
  duration: number;
  progress: number;
  isCurrent: (id: string) => boolean;
  play: (track: PlayerTrack) => void;
  playQueue: (tracks: PlayerTrack[], startId?: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekRatio: (ratio: number) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const recorded = useRef<Set<string>>(new Set());

  const queueRef = useRef(queue);
  const indexRef = useRef(index);
  queueRef.current = queue;
  indexRef.current = index;

  const current = index >= 0 ? (queue[index] ?? null) : null;
  const currentId = current?.id;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1 < queueRef.current.length ? i + 1 : i));
  }, []);

  // bind audio events once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (indexRef.current + 1 < queueRef.current.length) goNext();
      else setPlaying(false);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [goNext]);

  // load + play whenever the current track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.url;
    audio.currentTime = 0;
    setTime(0);
    setDuration(current.duration ?? 0);
    audio.play().catch(() => setPlaying(false));

    if (!recorded.current.has(current.id)) {
      recorded.current.add(current.id);
      try {
        createClient().rpc("record_engagement", { p_id: current.id, p_kind: "listen" });
      } catch {
        /* best-effort */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const play = useCallback(
    (track: PlayerTrack) => {
      if (currentId === track.id) {
        const audio = audioRef.current;
        if (audio) (audio.paused ? audio.play() : audio.pause());
        return;
      }
      setQueue([track]);
      setIndex(0);
    },
    [currentId],
  );

  const playQueue = useCallback((tracks: PlayerTrack[], startId?: string) => {
    if (tracks.length === 0) return;
    const start = startId ? Math.max(0, tracks.findIndex((t) => t.id === startId)) : 0;
    setQueue(tracks);
    setIndex(start);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const next = useCallback(() => goNext(), [goNext]);
  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const seekRatio = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const dur = audio.duration || current?.duration || 0;
      audio.currentTime = Math.max(0, Math.min(dur, ratio * dur));
    },
    [current],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setQueue([]);
    setIndex(-1);
    setPlaying(false);
    setTime(0);
  }, []);

  const isCurrent = useCallback((id: string) => currentId === id, [currentId]);

  const dur = duration || current?.duration || 0;
  const progress = dur > 0 ? Math.min(1, time / dur) : 0;

  const api = useMemo<PlayerApi>(
    () => ({
      current,
      queue,
      playing,
      time,
      duration: dur,
      progress,
      isCurrent,
      play,
      playQueue,
      toggle,
      next,
      prev,
      seekRatio,
      stop,
    }),
    [current, queue, playing, time, dur, progress, isCurrent, play, playQueue, toggle, next, prev, seekRatio, stop],
  );

  return (
    <PlayerContext.Provider value={api}>
      {children}
      {/* single global audio element — off-screen, preload none */}
      <audio ref={audioRef} preload="none" />
    </PlayerContext.Provider>
  );
}
