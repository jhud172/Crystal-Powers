import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./app/App";
import { EnquiryProvider } from "./features/contact/EnquiryContext";
import { NavigationProtection } from "./app/NavigationProtection";
import { preserveNativeFragmentHistory } from "./app/nativeFragmentHistory";
import "./styles/index.css";

// The data router provides history blocking; App retains all existing route elements.
const fragmentHistory = preserveNativeFragmentHistory();
const router = createBrowserRouter([{ path: "*", element: <EnquiryProvider><NavigationProtection><App /></NavigationProtection></EnquiryProvider> }]);
fragmentHistory.connect(router);
if (import.meta.hot) import.meta.hot.dispose(fragmentHistory.dispose);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
