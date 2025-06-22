import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const checkUserInfoExists = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_info')
      .select('user_id, workspace_id_list')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.log('No existing user_info found (expected for new users):', error.message)
      return { exists: false, data: null, error }
    } else {
      console.log('Existing user_info found:', data)
      return { exists: true, data, error: null }
    }
  } catch (error) {
    console.error('Error checking user_info:', error)
    return { exists: false, data: null, error }
  }
}

export const getUserInfo = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_info')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error getting user_info:', error)
    return { data: null, error }
  }
}

export const updateUserInfo = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('user_info')
      .update(updates)
      .eq('user_id', userId)
      .select()
    
    return { data, error }
  } catch (error) {
    console.error('Error updating user_info:', error)
    return { data: null, error }
  }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// Helper function to generate UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const createWorkspace = async (title: string, uploadUrl?: string) => {
  try {
    const workspaceId = generateUUID();
    console.log('🆔 Generated workspace_id:', workspaceId);
    
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        workspace_id: workspaceId,
        title,
        upload_url: uploadUrl,
        page_id_list: [],
        question_list: [],
        num_completed: 0
      })
      .select()
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error creating workspace:', error)
    return { data: null, error }
  }
}

export const getWorkspace = async (workspaceId: string) => {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error getting workspace:', error)
    return { data: null, error }
  }
}

export const updateWorkspace = async (workspaceId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('workspace_id', workspaceId)
      .select()
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error updating workspace:', error)
    return { data: null, error }
  }
}

export const addPageToWorkspace = async (workspaceId: string, pageId: string) => {
  try {
    const { data: workspace, error: workspaceError } = await getWorkspace(workspaceId)
    if (workspaceError) throw workspaceError

    const currentPageList = workspace.page_id_list || []
    const updatedPageList = [...currentPageList, pageId]

    const { data, error } = await supabase
      .from('workspaces')
      .update({ page_id_list: updatedPageList })
      .eq('workspace_id', workspaceId)
      .select()
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error adding page to workspace:', error)
    return { data: null, error }
  }
}

export const createPage = async (snapshot: any, question?: string) => {
  try {
    const pageId = generateUUID();
    console.log('🆔 Generated page_id:', pageId);
    
    const { data, error } = await supabase
      .from('pages')
      .insert({
        page_id: pageId,
        snapshot,
        question,
        is_complete: false
      })
      .select()
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error creating page:', error)
    return { data: null, error }
  }
}

export const getPage = async (pageId: string) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('page_id', pageId)
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error getting page:', error)
    return { data: null, error }
  }
}

export const updatePage = async (pageId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .update(updates)
      .eq('page_id', pageId)
      .select()
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error updating page:', error)
    return { data: null, error }
  }
}

export const markPageComplete = async (pageId: string) => {
  try {
    const { data, error } = await supabase
      .from('pages')
      .update({ is_complete: true })
      .eq('page_id', pageId)
      .select()
      .single()
    
    return { data, error }
  } catch (error) {
    console.error('Error marking page complete:', error)
    return { data: null, error }
  }
}

export const addWorkspaceToUser = async (userId: string, workspaceId: string) => {
  try {
    console.log('👤 Adding workspace to user:', { userId, workspaceId })
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('❌ No authenticated session found')
      throw new Error('User must be authenticated to add workspace')
    }
    
    console.log('✅ User is authenticated:', session.user.id)
    
    const { exists, data: existingUserInfo } = await checkUserInfoExists(userId)
    console.log('📋 User info exists:', exists)
    
    if (!exists) {
      console.log('🆕 Creating new user_info record...')
      const { data, error } = await supabase
        .from('user_info')
        .insert({
          user_id: userId,
          workspace_id_list: [workspaceId]
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating user_info:', error)
        throw error
      }
      
      console.log('✅ User_info created successfully:', data)
      return { data, error }
    } else {
      console.log('🔄 Updating existing user_info...')
      console.log(existingUserInfo)
      const currentWorkspaceList = (existingUserInfo as any)?.workspace_id_list || []
      const updatedWorkspaceList = [...currentWorkspaceList, workspaceId]
      
      console.log(' Workspace lists:', {
        current: currentWorkspaceList,
        updated: updatedWorkspaceList
      })

      const { data, error } = await supabase
        .from('user_info')
        .update({ workspace_id_list: updatedWorkspaceList })
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error updating user_info:', error)
        throw error
      }
      
      console.log('✅ User_info updated successfully:', data)
      return { data, error }
    }
  } catch (error) {
    console.error('💥 Error in addWorkspaceToUser:', error)
    return { data: null, error }
  }
}

