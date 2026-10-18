import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PinNote } from "./components/PinNote";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const pinId = params.get("pin");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{pinId ? <PinNote noteId={pinId} /> : <App />}</React.StrictMode>,
);
