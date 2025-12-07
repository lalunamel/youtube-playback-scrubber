"use client";

import { useState } from "react";
import Landing from "./components/Landing";
import Workspace from "./components/Workspace";

export default function Home() {
  const [videoId, setVideoId] = useState<string | null>(null);

  if (videoId) {
    return <Workspace videoId={videoId} onBack={() => setVideoId(null)} />;
  }

  return (
    <main className="bg-black min-h-screen text-white selection:bg-blue-500/30">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl opacity-30" />
             <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl opacity-30" />
        </div>
        
        <div className="relative z-10">
            <Landing onVideoSelect={setVideoId} />
        </div>
    </main>
  );
}
