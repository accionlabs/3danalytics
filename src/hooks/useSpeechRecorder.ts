import { useRef, useState, useCallback } from 'react'

export type RecordingState = 'idle' | 'recording' | 'processing'

export interface UseSpeechRecorderReturn {
  state: RecordingState
  transcript: string
  /** 'native' = Web Speech API (fast), 'whisper' = WASM fallback (slow) */
  backend: 'native' | 'whisper'
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearTranscript: () => void
}

export interface UseSpeechRecorderOptions {
  /**
   * Force the Whisper WASM backend even on browsers that support the native
   * Web Speech API. Required for WebXR mode where the Speech API is unavailable.
   */
  forceWhisper?: boolean
}

// ─── Backend detection ─────────────────────────────────────────────────────
// Web Speech API is available on Chrome, Edge, and Safari.
// It transcribes natively (< 1 s) with no model download.
// Firefox and non-Chromium browsers fall back to Whisper over WASM.

const NativeSpeechRecognition: (new () => SpeechRecognition) | undefined =
  typeof window !== 'undefined'
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)
    : undefined

// ─── Whisper pipeline (WASM fallback) ─────────────────────────────────────

let transcriberPromise: Promise<unknown> | null = null

async function getTranscriber() {
  if (!transcriberPromise) {
    const { pipeline } = await import('@huggingface/transformers')
    transcriberPromise = pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
    ).catch((err) => {
      transcriberPromise = null
      throw err
    })
  }
  return transcriberPromise
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ])
}

// ─── Audio helpers (Whisper path only) ────────────────────────────────────

async function blobToFloat32At16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const decodeCtx   = new AudioContext()
  const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer)
  await decodeCtx.close()

  // If the browser honoured the 16 kHz sampleRate constraint we skip resampling
  if (audioBuffer.sampleRate === 16000) return audioBuffer.getChannelData(0)

  const targetLen  = Math.ceil(audioBuffer.duration * 16000)
  const offlineCtx = new OfflineAudioContext(1, targetLen, 16000)
  const source     = offlineCtx.createBufferSource()
  source.buffer    = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)
  const resampled  = await offlineCtx.startRendering()
  return resampled.getChannelData(0)
}

function padWithSilence(data: Float32Array, sr = 16000): Float32Array {
  const pre    = Math.round(0.25 * sr)
  const post   = Math.round(0.50 * sr)
  const padded = new Float32Array(pre + data.length + post) // zero-filled
  padded.set(data, pre)
  return padded
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSpeechRecorder(options?: UseSpeechRecorderOptions): UseSpeechRecorderReturn {
  const [state,      setState]      = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')

  // Native path refs
  const recognitionRef        = useRef<SpeechRecognition | null>(null)
  const nativeTranscriptRef   = useRef('')

  // Whisper path refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])

  const backend: 'native' | 'whisper' =
    !options?.forceWhisper && NativeSpeechRecognition ? 'native' : 'whisper'

  // ── Native: Web Speech API (Chrome / Edge / Safari) ─────────────────────
  const startNative = useCallback(() => {
    const recognition             = new NativeSpeechRecognition!()
    recognitionRef.current        = recognition
    nativeTranscriptRef.current   = ''

    recognition.lang              = 'en-US'
    recognition.continuous        = true   // keep listening until stopRecording()
    recognition.interimResults    = false  // only final results

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      nativeTranscriptRef.current = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join(' ')
        .trim()
    }

    recognition.onend = () => {
      setTranscript(nativeTranscriptRef.current)
      setState('idle')
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[SpeechRecorder] Native STT error:', event.error)
      setState('idle')
    }

    recognition.start()
    setState('recording')

    // Silently pre-warm Whisper model in case user's browser loses connectivity
    getTranscriber().catch(() => {})
  }, [])

  const stopNative = useCallback(() => {
    setState('processing') // briefly shown while onend fires (< 1 s)
    recognitionRef.current?.stop()
  }, [])

  // ── Whisper WASM fallback (Firefox + others) ─────────────────────────────
  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Request 16 kHz to avoid resampling; browser may or may not honour it
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      const recorder         = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current        = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(250) // flush chunks every 250 ms — no audio lost on stop
      setState('recording')
      getTranscriber().catch(() => {})
    } catch (err) {
      console.error('[SpeechRecorder] Failed to start recording:', err)
    }
  }, [])

  const stopWhisper = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    recorder.onstop = async () => {
      setState('processing')
      recorder.stream.getTracks().forEach((t) => t.stop())

      try {
        const blob       = new Blob(chunksRef.current, { type: 'audio/webm' })
        const raw        = await blobToFloat32At16k(blob)
        const padded     = padWithSilence(raw)
        const transcriber = await getTranscriber() as (
          data: Float32Array,
          opts: { sampling_rate: number },
        ) => Promise<{ text: string }>

        const result = await withTimeout(
          transcriber(padded, { sampling_rate: 16000 }),
          60_000,
          'Transcription',
        )
        setTranscript(result.text?.trim() ?? '')
      } catch (err) {
        console.error('[SpeechRecorder] Transcription failed:', err)
        setTranscript('[Transcription failed — check console for details]')
      } finally {
        setState('idle')
      }
    }

    recorder.stop()
  }, [])

  // ── Public API ───────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (backend === 'native') startNative()
    else await startWhisper()
  }, [backend, startNative, startWhisper])

  const stopRecording = useCallback(() => {
    if (backend === 'native') stopNative()
    else stopWhisper()
  }, [backend, stopNative, stopWhisper])

  const clearTranscript = useCallback(() => setTranscript(''), [])

  return { state, transcript, backend, startRecording, stopRecording, clearTranscript }
}
