import React from 'react';

interface ApiInfoModalProps {
  showApiInfo: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export const ApiInfoModal: React.FC<ApiInfoModalProps> = ({
  showApiInfo,
  onClose,
  isMobile
}) => {
  if (!showApiInfo) return null;

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
          <h2 className="modal-title">API Integration Guide</h2>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        <div className="api-info-section">
          <h3>🚀 Supported Endpoints</h3>
          <ul>
            <li><strong>LM Studio:</strong> http://localhost:1234 (default)</li>
            <li><strong>Ollama:</strong> http://localhost:11434 (default)</li>
            <li><strong>Custom:</strong> Any OpenAI-compatible endpoint</li>
          </ul>
        </div>

        <div className="api-info-section">
          <h3>⚙️ Parameters</h3>
          <ul>
            <li><strong>Temperature:</strong> Controls randomness (0.0-2.0)</li>
            <li><strong>Max Tokens:</strong> Maximum response length (100-4096)</li>
            <li><strong>Top P:</strong> Nucleus sampling parameter (0.0-1.0)</li>
            <li><strong>API Key:</strong> Optional authentication token</li>
          </ul>
        </div>

        <div className="api-info-section">
          <h3>🔧 Setup Instructions</h3>
          <div style={{ fontSize: '0.9rem' }}>
            <p><strong>LM Studio:</strong></p>
            <ol style={{ paddingLeft: '20px', marginBottom: '15px' }}>
              <li>Download and install LM Studio</li>
              <li>Load a model (e.g., Llama 2, Code Llama)</li>
              <li>Start the local server on port 1234</li>
            </ol>
            
            <p><strong>Ollama:</strong></p>
            <ol style={{ paddingLeft: '20px', marginBottom: '15px' }}>
              <li>Install Ollama: <code>curl -fsSL https://ollama.ai/install.sh | sh</code></li>
              <li>Pull a model: <code>ollama pull llama2</code></li>
              <li>Start server: <code>ollama serve</code></li>
            </ol>
          </div>
        </div>

        <div className="api-info-section">
          <h3>💡 Features</h3>
          <ul>
            <li>Real-time streaming responses</li>
            <li>Thinking vs Response detection</li>
            <li>Interactive code generation</li>
            <li>Multiple model support</li>
            <li>Parameter tuning</li>
          </ul>
        </div>

        <div className="api-info-section">
          <h3>🐛 Troubleshooting</h3>
          <ul>
            <li>Check if your model server is running</li>
            <li>Verify the endpoint URL is correct</li>
            <li>Ensure the model is loaded and ready</li>
            <li>Check browser console for error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

