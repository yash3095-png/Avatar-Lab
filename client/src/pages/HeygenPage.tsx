import React, { useEffect, useState, useRef } from "react";
import { Mic, User, Play, Download, Pause } from 'lucide-react';
import { Navbar } from '../components/Navbar';

type Voice = {
  voice_id: string;
  name: string;
  preview_audio: string;
  gender?: string;
};

type Avatar = {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string | null;
  gender?: string;
};

// Loader Component
const Loader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center gap-4 p-8">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-400 rounded-full animate-spin animation-delay-150"></div>
    </div>
    <p className="text-gray-300 font-medium">{message}</p>
  </div>
);

const HeygenPage: React.FC = () => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // ✅ useEffect: fetch and select 5 male + 5 female voices and avatars
  useEffect(() => {
    // Fetch voices
    setVoicesLoading(true);
    fetch("http://localhost:5000/api/heygen/voices")
      .then((res) => res.json())
      .then((data) => {
        const allVoices = data.voices || [];
        const maleVoices = allVoices.filter((v: any) => v.gender?.toLowerCase() === 'male').slice(0, 5);
        const femaleVoices = allVoices.filter((v: any) => v.gender?.toLowerCase() === 'female').slice(0, 5);
        setVoices([...maleVoices, ...femaleVoices]);
      })
      .catch((error) => console.error("Error fetching voices:", error))
      .finally(() => setVoicesLoading(false));

    // Fetch avatars with 1 unique person per gender, front-facing only
    setAvatarsLoading(true);
    fetch("http://localhost:5000/api/heygen/avatars")
      .then((res) => res.json())
      .then((data) => {
        const allAvatars = data || [];

        const pickUniquePersonsFront = (gender: string) => {
          const genderAvatars = allAvatars.filter(
            (a: any) => a.gender?.toLowerCase() === gender.toLowerCase()
          );

          const uniquePersonMap = new Map<string, any>();

          for (const avatar of genderAvatars) {
            const name = avatar.avatar_name.toLowerCase();
            const isFront = name.includes('front');

            // Get base name = first word (person's name)
            const baseName = name.split(' ')[0];

            if (isFront && !uniquePersonMap.has(baseName)) {
              uniquePersonMap.set(baseName, avatar);
            }
          }

          return Array.from(uniquePersonMap.values()).slice(0, 5);
        };

        const maleAvatars = pickUniquePersonsFront('male');
        const femaleAvatars = pickUniquePersonsFront('female');

        setAvatars([...maleAvatars, ...femaleAvatars]);
      })
      .catch((error) => console.error("Error fetching avatars:", error))
      .finally(() => setAvatarsLoading(false));

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleVoicePlay = (voiceId: string, audioUrl: string) => {
    const currentAudio = audioRefs.current.get(voiceId);
    
    if (playingVoice === voiceId && currentAudio) {
      currentAudio.pause();
      setPlayingVoice(null);
    } else {
      // Stop any currently playing audio
      if (playingVoice && audioRefs.current.get(playingVoice)) {
        audioRefs.current.get(playingVoice)!.pause();
      }
      
      // Create or get audio element
      let audio = audioRefs.current.get(voiceId);
      if (!audio) {
        audio = new Audio(audioUrl);
        audio.onended = () => setPlayingVoice(null);
        audioRefs.current.set(voiceId, audio);
      }
      
      audio.play();
      setPlayingVoice(voiceId);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    setGenerationStatus("Processing video... This may take a few moments.");
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/heygen/video-status/${videoId}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch video status.');
        }
        const data = await res.json();
        if (data.status === 'completed') {
          setVideoUrl(data.video_url);
          setGenerationStatus("Video generated successfully!");
          setLoading(false);
          clearInterval(intervalRef.current!);
        } else if (data.status === 'failed' || data.status === 'error') {
          setGenerationStatus(`Video generation failed: ${data.message || 'Please try again.'}`);
          setLoading(false);
          clearInterval(intervalRef.current!);
        } else {
          setGenerationStatus(`Video status: ${data.status}...`);
        }
      } catch (err: any) {
        console.error("Error polling video status:", err);
        setGenerationStatus(`Error checking video status: ${err.message || "Unknown error."}`);
        setLoading(false);
        clearInterval(intervalRef.current!);
      }
    }, 15000);
  };

  const handleGenerate = async () => {
    if (!selectedVoice || !selectedAvatar || !prompt) {
      alert("Please select a voice, an avatar, and enter a script.");
      return;
    }
    setLoading(true);
    setVideoUrl(null);
    setGenerationStatus("Sending request to generate video...");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    try {
      const res = await fetch("http://localhost:5000/api/heygen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_id: selectedVoice.voice_id,
          avatar_id: selectedAvatar.avatar_id,
          script: prompt,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Backend API error.');
      }

      const data = await res.json();
      const videoId = data.video_id;
      if (videoId) {
        setGenerationStatus("Video request submitted. Checking status...");
        pollVideoStatus(videoId);
      } else {
        setGenerationStatus("No video ID returned.");
        setLoading(false);
        alert("Error generating video: No video ID.");
      }
    } catch (err: any) {
      console.error("Error initiating video generation:", err);
      setGenerationStatus(`Error: ${err.message || "Unknown error"}`);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedVoice(null);
    setSelectedAvatar(null);
    setPrompt("");
    setVideoUrl(null);
    setGenerationStatus(null);
    setPlayingVoice(null);
    // Stop all audio
    audioRefs.current.forEach(audio => audio.pause());
  };

  return (
    
    
    <div className="min-h-screen bg-black text-white pt-[64px]">
      <Navbar scrolled={true} />
      <div className="container mx-auto px-6 pt-8 pb-16 max-w-6xl space-y-8 ">
        {/* Header
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-400  mb-4">
            AI Avatar Generator
          </h1>
          <p className="text-gray-400 text-lg">Choose your voice, select an avatar, and create amazing videos</p>
        </div> */}

        {/* Voice Selection */}
        <div className="bg-gray-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Mic className="text-blue-400" />
            Choose a Voice
          </h2>
          
          {voicesLoading ? (
            <Loader message="Loading voices..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {voices.map((voice) => (
                <div
                  key={voice.voice_id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`bg-black/40 border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 ${
                    selectedVoice?.voice_id === voice.voice_id 
                      ? "border-blue-500 shadow-lg shadow-blue-500/25" 
                      : "border-white/10 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white truncate">{voice.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      voice.gender?.toLowerCase() === 'male' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {voice.gender}
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVoicePlay(voice.voice_id, voice.preview_audio);
                    }}
                    className="w-full p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {playingVoice === voice.voice_id ? (
                      <><Pause className="w-4 h-4" /> Pause</>
                    ) : (
                      <><Play className="w-4 h-4" /> Play</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
              {(selectedVoice || selectedAvatar) && (
  <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-xl mb-6">
    <p className="text-sm">
      <strong>Selected Voice:</strong> {selectedVoice?.name || "None"} 
    </p>
  </div>
)}

        {/* Avatar Selection */}
        <div className="bg-gray-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <User className="text-blue-400" />
            Choose an Avatar
          </h2>
          
          {avatarsLoading ? (
            <Loader message="Loading avatars..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {avatars.map((avatar) => (
                <div
                  key={avatar.avatar_id}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`bg-black/40 border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 ${
                    selectedAvatar?.avatar_id === avatar.avatar_id 
                      ? "border-blue-500 shadow-lg shadow-blue-500/25" 
                      : "border-white/10 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white truncate">{avatar.avatar_name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      avatar.gender?.toLowerCase() === 'male' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {avatar.gender}
                    </span>
                  </div>
                  
                  <div className="aspect-square bg-black/60 rounded-lg overflow-hidden">
                    {avatar.preview_image_url ? (
                      <img
                        src={avatar.preview_image_url}
                        alt={avatar.avatar_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
              {(selectedVoice || selectedAvatar) && (
  <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-xl mb-6">
    <p className="text-sm">
      <strong>Selected Avatar:</strong> {selectedAvatar?.avatar_name || "None"}
    </p>
  </div>
)}

        {/* Script Input */}
        <div className="bg-gray-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
          <h2 className="text-2xl font-bold mb-6">Your Script</h2>
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type what your avatar should say..."
            rows={4}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 min-h-[120px] resize-none"
          />
        </div>
  


        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedVoice || !selectedAvatar || !prompt}
          className={`w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 ${
            loading || !selectedVoice || !selectedAvatar || !prompt
              ? 'bg-gray-700 cursor-not-allowed text-gray-400'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Generate Avatar Video
            </>
          )}
        </button>

        {/* Status and Loading */}
        {(loading || generationStatus) && (
          <div className="bg-gray-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
            {loading && <Loader message={generationStatus || "Processing your request..."} />}
            {!loading && generationStatus && (
              <div className="text-center">
                <p className="text-lg font-medium text-gray-300">{generationStatus}</p>
              </div>
            )}
          </div>
        )}

        {/* Video Result */}
        {videoUrl && (
          <div className="bg-gray-900/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Play className="text-blue-400" />
              Your AI Avatar Video
            </h2>

            <div className="bg-blue-500/20 border border-blue-500 text-blue-400 px-4 py-3 rounded-xl flex items-center gap-3 mb-6">
              <Play size={20} />
              Your AI Avatar video has been generated successfully!
            </div>

            <div className="bg-black/40 p-6 rounded-xl mb-6">
              <div className="aspect-video bg-black/60 rounded-lg overflow-hidden mb-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-all duration-300"
                >
                  <Play size={20} />
                  Play Video
                </a>
                <a
                  href={videoUrl}
                  download="ai-avatar-video.mp4"
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-all duration-300"
                >
                  <Download size={20} />
                  Download
                </a>
              </div>
            </div>

            <button
              onClick={resetForm}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-xl font-medium transition-all duration-300"
            >
              Create Another Video
            </button>
          </div>
          
        )}
      </div>
    </div>
    
  );
};

export default HeygenPage;