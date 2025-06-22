// Mock Claude API service
export interface ClaudeResponse {
  content: Array<{
    text: string;
    type: string;
  }>;
}

export const mockClaudeAPI = async (base64: string, mime: string): Promise<ClaudeResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock response with sample questions
  const mockQuestions = [
    "What is the derivative of f(x) = x²?",
    "Find the limit as x approaches 0 of sin(x)/x",
    "Calculate the integral of 2x dx",
    "What is the chain rule in calculus?",
    "Find the critical points of f(x) = x³ - 3x",
    "What is the power rule for derivatives?",
    "Calculate the derivative of e^x",
    "Find the antiderivative of 1/x"
  ];
  
  // Randomly select 3-6 questions
  const numQuestions = Math.floor(Math.random() * 4) + 3;
  const selectedQuestions = mockQuestions
    .sort(() => 0.5 - Math.random())
    .slice(0, numQuestions);
  
  // Create structured response with title and questions
  const structuredResponse = {
    title: "Calculus Review Questions",
    questions: selectedQuestions
  };
  
  return {
    content: [
      {
        text: JSON.stringify(structuredResponse, null, 2),
        type: 'text'
      }
    ]
  };
};

export const realClaudeAPI = async (base64: string, mime: string): Promise<ClaudeResponse> => {
  // Expected response format from Claude API:
  // {
  //   "title": "<Brief descriptive title for this question set>",
  //   "questions": [
  //     "<LaTeX-formatted question 1>",
  //     "<LaTeX-formatted question 2>",
  //     "<LaTeX-formatted question 3>",
  //     "<LaTeX-formatted question 4>",
  //     "<LaTeX-formatted question 5>"
  //   ]
  // }
  
  const response = await fetch('https://sclinsqexujpvpwqszyz.supabase.co/functions/v1/claude-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mime })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}; 