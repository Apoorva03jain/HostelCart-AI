import { createContext, useState, useCallback } from "react";
import api from "../services/api";

export const GroupContext = createContext(null);

export function GroupProvider({ children }) {
  const [state, setState] = useState({
    activeGroup: null,
    summary: null,
    isLeader: false,
    isLoading: false,
  });

  const fetchGroup = useCallback(async (groupId, userEmail) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const [groupsRes, summaryRes] = await Promise.all([
        api.get("/groups"),
        api.get(`/groups/${groupId}/summary`),
      ]);

      const found = groupsRes.data.find((g) => g._id === groupId);
      const isLeader = found
        ? found.groupLeader.toLowerCase() === (userEmail || "").toLowerCase()
        : false;

      setState({
        activeGroup: found || null,
        summary: summaryRes.data,
        isLeader,
        isLoading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshGroup = useCallback(async (userEmail) => {
    if (state.activeGroup?._id) {
      await fetchGroup(state.activeGroup._id, userEmail);
    }
  }, [state.activeGroup, fetchGroup]);

  const clearGroup = useCallback(() => {
    setState({
      activeGroup: null,
      summary: null,
      isLeader: false,
      isLoading: false,
    });
  }, []);

  return (
    <GroupContext.Provider value={{ ...state, fetchGroup, refreshGroup, clearGroup }}>
      {children}
    </GroupContext.Provider>
  );
}
