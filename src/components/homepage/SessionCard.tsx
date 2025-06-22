import { useState } from "react";
import { useNavigate } from "react-router-dom";
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import ProgressBar from "./ProgressBar";

interface SessionCardProps {
  title: string;
  status: "in progress" | "completed";
  completed: number;
  total: number;
  fileName: string;
  sessionId?: string;
  questions?: string[]; // Add questions prop for real data
}

export default function SessionCard({
  title,
  status,
  completed,
  total,
  fileName,
  sessionId = "1",
  questions = [], // Default to empty array
}: SessionCardProps) {
  const [showQuestions, setShowQuestions] = useState(false);
  const navigate = useNavigate();
  const isCompleted = status === "completed";
  const progress = Math.round((completed / total) * 100);

  const handlePreviewQuestions = () => {
    setShowQuestions(!showQuestions);
  };

  const handleResume = () => {
    navigate(`/problem-space/${sessionId}`);
  };

  // Use real questions if available, otherwise show a placeholder
  const displayQuestions = questions.length > 0 ? questions : [
    "Question data not available",
    "Please check the workspace details"
  ];

  return (
    <div className="border border-gray-700 rounded-lg p-6 bg-gray-900/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-lg text-white font-karla">{title}</h2>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${
            isCompleted
              ? "bg-green-900/30 text-green-400 border border-green-500/30"
              : "bg-yellow-900/30 text-yellow-400 border border-yellow-500/30"
          }`}
        >
          {isCompleted ? "Completed" : "In Progress"}
        </span>
      </div>

      {/* Progress Info */}
      <p className="text-sm text-gray-300 mb-2 font-ibm-plex">
        {isCompleted
          ? "Finished"
          : `${completed} of ${total} questions completed`}
      </p>
      {!isCompleted && <ProgressBar progress={progress} />}

      {/* File info */}
      <p className="text-xs text-gray-500 mt-3 font-ibm-plex">Created from {fileName}</p>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between items-center">
        {/* Left side - View PDF */}
        <button className="bg-green-600/20 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-md hover:bg-green-600/30 transition-all duration-300 flex items-center gap-2 font-ibm-plex">
          📄 View Image
        </button>
        
        {/* Right side - Resume and Preview Questions */}
        <div className="flex gap-3">
          <button 
            onClick={handlePreviewQuestions}
            className="border border-gray-600 text-gray-300 text-sm px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800/50 transition-all duration-300 font-ibm-plex"
          >
            👁️ {showQuestions ? 'Hide Questions' : 'Preview Questions'}
          </button>
          <button 
            onClick={handleResume}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm px-4 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-ibm-plex"
          >
            {isCompleted ? "View" : "Resume"}
          </button>
        </div>
      </div>

      {/* Questions Preview Section */}
      {showQuestions && (
        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 font-karla">Preview Questions</h3>
          <div className="space-y-4">
            {displayQuestions.map((question, index) => (
              <div key={index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start space-x-4">
                  <span className="bg-blue-600/30 text-blue-400 font-semibold rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 border border-blue-500/30">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="bg-gray-800/50 rounded p-4 mb-3 border border-gray-600">
                      <div className="text-sm text-gray-200">
                        <BlockMath>{String.raw`${question}`}</BlockMath>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-ibm-plex">
                      <strong>Status:</strong> 
                      <span className="ml-1">
                        {index < completed ? "Completed" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
