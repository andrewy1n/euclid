import React, { useState, useEffect } from "react";
import type { Session } from '@supabase/supabase-js'
import { supabase, signOut, getUserWorkspacesWithPages } from '../util/supabase'
import UploadBox from "../components/homepage/UploadBox";
import SessionList from "../components/homepage/SessionList";
import ImageModal from "../components/FileModal";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-800">My App</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {session.user.email}</span>
              <button 
                onClick={handleSignOut}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Top message */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome back, {session.user.email}!
          </h2>
          <p className="text-xl text-gray-600">
            Here's your study dashboard with recent sessions.
          </p>
        </div>

        {/* Upload prompt */}
        <UploadBox onFileUpload={handleFileUpload} />

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your workspaces...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-red-700">
              <span className="text-red-500 mr-2">⚠️</span>
              <span>{error}</span>
            </div>
            <button 
              onClick={loadWorkspaces}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
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
                <div className="text-6xl text-gray-300 mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No workspaces yet</h3>
                <p className="text-gray-500">Upload an image to create your first study session!</p>
              </div>
            )}
          </>
        )}

        {/* Account Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto mt-12">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Your Account Info</h3>
          <div className="space-y-2 text-left">
            <p>
              <span className="font-medium">Email:</span> {session.user.email}
            </p>
            <p>
              <span className="font-medium">User ID:</span> {session.user.id}
            </p>
            <p>
              <span className="font-medium">Last Sign In:</span>{" "}
              {new Date(session.user.last_sign_in_at || "").toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Workspaces:</span> {workspaces.length}
            </p>
          </div>
        </div>
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
