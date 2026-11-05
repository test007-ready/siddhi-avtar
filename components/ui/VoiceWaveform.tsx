'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  isActive: boolean;
  mode: 'listening' | 'speaking' | 'idle';
  barCount?: number;
}

export default function VoiceWaveform({ isActive, mode, barCount = 5 }: VoiceWaveformProps) {
  const colors = {
    listening: { from: '#ef4444', to: '#f97316', glow: 'rgba(239,68,68,0.4)' },
    speaking: { from: '#00f2fe', to: '#7c3aed', glow: 'rgba(0,242,254,0.4)' },
    idle: { from: '#ffffff', to: '#ffffff', glow: 'rgba(255,255,255,0.1)' },
  };

  const color = colors[mode];

  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => {
        const baseHeight = mode === 'idle' ? 4 : 8;
        const maxHeight = mode === 'listening' ? 24 : mode === 'speaking' ? 20 : 4;
        const delay = i * 0.12;
        const duration = mode === 'listening' ? 0.5 : mode === 'speaking' ? 0.7 : 1;

        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              background: `linear-gradient(to top, ${color.from}, ${color.to})`,
              boxShadow: isActive ? `0 0 8px ${color.glow}` : 'none',
              height: baseHeight,
            }}
            animate={
              isActive
                ? {
                    height: [baseHeight, maxHeight, baseHeight + 2, maxHeight * 0.6, baseHeight],
                  }
                : { height: baseHeight }
            }
            transition={
              isActive
                ? {
                    duration,
                    repeat: Infinity,
                    delay,
                    ease: 'easeInOut',
                  }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}
