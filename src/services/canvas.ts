// Canvas description service using the see-canvas edge function
export interface CanvasDescriptionResponse {
  description: string;
  error?: string;
}

export const describeCanvas = async (imageBase64: string): Promise<CanvasDescriptionResponse> => {
  try {
    console.log('Calling see-canvas edge function...');
    
    const response = await fetch(
      'https://sclinsqexujpvpwqszyz.supabase.co/functions/v1/see-canvas',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ imageBase64 })
      }
    );

    console.log('Canvas description response status:', response.status);

    if (!response.ok) {
      throw new Error(`Canvas description error: ${response.status} ${response.statusText}`);
    }

    // Get the response as text first
    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);

    let description: string;

    // Try to parse as JSON first
    try {
      const result = JSON.parse(responseText);
      description = result.description || result.text || result.message || responseText;
    } catch (jsonError) {
      // If JSON parsing fails, use the raw text as description
      console.log('📝 Response is plain text, using as-is');
      description = responseText;
    }

    console.log('✅ Canvas description extracted:', description);

    return {
      description: description || 'No description available'
    };
  } catch (error) {
    console.error('❌ Error getting canvas description:', error);
    return {
      description: 'Unable to describe canvas content',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 