import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

const App = lazy(() => import("./App.tsx"));
const WorkPage = lazy(() => import("./pages/WorkPage.tsx"));
const ProjectPage = lazy(() => import("./pages/ProjectPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
