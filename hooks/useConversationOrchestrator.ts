'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  evaluateDecisionSync,
  getIdleDecision,
  type DecisionResult,
} from '@/lib/avatar/decisionEngine';
import {
  createInitialState,
  transitionToIdle,
  transitionToListening,
  transitionToThinking,
  transitionToSpeaking,
  transitionToSpeakingLoop,
  type AvatarState,
} from '@/lib/avatar/avatarStateMachine';
import { submitLead, type LeadData } from '@/lib/avatar/leadCapture';
import { sendToAgnesAI, type ChatMessage } from '@/lib/avatar/agnesClient';

export type ConversationPhase =
  | 'INIT'
  | 'GREETING'
  | 'ASKING_NAME'
  | 'ASKING_BUSINESS'
  | 'QUALIFYING'
  | 'CAPTURING_PHONE'
  | 'SUCCESS'
  | 'FALLBACK_CHAT';

interface ConversationState {
  phase: ConversationPhase;
  step: number;
  userName: string;
  businessName: string;
  industry: string;
  phone: string;
  lastDecision: DecisionResult;
  avatarState: AvatarState;
  displayText: string;
  isProcessing: boolean;
  leadSubmitted: boolean;
  messages: ChatMessage[];
  lastInput: string;
  isUserSpeaking: boolean;
}

