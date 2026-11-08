'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { getPlaybackVolume, microphoneError, replaceMicrophoneTrack } from './call-audio';

export interface CallAudioControls {
  microphones: MediaDeviceInfo[];
  inputDeviceId: string;
  localStream: MediaStream | null;
  volume: number;
  isDeafened: boolean;
  changingMicrophone: boolean;
  playbackBlocked: boolean;
  audioError: string | null;
  setInputDevice: (deviceId: string) => Promise<void>;
  setVolume: (volume: number) => void;
  toggleDeafen: () => void;
  resumeAudio: () => Promise<void>;
}

export function useCallAudio(
  streamRef: RefObject<MediaStream | null>,
  getPeers: () => RTCPeerConnection[],
  getAudioElements: () => HTMLAudioElement[]
) {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [inputDeviceId, setInputDeviceId] = useState('default');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [isDeafened, setDeafened] = useState(false);
  const [changingMicrophone, setChangingMicrophone] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const preferencesRef = useRef({ deviceId: 'default', volume: 1, deafened: false });
  const requestVersionRef = useRef(0);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMicrophones(devices.filter((device) => device.kind === 'audioinput'));
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices) return;
    const refresh = () => {
      void refreshDevices().catch(() => setAudioError('Microphone list could not be refreshed.'));
    };
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [refreshDevices]);

  const requestMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error('Voice calls need HTTPS and a browser with microphone support.');
    const version = ++requestVersionRef.current;
    const deviceId = preferencesRef.current.deviceId;
    const next = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}),
      },
    });
    if (version !== requestVersionRef.current) {
      next.getTracks().forEach((track) => track.stop());
      throw new DOMException('Call cancelled.', 'AbortError');
    }
    streamRef.current = next;
    setStream(next);
    setAudioError(null);
    setPlaybackBlocked(false);
    void refreshDevices().catch(() => setAudioError('Microphone list could not be refreshed.'));
    return next;
  }, [streamRef, refreshDevices]);

  const releaseMicrophone = useCallback(() => {
    requestVersionRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, [streamRef]);

  const setInputDevice = useCallback(
    async (deviceId: string) => {
      const previousStream = streamRef.current;
      if (!previousStream || changingMicrophone) return;
      const version = ++requestVersionRef.current;
      setChangingMicrophone(true);
      setAudioError(null);
      let next: MediaStream | null = null;
      try {
        next = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const previousTrack = previousStream.getAudioTracks()[0];
        const nextTrack = next.getAudioTracks()[0];
        if (!nextTrack || version !== requestVersionRef.current) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        nextTrack.enabled = previousTrack?.enabled ?? true;
        await replaceMicrophoneTrack(getPeers(), nextTrack, previousTrack ?? null);
        if (version !== requestVersionRef.current) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = next;
        preferencesRef.current.deviceId = deviceId;
        setInputDeviceId(deviceId);
        setStream(next);
        previousStream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        next?.getTracks().forEach((track) => track.stop());
        if (version === requestVersionRef.current) setAudioError(microphoneError(error));
      } finally {
        setChangingMicrophone(false);
      }
    },
    [streamRef, getPeers, changingMicrophone]
  );

  const playRemoteAudio = useCallback(async (element: HTMLAudioElement) => {
    element.volume = getPlaybackVolume(
      preferencesRef.current.volume,
      preferencesRef.current.deafened
    );
    try {
      await element.play();
    } catch {
      setPlaybackBlocked(true);
    }
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const next = getPlaybackVolume(value, false);
      preferencesRef.current.volume = next;
      setVolumeState(next);
      getAudioElements().forEach((element) => {
        element.volume = getPlaybackVolume(next, preferencesRef.current.deafened);
      });
    },
    [getAudioElements]
  );

  const toggleDeafen = useCallback(() => {
    const next = !preferencesRef.current.deafened;
    preferencesRef.current.deafened = next;
    setDeafened(next);
    getAudioElements().forEach((element) => {
      element.volume = getPlaybackVolume(preferencesRef.current.volume, next);
    });
  }, [getAudioElements]);

  const resumeAudio = useCallback(async () => {
    const results = await Promise.allSettled(
      getAudioElements()
        .filter((element) => element.srcObject)
        .map((element) => element.play())
    );
    setPlaybackBlocked(results.some((result) => result.status === 'rejected'));
  }, [getAudioElements]);

  useEffect(
    () => () => {
      requestVersionRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [streamRef]
  );

  return {
    microphones,
    inputDeviceId,
    localStream: stream,
    volume,
    isDeafened,
    changingMicrophone,
    playbackBlocked,
    audioError,
    setInputDevice,
    setVolume,
    toggleDeafen,
    resumeAudio,
    requestMicrophone,
    releaseMicrophone,
    playRemoteAudio,
  };
}

export function useMicrophoneLevel(stream: MediaStream | null) {
  const [inputLevel, setInputLevel] = useState(0);
  useEffect(() => {
    if (!stream) return;
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      return;
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, value) => sum + value * value, 0) / samples.length
      );
      setInputLevel(Math.min(1, rms * 5));
    }, 150);
    return () => {
      clearInterval(timer);
      source.disconnect();
      void context.close();
    };
  }, [stream]);

  return stream ? inputLevel : 0;
}
