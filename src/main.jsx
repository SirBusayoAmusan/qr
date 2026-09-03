import React from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.jsx";
import "./index.css";

/**
 * Storage shim.
 *
 * The Claude artifact sandbox provides window.storage. Everywhere else
 * (localhost, Vercel) we back the same async key/value contract with
 * localStorage so the app code never branches on environment.
 */
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const value = localStorage.getItem(key);
      return value !== null ? { key, value } : null;
    },
    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        // QuotaExceededError surfaces here once the origin is full.
        throw new Error("Local storage is full. Export your leads to free space.");
      }
      return { key, value };
    },
    delete: async (key) => {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    list: async (prefix = "") => ({
      keys: Object.keys(localStorage).filter((k) => k.startsWith(prefix)),
    }),
  };
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
