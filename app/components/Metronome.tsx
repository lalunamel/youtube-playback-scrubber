"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, HandMetal, Plus, Minus } from "lucide-react";
import clsx from "clsx";

type BeatType = 0 | 1 | 2; // 0: Mute, 1: Normal, 2: Accent

interface ScheduledNote {
  time: number;
  beatIndex: number;
}

export default function Metronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isMuted, setIsMuted] = useState(false);
  
  // Time Signature & Beat Pattern
  // Default 4/4: Accent, Normal, Normal, Normal
  const [beatPattern, setBeatPattern] = useState<BeatType[]>([2, 1, 1, 1]);
  const beatPatternRef = useRef<BeatType[]>([2, 1, 1, 1]);
  
  const [activeBeatIndex, setActiveBeatIndex] = useState<number>(-1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatIndexRef = useRef(0); // Which beat in the measure are we on?
  const timerIDRef = useRef<number | null>(null);
  const notesQueue = useRef<ScheduledNote[]>([]); // Keep track of scheduled notes for visuals
  const visualRafId = useRef<number | null>(null);

  // Sync ref with state
  useEffect(() => {
    beatPatternRef.current = beatPattern;
  }, [beatPattern]);

  // Tap Tempo
  const tapTimesRef = useRef<number[]>([]);
  const lastTapRef = useRef<number>(0);

  const lookahead = 25.0; 
  const scheduleAheadTime = 0.1; 

  // Volume logic
  const [volume, setVolume] = useState(0.7);
  const volumeRef = useRef(0.7);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // --- Logic ---

  const scheduleNote = (time: number, beatIndex: number) => {
    // Record for visualizer
    notesQueue.current.push({ time, beatIndex });

    if (isMuted) return;
    if (!audioContextRef.current) return;

    // Use ref to avoid closure staleness without dependency recreation
    const pattern = beatPatternRef.current;
    
    // Safety check for index
    if (beatIndex >= pattern.length) return;

    const type = pattern[beatIndex];
    if (type === 0) return; // Mute

    // Sound Synthesis
    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    // Accent: Higher pitch, slightly louder
    // Normal: Lower pitch
    osc.frequency.value = type === 2 ? 1000 : 800;
    // Base gain scaled by master volume
    const baseGain = type === 2 ? 1.0 : 0.6;
    envelope.gain.value = baseGain * volumeRef.current;
    
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTimeRef.current += secondsPerBeat;
    
    // Increment beat index ref for the scheduler logic
    // Use ref length to ensure we wrap correctly even if pattern changed mid-stream
    currentBeatIndexRef.current = (currentBeatIndexRef.current + 1) % beatPatternRef.current.length;
  };

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
      scheduleNote(nextNoteTimeRef.current, currentBeatIndexRef.current);
      nextNote();
    }
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  }, [bpm, isMuted]); // Note: beatPattern and volume removed from dependencies to prevent restart

  // --- Visualizer Loop ---
  // Decoupled from audio thread for performance
  useEffect(() => {
      let rafId: number;
      
      const draw = () => {
          if (!audioContextRef.current) return;
          const currentTime = audioContextRef.current.currentTime;
          
          while (notesQueue.current.length && notesQueue.current[0].time < currentTime) {
              const playingNote = notesQueue.current[0];
              setActiveBeatIndex(playingNote.beatIndex);
              notesQueue.current.shift(); // Remove handled note
              
              // Auto-clear highlight after short duration? 
              // Actually we just let it stay active until next beat for better visibility at high speeds,
              // or we could use a timeout to clear it if desired. 
              // Letting it persist until next beat is usually clearer.
          }
          
          rafId = requestAnimationFrame(draw);
      };

      if (isPlaying) {
          rafId = requestAnimationFrame(draw);
      } else {
          setActiveBeatIndex(-1);
      }

      return () => {
          if (rafId) cancelAnimationFrame(rafId);
      };
  }, [isPlaying]);


  // --- Audio Lifecycle ---
  useEffect(() => {
    if (isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      currentBeatIndexRef.current = 0;
      nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05; // Brief delay start
      scheduler();
    } else {
      if (timerIDRef.current) {
        window.clearTimeout(timerIDRef.current);
      }
    }

    return () => {
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
    };
  }, [isPlaying, scheduler]);

  
  // --- Beat Pattern Interaction ---

  const handleBeatClick = (index: number) => {
      const newPattern = [...beatPattern];
      // Cycle: 1 -> 2 -> 0 -> 1 ...
      if (newPattern[index] === 1) newPattern[index] = 2;
      else if (newPattern[index] === 2) newPattern[index] = 0;
      else newPattern[index] = 1;
      
      setBeatPattern(newPattern);
  };

  const changeTimeSignature = (delta: number) => {
      let newPattern = [...beatPattern];
      if (delta > 0) {
          if (newPattern.length < 12) newPattern.push(1); // Max 12 beats
      } else {
          if (newPattern.length > 1) newPattern.pop(); // Min 1 beat
      }
      setBeatPattern(newPattern);
      
      // Safety: reset current index if out of bounds (though scheduler handles modulo)
      if (currentBeatIndexRef.current >= newPattern.length) {
          currentBeatIndexRef.current = 0;
      }
  };


  const handleTap = () => {
    const now = performance.now();
    const lastTap = lastTapRef.current;
    if (now - lastTap > 2000) tapTimesRef.current = [now];
    else {
        tapTimesRef.current.push(now);
        if (tapTimesRef.current.length > 4) tapTimesRef.current.shift();
    }
    lastTapRef.current = now;
    if (tapTimesRef.current.length > 1) {
        const intervals = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i]);
        const avg = intervals.reduce((a, b) => a + b) / intervals.length;
        const newBpm = Math.round(60000 / avg);
        if (newBpm >= 30 && newBpm <= 300) setBpm(newBpm);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm w-full select-none">
        
        {/* Header / TS Controls */}
        <div className="flex items-center justify-between w-full">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Metronome</h3>
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                <button 
                  onClick={() => changeTimeSignature(-1)} 
                  className="p-1 hover:bg-zinc-700 rounded text-zinc-400"
                >
                    <Minus size={14} />
                </button>
                <div className="flex items-center justify-center gap-1 w-10 text-xs font-mono">
                    <span className="text-white w-3 text-right">{beatPattern.length}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-white w-3 text-left">4</span>
                </div>
                <button 
                  onClick={() => changeTimeSignature(1)}
                  className="p-1 hover:bg-zinc-700 rounded text-zinc-400"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
        
        {/* Beat Editor (Visual Measure) */}
        <div className="flex items-center justify-center gap-3 w-full flex-wrap min-h-[40px]">
             {beatPattern.map((type, index) => (
                 <button
                    key={index}
                    onClick={() => handleBeatClick(index)}
                    className={clsx(
                        "w-8 h-8 rounded-full transition-all duration-100 flex items-center justify-center relative",
                        type === 2 && "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]", // Accent
                        type === 1 && "bg-blue-500 opacity-60", // Normal (Now Blue, slightly transparent for distinction without using gray)
                        type === 0 && "border-2 border-zinc-700 bg-transparent", // Mute
                        
                        // Active State Pulse
                        index === activeBeatIndex && type !== 0 && "scale-125 brightness-150 opacity-100",
                        index === activeBeatIndex && type === 0 && "border-zinc-400 scale-110", // Active mute
                        
                        // Default Hover
                        "hover:scale-110 active:scale-95"
                    )}
                 >
                    {/* Inner dot for Accent clarity */}
                    {type === 2 && <div className="w-2 h-2 bg-white rounded-full bg-opacity-80" />}
                 </button>
             ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 w-full justify-center">
            
            <button
                onClick={handleTap}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all active:scale-95"
            >
                <div className="mb-1 bg-zinc-700 p-1.5 rounded-full"><HandMetal size={16} /></div>
                <span className="text-[10px] font-bold">TAP</span>
            </button>

            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={clsx(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl",
                    isPlaying ? "bg-red-500/20 text-red-500 ring-2 ring-red-500/50" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                )}
            >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}
            </button>
            
            <div className="flex flex-col items-center gap-1">
                 <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 ${isMuted ? 'bg-red-900/20 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                    <div className="mb-1 bg-zinc-700/50 p-1.5 rounded-full">{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</div>
                    <span className="text-[10px] font-bold">{isMuted ? 'MUTED' : 'AUDIO'}</span>
                </button>
                {/* Mini Volume Slider */}
                {!isMuted && (
                   <input 
                      type="range"
                      min="0"
                      max="1" 
                      step="0.1"
                      value={volume} 
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-16 h-1 mt-1 accent-zinc-500 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      title="Metronome Volume"
                   />
                )}
            </div>
        </div>

        {/* BPM Slider */}
        <div className="w-full space-y-2">
            <div className="flex justify-between items-end px-1">
                <span className="text-zinc-500 text-xs font-bold">TEMPO</span>
                <span className="text-2xl font-mono font-bold text-white">{bpm}</span>
            </div>
            <input
                type="range"
                min="30"
                max="240"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer hover:bg-zinc-700 transition-colors"
                style={{
                  backgroundImage: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(bpm - 30) / (240 - 30) * 100}%, transparent ${(bpm - 30) / (240 - 30) * 100}%, transparent 100%)`
                }}
            />
        </div>
    </div>
  );
}