export function useConversationOrchestrator() {
  const [state, setState] = useState<ConversationState>({
    phase: 'INIT',
    step: 0,
    userName: '',
    businessName: '',
    industry: '',
    phone: '',
    lastDecision: getIdleDecision(),
    avatarState: createInitialState(),
    displayText: '',
    isProcessing: false,
    leadSubmitted: false,
    messages: [],
    lastInput: '',
    isUserSpeaking: false,
  });

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    const currentPhase = stateRef.current.phase;
    if (currentPhase === 'SUCCESS' || currentPhase === 'INIT') return;

    inactivityTimer.current = setTimeout(() => {
      const nudgeDecision = evaluateDecisionSync('', stateRef.current.step, stateRef.current.userName, 'nudge');
      setState((prev) => ({
        ...prev,
        avatarState: transitionToSpeaking('NUDGE', 'warm'),
        displayText: nudgeDecision.spokenText,
        lastDecision: nudgeDecision,
      }));
    }, 12000);
  }, []);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [state.phase, resetInactivityTimer]);

  const startConversation = useCallback(() => {
    const decision = evaluateDecisionSync('', 0);
    setState((prev) => ({
      ...prev,
      phase: 'GREETING',
      step: 0,
      lastDecision: decision,
      avatarState: transitionToSpeaking(decision.clipKey, decision.emotion),
      displayText: decision.spokenText,
    }));
  }, []);

  const handleClipComplete = useCallback(() => {
    const s = stateRef.current;
    if (s.avatarState.phase === 'SPEAKING' && !s.isUserSpeaking) {
      setState((prev) => ({
        ...prev,
        avatarState: transitionToIdle(),
      }));
    }
  }, []);

  const handleUserStartSpeaking = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isUserSpeaking: true,
      avatarState: transitionToListening(),
    }));
  }, []);

  const handleUserStopSpeaking = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isUserSpeaking: false,
    }));
  }, []);

  const processUserInput = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        lastInput: input,
        isUserSpeaking: false,
        avatarState: transitionToThinking(),
        displayText: 'सोच रही हूँ...',
      }));

      resetInactivityTimer();

      const s = stateRef.current;
      const newMessages: ChatMessage[] = [
        ...s.messages,
        { role: 'user' as const, content: input },
      ];

      // Step 0-1: Greeting → Ask name
      if (s.phase === 'GREETING' || (s.phase === 'ASKING_NAME' && !s.userName)) {
        const nameGuess = input.replace(/जी|ji|sir|madam|my name is|mera naam|नाम है|हूँ|हूं/gi, '').trim();
        if (nameGuess.length >= 2 && nameGuess.length <= 30) {
          const decision = evaluateDecisionSync(input, 1, nameGuess, 'greeting');
          setState((prev) => ({
            ...prev,
            userName: nameGuess,
            phase: 'ASKING_BUSINESS',
            step: 1,
            lastDecision: decision,
            avatarState: transitionToSpeaking(decision.clipKey, decision.emotion),
            displayText: decision.spokenText,
            isProcessing: false,
            messages: newMessages,
          }));
          return;
        }
        // Name not clear, ask again
        const clarifyDecision = evaluateDecisionSync('', 0, '', 'clarify');
        setState((prev) => ({
          ...prev,
          phase: 'ASKING_NAME',
          lastDecision: clarifyDecision,
          avatarState: transitionToSpeaking('CLARIFY', 'neutral'),
          displayText: 'माफ़ कीजिए, क्या आप अपना नाम दोबारा बता सकते हैं?',
          isProcessing: false,
          messages: newMessages,
        }));
        return;
      }

      // Step 2: Ask business
      if (s.phase === 'ASKING_BUSINESS') {
        const business = input.trim();
        if (business.length >= 2) {
          const decision = evaluateDecisionSync(input, 2, s.userName, 'business');
          setState((prev) => ({
            ...prev,
            businessName: business,
            industry: business,
            phase: 'QUALIFYING',
            step: 2,
            lastDecision: decision,
            avatarState: transitionToSpeaking(decision.clipKey, decision.emotion),
            displayText: decision.spokenText,
            isProcessing: false,
            messages: newMessages,
          }));
          return;
        }
      }

      // Step 3: Qualifying → Ask phone
      if (s.phase === 'QUALIFYING') {
        const decision = evaluateDecisionSync(input, 3, s.userName, 'service');
        setState((prev) => ({
          ...prev,
          phase: 'CAPTURING_PHONE',
          step: 3,
          lastDecision: decision,
          avatarState: transitionToSpeaking(decision.clipKey, decision.emotion),
          displayText: decision.spokenText,
          isProcessing: false,
          messages: newMessages,
        }));
        return;
      }

      // Step 4: Capture phone
      if (s.phase === 'CAPTURING_PHONE') {
        const phoneClean = input.replace(/\D/g, '').slice(-10);
        if (phoneClean.length === 10) {
          const leadData: LeadData = {
            name: s.userName || 'Indian Founder',
            businessName: s.businessName || 'Not Specified',
            phone: phoneClean,
            industry: s.industry || 'General',
            serviceInterest: s.lastInput,
            transcript: newMessages.map((m, i) => ({
              role: m.role,
              text: m.content,
              timestamp: i,
            })),
          };

          const result = await submitLead(leadData);
          const decision = evaluateDecisionSync('', 4, s.userName);

          setState((prev) => ({
            ...prev,
            phone: phoneClean,
            phase: 'SUCCESS',
            step: 5,
            lastDecision: decision,
            avatarState: transitionToSpeaking('THANKS', 'warm'),
            displayText: decision.spokenText,
            leadSubmitted: result.success,
            isProcessing: false,
            messages: newMessages,
          }));
          return;
        }

        // Phone not valid
        const clarifyDecision = evaluateDecisionSync('', 3, s.userName, 'clarify');
        setState((prev) => ({
          ...prev,
          lastDecision: clarifyDecision,
          avatarState: transitionToSpeaking('CLARIFY', 'neutral'),
          displayText: 'कृपया सही 10 अंकों का WhatsApp नंबर बोलिए।',
          isProcessing: false,
        }));
        return;
      }

      // Step 5: Success → restart or end
      if (s.phase === 'SUCCESS') {
        if (/हाँ|yes|again|शुरू|दुबारा|बोल/i.test(input)) {
          setState({
            phase: 'INIT',
            step: 0,
            userName: '',
            businessName: '',
            industry: '',
            phone: '',
            lastDecision: getIdleDecision(),
            avatarState: createInitialState(),
            displayText: '',
            isProcessing: false,
            leadSubmitted: false,
            messages: [],
            lastInput: '',
            isUserSpeaking: false,
          });
          return;
        }
        const byeDecision = evaluateDecisionSync('', 5, s.userName);
        setState((prev) => ({
          ...prev,
          lastDecision: byeDecision,
          avatarState: transitionToSpeaking('THANKS', 'warm'),
          displayText: byeDecision.spokenText,
          isProcessing: false,
        }));
        return;
      }

      // Fallback: Agnes AI
      try {
        const aiResponse = await sendToAgnesAI(newMessages, {
          userName: s.userName,
          businessName: s.businessName,
          step: s.step,
        });

        const decision = evaluateDecisionSync(
          aiResponse.speech,
          s.step,
          s.userName,
          aiResponse.detected_track || undefined,
        );

        setState((prev) => ({
          ...prev,
          lastDecision: decision,
          avatarState: transitionToSpeakingLoop(decision.emotion),
          displayText: aiResponse.speech,
          isProcessing: false,
          messages: [
            ...newMessages,
            { role: 'assistant' as const, content: aiResponse.speech },
          ],
        }));
      } catch {
        const fallbackDecision = evaluateDecisionSync('', s.step, s.userName, 'error');
        setState((prev) => ({
          ...prev,
          lastDecision: fallbackDecision,
          avatarState: transitionToSpeakingLoop('empathetic'),
          displayText: fallbackDecision.spokenText,
          isProcessing: false,
        }));
      }
    },
    [resetInactivityTimer],
  );

  return {
    state,
    startConversation,
    processUserInput,
    handleClipComplete,
    handleUserStartSpeaking,
    handleUserStopSpeaking,
    resetInactivityTimer,
  };
}
