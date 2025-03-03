// biome-ignore lint/style/useImportType: react requires import
import * as React from "react";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { getDomainAndSubdomain } from "./lib/getDomainAndSubdomain";

const Content: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    async function main() {
      const domain = getDomainAndSubdomain(window.location.href);

      chrome.storage.session.get(`visited-before-${domain}`, (result) => {
        if (result[`visited-before-${domain}`]) {
          setShowOverlay(true);
        }
      });
    }

    main();
  }, []);

  const handleProceed = () => {
    setShowOverlay(true);

    container.style.display = "none";
  };

  if (showOverlay) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "#020202",
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        borderRadius: "0",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
        zIndex: 9999,
        color: "white",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
        border: "1px solid #333",
      }}
    >
      <div style={{ padding: "12px", display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>
            {chrome.i18n.getMessage("firstTimeVisitTitle")}
          </div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            {chrome.i18n.getMessage("firstTimeVisitWarning")}
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "0 12px 12px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={handleProceed}
          style={{
            padding: "6px 12px",
            backgroundColor: "#f42e2e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {chrome.i18n.getMessage("understandProceed")}
        </button>
      </div>
    </div>
  );
};

const container = document.createElement("div");

const shadowRoot = container.attachShadow({ mode: "open" });

const reactContainer = document.createElement("div");
shadowRoot.appendChild(reactContainer);

document.body.appendChild(container);

const root = createRoot(reactContainer);

root.render(<Content />);
