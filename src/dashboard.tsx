import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as d3 from "d3";
import logo from "./assets/logo.png";
import "./styles/globals.css";
import axios from "axios";
import { useAuth } from "./hooks/useAuth";
import { useTrustedUsers } from "./hooks/useTrustedUsers";
import type { TrustedUser } from "./hooks/useTrustedUsers";

interface BlockedSite {
  url: string;
  domain: string;
  timestamp: string;
}

function App() {
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "settings" | "trusted">(
    "stats",
  );
  const chartRef = useRef<SVGSVGElement>(null);
  const auth = useAuth();

  useEffect(() => {
    const fetchBlockedSites = async () => {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          chrome.storage.local.get(["token"], (result) => {
            if (result.token) {
              resolve(result.token);
            } else {
              reject(new Error("No token found"));
            }
          });
        });

        const response = await axios.get(`${BASE_URL}/blocked-phishing`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          setBlockedSites(response.data.data);
        } else {
          throw new Error(
            response.data.error || "Failed to fetch blocked sites",
          );
        }
      } catch (err) {
        setError(chrome.i18n.getMessage("fetchError"));
        console.error("Error fetching blocked sites:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedSites();
  }, []);

  const last30Days = [...Array(30)]
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString();
    })
    .reverse();

  const sitesCountByDay: Record<string, number> = {};

  for (const site of blockedSites) {
    const day = new Date(site.timestamp).toLocaleDateString();
    sitesCountByDay[day] = (sitesCountByDay[day] || 0) + 1;
  }

  useEffect(() => {
    if (!chartRef.current || loading || error) return;

    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3
      .select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(last30Days, (d) => new Date(d)) as [Date, Date])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(Object.values(sitesCountByDay)) || 1])
      .nice()
      .range([height, 0]);

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .style("fill", "#f3f3f3")
      .text(chrome.i18n.getMessage("blockedSitesOverTime"));

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .attr("class", "x-axis")
      .style("color", "#f3f3f3")
      .call(d3.axisBottom(x));

    svg
      .append("g")
      .attr("class", "y-axis")
      .style("color", "#f3f3f3")
      .call(d3.axisLeft(y));

    const area = d3
      .area<string>()
      .x((d) => x(new Date(d)))
      .y0(height)
      .y1((d) => y(sitesCountByDay[d] || 0))
      .curve(d3.curveMonotoneX);

    const areaInitial = d3
      .area<string>()
      .x((d) => x(new Date(d)))
      .y0(height)
      .y1(height)
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<string>()
      .x((d) => x(new Date(d)))
      .y((d) => y(sitesCountByDay[d] || 0))
      .curve(d3.curveMonotoneX);

    const lineInitial = d3
      .line<string>()
      .x((d) => x(new Date(d)))
      .y(height)
      .curve(d3.curveMonotoneX);

    // Add area with animation
    svg
      .append("path")
      .datum(last30Days)
      .attr("fill", "#f42e2e20")
      .attr("d", areaInitial)
      .transition()
      .duration(1000)
      .attr("d", area);

    // Add path with animation
    svg
      .append("path")
      .datum(last30Days)
      .attr("fill", "none")
      .attr("stroke", "#f42e2e")
      .attr("stroke-width", 2)
      .attr("d", lineInitial)
      .transition()
      .duration(1000)
      .attr("d", line);

    // Add data points with animation
    for (const day of last30Days) {
      const value = sitesCountByDay[day] || 0;
      if (value > 0) {
        svg
          .append("circle")
          .attr("cx", x(new Date(day)))
          .attr("cy", height)
          .attr("r", 3)
          .attr("fill", "#f42e2e")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .transition()
          .delay(1000) // Start after line animation
          .duration(500)
          .attr("cy", y(value));
      }
    }

    // Add tooltip functionality
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "chart-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    // Add transparent overlay for better tooltip interaction
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const xDate = x.invert(mouseX);

        // Find the closest date in our data
        const bisect = d3.bisector((d: string) => new Date(d)).left;
        const index = bisect(last30Days, xDate);
        const leftDate = last30Days[Math.max(0, index - 1)];
        const rightDate = last30Days[Math.min(last30Days.length - 1, index)];

        // Select the date closer to mouse position
        const date =
          xDate.valueOf() - new Date(leftDate).valueOf() >
          new Date(rightDate).valueOf() - xDate.valueOf()
            ? rightDate
            : leftDate;

        const value = sitesCountByDay[date] || 0;

        // Position and update tooltip
        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`
            <div>${date}</div>
            <div>${value} ${
              value === 1
                ? chrome.i18n.getMessage("siteBlocked")
                : chrome.i18n.getMessage("sitesBlocked")
            }</div>
          `);

        // Highlight the point
        svg.selectAll(".highlight-point").remove();
        if (value > 0) {
          svg
            .append("circle")
            .attr("class", "highlight-point")
            .attr("cx", x(new Date(date)))
            .attr("cy", y(value))
            .attr("r", 5)
            .attr("fill", "#ffffff")
            .attr("stroke", "#f42e2e")
            .attr("stroke-width", 2);
        }
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
        svg.selectAll(".highlight-point").remove();
      });
  }, [loading, error, last30Days]);

  const Stats = () => (
    <div className="space-y-8">
      <div className="bg-secondary-background p-6 rounded-lg">
        <h2 className="text-xl mb-4">{chrome.i18n.getMessage("statistics")}</h2>
        <div className="text-4xl font-bold text-accent">
          {blockedSites.length}
          <span className="text-base font-normal text-gray-400 ml-2">
            {chrome.i18n.getMessage("totalBlocked")}
          </span>
        </div>
      </div>

      <div className="bg-secondary-background p-6 rounded-lg">
        <div className="h-[300px]">
          <svg ref={chartRef} width="100%" height="100%" />
        </div>
      </div>

      <div className="bg-secondary-background p-6 rounded-lg">
        <h2 className="text-xl mb-4">
          {chrome.i18n.getMessage("recentlyBlocked")}
        </h2>
        <div className="space-y-2">
          {blockedSites
            .slice(-10)
            .reverse()
            .map((site, index) => (
              <div
                key={site.url}
                className="flex items-center justify-between py-2 px-4 bg-tertiary-background rounded"
              >
                <div className="truncate flex-1">
                  <div className="font-medium">{site.domain}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {site.url}
                  </div>
                </div>
                <div className="text-sm text-gray-400 ml-4">
                  {new Date(site.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const Settings = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
    const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);
    const [confidenceUpdateSuccess, setConfidenceUpdateSuccess] =
      useState<boolean>(false);

    useEffect(() => {
      // Load the current confidence threshold
      chrome.storage.local.get(["requiredConfidence"], (result) => {
        if (result.requiredConfidence) {
          setConfidenceThreshold(Number(result.requiredConfidence));
        }
      });
    }, []);

    const handleUpdateConfidence = async (value: number) => {
      try {
        setConfidenceThreshold(value);
        await chrome.storage.local.set({ requiredConfidence: value });
        setConfidenceUpdateSuccess(true);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setConfidenceUpdateSuccess(false);
        }, 3000);
      } catch (err) {
        console.error("Error updating confidence threshold:", err);
      }
    };

    const handleUpdateProfile = async () => {
      try {
        setUpdateError(null);
        setUpdateSuccess(null);

        const token = await new Promise<string>((resolve, reject) => {
          chrome.storage.local.get(["token"], (result) => {
            if (result.token) resolve(result.token);
            else reject(new Error("No token found"));
          });
        });

        const response = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.data.valid) {
          throw new Error(response.data.error || "Failed to fetch user data");
        }

        const data: {
          fullName?: string;
          email?: string;
          currentPassword?: string;
          newPassword?: string;
        } = {};
        if (fullName) data.fullName = fullName;
        if (email) data.email = email;
        if (currentPassword && newPassword) {
          data.currentPassword = currentPassword;
          data.newPassword = newPassword;
        }

        if (Object.keys(data).length === 0) {
          return;
        }

        const updateResponse = await axios.post(`${BASE_URL}/auth/me`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!updateResponse.data.valid) {
          throw new Error(
            updateResponse.data.error || "Failed to update profile",
          );
        }

        setUpdateSuccess(chrome.i18n.getMessage("profileUpdateSuccess"));
        setFullName("");
        setEmail("");
        setCurrentPassword("");
        setNewPassword("");
      } catch (err: unknown) {
        setUpdateError(
          err instanceof Error
            ? err.message
            : chrome.i18n.getMessage("updateError"),
        );
      }
    };

    return (
      <div className="space-y-8">
        <div className="bg-secondary-background p-6 rounded-lg">
          <h2 className="text-xl mb-4">
            {chrome.i18n.getMessage("profileSettings")}
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm text-gray-400 mb-1"
              >
                {chrome.i18n.getMessage("fullName")}
              </label>
              <input
                id="fullName"
                type="text"
                className="w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
                placeholder={chrome.i18n.getMessage("fullNamePlaceholder")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-gray-400 mb-1"
              >
                {chrome.i18n.getMessage("email")}
              </label>
              <input
                id="email"
                type="email"
                className="w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
                placeholder={chrome.i18n.getMessage("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm text-gray-400 mb-1"
              >
                {chrome.i18n.getMessage("currentPassword")}
              </label>
              <input
                id="currentPassword"
                type="password"
                className="w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
                placeholder={chrome.i18n.getMessage(
                  "currentPasswordPlaceholder",
                )}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm text-gray-400 mb-1"
              >
                {chrome.i18n.getMessage("newPassword")}
              </label>
              <input
                id="newPassword"
                type="password"
                className="w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
                placeholder={chrome.i18n.getMessage("newPasswordPlaceholder")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {updateError && (
              <div className="text-red-500 text-sm">{updateError}</div>
            )}
            {updateSuccess && (
              <div className="text-green-500 text-sm">{updateSuccess}</div>
            )}
            <button
              type="button"
              className="w-full h-12 bg-primary rounded-lg text-lg"
              onClick={handleUpdateProfile}
            >
              {chrome.i18n.getMessage("updateProfile")}
            </button>
          </div>
        </div>

        <div className="bg-secondary-background p-6 rounded-lg">
          <h2 className="text-xl mb-4">
            {chrome.i18n.getMessage("securitySettings") || "Security Settings"}
          </h2>
          <div className="space-y-4">
            <div>
              <div className="block text-sm text-gray-400 mb-2">
                {chrome.i18n.getMessage("confidenceThreshold") ||
                  "Phishing Detection Threshold"}{" "}
                ({Math.round(confidenceThreshold * 100)}%)
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {chrome.i18n.getMessage("low")}
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) =>
                    handleUpdateConfidence(Number.parseFloat(e.target.value))
                  }
                  className="flex-1 h-2 bg-tertiary-background rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-400">
                  {chrome.i18n.getMessage("high")}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {chrome.i18n.getMessage("confidenceThresholdDescription")}
              </div>
              {confidenceUpdateSuccess && (
                <div className="text-green-500 text-sm mt-2">
                  {chrome.i18n.getMessage("settingsSaved") ||
                    "Settings saved successfully"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TrustedUsers = () => {
    const { trustedUsers, loading, error, addTrustedUser, removeTrustedUser } =
      useTrustedUsers();
    const [email, setEmail] = useState("");
    const [addError, setAddError] = useState<string | null>(null);

    const handleAddTrustedUser = async () => {
      setAddError(null);
      const result = await addTrustedUser(email);

      if (!result.success) {
        setAddError(result.error!);
      } else {
        setEmail("");
      }
    };

    return (
      <div className="space-y-8">
        <div className="bg-secondary-background p-6 rounded-lg">
          <h2 className="text-xl mb-4">
            {chrome.i18n.getMessage("addTrustedUser")}
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="trustedEmail"
                className="block text-sm text-gray-400 mb-1"
              >
                {chrome.i18n.getMessage("email")}
              </label>
              <div className="flex gap-4">
                <input
                  id="trustedEmail"
                  type="email"
                  className="flex-1 h-12 bg-tertiary-background rounded-lg text-lg p-4"
                  placeholder={chrome.i18n.getMessage("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="px-8 h-12 bg-primary rounded-lg text-lg"
                  onClick={handleAddTrustedUser}
                >
                  {chrome.i18n.getMessage("add")}
                </button>
              </div>
            </div>
            {addError && <div className="text-red-500 text-sm">{addError}</div>}
          </div>
        </div>

        <div className="bg-secondary-background p-6 rounded-lg">
          <h2 className="text-xl mb-4">
            {chrome.i18n.getMessage("trustedUsers")}
          </h2>
          {loading ? (
            <div className="text-center py-4">
              {chrome.i18n.getMessage("loading")}
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : trustedUsers.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              {chrome.i18n.getMessage("noTrustedUsers")}
            </div>
          ) : (
            <div className="space-y-2">
              {trustedUsers.map((user: TrustedUser) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2 px-4 bg-tertiary-background rounded"
                >
                  <div>
                    <div className="font-medium">
                      {user.fullName || user.email}
                    </div>
                    {user.fullName && (
                      <div className="text-sm text-gray-400">{user.email}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ml-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded"
                    onClick={() => removeTrustedUser(Number(user.id))}
                  >
                    {chrome.i18n.getMessage("remove")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    chrome.storage.local.remove(["token"], () => {
      chrome.tabs.getCurrent((tab) => {
        chrome.tabs.remove(tab!.id!);
      });
    });
  };

  return (
    <div className="bg-background text-foreground min-h-screen w-screen flex overflow-hidden">
      <div className="w-64 bg-secondary-background min-h-screen flex-shrink-0 p-6 flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          <img src={logo} alt="logo" className="h-12" />

          <div className="text-xl">lajo.sh</div>
        </div>

        <nav className="space-y-2 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`w-full py-2 rounded-lg text-sm transition-colors ${
              activeTab === "stats"
                ? "bg-tertiary-background text-accent"
                : "hover:bg-tertiary-background"
            }`}
          >
            {chrome.i18n.getMessage("statistics")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trusted")}
            className={`w-full py-2 rounded-lg text-sm transition-colors ${
              activeTab === "trusted"
                ? "bg-tertiary-background text-accent"
                : "hover:bg-tertiary-background"
            }`}
          >
            {chrome.i18n.getMessage("trustedUsers")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`w-full py-2 rounded-lg text-sm transition-colors ${
              activeTab === "settings"
                ? "bg-tertiary-background text-accent"
                : "hover:bg-tertiary-background"
            }`}
          >
            {chrome.i18n.getMessage("settings")}
          </button>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2 bg-primary rounded-lg text-lg"
        >
          {chrome.i18n.getMessage("logout")}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-8">
          {chrome.i18n.getMessage(
            activeTab === "stats"
              ? "statistics"
              : activeTab === "trusted"
                ? "trustedUsers"
                : "settings",
          )}
        </h1>

        {loading ? (
          <div className="text-center py-8">
            {chrome.i18n.getMessage("loading")}
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : activeTab === "stats" ? (
          <Stats />
        ) : activeTab === "trusted" ? (
          <TrustedUsers />
        ) : (
          <Settings />
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
