import Vapi from "@vapi-ai/web";

const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);

interface PendingContext {
  text: string;
  canvasDescription?: string;
}

let pendingContext: PendingContext | null = null;

// Listen for call-start event to send pending context
vapi.on('call-start', () => {
  if (pendingContext) {
    // Send the context message once the call is established
    let messageContent = `You are a helpful math tutor. A student needs assistance with a math problem. Please analyze their work and provide immediate guidance.

Question: ${pendingContext.text}

Student's Work: ${pendingContext.canvasDescription || 'No work shown yet'}

Instructions:
1. First, analyze what the student has written/drawn on their canvas
2. Identify any mistakes or areas where they might be stuck
3. Provide specific, actionable advice on how to approach the problem correctly
4. Give step-by-step guidance if needed
5. Be encouraging and supportive while being direct about any errors
6. Focus on helping them understand the concept, not just getting the answer

Please start by describing what you see in their work and then provide your guidance.`;
    
    vapi.send({
      type: 'add-message',
      message: {
        role: 'user',
        content: messageContent
      }
    });
    pendingContext = null;
  }
});

export function startVapi(context: string, canvasDescription?: string) {
  // Store the context and description to be sent when the call starts
  pendingContext = {
    text: context,
    canvasDescription
  };
  
  vapi.start(import.meta.env.VITE_VAPI_ASSISTANT_ID);
}

export function stopVapi() {
  vapi.stop();
  pendingContext = null;
}

export default vapi; 