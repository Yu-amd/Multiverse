import React, { useState, useMemo } from 'react';
import type { Message, SavedConversation } from '../types';

interface ConversationHistoryModalProps {
  showConversationHistory: boolean;
  onClose: () => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  setSelectedModel: (model: string) => void;
  setCustomEndpoint: (endpoint: string) => void;
  getSavedConversations: () => SavedConversation[];
  saveConversationToList: () => void;
  loadConversationFromList: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, newTitle: string) => boolean;
  exportConversation: (format: 'json' | 'markdown' | 'txt') => void;
  importConversation: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isMobile: boolean;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical';
type FilterOption = 'all' | string; // 'all' or model name

export const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  showConversationHistory,
  onClose,
  messages,
  setMessages,
  setSelectedModel,
  setCustomEndpoint,
  getSavedConversations,
  saveConversationToList,
  loadConversationFromList,
  deleteConversation,
  renameConversation,
  exportConversation,
  importConversation,
  isMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterModel, setFilterModel] = useState<FilterOption>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const allConversations = getSavedConversations();

  // Get unique models for filter dropdown
  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    allConversations.forEach(conv => models.add(conv.model));
    return Array.from(models).sort();
  }, [allConversations]);

  // Filter and sort conversations
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = allConversations;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(query)) ||
        conv.model.toLowerCase().includes(query) ||
        conv.endpoint.toLowerCase().includes(query)
      );
    }

    // Filter by model
    if (filterModel !== 'all') {
      filtered = filtered.filter(conv => conv.model === filterModel);
    }

    // Sort conversations
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return sorted;
  }, [allConversations, searchQuery, sortOption, filterModel]);

  const handleStartRename = (conv: SavedConversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (conversationId: string) => {
    if (editTitle.trim() && renameConversation(conversationId, editTitle.trim())) {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  if (!showConversationHistory) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          padding: isMobile ? '15px' : '20px',
          maxWidth: isMobile ? '95%' : '600px',
          width: '90%',
          maxHeight: isMobile ? '90vh' : '80vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">💬 Conversation History</h2>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Export/Import Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportConversation('json')}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--success-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            📥 Export JSON
          </button>
          <button
            onClick={() => exportConversation('markdown')}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--success-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            📥 Export Markdown
          </button>
          <button
            onClick={() => exportConversation('txt')}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--success-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            📥 Export TXT
          </button>
          <label
            style={{
              background: 'var(--success-color)',
              color: '#fff',
              border: '1px solid var(--success-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'inline-block'
            }}
          >
            📤 Import
            <input
              type="file"
              accept=".json"
              onChange={importConversation}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={saveConversationToList}
            disabled={messages.length === 0}
            style={{
              background: messages.length === 0 ? 'var(--button-bg)' : 'var(--accent-color)',
              color: messages.length === 0 ? 'var(--text-secondary)' : '#fff',
              border: '1px solid',
              borderColor: messages.length === 0 ? 'var(--border-color)' : 'var(--accent-color)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: messages.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              opacity: messages.length === 0 ? 0.7 : 1
            }}
          >
            💾 Save to History
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          {/* Search Bar */}
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="🔍 Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={allConversations.length === 0}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: allConversations.length === 0 ? 'var(--bg-secondary)' : 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                opacity: allConversations.length === 0 ? 0.6 : 1,
                cursor: allConversations.length === 0 ? 'not-allowed' : 'text'
              }}
            />
          </div>

          {/* Filter and Sort Controls */}
          {allConversations.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {/* Model Filter */}
                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value as FilterOption)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    flex: '1',
                    minWidth: '120px'
                  }}
                >
                  <option value="all">All Models</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>

                {/* Sort Option */}
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    flex: '1',
                    minWidth: '120px'
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>

              {/* Results Count */}
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)',
                marginBottom: '10px'
              }}>
                Showing {filteredAndSortedConversations.length} of {allConversations.length} conversations
              </div>
            </>
          )}
        </div>

        {/* Saved Conversations List */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '15px' }}>Saved Conversations</h3>
          {allConversations.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No saved conversations yet. Save your current conversation to see it here.
            </div>
          ) : filteredAndSortedConversations.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No conversations match your search criteria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredAndSortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  style={{
                    background: 'var(--metric-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {editingId === conv.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveRename(conv.id);
                            } else if (e.key === 'Escape') {
                              handleCancelRename();
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--accent-color)',
                            background: 'var(--input-bg)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                          }}
                        />
                        <button
                          onClick={() => handleSaveRename(conv.id)}
                          style={{
                            background: 'var(--success-color)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelRename}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        style={{ cursor: 'pointer' }} 
                        onClick={() => loadConversationFromList(conv.id)}
                      >
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                          {conv.title}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {conv.messages.length} messages • {new Date(conv.createdAt).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {conv.model} • {conv.endpoint}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {editingId !== conv.id && (
                      <>
                        <button
                          onClick={() => {
                            setMessages(conv.messages);
                            setSelectedModel(conv.model);
                            setCustomEndpoint(conv.endpoint);
                            onClose();
                          }}
                          style={{
                            background: 'transparent',
                            color: 'var(--accent-color)',
                            border: '1px solid var(--accent-color)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleStartRename(conv)}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          title="Rename conversation"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this conversation?')) {
                              deleteConversation(conv.id);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            color: 'var(--error-color)',
                            border: '1px solid var(--error-color)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