export const getUserWorkspaces = async (userId: string) => {
  try {
    const { data: userInfo, error: userError } = await getUserInfo(userId)
    if (userError) throw userError

    if (!userInfo || !userInfo.workspace_id_list || userInfo.workspace_id_list.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .in('workspace_id', userInfo.workspace_id_list)
      .order('created_at', { ascending: false })
    
    return { data, error }
  } catch (error) {
    console.error('Error getting user workspaces:', error)
    return { data: null, error }
  }
}

export const uploadFile = async (file: File) => {
  try {
    console.log('📁 Starting file upload...')
    console.log(' File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = fileName

    console.log('📂 Upload path:', filePath)

    console.log('📤 Uploading file to storage...')
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('❌ Upload error:', error)
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name
      })
      throw error
    }

    console.log('✅ File uploaded successfully:', data)

    // Get the public URL
    console.log(' Getting public URL...')
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath)

    console.log('✅ Public URL generated:', urlData.publicUrl)

    return { 
      data: { 
        path: filePath, 
        url: urlData.publicUrl,
        fileName: file.name 
      }, 
      error: null 
    }
  } catch (error) {
    console.error('💥 Error uploading file:', error)
    return { data: null, error }
  }
}

export const deleteFile = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('uploads')
      .remove([filePath])
    
    return { data, error }
  } catch (error) {
    console.error('Error deleting file:', error)
    return { data: null, error }
  }
}

export const createWorkspaceWithUpload = async (title: string, file: File, userId: string) => {
  try {
    // 1. Upload the file
    const { data: uploadData, error: uploadError } = await uploadFile(file)
    if (uploadError || !uploadData) throw uploadError || new Error('Upload failed')

    // 2. Create workspace
    const { data: workspace, error: workspaceError } = await createWorkspace(title, uploadData.url)
    if (workspaceError) throw workspaceError

    // 3. Add workspace to user (using workspace_id)
    const { error: userError } = await addWorkspaceToUser(userId, workspace.workspace_id)
    if (userError) throw userError

    return { 
      data: { 
        workspace, 
        upload: uploadData 
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Error creating workspace with upload:', error)
    return { data: null, error }
  }
}

// New functions for loading home page data
export const getUserWorkspacesWithPages = async (userId: string) => {
  try {
    // Get user's workspaces
    const { data: workspaces, error: workspacesError } = await getUserWorkspaces(userId)
    if (workspacesError) throw workspacesError

    if (!workspaces || workspaces.length === 0) {
      return { data: [], error: null }
    }

    // For each workspace, get its pages to calculate completion status
    const workspacesWithPages = await Promise.all(
      workspaces.map(async (workspace) => {
        const pageIds = workspace.page_id_list || []
        
        if (pageIds.length === 0) {
          return {
            ...workspace,
            pages: [],
            completedCount: 0,
            totalCount: 0,
            status: 'in progress' as const
          }
        }

        // Get all pages for this workspace
        const { data: pages, error: pagesError } = await supabase
          .from('pages')
          .select('*')
          .in('page_id', pageIds)
          .order('created_at', { ascending: true })

        if (pagesError) {
          console.error('Error fetching pages for workspace:', workspace.workspace_id, pagesError)
          return {
            ...workspace,
            pages: [],
            completedCount: 0,
            totalCount: pageIds.length,
            status: 'in progress' as const
          }
        }

        const completedCount = pages?.filter(page => page.is_complete).length || 0
        const totalCount = pages?.length || 0
        const status = completedCount === totalCount && totalCount > 0 ? 'completed' as const : 'in progress' as const

        return {
          ...workspace,
          pages: pages || [],
          completedCount,
          totalCount,
          status
        }
      })
    )

    return { data: workspacesWithPages, error: null }
  } catch (error) {
    console.error('Error getting user workspaces with pages:', error)
    return { data: null, error }
  }
}

export const getWorkspaceWithPages = async (workspaceId: string) => {
  try {
    // Get workspace
    const { data: workspace, error: workspaceError } = await getWorkspace(workspaceId)
    if (workspaceError) throw workspaceError

    if (!workspace) {
      return { data: null, error: new Error('Workspace not found') }
    }

    const pageIds = workspace.page_id_list || []
    
    if (pageIds.length === 0) {
      return {
        data: {
          ...workspace,
          pages: [],
          completedCount: 0,
          totalCount: 0,
          status: 'in progress' as const
        },
        error: null
      }
    }

    // Get all pages for this workspace
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .in('page_id', pageIds)
      .order('created_at', { ascending: true })

    if (pagesError) throw pagesError

    const completedCount = pages?.filter(page => page.is_complete).length || 0
    const totalCount = pages?.length || 0
    const status = completedCount === totalCount && totalCount > 0 ? 'completed' as const : 'in progress' as const

    return {
      data: {
        ...workspace,
        pages: pages || [],
        completedCount,
        totalCount,
        status
      },
      error: null
    }
  } catch (error) {
    console.error('Error getting workspace with pages:', error)
    return { data: null, error }
  }
} 