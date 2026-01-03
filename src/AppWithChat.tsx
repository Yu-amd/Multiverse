import React, { useState, useEffect } from 'react';
import { TasksPage } from './pages/TasksPage';
import { ConversationHistoryModal } from './components/ConversationHistoryModal';
import { SessionRecovery } from './components/SessionRecovery';
import { ApiInfoModal } from './components/ApiInfoModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { saveCurrentSession, saveToHistory, hasRecoverableSession } from './utils/sessionPersistence';
import { useSettings } from './hooks/useSettings';
import { useConversation } from './hooks/useConversation';
import type { Message } from './types';
import { useTheme } from './hooks/useTheme';
import { useLayout } from './hooks/useLayout';
import { useToast } from './hooks/useToast';
import { useConnection } from './hooks/useConnection';
import { useBackendMetrics } from './hooks/useBackendMetrics';
import { useChat } from './hooks/useChat';
import { logger } from './utils/logger';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNavigate } from 'react-router-dom';

interface AppWithChatProps {
}

export const AppWithChat: React.FC<AppWithChatProps> = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { selectedModel, customEndpoint, apiKey, temperature, maxTokens, topP } = settings;

  const { 
    messages, 
    setMessages, 
    clearConversation,
    getSavedConversations,
    saveConversationToList,
    loadConversationFromList,
    deleteConversation,
    renameConversation
  } = useConversation();

  const { theme, setTheme } = useTheme();
  const { toasts, showToast, removeToast } = useToast();
  const connectionStatus = useConnection(customEndpoint, apiKey);
  
  const backendMetricsUrl = 'http://localhost:8000';
  const { 
    metrics: backendMetrics, 
    connected: backendConnected
  } = useBackendMetrics({
    backendUrl: backendMetricsUrl,
    enabled: false, // Disable backend metrics by default (backend may not be running)
    onError: () => {
      // Silently handle errors - backend metrics are optional
    }
  });

  const { handleDeleteMessage } = useChat({
    messages,
    setMessages,
    customEndpoint,
    apiKey,
    temperature,
    maxTokens,
    topP,
    showToast,
    recordMetrics: (promptLength, responseLength, totalTime, firstTokenLatency, tokensPerSecond) => {
      setModelMetrics(prev => ({
        ...prev,
        promptToFirstToken: firstTokenLatency,
        totalResponseTime: totalTime,
        tokensPerSecond: tokensPerSecond,
        tokensIn: promptLength,
        tokensOut: responseLength,
        promptLength: promptLength,
        maxTokens: maxTokens,
        contextUtilization: (promptLength / maxTokens) * 100,
        activeRequests: 0
      }));
    },
    recordError: () => {
      setModelMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    }
  });

  const [showApiInfo, setShowApiInfo] = useState(false);
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(() => {
    const saved = localStorage.getItem('multiverse-show-timestamps');
    return saved ? saved === 'true' : false;
  });
  
  // Save showTimestamps to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('multiverse-show-timestamps', showTimestamps.toString());
  }, [showTimestamps]);
  const [showSessionRecovery, setShowSessionRecovery] = useState(false);
  
  const [modelMetrics, setModelMetrics] = useState({
    promptToFirstToken: 0,
    totalResponseTime: 0,
    tokensPerSecond: 0,
    tokensIn: 0,
    tokensOut: 0,
    promptLength: 0,
    maxTokens: 0,
    contextUtilization: 0,
    activeRequests: 0,
    quantizationFormat: 'Unknown',
    cacheHitRate: 0,
    errorCount: 0
  });
  
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUtilization: 0,
    gpuUtilization: 0,
    gpuMemoryUsage: 0,
    ramUsage: 0,
    powerDraw: 0,
    temperature: 0,
    isThrottling: false,
    batteryLevel: 100,
    gpuModel: 'Unknown',
    gpuVendor: 'Unknown',
    gpuMemoryTotal: 0,
    gpuMemoryBandwidth: 0,
    gpuComputeUnits: 0,
    gpuClockSpeed: 0,
    activeAccelerator: 'Unknown',
    acceleratorType: 'Unknown',
    npuAvailable: false,
    npuUtilization: 0,
    npuModel: 'Unknown',
    igpuAvailable: false,
    igpuUtilization: 0,
    igpuModel: 'Unknown',
    igpuMemoryTotal: 0
  });
  
  const [compositeMetrics, setCompositeMetrics] = useState({
    tokensPerWatt: 0,
    efficiencyRating: 0,
    performanceTrend: 'Stable'
  });
  // Use global layout hook
  const { isMobile, isTablet, isROGAllyX } = useLayout();

  // Check for recoverable session on mount
  useEffect(() => {
    if (hasRecoverableSession()) {
      setShowSessionRecovery(true);
    }
  }, []);

  // Session metrics
  const sessionMetrics = {
    totalMessages: messages.length,
    totalTokens: modelMetrics.tokensIn + modelMetrics.tokensOut,
    averageLatency: modelMetrics.totalResponseTime / Math.max(1, messages.length / 2),
    errorRate: modelMetrics.errorCount / Math.max(1, messages.length)
  };

  const handleClearChat = () => {
    clearConversation();
    showToast('Conversation cleared', 'success');
  };

  const handleRestoreSession = (
    restoredMessages: Message[],
    restoredSettings: {
      selectedModel: string;
      customEndpoint: string;
      apiKey: string;
      temperature: number;
      maxTokens: number;
      topP: number;
    }
  ) => {
    setMessages(restoredMessages);
    updateSettings(restoredSettings);
    setShowSessionRecovery(false);
    showToast('Session restored successfully', 'success');
  };

  // Export/Import conversation handlers
  const handleExportConversation = (format: 'json' | 'markdown' | 'txt' = 'json') => {
    if (messages.length === 0) {
      showToast('No conversation to export', 'error');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      const conversation = {
        title: messages[0]?.content.substring(0, 50) || 'New Conversation',
        messages: messages,
        model: selectedModel,
        endpoint: customEndpoint,
        exportedAt: new Date().toISOString()
      };
      content = JSON.stringify(conversation, null, 2);
      filename = `conversation-${Date.now()}.json`;
      mimeType = 'application/json';
    } else if (format === 'markdown') {
      content = `# Conversation\n\n`;
      content += `**Model:** ${selectedModel}\n`;
      content += `**Endpoint:** ${customEndpoint}\n`;
      content += `**Exported:** ${new Date().toLocaleString()}\n\n`;
      content += `---\n\n`;
      messages.forEach((msg) => {
        content += `## ${msg.role === 'user' ? 'You' : 'Assistant'} (${msg.timestamp.toLocaleString()})\n\n`;
        content += `${msg.content}\n\n`;
        content += `---\n\n`;
      });
      filename = `conversation-${Date.now()}.md`;
      mimeType = 'text/markdown';
    } else { // txt
      content = `Conversation\n`;
      content += `Model: ${selectedModel}\n`;
      content += `Endpoint: ${customEndpoint}\n`;
      content += `Exported: ${new Date().toLocaleString()}\n\n`;
      content += `${'='.repeat(50)}\n\n`;
      messages.forEach((msg) => {
        content += `${msg.role.toUpperCase()}: ${msg.timestamp.toLocaleString()}\n`;
        content += `${msg.content}\n\n`;
        content += `${'-'.repeat(50)}\n\n`;
      });
      filename = `conversation-${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Conversation exported as ${format.toUpperCase()}`, 'success');
  };

  const handleImportConversation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.messages && Array.isArray(data.messages)) {
          // Convert timestamps if they're strings
          interface ImportedMessage {
            id?: string;
            role: 'user' | 'assistant';
            content: string;
            timestamp?: string | Date;
            edited?: boolean;
            originalContent?: string;
          }
          const importedMessages = (data.messages as ImportedMessage[]).map((msg) => ({
            ...msg,
            id: msg.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          
          setMessages(importedMessages);
          if (data.model) updateSettings({ selectedModel: data.model });
          if (data.endpoint) updateSettings({ customEndpoint: data.endpoint });
          showToast('Conversation imported successfully!', 'success');
        } else {
          showToast('Invalid conversation file format', 'error');
        }
      } catch (err) {
        logger.error('Import error:', err);
        showToast('Failed to import conversation. Please check the file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onClearChat: handleClearChat,
    onOpenDashboard: () => navigate('/observability'), // Navigate to Observability page
    onOpenHistory: () => setShowConversationHistory(true),
    onToggleTimestamps: () => setShowTimestamps(!showTimestamps),
  });

  return (
    <ErrorBoundary>
      <div className="app-container">
        {showSessionRecovery && (
          <SessionRecovery
            onRestore={handleRestoreSession}
            onDismiss={() => setShowSessionRecovery(false)}
          />
        )}
        
        {/* Modals - render at app-container level for proper z-index */}
        {showApiInfo && (
          <ApiInfoModal
            showApiInfo={showApiInfo}
            onClose={() => setShowApiInfo(false)}
            isMobile={isMobile}
          />
        )}


        {showConversationHistory && (
          <ConversationHistoryModal
            showConversationHistory={showConversationHistory}
            onClose={() => setShowConversationHistory(false)}
            messages={messages}
            setMessages={setMessages}
            setSelectedModel={(model) => updateSettings({ selectedModel: model })}
            setCustomEndpoint={(endpoint) => updateSettings({ customEndpoint: endpoint })}
            getSavedConversations={getSavedConversations}
            saveConversationToList={() => {
              if (saveConversationToList(selectedModel, customEndpoint)) {
                showToast('Conversation saved to history', 'success');
              } else {
                showToast('Failed to save conversation', 'error');
              }
            }}
            loadConversationFromList={(conversationId: string) => {
              const result = loadConversationFromList(conversationId);
              if (result) {
                setMessages(result.messages);
                updateSettings({ selectedModel: result.model, customEndpoint: result.endpoint });
                setShowConversationHistory(false);
              }
            }}
            deleteConversation={deleteConversation}
            renameConversation={renameConversation}
            exportConversation={handleExportConversation}
            importConversation={handleImportConversation}
            selectedModel={selectedModel}
            customEndpoint={customEndpoint}
            isMobile={isMobile}
          />
        )}

        <TasksPage
          messages={messages}
          setMessages={setMessages}
          customEndpoint={customEndpoint}
          apiKey={apiKey}
          temperature={temperature}
          maxTokens={maxTokens}
          topP={topP}
          showToast={showToast}
          recordMetrics={(promptLength, responseLength, totalTime, firstTokenLatency, tokensPerSecond) => {
            setModelMetrics(prev => ({
              ...prev,
              promptToFirstToken: firstTokenLatency,
              totalResponseTime: totalTime,
              tokensPerSecond: tokensPerSecond,
              tokensIn: promptLength,
              tokensOut: responseLength,
              promptLength: promptLength,
              maxTokens: maxTokens,
              contextUtilization: (promptLength / maxTokens) * 100,
              activeRequests: 0
            }));
          }}
          recordError={() => {
            setModelMetrics(prev => ({
              ...prev,
              errorCount: prev.errorCount + 1
            }));
          }}
          connectionStatus={connectionStatus}
          showTimestamps={showTimestamps}
          isMobile={isMobile}
          isTablet={isTablet}
          isROGAllyX={isROGAllyX}
          onClearChat={handleClearChat}
          onOpenHistory={() => setShowConversationHistory(true)}
          handleDeleteMessage={handleDeleteMessage}
          onOpenApiInfo={() => {
            setShowApiInfo(true);
          }}
        />

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ErrorBoundary>
  );
};

