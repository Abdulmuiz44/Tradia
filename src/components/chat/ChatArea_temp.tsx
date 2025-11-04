import React from "react";

/**
 * Placeholder component retained only so historical prototypes remain referenced without
 * causing lint/runtime errors. The real chat area now lives in `TradiaAIChat`.
 */
const ChatAreaTemp: React.FC = () => {
  return (
    <div className="rounded-lg border border-dashed border-slate-600/40 p-6 text-sm text-slate-400">
      Legacy chat area prototype has moved. This placeholder prevents unused markup fragments from breaking lint checks.
    </div>
  );
};

export default ChatAreaTemp;
