'use client';

import React, { useEffect, useCallback, useRef } from 'react';
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

  const prevSpokenText = useRef<string | undefined>(undefined);
  const isTTSActive = useRef(false);
  const conversationStarted = useRef(false);
  const bargeInCooldown = useRef(false);
  const inputQueue = useRef<string[]>([]);
  const isProcessingQueue = useRef(false);

  const onTTSStart = useCallback(() => {
    isTTSActive.current = true;
  }, []);

  const onTTSEnd = useCallback(() => {
    isTTSActive.current = false;
    handleClipComplete();
  }, [handleClipComplete]);

  const { speak, stop: stopTTS, isSpeaking } = useBrowserTTS(onTTSStart, onTTSEnd);

  // Unlock TTS on first user interaction
  useEffect(() => {
    const unlock = () => {
      window.speechSynthesis?.getVoices();
      const warmup = new SpeechSynthesisUtterance('');
      warmup.volume = 0;
      window.speechSynthesis?.speak(warmup);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Barge-in: cancel TTS when user starts speaking
  useEffect(() => {
    if (hasInterim && isTTSActive.current && !bargeInCooldown.current) {
      bargeInCooldown.current = true;
      stopTTS();
      pauseListening();
      setTimeout(() => {
        resumeListening();
        bargeInCooldown.current = false;
      }, 300);
    }
  }, [hasInterim, stopTTS, pauseListening, resumeListening]);

  // Realtime avatar reaction: user starts speaking → LISTENING
  useEffect(() => {
    if (hasInterim && !isTTSActive.current) {
      handleUserStartSpeaking();
    }
  }, [hasInterim, handleUserStartSpeaking]);

  // Queue-based input processing — handles multiple rapid voice inputs
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    if (inputQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    while (inputQueue.current.length > 0) {
      const input = inputQueue.current.shift()!;
      await processUserInput(input);
      // Small delay between queued inputs to let TTS start
      if (inputQueue.current.length > 0) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    isProcessingQueue.current = false;
  }, [processUserInput]);

  // Final transcript arrived → queue for processing
  useEffect(() => {
    if (transcript) {
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
      prevSpokenText.current = decision.spokenText;
      stopTTS();
      speak(decision.spokenText);
    }
  }, [state.lastDecision.spokenText, speak, stopTTS]);

  // Start conversation — auto-enable mic (always-on)
  const handleStart = useCallback(() => {
    conversationStarted.current = true;
    startConversation();
    setTimeout(() => {
      startListening();
    }, 800);
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
      />
    </main>
  );
}
