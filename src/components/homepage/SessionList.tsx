import SessionCard from "./SessionCard";

interface Session {
  id: number;
  title: string;
  status: "in progress" | "completed";
  completed: number;
  total: number;
  fileName: string;
  workspaceId: string;
  questions?: string[];
}

interface SessionListProps {
  sessions: Session[];
}

export default function SessionList({ sessions }: SessionListProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-6 font-karla">Your Study Sessions</h3>
      {sessions.map((session) => (
        <SessionCard 
          key={session.workspaceId} 
          {...session} 
          sessionId={session.workspaceId}
        />
      ))}
    </div>
  );
}
