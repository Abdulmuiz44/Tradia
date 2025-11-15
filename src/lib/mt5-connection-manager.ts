// MT5 Connection Manager stub
import { MT5Credentials, ConnectionStatus } from '@/types/mt5';

export const mt5ConnectionManager = {
  connect: async (credentials: MT5Credentials): Promise<ConnectionStatus> => {
    return 'disconnected';
  },
  disconnect: async (): Promise<void> => {},
  getStatus: (): ConnectionStatus => 'disconnected',
  validateConnection: async (credentials: MT5Credentials, options?: any): Promise<{ success: boolean; isValid: boolean; status: ConnectionStatus; error?: string }> => {
    return { success: false, isValid: false, status: 'disconnected' };
  },
};
