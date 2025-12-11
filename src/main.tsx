// src/main.tsx
import * as Cesium from "cesium";

// Read Cesium token from Vite env (no spaces around `=` in .env)
const ionToken = (import.meta.env.VITE_CESIUM_ION_TOKEN || "").trim();
(Cesium as any).Ion.defaultAccessToken = ionToken;

// debug log to confirm token is read
console.log("Cesium Ion Token length:", ionToken.length);

// Tell Cesium where static assets are served from (must be before importing widgets.css)
(window as any).CESIUM_BASE_URL = "/cesium";

// Import widgets css AFTER setting CESIUM_BASE_URL
import "cesium/Build/Cesium/Widgets/widgets.css";

// React app bootstrap (normal)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
