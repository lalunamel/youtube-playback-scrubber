"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Music2 } from "lucide-react";

interface LandingProps {
  onVideoSelect: (videoId: string) => void;
}

export default function Landing({ onVideoSelect }: LandingProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const [history, setHistory] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("drum_history");
    if (stored) {
        try {
            setHistory(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Simple regex for YouTube ID extraction (standard and short URLs)
    const videoIdMatch = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );

    if (videoIdMatch && videoIdMatch[1]) {
      onVideoSelect(videoIdMatch[1]);
    } else {
      setError("Please enter a valid YouTube URL");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="mb-8 p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
        <Music2 className="w-12 h-12 text-blue-500" />
      </div>
      
      <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 mb-6">
        Drum Practice
      </h1>
      
      <p className="text-zinc-400 text-lg mb-12 max-w-md mx-auto">
        Master your tracks with precision looping, speed control, and metronome tools.
      </p>

      <div className="w-full max-w-lg space-y-4">
        <form onSubmit={handleSubmit} className="relative">
            <input
            type="text"
            placeholder="Paste YouTube Link..."
            className="w-full px-6 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-lg transition-all shadow-xl placeholder:text-zinc-600"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            />
            <button
            type="submit"
            disabled={!url}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-0 disabled:scale-90"
            >
            <ArrowRight className="w-6 h-6" />
            </button>
        </form>

        {history.length > 0 && (
            <div className="relative group">
                <select 
                    onChange={(e) => {
                        if (e.target.value) onVideoSelect(e.target.value);
                    }}
                    className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 cursor-pointer hover:bg-zinc-800 outline-none focus:border-blue-500 transition-colors"
                    defaultValue=""
                >
                    <option value="" disabled>Recent Songs...</option>
                    {history.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.title}
                        </option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    ▼
                </div>
            </div>
        )}
      </div>
      
      {error && (
        <p className="mt-4 text-red-500 font-medium animate-in slide-in-from-top-2">
          {error}
        </p>
      )}
    </div>
  );
}
