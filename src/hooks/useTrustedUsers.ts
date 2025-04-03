import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export interface TrustedUser {
  id: number;
  email: string;
  fullName: string | null;
}

export function useTrustedUsers() {
  const [trustedUsers, setTrustedUsers] = useState<TrustedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrustedUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!BASE_URL) {
        throw new Error("API URL not configured");
      }

      const token = await new Promise<string>((resolve, reject) => {
        chrome.storage.local.get(["token"], (result) => {
          if (result.token) {
            resolve(result.token);
          } else {
            reject(new Error("No token found"));
          }
        });
      });

      const response = await axios.get(`${BASE_URL}/me/trusted-users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      if (!response.data || !Array.isArray(response.data.trustedUsers)) {
        throw new Error("Invalid response format");
      }

      setTrustedUsers(response.data.trustedUsers);
    } catch (err) {
      setTrustedUsers([]);
      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          setError(chrome.i18n.getMessage("networkError"));
          return;
        }

        if (err.response?.status === 401 || err.response?.status === 403) {
          setError(chrome.i18n.getMessage("authError"));
          return;
        }

        if (err.response) {
          setError(chrome.i18n.getMessage("serverError"));
          return;
        }

        if (err.request) {
          setError(chrome.i18n.getMessage("networkError"));
          return;
        }
      }

      setError(chrome.i18n.getMessage("error"));
      console.error("Error fetching trusted users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTrustedUser = useCallback(
    async (email: string) => {
      if (!email || typeof email !== "string") {
        return { success: false, error: chrome.i18n.getMessage("error") };
      }

      try {
        setError(null);

        if (!BASE_URL) {
          throw new Error("API URL not configured");
        }

        const token = await new Promise<string>((resolve, reject) => {
          chrome.storage.local.get(["token"], (result) => {
            if (result.token) {
              resolve(result.token);
            } else {
              reject(new Error("No token found"));
            }
          });
        });

        await axios.post(
          `${BASE_URL}/me/trusted-users`,
          { email },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          },
        );

        await fetchTrustedUsers();
        return { success: true };
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 400) {
            if (err.response?.data?.error === "User not found") {
              const errorMsg = chrome.i18n.getMessage("userNotFound");
              setError(errorMsg);
              return { success: false, error: errorMsg };
            }
            if (err.response?.data?.error === "User is already trusted") {
              const errorMsg = chrome.i18n.getMessage("userAlreadyTrusted");
              setError(errorMsg);
              return { success: false, error: errorMsg };
            }
          }

          if (err.response?.status === 401 || err.response?.status === 403) {
            const errorMsg = chrome.i18n.getMessage("authError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }

          if (err.code === "ECONNABORTED") {
            const errorMsg = chrome.i18n.getMessage("networkError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }

          if (err.response) {
            const errorMsg = chrome.i18n.getMessage("serverError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }

          if (err.request) {
            const errorMsg = chrome.i18n.getMessage("networkError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }
        }

        const errorMsg = chrome.i18n.getMessage("error");
        setError(errorMsg);
        console.error("Error adding trusted user:", err);
        return { success: false, error: errorMsg };
      }
    },
    [fetchTrustedUsers],
  );

  const removeTrustedUser = useCallback(
    async (userId: number) => {
      if (!userId || typeof userId !== "number") {
        return { success: false, error: chrome.i18n.getMessage("error") };
      }

      try {
        setError(null);

        if (!BASE_URL) {
          throw new Error("API URL not configured");
        }

        const token = await new Promise<string>((resolve, reject) => {
          chrome.storage.local.get(["token"], (result) => {
            if (result.token) {
              resolve(result.token);
            } else {
              reject(new Error("No token found"));
            }
          });
        });

        await axios.delete(`${BASE_URL}/me/trusted-users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        });

        await fetchTrustedUsers();
        return { success: true };
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.code === "ECONNABORTED") {
            const errorMsg = chrome.i18n.getMessage("networkError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }

          if (err.response?.status === 401 || err.response?.status === 403) {
            const errorMsg = chrome.i18n.getMessage("authError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }

          if (err.response) {
            const errorMsg = chrome.i18n.getMessage("serverError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }

          if (err.request) {
            const errorMsg = chrome.i18n.getMessage("networkError");
            setError(errorMsg);
            return { success: false, error: errorMsg };
          }
        }

        const errorMsg = chrome.i18n.getMessage("error");
        setError(errorMsg);
        console.error("Error removing trusted user:", err);
        return { success: false, error: errorMsg };
      }
    },
    [fetchTrustedUsers],
  );

  useEffect(() => {
    fetchTrustedUsers().catch((err) => {
      console.error("Initial trusted users fetch failed:", err);
      setError(chrome.i18n.getMessage("error"));
      setLoading(false);
    });
  }, [fetchTrustedUsers]);

  return {
    trustedUsers,
    loading,
    error,
    fetchTrustedUsers,
    addTrustedUser,
    removeTrustedUser,
  };
}
