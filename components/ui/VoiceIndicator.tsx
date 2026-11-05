'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceWaveform from './VoiceWaveform';

interface VoiceIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isSupported: boolean;
}

export default function VoiceIndicator({
  isListening,
  isSpeaking,
  isProcessing,
  isSupported,
}: VoiceIndicatorProps) {
  if (!isSupported) return null;

  const mode = isListening ? 'listening' : isSpeaking ? 'speaking' : 'idle';
  const isActive = isListening || isSpeaking;

  const statusConfig = {
    listening: {
      label: 'सुन रही हूँ',
      sublabel: 'बोलिए...',
      dotColor: 'bg-red-400',
      borderColor: 'border-red-400/30',
      bgColor: 'bg-red-500/[0.08]',
      glowColor: 'shadow-[0_0_40px_rgba(239,68,68,0.15)]',
    },
    speaking: {
      label: 'बोल रही हूँ',
      sublabel: '',
      dotColor: 'bg-siddhi-cyan',
      borderColor: 'border-siddhi-cyan/30',
      bgColor: 'bg-siddhi-cyan/[0.08]',
      glowColor: 'shadow-[0_0_40px_rgba(0,242,254,0.15)]',
    },
    idle: {
      label: 'तैयार हूँ',
      sublabel: 'बोलिए',
      dotColor: 'bg-white/30',
      borderColor: 'border-white/10',
      bgColor: 'bg-white/[0.04]',
      glowColor: '',
    },
  };

  const config = statusConfig[isProcessing ? 'idle' : mode];

  return (
    <motion.div
      layout
      className={`relative flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-xl ${config.borderColor} ${config.bgColor} ${config.glowColor} transition-colors duration-500`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          <motion.div
            className={`w-2 h-2 rounded-full ${config.dotColor}`}
            animate={isActive ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
          />

          <VoiceWaveform isActive={isActive} mode={isProcessing ? 'idle' : mode} barCount={5} />

          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white/80 tracking-wide">
              {isProcessing ? 'सोच रही हूँ...' : config.label}
            </span>
            {config.sublabel && !isProcessing && (
              <span className="text-[10px] text-white/30">{config.sublabel}</span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {isListening && (
        <motion.div
          className="absolute inset-0 rounded-full border border-red-400/20"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
