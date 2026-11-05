'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
  hasInterim: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [hasInterim, setHasInterim] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const restartDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStoppedRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[STT] Speech Recognition not supported in this browser');
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    console.log('[STT] Speech Recognition initialized');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN';
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
          console.log('[STT] Final:', final);
        } else {
          interim += t;
        }
      }
      if (final) {
        setTranscript(final.trim());
        setInterimTranscript('');
        setHasInterim(false);
      }
      if (interim) {
        setInterimTranscript(interim);
        setHasInterim(true);
      }
    };

    recognition.onend = () => {
      console.log('[STT] Ended, shouldRestart:', shouldRestartRef.current, 'userStopped:', userStoppedRef.current);
      if (shouldRestartRef.current && !userStoppedRef.current) {
        restartDelayRef.current = setTimeout(() => {
          try {
            recognition.start();
            console.log('[STT] Restarted');
          } catch (err) {
            console.error('[STT] Restart failed:', err);
          }
        }, 50);
      } else {
        setIsListening(false);
        setHasInterim(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[STT] Error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.error('[STT] Mic permission denied');
        shouldRestartRef.current = false;
        setIsListening(false);
        return;
      }
      if (event.error === 'network') {
        console.error('[STT] Network error - check internet connection');
      }
      if (shouldRestartRef.current && !userStoppedRef.current) {
        restartDelayRef.current = setTimeout(() => {
          try {
            recognition.start();
            console.log('[STT] Restarted after error');
          } catch (err) {
            console.error('[STT] Restart after error failed:', err);
          }
        }, 100);
      }
    };

    recognition.onstart = () => {
      console.log('[STT] Started listening');
      setIsListening(true);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (restartDelayRef.current) clearTimeout(restartDelayRef.current);
      try { 
        recognition.abort(); 
        console.log('[STT] Cleanup: aborted');
      } catch {}
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('[STT] Recognition not initialized');
      return;
    }
    userStoppedRef.current = false;
    shouldRestartRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    setHasInterim(false);
    try {
      recognitionRef.current.start();
      console.log('[STT] startListening() called');
    } catch (err) {
      console.error('[STT] Start failed:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    userStoppedRef.current = true;
    shouldRestartRef.current = false;
    if (restartDelayRef.current) clearTimeout(restartDelayRef.current);
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsListening(false);
    setHasInterim(false);
  }, []);

  const pauseListening = useCallback(() => {
    if (!recognitionRef.current) return;
    userStoppedRef.current = true;
    shouldRestartRef.current = false;
    if (restartDelayRef.current) clearTimeout(restartDelayRef.current);
    try {
      recognitionRef.current.stop();
    } catch {}
  }, []);

  const resumeListening = useCallback(() => {
    if (!recognitionRef.current) return;
    userStoppedRef.current = false;
    shouldRestartRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    setHasInterim(false);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {}
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setHasInterim(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
    isSupported,
    hasInterim,
  };
}
