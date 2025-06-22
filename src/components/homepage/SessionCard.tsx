import React, { useState } from "react";
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
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-lg text-gray-800">{title}</h2>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            isCompleted
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isCompleted ? "Completed" : "In Progress"}
        </span>
      </div>

      {/* Progress Info */}
      <p className="text-sm text-gray-600 mb-1">
        {isCompleted
          ? "Finished"
          : `${completed} of ${total} questions completed`}
      </p>
      {!isCompleted && <ProgressBar progress={progress} />}

      {/* File info */}
      <p className="text-xs text-gray-400 mt-2">Created from {fileName}</p>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-between items-center">
        {/* Left side - View PDF */}
        <button className="bg-green-500 text-white text-sm px-4 py-2 rounded-md hover:bg-green-600 transition flex items-center gap-1">
          📄 View Image
        </button>
        
        {/* Right side - Resume and Preview Questions */}
        <div className="flex gap-2">
          <button 
            onClick={handlePreviewQuestions}
            className="border border-gray-300 text-sm px-4 py-2 rounded-md flex items-center gap-1 hover:bg-gray-100 transition"
          >
            👁️ {showQuestions ? 'Hide Questions' : 'Preview Questions'}
          </button>
          <button 
            onClick={handleResume}
            className="bg-indigo-500 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-600 transition"
          >
            {isCompleted ? "View" : "Resume"}
          </button>
        </div>
      </div>

      {/* Questions Preview Section */}
      {showQuestions && (
        <div className="mt-4 bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Preview Questions</h3>
          <div className="space-y-3">
            {displayQuestions.map((question, index) => (
              <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-100 text-blue-800 font-semibold rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded p-3 mb-2">
                      <div className="text-sm text-gray-700">
                        <BlockMath>{String.raw`${question}`}</BlockMath>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
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
