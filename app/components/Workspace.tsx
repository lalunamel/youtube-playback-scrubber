"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import YouTubePlayer, { YouTubePlayerRef } from "./YouTubePlayer";
import ControlPanel from "./ControlPanel";
import Metronome from "./Metronome";
import { ArrowLeft } from "lucide-react";

interface WorkspaceProps {
  videoId: string;
  onBack: () => void;
}

export default function Workspace({ videoId, onBack }: WorkspaceProps) {
  const playerRef = useRef<YouTubePlayerRef>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Looping State
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(10); // Default 10s loop

  const handleReady = (event: any) => {
    setDuration(event.target.getDuration());
    setIsPlaying(true); // Auto-play

    // Save to History
    try {
        const videoData = event.target.getVideoData();
        if (videoData && videoData.title) {
            const historyItem = {
                id: videoId,
                title: videoData.title,
                timestamp: Date.now()
            };

            const stored = localStorage.getItem("drum_history");
            let history = stored ? JSON.parse(stored) : [];
            
            // Remove existing entry for this ID to move it to top
            history = history.filter((h: any) => h.id !== videoId);
            
            // Add to top
            history.unshift(historyItem);
            
            // Limit to 20
            if (history.length > 20) history = history.slice(0, 20);
            
            localStorage.setItem("drum_history", JSON.stringify(history));
        }
    } catch (e) {
        console.error("Failed to save history", e);
    }
  };

  const handleStateChange = (event: any) => {
    // 1 = Playing, 2 = Paused
    setIsPlaying(event.data === 1);
  };

  const handleProgress = useCallback((time: number) => {
    setCurrentTime(time);

    // Looping Logic
    if (isLooping && time >= loopEnd) {
      playerRef.current?.seekTo(loopStart);
    }
  }, [isLooping, loopEnd, loopStart]);

  const togglePlayPause = () => {
    if (isPlaying) {
      playerRef.current?.internalPlayer?.pauseVideo();
    } else {
      playerRef.current?.internalPlayer?.playVideo();
    }
  };

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time);
    setCurrentTime(time);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT') return;

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.code === 'ArrowLeft') {
            handleSeek(currentTime - 5);
        } else if (e.code === 'ArrowRight') {
            handleSeek(currentTime + 5);
        } else if (e.code === 'KeyR') {
            // Restart loop
            if (isLooping) handleSeek(loopStart);
            else handleSeek(0);
        }
    };
    
    // We bind to window listener but must be careful with dependencies
    // To avoid stale closures we can use refs or dependency array
    // Here we need current 'isPlaying' etc. so simpler to just let it update
    // But adding/removing listener on every render is expensive? 
    // Actually React handles this fine usually, or use a ref for 'currentTime'.
    // For simplicity V1, simplistic binding:
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, isLooping, loopStart]); 


  const [videoVolume, setVideoVolume] = useState(100);

  useEffect(() => {
    playerRef.current?.setVolume(videoVolume);
  }, [videoVolume]);

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header / Nav */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur z-20 sticky top-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Change Video</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Stage: Video */}
        <div className="flex-1 bg-black relative flex items-center justify-center p-4 pb-32 md:pb-36">
           <div className="w-full max-w-5xl aspect-video shadow-2xl rounded-xl overflow-hidden bg-zinc-950 border border-zinc-900">
               <YouTubePlayer
                    ref={playerRef}
                    videoId={videoId}
                    playbackRate={playbackRate}
                    onReady={handleReady}
                    onStateChange={handleStateChange}
                    onProgress={handleProgress}
               />
           </div>
        </div>

        {/* Sidebar: Tools (Metronome, etc) */}
        <div className="w-full md:w-80 bg-zinc-900 border-l border-zinc-800 p-4 flex flex-col gap-6 z-10 overflow-y-auto pb-32">
            <h2 className="text-lg font-bold text-white">Tools</h2>
            <Metronome />
            
            <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Shortcuts</h3>
                <ul className="text-sm text-zinc-400 space-y-2">
                    <li className="flex justify-between"><span>Play / Pause</span> <kbd className="bg-zinc-800 px-1 rounded">Space</kbd></li>
                    <li className="flex justify-between"><span>Rewind 5s</span> <kbd className="bg-zinc-800 px-1 rounded">←</kbd></li>
                    <li className="flex justify-between"><span>Forward 5s</span> <kbd className="bg-zinc-800 px-1 rounded">→</kbd></li>
                    <li className="flex justify-between"><span>Restart Loop</span> <kbd className="bg-zinc-800 px-1 rounded">R</kbd></li>
                </ul>
            </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <ControlPanel 
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          duration={duration}
          currentTime={currentTime}
          onSeek={handleSeek}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onLoopStartChange={(t) => setLoopStart(Math.max(0, t))}
          onLoopEndChange={(t) => setLoopEnd(Math.min(duration, t))}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping(!isLooping)}
          playbackRate={playbackRate}
          onPlaybackRateChange={setPlaybackRate}
          videoVolume={videoVolume}
          onVideoVolumeChange={setVideoVolume}
      />
    </div>
  );
}
