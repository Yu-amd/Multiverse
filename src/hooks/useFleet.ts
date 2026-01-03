import { useState, useEffect, useCallback } from 'react';
import { fleetApi, type Robot, type TaskStatus, type TaskRequest } from '../services/fleetApi';

export const useFleet = () => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFleet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fleet = await fleetApi.getFleet();
      setRobots(fleet);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch fleet'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    // Poll fleet status every 10 seconds
    const interval = setInterval(fetchFleet, 10000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  return {
    robots,
    loading,
    error,
    refetch: fetchFleet,
  };
};

export const useTaskExecution = (robotUrl?: string) => {
  const [currentTask, setCurrentTask] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitTask = useCallback(
    async (taskRequest: TaskRequest) => {
      try {
        setLoading(true);
        setError(null);
        const task = await fleetApi.submitTask(taskRequest, robotUrl);
        setCurrentTask(task);
        return task;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to submit task');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [robotUrl]
  );

  const pollTask = useCallback(
    async (taskId: string) => {
      try {
        setLoading(true);
        setError(null);
        const status = await fleetApi.pollTaskStatus(taskId, robotUrl);
        setCurrentTask(status);
        return status;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to poll task');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [robotUrl]
  );

  const getTaskStatus = useCallback(
    async (taskId: string) => {
      try {
        setError(null);
        const status = await fleetApi.getTaskStatus(taskId, robotUrl);
        setCurrentTask(status);
        return status;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get task status');
        setError(error);
        throw error;
      }
    },
    [robotUrl]
  );

  return {
    currentTask,
    loading,
    error,
    submitTask,
    pollTask,
    getTaskStatus,
  };
};

export const useTaskEvents = (taskId: string | null, robotUrl?: string) => {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setEvents([]);
      return;
    }

    setConnected(true);
    const cleanup = fleetApi.subscribeToEvents(
      (event) => {
        if (event.task_id === taskId) {
          setEvents((prev) => [...prev, event]);
        }
      },
      robotUrl,
      (error) => {
        setConnected(false);
        console.error('Event stream error:', error);
      }
    );

    return cleanup;
  }, [taskId, robotUrl]);

  return {
    events,
    connected,
  };
};

