import { useEffect, useRef, useState } from "react";

type VoiceState = {
  audioUrl: string | null;
};

type Props = {
  voice: VoiceState;
  voiceVolume: number;
  isChildVoice: boolean;
  onChange: (nextVoice: VoiceState) => void;
  onToggleChildVoice: () => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
};

export default function VoiceRecorder({
  voice,
  voiceVolume,
  isChildVoice,
  onChange,
  onToggleChildVoice,
  onRecordingStateChange,
}: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const pickSupportedMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
    ];

    return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.load();
    audio.volume = voiceVolume;
    audio.playbackRate = isChildVoice ? 1.2 : 1;
    if ("preservesPitch" in audio) {
      try {
        (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = false;
      } catch {}
    }
  }, [isChildVoice, voiceVolume, voice.audioUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) return;

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setErrorText("Микрофон недоступен в этом браузере.");
        return;
      }

      setErrorText(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        onChange({
          audioUrl,
        });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        onRecordingStateChange?.(false);
      };

      recorder.onerror = () => {
        setErrorText("Не удалось записать голос.");
        setIsRecording(false);
        onRecordingStateChange?.(false);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      onRecordingStateChange?.(true);
    } catch (error) {
      console.error("Voice recording failed", error);
      setErrorText("Не удалось открыть микрофон.");
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  };

  return (
    <div className="voice-recorder">
      <button
        type="button"
        className={`voice-recorder__record ${isRecording ? "is-recording" : ""}`}
        onClick={isRecording ? stopRecording : () => void startRecording()}
      >
        {isRecording ? "Stop" : "Rec"}
      </button>

      <button
        type="button"
        className={`voice-recorder__toggle ${isChildVoice ? "is-active" : ""}`}
        onClick={onToggleChildVoice}
      >
        Child Voice
      </button>

      {voice.audioUrl ? (
        <audio ref={audioRef} src={voice.audioUrl} controls className="voice-recorder__audio" />
      ) : (
        <p className="voice-recorder__hint">Record a voice line and it will appear here.</p>
      )}

      {errorText ? <p className="voice-recorder__error">{errorText}</p> : null}

      <style jsx>{`
        .voice-recorder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          min-height: 100%;
        }

        .voice-recorder__record {
          width: 128px;
          height: 128px;
          border: none;
          border-radius: 999px;
          background: radial-gradient(circle at top, #ffb5cf, #ff6f91);
          color: #fff;
          font-size: 1.35rem;
          font-weight: 700;
          box-shadow: 0 20px 36px rgba(255, 111, 145, 0.28);
        }

        .voice-recorder__record.is-recording {
          background: radial-gradient(circle at top, #ffc2c2, #ff4f4f);
        }

        .voice-recorder__toggle {
          min-height: 48px;
          border: none;
          border-radius: 16px;
          padding: 0.8rem 1rem;
          background: linear-gradient(180deg, #fff0e2 0%, #f3e5ff 100%);
          color: #2b231b;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .voice-recorder__toggle.is-active {
          background: #d9d0ff;
        }

        .voice-recorder__toggle:hover,
        .voice-recorder__record:hover {
          transform: translateY(-1px);
          filter: saturate(1.06);
          box-shadow: 0 14px 24px rgba(255, 154, 196, 0.24);
        }

        .voice-recorder__audio {
          width: 100%;
        }

        .voice-recorder__hint {
          margin: 0;
          color: rgba(255, 244, 232, 0.7);
          text-align: center;
        }

        .voice-recorder__error {
          margin: 0;
          color: #ffb8b8;
          text-align: center;
          font-size: 0.88rem;
        }
      `}</style>
    </div>
  );
}
