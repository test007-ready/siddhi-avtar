'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import AmbientBackground from '@/components/ui/AmbientBackground';
import ConversationContainer from '@/components/avatar/ConversationContainer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useBrowserTTS } from '@/hooks/useBrowserTTS';
import { useConversationOrchestrator } from '@/hooks/useConversationOrchestrator';

export default function SiddhiLandingPage() {
  const {
    state,
    startConversation,
    processUserInput,
    handleClipComplete,
    handleUserStartSpeaking,
    handleUserStopSpeaking,
  } = useConversationOrchestrator();

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    pauseListening,
    resumeListening,
    resetTranscript,
    isSupported: isSpeechSupported,
    hasInterim,
  } = useSpeechRecognition();

  const [micError, setMicError] = useState<string | null>(null);
  const prevSpokenText = useRef<string | undefined>(undefined);
  const isTTSActive = useRef(false);
  const conversationStarted = useRef(false);
  const bargeInCooldown = useRef(false);
  const inputQueue = useRef<string[]>([]);
  const isProcessingQueue = useRef(false);
  const ttsUnlocked = useRef(false);

  const onTTSStart = useCallback(() => {
    isTTSActive.current = true;
  }, []);

  const onTTSEnd = useCallback(() => {
    isTTSActive.current = false;
    handleClipComplete();
  }, [handleClipComplete]);

  const { speak, stop: stopTTS, isSpeaking } = useBrowserTTS(onTTSStart, onTTSEnd);

  // Unlock TTS immediately on mount
  useEffect(() => {
    const unlockTTS = () => {
      if (ttsUnlocked.current) return;
      ttsUnlocked.current = true;
      
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        const warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
        console.log('[TTS] Unlocked');
      }
    };

    // Try to unlock immediately
    unlockTTS();
    
    // Also unlock on first interaction
    document.addEventListener('click', unlockTTS, { once: true });
    document.addEventListener('touchstart', unlockTTS, { once: true });
    
    return () => {
      document.removeEventListener('click', unlockTTS);
      document.removeEventListener('touchstart', unlockTTS);
    };
  }, []);

  // Barge-in: cancel TTS when user starts speaking
  useEffect(() => {
    if (hasInterim && isTTSActive.current && !bargeInCooldown.current) {
      console.log('[Barge-in] User interrupted TTS');
      bargeInCooldown.current = true;
      stopTTS();
      pauseListening();
      setTimeout(() => {
        resumeListening();
        bargeInCooldown.current = false;
      }, 200);
    }
  }, [hasInterim, stopTTS, pauseListening, resumeListening]);

  // Realtime avatar reaction: user starts speaking → LISTENING
  useEffect(() => {
    if (hasInterim && !isTTSActive.current) {
      handleUserStartSpeaking();
    }
  }, [hasInterim, handleUserStartSpeaking]);

  // Queue-based input processing
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    if (inputQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    console.log('[Queue] Processing', inputQueue.current.length, 'items');
    
    while (inputQueue.current.length > 0) {
      const input = inputQueue.current.shift()!;
      console.log('[Queue] Processing input:', input);
      await processUserInput(input);
      
      if (inputQueue.current.length > 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    isProcessingQueue.current = false;
  }, [processUserInput]);

  // Final transcript arrived → queue for processing
  useEffect(() => {
    if (transcript) {
      console.log('[STT] Final transcript:', transcript);
      handleUserStopSpeaking();
      inputQueue.current.push(transcript);
      resetTranscript();
      processQueue();
    }
  }, [transcript, resetTranscript, handleUserStopSpeaking, processQueue]);

  // Avatar speaks when decision changes
  useEffect(() => {
    const decision = state.lastDecision;

    if (decision.spokenText && decision.spokenText !== prevSpokenText.current) {
      console.log('[TTS] Speaking:', decision.spokenText.substring(0, 50));
      prevSpokenText.current = decision.spokenText;
      stopTTS();
      speak(decision.spokenText);
    }
  }, [state.lastDecision.spokenText, speak, stopTTS]);

  // Start conversation — immediate mic start with error handling
  const handleStart = useCallback(async () => {
    console.log('[Start] Beginning conversation');
    conversationStarted.current = true;
    setMicError(null);
    
    // Start conversation immediately
    startConversation();
    
    // Start mic immediately (no delay)
    try {
      console.log('[Mic] Requesting permission...');
      startListening();
    } catch (err) {
      console.error('[Mic] Error:', err);
      setMicError('Microphone access denied. Please allow mic permission.');
    }
  }, [startConversation, startListening]);

  return (
    <main className="relative min-h-[100dvh]">
      <AmbientBackground />
      <ConversationContainer
        phase={state.phase}
        avatarState={state.avatarState}
        displayText={state.displayText}
        userName={state.userName}
        isProcessing={state.isProcessing}
        isListening={isListening}
        isSpeaking={isSpeaking}
        isSpeechSupported={isSpeechSupported}
        onStart={handleStart}
        onClipComplete={handleClipComplete}
        interimTranscript={interimTranscript}
        micError={micError}
      />
    </main>
  );
}
