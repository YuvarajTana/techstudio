import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, RefreshCw, Check, X } from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';
import type { TimelineAudioClip } from '../../../types/timeline';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const nowMs = () => window.performance?.now?.() ?? Date.now();

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const store = useEditorStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setAudioStream(null);
    setIsRecording(false);
  };

  const startRecording = async () => {
    setMicError('');
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDurationMs(0);

      const startTime = nowMs();
      timerRef.current = window.setInterval(() => {
        setRecordingDurationMs(nowMs() - startTime);
      }, 100);

      // Setup live visualizer
      visualizeMicStream(stream);
    } catch {
      setMicError('Microphone access denied or not available.');
    }
  };

  const visualizeMicStream = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          ctx.fillStyle = '#8b5cf6';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch {
      // Visualizer fallback
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleSave = () => {
    if (!recordedAudioUrl || recordingDurationMs <= 0) return;

    const playheadMs = store.timelineProject.currentTimeMs || 0;
    const clip: TimelineAudioClip = {
      id: `voice-${Date.now()}`,
      name: `Voiceover ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      assetUrl: recordedAudioUrl,
      trackType: 'voiceover',
      startTimeMs: playheadMs,
      durationMs: recordingDurationMs,
      trimStartMs: 0,
      trimEndMs: 0,
      volume: 1.0,
      muted: false,
    };

    store.addAudioClip(clip);
    onClose();
  };

  if (!isOpen) return null;

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Record Voice-over</h3>
              <p className="text-[11px] text-zinc-400">Speak into microphone to add voice audio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {micError ? (
          <div className="my-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs text-rose-300">
            {micError}
          </div>
        ) : (
          <div className="my-6 flex flex-col items-center justify-center gap-4">
            {/* Timer */}
            <div className="font-mono text-3xl font-bold tracking-wider text-violet-400">
              {formatMs(recordingDurationMs)}
            </div>

            {/* Visualizer Canvas */}
            <div className="h-16 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
              <canvas ref={canvasRef} className="h-full w-full" width={380} height={48} />
            </div>

            {/* Record / Stop Controls */}
            <div className="flex items-center gap-3">
              {!isRecording && !recordedAudioUrl && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex h-12 items-center gap-2 rounded-full bg-violet-600 px-6 font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500"
                >
                  <Mic className="h-5 w-5 animate-pulse" />
                  Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex h-12 items-center gap-2 rounded-full bg-rose-600 px-6 font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
                >
                  <Square className="h-5 w-5" />
                  Stop Recording
                </button>
              )}

              {recordedAudioUrl && !isRecording && (
                <div className="flex items-center gap-2">
                  <audio src={recordedAudioUrl} controls className="h-9 w-48" />
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs text-zinc-300 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Re-record
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!recordedAudioUrl || isRecording}
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-violet-500 disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Add Voice-over to Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
