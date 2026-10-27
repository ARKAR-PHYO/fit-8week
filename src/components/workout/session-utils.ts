"use client";

import { useEffect, useState } from "react";

/** mm:ss, or h:mm:ss past an hour. */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Re-renders every second while `active`, so elapsed times derived from Date.now() stay current. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Keeps the screen on during a session where the browser supports it (iOS 16.4+). The lock is
 * dropped by the system when the app goes to the background, so it's re-requested on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Not allowed right now (e.g. low battery mode); the session still works.
      }
      if (cancelled) void lock?.release();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}

let audio: AudioContext | null = null;

/** Must be called from a tap first: iOS only allows sound after a user gesture. */
export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audio && Ctor) audio = new Ctor();
    void audio?.resume();
  } catch {
    audio = null;
  }
}

/** A short double beep at the end of a countdown. Silent if audio isn't available. */
export function beep() {
  if (!audio) return;
  try {
    for (const offset of [0, 0.25]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, audio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(audio.currentTime + offset);
      osc.stop(audio.currentTime + offset + 0.2);
    }
  } catch {
    // ignore
  }
}

/** Session progress survives closing the app mid-workout. Storage can be unavailable; never throw. */
export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
