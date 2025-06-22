import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  createWorkspaceWithUpload, 
  createPage, 
  addPageToWorkspace,
  supabase 
} from '../util/supabase'
import { realClaudeAPI } from '../services/claude'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageFile: File | null
}

export default function ImageModal({ isOpen, onClose, imageFile }: ImageModalProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [responseText, setResponseText] = useState<string | null>(null)

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    return '📎'
  }

  const getFileTypeText = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'Image File'
    return 'Document'
  }

  const handleGenerateReview = async () => {
    if (!imageFile) return

    console.log('🚀 Starting generate review process...')
    setIsLoading(true)
    setResponseText(null)

    try {
      console.log('📋 Step 1: Getting user session...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No user session found')
      console.log('✅ User session found:', session.user.id)

      const userId = session.user.id
      const workspaceTitle = imageFile.name.replace(/\.[^/.]+$/, '')
      console.log('📝 Workspace title:', workspaceTitle)

      console.log('📄 Step 2: Converting file to base64...')
      const base64 = await toBase64(imageFile)
      const mime = imageFile.type
      console.log('✅ File converted to base64, size:', base64.length)

      console.log('🤖 Step 3: Calling Claude API...')
      const result = await realClaudeAPI(base64, mime)
      console.log('✅ Claude API response received:', result)
      
      const text = result?.content?.[0]?.text || ''
      
      // Parse the JSON response from Claude
      let parsedResponse: { title: string; questions: string[] } | null = null
      try {
        parsedResponse = JSON.parse(text)
        console.log('✅ Parsed Claude response:', parsedResponse)
      } catch (error) {
        console.error('❌ Failed to parse Claude response as JSON:', error)
        // Fallback to old format if JSON parsing fails
        const questions = text.split('\n').filter(Boolean)
        parsedResponse = {
          title: imageFile.name.replace(/\.[^/.]+$/, ''),
          questions
        }
      }
      
      if (!parsedResponse) {
        throw new Error('Failed to parse Claude response')
      }
      
      const { title, questions } = parsedResponse
      console.log('📚 Questions extracted:', questions.length, 'questions')
      console.log('📝 Workspace title from Claude:', title)

      console.log('📁 Step 4: Creating workspace with file upload...')
      const { data: workspaceData, error: workspaceError } = await createWorkspaceWithUpload(
        title, // Use the title from Claude response
        imageFile,
        userId
      )

      if (workspaceError || !workspaceData) {
        console.error('❌ Workspace creation failed:', workspaceError)
        throw workspaceError || new Error('Workspace creation failed')
      }

      const { workspace, upload } = workspaceData
      console.log('✅ Workspace created successfully:', workspace.workspace_id)
      console.log('📄 File uploaded:', upload.fileName, 'at', upload.url)

      console.log('📄 Step 5: Creating pages for each question...')
      const pageIds: string[] = []
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        console.log(`📝 Creating page ${i + 1}/${questions.length}:`, question.substring(0, 50) + '...')
        
        const { data: page, error: pageError } = await createPage({}, question)
        if (page && !pageError) {
          pageIds.push(page.page_id)
          console.log(`✅ Page ${i + 1} created with ID:`, page.page_id)
          
          console.log(`🔗 Adding page ${page.page_id} to workspace ${workspace.workspace_id}...`)
          const { error: addError } = await addPageToWorkspace(workspace.workspace_id, page.page_id)
          if (addError) {
            console.error(`❌ Error adding page ${page.page_id} to workspace:`, addError)
          } else {
            console.log(`✅ Page ${page.page_id} added to workspace successfully`)
          }
        } else {
          console.error(`❌ Error creating page ${i + 1}:`, pageError)
        }
      }

      console.log('📋 All pages created. Page IDs:', pageIds)

      console.log('🔄 Step 6: Updating workspace with question list...')
      const { error: updateError } = await supabase.from('workspaces').update({ 
        question_list: questions,
        num_completed: 0
      }).eq('workspace_id', workspace.workspace_id)

      if (updateError) {
        console.error('❌ Error updating workspace:', updateError)
      } else {
        console.log('✅ Workspace updated with question list successfully')
      }

      console.log('🎉 Process completed successfully!')
      console.log('📊 Final Summary:', {
        workspaceId: workspace.workspace_id,
        workspaceTitle: title,
        fileUploaded: upload.fileName,
        questionsCount: questions.length,
        pagesCreated: pageIds.length,
        pageIds
      })

      // Navigate to the newly created workspace instead of showing success text
      onClose() // Close the modal
      navigate(`/problem-space/${workspace.workspace_id}`)

    } catch (error) {
      console.error('💥 Error in generate review process:', error)
      setResponseText(`❌ Error: ${error instanceof Error ? error.message : 'Unexpected error'}`)
    } finally {
      console.log('🏁 Generate review process finished')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {imageFile?.name || 'Document'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-100 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center">
            <div className="text-6xl text-gray-400 mb-4">{getFileIcon(imageFile?.type || '')}</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{imageFile?.name}</h3>
            <p className="text-gray-500">{getFileTypeText(imageFile?.type || '')}</p>
            <div className="mt-4 text-sm text-gray-400">
              Size: {imageFile?.size ? (imageFile.size / 1024 / 1024).toFixed(2) : '0'} MB
            </div>
          </div>

          {responseText && (
            <div className="mt-6 bg-red-50 border border-red-200 p-4 rounded-md text-sm whitespace-pre-wrap text-red-700">
              {responseText}
            </div>
          )}
        </div>

        <div className="border-t p-6 flex justify-end">
          <button
            onClick={handleGenerateReview}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate Review</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
