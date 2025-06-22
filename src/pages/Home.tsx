import React, { useState, useEffect } from "react";
import type { Session } from '@supabase/supabase-js'
import { supabase, signOut, getUserWorkspacesWithPages } from '../util/supabase'
import UploadBox from "../components/homepage/UploadBox";
import SessionList from "../components/homepage/SessionList";
import ImageModal from "../components/FileModal";
import UserProfileDropdown from "../components/UserProfileDropdown";

interface HomeProps {
  session: Session
}

// Define the workspace type based on our database schema
interface WorkspaceWithPages {
  workspace_id: string;
  title: string;
  upload_url?: string;
  page_id_list?: string[];
  question_list?: string[];
  num_completed?: number;
  created_at: string;
  pages: Array<{
    page_id: string;
    question?: string;
    is_complete: boolean;
    snapshot: any;
    created_at: string;
  }>;
  completedCount: number;
  totalCount: number;
  status: "in progress" | "completed";
}

export default function Home({ session }: HomeProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceWithPages[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load workspaces from Supabase
  const loadWorkspaces = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('🔄 Loading workspaces for user:', session.user.id)
      const { data, error } = await getUserWorkspacesWithPages(session.user.id)
      
      if (error) {
        console.error('❌ Error loading workspaces:', error)
        setError('Failed to load workspaces')
        return
      }
      
      console.log('✅ Workspaces loaded:', data?.length || 0, 'workspaces')
      setWorkspaces(data || [])
    } catch (err) {
      console.error('💥 Error in loadWorkspaces:', err)
      setError('Failed to load workspaces')
    } finally {
      setIsLoading(false)
    }
  }

  // Load workspaces on component mount and after modal closes
  useEffect(() => {
    loadWorkspaces()
  }, [session.user.id])

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleFileUpload = (file: File) => {
    // Check if file is an image
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    if (allowedTypes.includes(file.type)) {
      setUploadedImage(file)
      setIsImageModalOpen(true)
    } else {
      alert('Please upload an image file (JPEG, PNG, GIF, WebP)')
    }
  }

  const closeImageModal = () => {
    setIsImageModalOpen(false)
    setUploadedImage(null)
    // Reload workspaces after modal closes to show new workspace
    loadWorkspaces()
  }

  // Convert workspaces to the format expected by SessionList
  const sessions = workspaces.map((workspace, index) => ({
    id: index + 1, // Use index as ID since we don't have a numeric ID
    title: workspace.title || 'Untitled Workspace',
    status: workspace.status,
    completed: workspace.completedCount,
    total: workspace.totalCount,
    fileName: workspace.upload_url ? 'Uploaded Image' : 'No file',
    workspaceId: workspace.workspace_id, // Add workspace ID for navigation
    questions: workspace.question_list || [] // Add questions for preview
  }))

  return (
    <div className="min-h-screen bg-black">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-indigo-900/10 animate-pulse"></div>
      
      {/* Navbar */}
      <nav className="relative z-10 bg-black/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-white font-karla">Euclid</h1>
            <UserProfileDropdown session={session} onSignOut={handleSignOut} />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Top message */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4 font-karla">
            Welcome back, {session.user.email}!
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300 font-ibm-plex">
            Here's your study dashboard with recent sessions.
          </p>
        </div>

        {/* Upload prompt */}
        <UploadBox onFileUpload={handleFileUpload} />

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400 font-ibm-plex">Loading your workspaces...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center text-red-400">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="font-ibm-plex">{error}</span>
            </div>
            <button 
              onClick={loadWorkspaces}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline font-ibm-plex"
            >
              Try again
            </button>
          </div>
        )}

        {/* Session cards */}
        {!isLoading && !error && (
          <>
            {sessions.length > 0 ? (
              <SessionList sessions={sessions} />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-600 mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2 font-karla">No workspaces yet</h3>
                <p className="text-gray-500 font-ibm-plex">Upload an image to create your first study session!</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageFile={uploadedImage}
      />
    </div>
  );
}
