import React from "react";

interface ProgressBarProps {
  progress: number;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
      <div
        className="h-full bg-indigo-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
