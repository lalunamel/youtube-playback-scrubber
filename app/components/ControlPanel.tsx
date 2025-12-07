"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Repeat, RotateCcw, FastForward } from "lucide-react";

interface ControlPanelProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  loopStart: number;
  loopEnd: number;
  onLoopStartChange: (time: number) => void;
  onLoopEndChange: (time: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  videoVolume: number;
  onVideoVolumeChange: (volume: number) => void;
}

export default function ControlPanel({
  isPlaying,
  onPlayPause,
  duration,
  currentTime,
  onSeek,
  loopStart,
  loopEnd,
  onLoopStartChange,
  onLoopEndChange,
  isLooping,
  onToggleLoop,
  playbackRate,
  onPlaybackRateChange,
  videoVolume,
  onVideoVolumeChange,
}: ControlPanelProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Drag state
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const getPercent = (time: number) => (duration > 0 ? (time / duration) * 100 : 0);

  // Global mouse handlers for dragging
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
        if (!timelineRef.current || duration <= 0) return;
        
        const rect = timelineRef.current.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = (offsetX / rect.width) * duration;

        if (dragging === "start") {
            const safeTime = Math.min(newTime, loopEnd - 0.5); // Min 0.5s gap
            onLoopStartChange(Math.max(0, safeTime));
        } else if (dragging === "end") {
            const safeTime = Math.max(newTime, loopStart + 0.5);
            onLoopEndChange(Math.min(duration, safeTime));
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, duration, loopEnd, loopStart, onLoopStartChange, onLoopEndChange]);


  const handleHandleMouseDown = (e: React.MouseEvent, type: "start" | "end") => {
      e.stopPropagation(); // Prevent seek input from catching this
      e.preventDefault();
      setDragging(type);
  };


  return (
    <div className="w-full bg-zinc-900 border-t border-zinc-800 p-4 md:p-6 pb-8 md:pb-10 fixed bottom-0 left-0 z-50 glass-panel">
      <div className="container mx-auto max-w-5xl flex flex-col gap-6">
        
        {/* Timeline / Scrubber */}
        <div 
            ref={timelineRef}
            className="relative w-full h-16 flex items-center group select-none"
        >
           {/* Background Track */}
           <div className="absolute w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                {/* Loop Region Highlight */}
                {isLooping && (
                  <div 
                    className="absolute h-full bg-blue-900/40 border-l border-r border-blue-500/50"
                    style={{ 
                        left: `${getPercent(loopStart)}%`, 
                        width: `${getPercent(loopEnd - loopStart)}%` 
                    }}
                  />
                )}
                {/* Play Progress */}
                <div 
                    className="absolute h-full bg-blue-600 rounded-l-full"
                    style={{ width: `${getPercent(currentTime)}%` }}
                />
           </div>

           {/* Seek Input (z-10: Below handles, above background) */}
           <input
             type="range"
             min={0}
             max={duration || 100}
             value={currentTime}
             onChange={(e) => onSeek(Number(e.target.value))}
             className="absolute w-full h-full opacity-0 cursor-pointer z-10"
           />
           
           {/* Playhead (Professional Line Scrubber) - z-[15] */}
           <div 
               className="absolute top-0 h-full pointer-events-none z-[15] flex flex-col items-center"
               style={{ 
                   left: `${getPercent(currentTime)}%`,
                   transform: 'translateX(-50%)' 
               }}
           >
                {/* The Knob */}
                <div className="absolute -top-1.5 w-4 h-4 bg-blue-500 rounded-full shadow-md ring-2 ring-white transition-transform scale-100" />
                
                {/* The Line */}
                <div className="w-0.5 h-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
           </div>

           {/* Interactive Loop Handles (z-20: Above seek input) */}
           {isLooping && (
             <>
               {/* Loop Start Handle */}
               <div 
                 onMouseDown={(e) => handleHandleMouseDown(e, "start")}
                 className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-500/80 hover:bg-blue-400 border-2 border-white/80 rounded-md z-20 cursor-ew-resize shadow-lg flex items-center justify-center group/handle transition-colors backdrop-blur-sm"
                 style={{ left: `${getPercent(loopStart)}%`, transform: 'translate(-50%, -50%)' }}
               >
                   <div className="w-0.5 h-3 bg-black/20" />
               </div>
               
               {/* Loop End Handle */}
               <div 
                 onMouseDown={(e) => handleHandleMouseDown(e, "end")}
                 className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-500/80 hover:bg-blue-400 border-2 border-white/80 rounded-md z-20 cursor-ew-resize shadow-lg flex items-center justify-center group/handle transition-colors backdrop-blur-sm"
                 style={{ left: `${getPercent(loopEnd)}%`, transform: 'translate(-50%, -50%)' }}
               >
                   <div className="w-0.5 h-3 bg-black/20" />
               </div>
             </>
           )}
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                    onClick={onPlayPause}
                    className="w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>

                {/* Time Display */}
                <div className="font-mono text-zinc-400 text-sm">
                    <span className="text-white">{formatTime(currentTime)}</span> / {formatTime(duration)}
                </div>
            </div>

            {/* Loop Controls */}
            <div className="flex items-center gap-2 bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-700/50">
                <button
                    onClick={onToggleLoop}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isLooping ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:text-white'}`}
                >
                    <Repeat size={18} />
                    Loop
                </button>
                {isLooping ? (
                    <div className="flex items-center gap-2 text-xs">
                         <div className="flex flex-col gap-1">
                            <label className="text-zinc-500 font-mono">IN</label>
                            <input 
                                type="number" 
                                value={Math.floor(loopStart)}
                                onChange={(e) => onLoopStartChange(Number(e.target.value))} 
                                className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-center text-zinc-300 font-mono"
                            />
                         </div>
                         <div className="flex flex-col gap-1">
                            <label className="text-zinc-500 font-mono">OUT</label>
                            <input 
                                type="number" 
                                value={Math.floor(loopEnd)}
                                onChange={(e) => onLoopEndChange(Number(e.target.value))} 
                                className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-center text-zinc-300 font-mono"
                            />
                         </div>
                         <button 
                             onClick={() => { onLoopStartChange(currentTime); }} // Set In Point
                             className="px-2 py-3 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-bold"
                             title="Set Loop Start to Current"
                         >
                             IN
                         </button>
                         <button 
                             onClick={() => { onLoopEndChange(currentTime); }} // Set Out Point
                             className="px-2 py-3 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-bold"
                             title="Set Loop End to Current"
                         >
                             OUT
                         </button>
                    </div>
                ) : (
                    <span className="text-xs text-zinc-600 px-2">Enable Loop to edit range</span>
                )}
            </div>

            <div className="flex items-center gap-6">
                {/* Volume Control */}
                <div className="flex items-center gap-2 w-32 group/vol">
                    {/* Placeholder Icon */}
                    <div className="text-zinc-500"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg></div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={videoVolume}
                        onChange={(e) => onVideoVolumeChange(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-400 hover:accent-white"
                    />
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-2">
                    <FastForward size={18} className="text-zinc-500" />
                    <select
                        value={playbackRate}
                        onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
                        className="bg-zinc-800 text-sm font-medium text-white px-3 py-2 rounded-lg outline-none border border-zinc-700 focus:border-blue-500"
                    >
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <option key={rate} value={rate}>{rate}x</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
