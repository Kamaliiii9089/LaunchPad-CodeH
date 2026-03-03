'use client';

import { useState, useEffect } from 'react';

interface Comment {
  _id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  mentions: Array<{
    userId: string;
    userName: string;
    userEmail: string;
  }>;
  isInternal: boolean;
  edited: boolean;
  editedAt?: Date;
  createdAt: Date;
}

interface CommentsPanelProps {
  eventId: string;
  onClose: () => void;
  toast: any;
}

export default function CommentsPanel({ eventId, onClose, toast }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadComments();
  }, [eventId]);

  const loadComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/collaboration/comments?eventId=${eventId}&includeInternal=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error: any) {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collaboration/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          content: newComment,
          isInternal,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Comment added successfully');
        setNewComment('');
        setIsInternal(false);
        loadComments();
      } else {
        toast.error(data.error || 'Failed to add comment');
      }
    } catch (error: any) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Please enter content');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collaboration/comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          commentId,
          content: editContent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Comment updated successfully');
        setEditingCommentId(null);
        setEditContent('');
        loadComments();
      } else {
        toast.error(data.error || 'Failed to update comment');
      }
    } catch (error: any) {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/collaboration/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Comment deleted successfully');
        loadComments();
      } else {
        toast.error(data.error || 'Failed to delete comment');
      }
    } catch (error: any) {
      toast.error('Failed to delete comment');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightMentions = (text: string) => {
    return text.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-medium bg-blue-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Discussion</h2>
            <p className="text-sm text-gray-600 mt-1">
              Event ID: {eventId} • {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">💬 No comments yet</p>
              <p className="text-sm mt-2">Be the first to comment on this event</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment._id}
                className={`p-4 rounded-lg border ${
                  comment.isInternal ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{comment.userName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                        {comment.edited && <span className="ml-2">(edited)</span>}
                      </p>
                    </div>
                    {comment.isInternal && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                        Internal
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCommentId(comment._id);
                        setEditContent(comment.content);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="mt-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEditComment(comment._id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditContent('');
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-700 text-sm whitespace-pre-wrap">
                    {highlightMentions(comment.content)}
                  </div>
                )}

                {comment.mentions && comment.mentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comment.mentions.map((mention, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        @{mention.userName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* New Comment Form */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="mb-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... Use @username to mention team members"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Use @username to mention team members and notify them
            </p>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Internal note (team only)</span>
            </label>

            <button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
