import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tldraw, useEditor, getSnapshot, loadSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { getWorkspaceWithPages, updatePage } from '../util/supabase';
import { startVapi, stopVapi } from '../services/vapi';
import { describeCanvas } from '../services/canvas';
import vapi from '../services/vapi';

interface Question {
  page_id: string;
  question?: string;
  is_complete: boolean;
  snapshot: any;
  created_at: string;
}

interface WorkspaceData {
  workspace_id: string;
  title: string;
  upload_url?: string;
  page_id_list?: string[];
  question_list?: string[];
  num_completed?: number;
  created_at: string;
  pages: Question[];
  completedCount: number;
  totalCount: number;
  status: "in progress" | "completed";
}

// Custom UI component that will be rendered inside Tldraw
function SubmitHelpButtons({ 
  questionId, 
  currentQuestion, 
  onSnapshotUpdate,
  setSave,
  onQuestionComplete
}: { 
  questionId: string; 
  currentQuestion: Question;
  onSnapshotUpdate?: (pageId: string, snapshot: any) => void;
  setSave?: (fn: () => Promise<void>) => void;
  onQuestionComplete?: () => void;
}) {
  const editor = useEditor();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [helpStatus, setHelpStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [isCallActive, setIsCallActive] = useState(false);

  // Load snapshot from Supabase when question changes
  useEffect(() => {
    if (editor) {
      // Use a timeout to ensure editor is fully initialized
      const timeoutId = setTimeout(() => {
        try {
          if (currentQuestion?.snapshot) {
            // Reset tool state
            editor.setCurrentTool('select');
            
            // Load the snapshot from Supabase (this will replace all content)
            loadSnapshot(editor.store, currentQuestion.snapshot);
            
            console.log('✅ Snapshot loaded from Supabase for question:', questionId);
          } else {
            // No saved snapshot, ensure clean state
            editor.setCurrentTool('select');
            console.log('🆕 Starting fresh canvas for question:', questionId);
          }
        } catch (error) {
          console.error('❌ Error loading snapshot from Supabase:', error);
        }
      }, 100); // Small delay to ensure editor is ready
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentQuestion?.snapshot, editor, questionId]);

  // Listen for Vapi call events
  useEffect(() => {
    const handleCallStart = () => {
      setIsCallActive(true);
      setHelpStatus('loaded');
      console.log('✅ Vapi call started');
    };

    const handleCallEnd = () => {
      setIsCallActive(false);
      setHelpStatus('idle');
      console.log('✅ Vapi call ended');
    };

    const handleCallError = (error: any) => {
      setIsCallActive(false);
      setHelpStatus('error');
      console.error('❌ Vapi call error:', error);
      setTimeout(() => setHelpStatus('idle'), 3000);
    };

    // Add event listeners
    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleCallEnd);
    vapi.on('error', handleCallError);

    // Cleanup event listeners
    return () => {
      vapi.off('call-start', handleCallStart);
      vapi.off('call-end', handleCallEnd);
      vapi.off('error', handleCallError);
    };
  }, []);

  // Save snapshot function
  const saveSnapshot = useCallback(async () => {
    if (!editor) return;
    
    try {
      const { document, session } = getSnapshot(editor.store);
      const snapshotData = { document, session };
      
      // Save to Supabase
      const { error } = await updatePage(questionId, { snapshot: snapshotData });
      
      if (error) {
        console.error('❌ Error saving snapshot:', error);
      } else {
        console.log('✅ Snapshot saved to Supabase for question:', questionId);
        // Update local state if callback provided
        onSnapshotUpdate?.(questionId, snapshotData);
      }
    } catch (error) {
      console.error('❌ Error in save:', error);
    }
  }, [editor, questionId, onSnapshotUpdate]);

  const handleSubmit = useCallback(async () => {
    if (!editor || !currentQuestion?.question) {
      console.warn('🛑 Missing editor or question text.');
      return;
    }

    setSubmitStatus('submitting');
    console.log('📤 Submitting canvas image for question:', currentQuestion.page_id);

    try {
      // Capture canvas as image using Editor.toImage
      const canvasImage = await editor.toImage(editor.getSelectedShapeIds(), { format: 'png' });
      console.log('📸 Canvas image captured');

      // Save snapshot to Supabase (for persistence)
      const { document, session } = getSnapshot(editor.store);
      const snapshotData = { document, session };

      console.log('💾 Saving snapshot to Supabase...');
      const { error } = await updatePage(currentQuestion.page_id, { snapshot: snapshotData });
      if (error) {
        console.error('❌ Error saving to Supabase:', error);
        throw error;
      }
      console.log('✅ Snapshot saved to Supabase.');

      // Convert image Blob to base64
      const toBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]); // extract raw base64
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

      const base64 = await toBase64(canvasImage.blob);
      console.log('📦 Base64 image prepared');

      // Prepare payload for Edge Function
      const payload = {
        imageBase64: base64, // ✅ fixed key
        question: currentQuestion.question
      };

      console.log('📡 Sending canvas image to Edge Function');

      const response = await fetch(
        'https://sclinsqexujpvpwqszyz.supabase.co/functions/v1/check-problem',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(payload)
        }
      );

      console.log('📬 Response status:', response.status);

      const result = await response.json();
      console.log('✅ Claude evaluation result:', result);

      if (result.isCorrect === true) {
        alert('✅ Your answer is correct!');
        
        // Automatically mark the problem as complete
        if (!currentQuestion.is_complete) {
          const { error: updateError } = await updatePage(currentQuestion.page_id, {
            is_complete: true
          });
          
          if (updateError) {
            console.error('❌ Error marking question as complete:', updateError);
          } else {
            // Update local state
            onQuestionComplete?.();
            
            console.log('✅ Question automatically marked as complete');
          }
        }
      } else if (result.isCorrect === false) {
        alert(`❌ Incorrect answer.\nReason: ${result.explanation}`);
      } else {
        alert('⚠️ No verdict from AI grader.');
      }

      setSubmitStatus('submitted');
      onSnapshotUpdate?.(currentQuestion.page_id, snapshotData);

      setTimeout(() => setSubmitStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ Error during submission process:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  }, [editor, currentQuestion, onQuestionComplete, onSnapshotUpdate]);

  // Register save function with parent component
  useEffect(() => {
    if (setSave) {
      setSave(saveSnapshot);
    }
  }, [saveSnapshot, setSave]);

  const handleAskForHelp = useCallback(async () => {
    if (!editor) return;
    
    try {
      if (isCallActive) {
        // If call is active, stop it
        stopVapi();
        setIsCallActive(false);
        setHelpStatus('idle');
        console.log('✅ Vapi call stopped');
      } else {
        // If no call is active, start it with context and canvas description
        setHelpStatus('loading');
        
        // Capture canvas as image
        const canvasImage = await editor.toImage(editor.getSelectedShapeIds(), { format: 'png' });
        console.log('📸 Canvas image captured for description');
        
        // Convert image Blob to base64 for the description service
        const toBase64 = (blob: Blob): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]); // extract raw base64
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

        const imageBase64 = await toBase64(canvasImage.blob);
        
        // Get canvas description from the edge function
        console.log('🔍 Getting canvas description...');
        const { description: canvasDescription } = await describeCanvas(imageBase64);
        console.log('✅ Canvas description:', canvasDescription);
        
        // Create context message with the question
        const contextMessage = `Hi! I need help with this math problem: ${currentQuestion.question}`;
        
        // Start Vapi with the context and canvas description (no image)
        startVapi(contextMessage, canvasDescription);

        console.log('✅ Vapi call started for question:', questionId);
      }
    } catch (error) {
      console.error('❌ Error with Vapi call:', error);
      setHelpStatus('error');
      setIsCallActive(false);
      setTimeout(() => setHelpStatus('idle'), 3000);
    }
  }, [editor, questionId, isCallActive, currentQuestion.question]);

  const getSubmitButtonText = () => {
    switch (submitStatus) {
      case 'submitting': return '📤 Submitting...';
      case 'submitted': return '✅ Submitted!';
      case 'error': return '❌ Error';
      default: return '📤 Submit';
    }
  };

  const getHelpButtonText = () => {
    if (isCallActive) {
      return '📞 End Call';
    }
    
    switch (helpStatus) {
      case 'loading': return '🤔 Starting...';
      case 'loaded': return '📞 Call Active';
      case 'error': return '❌ Error';
      default: return '🤔 Ask for Help';
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 flex space-x-2">
      <button
        onClick={handleSubmit}
        disabled={submitStatus === 'submitting'}
        className={`font-semibold py-3 px-6 rounded-lg transition-colors text-sm shadow-lg ${
          submitStatus === 'submitted' 
            ? 'bg-green-600 text-white' 
            : submitStatus === 'error'
            ? 'bg-red-600 text-white'
            : submitStatus === 'submitting'
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {getSubmitButtonText()}
      </button>
      <button
        onClick={handleAskForHelp}
        disabled={helpStatus === 'loading'}
        className={`font-semibold py-3 px-6 rounded-lg transition-colors text-sm shadow-lg ${
          isCallActive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : helpStatus === 'loaded'
            ? 'bg-green-600 text-white'
            : helpStatus === 'error'
            ? 'bg-red-600 text-white'
            : helpStatus === 'loading'
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {getHelpButtonText()}
      </button>
    </div>
  );
}

export default function ProblemSpace() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveFunction, setSaveFunction] = useState<(() => Promise<void>) | null>(null);

  // Load workspace data from Supabase
  const loadWorkspaceData = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading workspace data for:', sessionId);
      const { data, error } = await getWorkspaceWithPages(sessionId);
      
      if (error) {
        console.error('❌ Error loading workspace:', error);
        setError('Failed to load workspace data');
        return;
      }
      
      if (!data) {
        setError('Workspace not found');
        return;
      }
      
      console.log('✅ Workspace data loaded:', data);
      setWorkspaceData(data);
    } catch (err) {
      console.error('💥 Error in loadWorkspaceData:', err);
      setError('Failed to load workspace data');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Load data on component mount
  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const questions = workspaceData?.pages || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // Save current question before navigating
      if (saveFunction) {
        saveFunction();
      }
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, totalQuestions, saveFunction]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      // Save current question before navigating
      if (saveFunction) {
        saveFunction();
      }
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex, saveFunction]);

  const goBackToHome = useCallback(() => {
    navigate('/home');
  }, [navigate]);

  // Handle snapshot updates
  const handleSnapshotUpdate = useCallback((pageId: string, snapshot: any) => {
    setWorkspaceData(prev => {
      if (!prev) return prev;
      
      const updatedPages = prev.pages.map(page => 
        page.page_id === pageId 
          ? { ...page, snapshot }
          : page
      );
      
      return {
        ...prev,
        pages: updatedPages
      };
    });
  }, []);

  // Set save function from child component
  const setSave = useCallback((fn: () => Promise<void>) => {
    setSaveFunction(() => fn);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Workspace</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={loadWorkspaceData}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={goBackToHome}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No workspace data
  if (!workspaceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Workspace Not Found</h2>
          <p className="text-gray-600 mb-4">The requested workspace could not be found.</p>
          <button
            onClick={goBackToHome}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // No questions
  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBackToHome}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to Home
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{workspaceData.title}</h1>
                  <p className="text-sm text-gray-500">Problem Space</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">❓</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Questions Available</h2>
            <p className="text-gray-600">This workspace doesn't have any questions yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Back button and session info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={goBackToHome}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Home
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{workspaceData.title}</h1>
                <p className="text-sm text-gray-500">Problem Space</p>
              </div>
            </div>

            {/* Right side - Question navigation */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={goToNextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 text-blue-800 font-semibold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                {currentQuestionIndex + 1}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Question {currentQuestionIndex + 1}</h2>
                <p className="text-sm text-gray-500">Solve the following problem</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                currentQuestion.is_complete
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {currentQuestion.is_complete ? "Finished" : "In Progress"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-6">
            {currentQuestion.question ? (
              // <p className="text-lg text-gray-700">{currentQuestion.question}</p>
              <BlockMath>{String.raw`${currentQuestion.question}`}</BlockMath>
            ) : (
              <p className="text-gray-500 italic">No question text available</p>
            )}
          </div>
        </div>

        {/* TLDraw Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-[600px]">
            <Tldraw>
              <SubmitHelpButtons 
                questionId={currentQuestion.page_id} 
                currentQuestion={currentQuestion}
                onSnapshotUpdate={handleSnapshotUpdate}
                setSave={setSave}
                onQuestionComplete={() => {
                  if (workspaceData) {
                    const updatedPages = workspaceData.pages.map((page, index) => 
                      index === currentQuestionIndex 
                        ? { ...page, is_complete: true }
                        : page
                    );
                    
                    const completedCount = updatedPages.filter(page => page.is_complete).length;
                    const status = completedCount === updatedPages.length && updatedPages.length > 0 ? 'completed' as const : 'in progress' as const;
                    
                    setWorkspaceData({
                      ...workspaceData,
                      pages: updatedPages,
                      completedCount,
                      status
                    });
                  }
                  
                  console.log('✅ Question automatically marked as complete');
                }}
              />
            </Tldraw>
          </div>
        </div>
      </div>
    </div>
  );
} 