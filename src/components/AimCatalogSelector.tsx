import React, { useState, useMemo } from 'react';
import type { AimCatalogModel } from '../types/aim';
import { AIM_CATALOG_MODELS, getAimOrganizations, getAimModelsByOrganization } from '../types/aim';

interface AimCatalogSelectorProps {
  selectedModelId?: string;
  onSelectModel: (model: AimCatalogModel) => void;
  isMobile?: boolean;
}

export const AimCatalogSelector: React.FC<AimCatalogSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  isMobile
}) => {
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const organizations = getAimOrganizations();

  // Filter models based on organization and search
  const filteredModels = useMemo(() => {
    let models = AIM_CATALOG_MODELS;

    // Filter by organization
    if (selectedOrg !== 'all') {
      models = getAimModelsByOrganization(selectedOrg);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      models = models.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.organization.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.parameters?.toLowerCase().includes(query)
      );
    }

    return models;
  }, [selectedOrg, searchQuery]);

  const handleModelSelect = (model: AimCatalogModel) => {
    onSelectModel(model);
  };

  return (
    <div className="aim-catalog-selector" style={{
      marginTop: '15px',
      padding: '15px',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '1.1rem',
          color: 'var(--text-primary)'
        }}>
          📦 AIM Model Catalog
        </h3>
        <p style={{ 
          margin: '0 0 15px 0', 
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          Select a model from the AMD Inference Microservice catalog. 
          <a 
            href="https://enterprise-ai.docs.amd.com/en/latest/aims/catalog/models.html" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ marginLeft: '5px', color: 'var(--accent-color)' }}
          >
            View full catalog →
          </a>
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem'
          }}
          aria-label="Search AIM models"
        />
      </div>

      {/* Organization Filter */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          Filter by Organization:
        </label>
        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem'
          }}
          aria-label="Filter by organization"
        >
          <option value="all">All Organizations</option>
          {organizations.map(org => (
            <option key={org} value={org}>
              {org}
            </option>
          ))}
        </select>
      </div>

      {/* Model List */}
      <div style={{
        maxHeight: isMobile ? '300px' : '400px',
        overflowY: 'auto',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-primary)'
      }}>
        {filteredModels.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            No models found matching your search.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model)}
                style={{
                  padding: '12px',
                  border: selectedModelId === model.id 
                    ? '2px solid var(--accent-color)' 
                    : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: selectedModelId === model.id 
                    ? 'var(--accent-color-alpha)' 
                    : 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (selectedModelId !== model.id) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedModelId !== model.id) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
                aria-label={`Select ${model.name}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '0.95rem',
                      marginBottom: '4px'
                    }}>
                      {model.name}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px'
                    }}>
                      {model.organization} • {model.parameters}
                    </div>
                    {model.description && (
                      <div style={{ 
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                        lineHeight: '1.4'
                      }}>
                        {model.description}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    marginLeft: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px'
                  }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: model.status === 'stable' 
                        ? 'rgba(34, 197, 94, 0.2)' 
                        : 'rgba(251, 191, 36, 0.2)',
                      color: model.status === 'stable' 
                        ? 'rgb(34, 197, 94)' 
                        : 'rgb(251, 191, 36)'
                    }}>
                      {model.status === 'stable' ? '✓ Stable' : 'Preview'}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      v{model.version}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Model Info */}
      {selectedModelId && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: 'var(--accent-color-alpha)',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: 'var(--text-primary)'
        }}>
          <strong>Selected:</strong> {AIM_CATALOG_MODELS.find(m => m.id === selectedModelId)?.name || selectedModelId}
        </div>
      )}
    </div>
  );
};

