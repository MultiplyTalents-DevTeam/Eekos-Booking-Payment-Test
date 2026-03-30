import { roomSelectorTemplate } from "../embed/template.js";
import { initializeRoomSelector } from "./app.js";
import { setupEmbedAutoHeight } from "./embed-auto-height.js";

if (typeof document !== "undefined") {
  const appRoot = document.getElementById("app");

  if (appRoot && !document.getElementById("eekos-room-selector")) {
    appRoot.innerHTML = roomSelectorTemplate.trim();
  }

  initializeRoomSelector(document);
  setupEmbedAutoHeight();
}

