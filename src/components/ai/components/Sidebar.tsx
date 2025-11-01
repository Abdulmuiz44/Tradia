import React from 'react';
import { Button } from '@/components/ui/button';
import { History, Settings, PlusCircle, Download } from 'lucide-react';

interface SidebarProps {
  onExport?: () => void;
  canExport?: boolean;
  onChatHistory?: () => void;
  onSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ onExport, canExport = true, onChatHistory, onSettings }) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Tradia AI</h3>
      <Button variant="ghost" className="justify-start text-gray-300 hover:text-white hover:bg-gray-800" onClick={onChatHistory}>
      <History className="w-4 h-4 mr-2" /> Chat History
      </Button>
      <Button variant="ghost" className="justify-start text-gray-300 hover:text-white hover:bg-gray-800 mt-2" onClick={onSettings}>
      <Settings className="w-4 h-4 mr-2" /> Settings
      </Button>
      {canExport && (
        <Button
          variant="ghost"
          className="justify-start text-gray-300 hover:text-white hover:bg-gray-800 mt-2"
          onClick={onExport}
        >
          <Download className="w-4 h-4 mr-2" /> Export Chat
        </Button>
      )}
      <div className="mt-auto">
        <Button variant="outline" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </div>
    </div>
  );
});
