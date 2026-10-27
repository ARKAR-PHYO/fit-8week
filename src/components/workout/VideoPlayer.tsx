"use client";

import { useState } from "react";
import { VIDEOS, type Video } from "@/content/workouts";
import { embedUrl } from "@/lib/training";

/** Plays a plan video inside the app; falls back to a YouTube link. Needs a connection. */
export function VideoPlayer({ id, defaultOpen = false }: { id: Video["id"]; defaultOpen?: boolean }) {
  const video = VIDEOS[id];
  const src = embedUrl(video);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-full bg-red-50 px-3 py-1.5 text-left text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {open ? "■ Hide" : "▶ Play"} Video {id} · {video.minutes} min
        </button>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-neutral-500 underline">
          Open in YouTube
        </a>
      </div>
      {open && src && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={src}
            title={video.title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
    </div>
  );
}
