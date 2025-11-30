/**
 * Hook for managing endpoint profiles
 */

import { useState, useEffect } from 'react';
import type { EndpointProfileWithPrompts, PromptSet } from '../types/profiles';
import { logger } from '../utils/logger';

const PROFILES_STORAGE_KEY = 'multiverse-endpoint-profiles';

export const useProfiles = () => {
  const loadProfiles = (): EndpointProfileWithPrompts[] => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      logger.warn('Failed to load profiles:', e);
    }
    return [];
  };

  const [profiles, setProfiles] = useState<EndpointProfileWithPrompts[]>(loadProfiles());

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      logger.warn('Failed to save profiles:', e);
    }
  }, [profiles]);

  const createProfile = (
    name: string,
    endpoint: string,
    apiKey?: string,
    model?: string,
    temperature?: number,
    maxTokens?: number,
    topP?: number
  ): string => {
    const profile: EndpointProfileWithPrompts = {
      id: `profile-${Date.now()}`,
      name,
      endpoint,
      apiKey,
      model,
      temperature,
      maxTokens,
      topP,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setProfiles(prev => [...prev, profile]);
    return profile.id;
  };

  const updateProfile = (id: string, updates: Partial<EndpointProfileWithPrompts>): boolean => {
    setProfiles(prev => {
      const updated = prev.map(p => 
        p.id === id 
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      );
      return updated;
    });
    return true;
  };

  const deleteProfile = (id: string): boolean => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const getProfile = (id: string): EndpointProfileWithPrompts | null => {
    return profiles.find(p => p.id === id) || null;
  };

  const addPromptSet = (profileId: string, promptSet: PromptSet): boolean => {
    setProfiles(prev => {
      return prev.map(p => {
        if (p.id === profileId) {
          const promptSets = p.promptSets || [];
          return {
            ...p,
            promptSets: [...promptSets, promptSet],
            updatedAt: Date.now()
          };
        }
        return p;
      });
    });
    return true;
  };

  const removePromptSet = (profileId: string, promptSetId: string): boolean => {
    setProfiles(prev => {
      return prev.map(p => {
        if (p.id === profileId) {
          const promptSets = (p.promptSets || []).filter(ps => ps.id !== promptSetId);
          return {
            ...p,
            promptSets,
            updatedAt: Date.now()
          };
        }
        return p;
      });
    });
    return true;
  };

  return {
    profiles,
    createProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    addPromptSet,
    removePromptSet
  };
};

