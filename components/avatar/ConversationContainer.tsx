'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HologramPortal from '@/components/avatar/HologramPortal';
import SpeechBubble from '@/components/ui/SpeechBubble';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import type { ConversationPhase } from '@/hooks/useConversationOrchestrator';
import type { AvatarState } from '@/lib/avatar/avatarStateMachine';

interface ConversationContainerProps {
  phase: ConversationPhase;
  avatarState: AvatarState;
  displayText: string;
  userName: string;
  isProcessing: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isSpeechSupported: boolean;
  onStart: () => void;
  onClipComplete: () => void;
  interimTranscript: string;
}

export default function ConversationContainer({
  phase,
  avatarState,
  displayText,
  userName,
  isProcessing,
  isListening,
  isSpeaking,
  isSpeechSupported,
  onStart,
  onClipComplete,
  interimTranscript,
}: ConversationContainerProps) {
  const isStarted = phase !== 'INIT';

  return (
    <div className="relative z-10 flex flex-col items-center min-h-[100dvh] px-4 pt-8 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-4"
      >
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-siddhi-cyan via-white to-siddhi-purple bg-clip-text text-transparent">
          कल्कि इंटेलिजेंस
        </h1>
        <p className="text-white/30 text-[10px] sm:text-xs mt-1 tracking-[0.2em] uppercase">
          AI Solutions — Indore, MP
        </p>
      </motion.div>

      {/* Avatar + Voice Flow */}
      <motion.div
        layout
        className="w-full flex flex-col items-center gap-4 flex-1"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Hologram Avatar */}
        <HologramPortal
          avatarState={avatarState}
          onClipComplete={onClipComplete}
          className="w-[240px] h-[340px] sm:w-[300px] sm:h-[420px]"
        />

        {/* Always-On Voice Indicator */}
        {isStarted && (
          <VoiceIndicator
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            isSupported={isSpeechSupported}
          />
        )}

        {/* Speech Bubble — Avatar's response */}
        {isStarted && (
          <div className="w-full max-w-sm">
            <SpeechBubble
              text={displayText}
              isVisible={!!displayText}
              isTyping={isProcessing}
            />
          </div>
        )}

        {/* Live Interim Transcript — What user is saying right now */}
        <AnimatePresence>
          {interimTranscript && isListening && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 animate-pulse shrink-0" />
                  <p className="text-sm text-white/50 italic leading-relaxed">
                    {interimTranscript}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Button */}
        {!isStarted && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="w-full max-w-sm py-4 rounded-2xl bg-gradient-to-r from-siddhi-cyan/20 to-siddhi-purple/20 border border-siddhi-cyan/30 text-white font-semibold text-base sm:text-lg cursor-pointer shadow-[0_8px_32px_rgba(0,242,254,0.1)] hover:shadow-[0_12px_48px_rgba(0,242,254,0.2)] hover:border-siddhi-cyan/50 transition-all duration-300 active:scale-95"
          >
            <span className="flex items-center justify-center gap-3">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                🎤
              </motion.span>
              सिद्धि से बात करें
            </span>
            <span className="block text-[10px] text-white/30 mt-1 font-normal">
              आवाज़ से बातचीत — हाथ से टाइप करने की ज़रूरत नहीं
            </span>
          </motion.button>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-auto pt-4 text-center"
      >
        <p className="text-white/15 text-[9px] tracking-[0.15em] uppercase">
          Realtime STT + TTS — Zero GPU — Agnes AI Brain
        </p>
      </motion.div>
    </div>
  );
}
