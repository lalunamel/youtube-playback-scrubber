"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import ReactYouTube, { YouTubeProps } from "react-youtube";

interface YouTubePlayerProps {
  videoId: string;
  playbackRate: number;
  onReady?: (event: any) => void;
  onStateChange?: (event: any) => void;
  onProgress?: (currentTime: number) => void;
}

export interface YouTubePlayerRef {
  internalPlayer: any;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => Promise<number>;
}

const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  ({ videoId, playbackRate, onReady, onStateChange, onProgress }, ref) => {
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      internalPlayer: playerRef.current,
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      },
      setVolume: (volume: number) => {
        playerRef.current?.setVolume(volume);
      },
      getCurrentTime: async () => {
        return playerRef.current?.getCurrentTime() || 0;
      },
    }));

    const opts: YouTubeProps["opts"] = {
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        controls: 0, // Disable native controls
        disablekb: 1, // Disable native keyboard shortcuts
        fs: 0, // Disable native fullscreen button (we rely on app UI)
        // Adding origin is crucial for the IFrame API to correctly identify the source
        // and prevent some 'embed' restrictions or session conflicts.
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    };

    // Sync playback rate when prop changes
    useEffect(() => {
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(playbackRate);
      }
    }, [playbackRate]);

    const handleReady = (event: any) => {
      playerRef.current = event.target;
      playerRef.current.setPlaybackRate(playbackRate);
      if (onReady) onReady(event);
    };

    // Polling for progress updates since iframe API doesn't have a frequent timeupdate event
    useEffect(() => {
      intervalRef.current = setInterval(async () => {
        if (playerRef.current && onProgress) {
          const time = await playerRef.current.getCurrentTime();
          onProgress(time);
        }
      }, 100); // 10Hz updates

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [onProgress]);

    return (
      <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-black">
        <ReactYouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={onStateChange}
          className="w-full h-full"
          iframeClassName="w-full h-full"
        />
      </div>
    );
  }
);

YouTubePlayer.displayName = "YouTubePlayer";

export default YouTubePlayer;
