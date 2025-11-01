import { useReducer } from 'react';
import { ChatState, ChatAction, Message, UserTier } from '../types';
import { getOnboardingMessage, isGrokUnlocked, isUserAdmin } from '../utils';

const initialState: ChatState = {
  messages: [],
  inputMessage: '',
  isTyping: false,
  assistantMode: 'coach',
  userTier: 'free',
  userEmail: '',
  isAdmin: false,
  grokUnlocked: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_INPUT':
      return { ...state, inputMessage: action.payload };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'SET_MODE':
      return { ...state, assistantMode: action.payload };
    case 'SET_USER_TIER':
      return { ...state, userTier: action.payload };
    case 'SET_USER_EMAIL':
      return { ...state, userEmail: action.payload };
    case 'SET_GROK_UNLOCKED':
      return { ...state, grokUnlocked: action.payload };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    case 'CLEAR_SEARCH':
      return { ...state, searchResults: undefined };
    default:
      return state;
  }
}

export function useChatReducer(initialTier: UserTier['type'], initialEmail: string, tradesLength: number) {
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    userTier: initialTier,
    userEmail: initialEmail,
    isAdmin: isUserAdmin(initialEmail),
    grokUnlocked: isGrokUnlocked(initialTier, isUserAdmin(initialEmail)),
    assistantMode: isGrokUnlocked(initialTier, isUserAdmin(initialEmail)) ? 'grok' : 'coach',
    messages: [
      {
        id: 'ai-welcome',
        type: 'assistant',
        content: getOnboardingMessage(
          initialTier,
          isGrokUnlocked(initialTier, isUserAdmin(initialEmail)) ? 'grok' : 'coach',
          tradesLength,
          isUserAdmin(initialEmail),
          isGrokUnlocked(initialTier, isUserAdmin(initialEmail))
        ),
        timestamp: new Date(),
        mode: isGrokUnlocked(initialTier, isUserAdmin(initialEmail)) ? 'grok' : 'coach',
        variant: 'system',
      },
    ],
  });

  return { state, dispatch };
}
