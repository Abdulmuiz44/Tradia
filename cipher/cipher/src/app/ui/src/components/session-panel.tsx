"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Hash,
  Loader2,
  AlertCircle,
  X,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Session } from "@/types/server-registry"
import { useCreateSession, useSessions, useDeleteSession } from "@/hooks/use-sessions"
import { useSessionStore } from "@/stores/session-store"

interface SessionPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSessionId?: string | null
  onSessionChange: (sessionId: string) => void
  returnToWelcome: () => void
  variant?: 'inline' | 'modal'
  className?: string
}

export function SessionPanel({ 
  isOpen, 
  onClose, 
  currentSessionId, 
  onSessionChange, 
  returnToWelcome,
  variant = 'modal',
  className 
}: SessionPanelProps) {
  // Use React Query hooks as single source of truth for immediate UI updates
  const { sessions, isLoading: loading, error: fetchError, refetch: refetchSessions } = useSessions()
  const createSessionMutation = useCreateSession()
  const deleteSessionMutation = useDeleteSession()
  
  // Get deleting session state from store
  const { deletingSessionId } = useSessionStore()
  
  // Local state management
  const [error, setError] = React.useState<string | null>(null)
  const [isNewSessionOpen, setNewSessionOpen] = React.useState(false)
  const [newSessionId, setNewSessionId] = React.useState('')
  
  // Scroll position preservation
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const savedScrollPosition = React.useRef<number>(0)

  // Conversation management states
  const [isDeleteConversationDialogOpen, setDeleteConversationDialogOpen] = React.useState(false)
  const [selectedSessionForAction, setSelectedSessionForAction] = React.useState<string | null>(null)
  const [isDeletingConversation, setIsDeletingConversation] = React.useState(false)

  // Date/time formatting logic
  const formatDate = React.useCallback((dateString: string | null) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const formatRelativeTime = React.useCallback((dateString: string | null) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }, [])

  // Handle fetch errors
  React.useEffect(() => {
    if (fetchError) {
      setError(fetchError)
    } else {
      setError(null)
    }
  }, [fetchError])

  // Optional refresh when panel opens (but React Query handles most cases automatically)
  React.useEffect(() => {
    if (isOpen) {
      // Only refetch if data is stale, React Query will decide
      refetchSessions()
    }
  }, [isOpen, refetchSessions])

  // Session creation with optimistic updates (no manual refresh needed)
  const handleCreateSession = async () => {
    try {
      const sessionId = newSessionId.trim() || undefined
      const session = await createSessionMutation.mutateAsync(sessionId)
      
      setNewSessionId('')
      setNewSessionOpen(false)
      
      // React Query optimistic updates handle UI changes automatically
      // Switch to the new session
      onSessionChange(session.id)
      
    } catch (err) {
      console.error('Error creating session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  // Session deletion with optimistic updates (no manual refresh needed)
  const handleDeleteSession = async (sessionId: string) => {
    try {
      // If we're deleting the current session, switch away from it first
      if (currentSessionId === sessionId) {
        returnToWelcome()
        // Brief delay to ensure backend processes the session switch
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // React Query optimistic updates handle UI changes automatically
      await deleteSessionMutation.mutateAsync(sessionId)
      
    } catch (err) {
      console.error('Error deleting session:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete session')
    }
  }

  // Conversation deletion with optimistic updates
  const handleDeleteConversation = async () => {
    if (!selectedSessionForAction) return

    setIsDeletingConversation(true)
    try {
      // If we're deleting the current session, switch away from it first
      if (currentSessionId === selectedSessionForAction) {
        returnToWelcome()
        // Brief delay to ensure backend processes the session switch
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // React Query optimistic updates handle UI changes automatically
      await deleteSessionMutation.mutateAsync(selectedSessionForAction)

      setDeleteConversationDialogOpen(false)
      setSelectedSessionForAction(null)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete conversation')
    } finally {
      setIsDeletingConversation(false)
    }
  }

  // Session actions component
  const SessionActions = ({ session, onDeleteConversation, onDeleteSession }: {
    session: Session
    onDeleteConversation: () => void
    onDeleteSession: () => void
  }) => (
    <div className="flex items-center space-x-1">
      {session.messageCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteConversation()
          }}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete Conversation"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteSession()
          }}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete Session"
          disabled={deletingSessionId === session.id}
        >
          {deletingSessionId === session.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 text-destructive" />
          )}
        </Button>
      )}
    </div>
  )

  // Enhanced session change handler with scroll preservation
  const handleSessionSelect = React.useCallback((sessionId: string) => {
    // Save current scroll position
    if (scrollAreaRef.current) {
      savedScrollPosition.current = scrollAreaRef.current.scrollTop
    }
    
    // Call the original session change handler
    onSessionChange(sessionId)
    
    // Restore scroll position after state updates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollAreaRef.current && savedScrollPosition.current > 0) {
          scrollAreaRef.current.scrollTop = savedScrollPosition.current
        }
      })
    })
  }, [onSessionChange])

  // Session card component
  const SessionCard = ({ session, isActive, onSelect, onDelete }: {
    session: Session
    isActive: boolean
    onSelect: () => void
    onDelete: () => void
  }) => {
    return (
      <div
        className={cn(
          "group p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-all cursor-pointer",
          isActive && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={onSelect}
      >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-medium text-sm truncate">
              {session.id}
            </h3>
            {isActive && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Hash className="h-3 w-3" />
                <span>{session.messageCount || 0} messages</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(session.lastActivity)}</span>
              </div>
            </div>

            {session.createdAt && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(session.createdAt)}</span>
              </div>
            )}
          </div>
        </div>

        <SessionActions
          session={session}
          onDeleteConversation={onDelete}
          onDeleteSession={() => handleDeleteSession(session.id)}
        />
      </div>
    </div>
    )
  }

  // Handle dialog close
  const handleDialogClose = React.useCallback(() => {
    setNewSessionOpen(false)
    setNewSessionId('')
  }, [])

  // Handle input change
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSessionId(e.target.value)
  }, [])

  // Handle key down for Enter key
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !createSessionMutation.isPending) {
      e.preventDefault()
      const sessionId = newSessionId.trim() || undefined
      createSessionMutation.mutateAsync(sessionId).then((session) => {
        setNewSessionId('')
        setNewSessionOpen(false)
        onSessionChange(session.id)
      }).catch((err) => {
        console.error('Error creating session:', err)
        setError(err instanceof Error ? err.message : 'Failed to create session')
      })
    }
  }, [createSessionMutation, newSessionId, onSessionChange])

  // Delete confirmation dialog
  const DeleteConfirmationDialog = ({
    isOpen,
    onClose,
    onConfirm,
    sessionId,
    isDeleting
  }: {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    sessionId: string | null
    isDeleting: boolean
  }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <span>Delete Conversation</span>
          </DialogTitle>
          <DialogDescription>
            This will permanently delete this conversation and all its messages. This action cannot be undone.
            {sessionId && (
              <span className="block mt-2 font-medium">
                Session: <span className="font-mono">{sessionId}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Conversation'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // Main content
  const SessionContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h2 className="font-semibold">Sessions ({sessions.length})</h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSessions()}
            disabled={loading}
            title="Refresh sessions"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewSessionOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Session
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Sessions list - flex-1 to take remaining space */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">No sessions found</p>
            <p className="text-xs">Create a new session to get started</p>
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-2 pr-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActive={currentSessionId === session.id}
                  onSelect={() => handleSessionSelect(session.id)}
                  onDelete={() => {
                    setSelectedSessionForAction(session.id)
                    setDeleteConversationDialogOpen(true)
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isNewSessionOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-session-id">Session ID</Label>
              <Input
                id="new-session-id"
                value={newSessionId}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="e.g., user-123, project-alpha"
                className="font-mono"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate a unique ID
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSession}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={isDeleteConversationDialogOpen}
        onClose={() => {
          setDeleteConversationDialogOpen(false)
          setSelectedSessionForAction(null)
        }}
        onConfirm={handleDeleteConversation}
        sessionId={selectedSessionForAction}
        isDeleting={isDeletingConversation}
      />
    </div>
  )

  if (variant === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <SessionContent />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className={cn("h-full", className)}>
      <SessionContent />
    </div>
  )
}

// Hook for managing session panel state
export function useSessionPanel() {
  const [isOpen, setIsOpen] = React.useState(false)

  const openPanel = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closePanel = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    openPanel,
    closePanel,
  }
}