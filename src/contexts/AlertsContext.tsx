import React, { createContext, useContext } from "react";
import { useAlerts } from "@/hooks/useAlerts";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

interface AlertsContextType {
  alerts: Alert[];
  activeAlerts: Alert[];
  todayCount: number;
  error: string | null;
  lastUpdated: Date | null;
}

const AlertsContext = createContext<AlertsContextType>({
  alerts: [],
  activeAlerts: [],
  todayCount: 0,
  error: null,
  lastUpdated: null,
});

export const useAlertsContext = () => useContext(AlertsContext);

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const alertsState = useAlerts();
  return (
    <AlertsContext.Provider value={alertsState}>
      {children}
    </AlertsContext.Provider>
  );
};
