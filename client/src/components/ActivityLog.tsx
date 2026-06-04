import React, { useEffect, useRef } from "react";
import { LogEntry } from "../types";

interface ActivityLogProps {
  entries: LogEntry[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ entries }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="activity-log">
      <div className="log-header">⚡ Battle Log</div>
      <div className="log-entries">
        {entries.map((entry, i) => (
          <div key={i} className={`log-entry ${entry.type}`}>
            {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
