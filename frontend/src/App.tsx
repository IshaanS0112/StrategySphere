import { Link, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import CompanyDetail from "./pages/CompanyDetail";
import Dashboard from "./pages/Dashboard";
import NewCompany from "./pages/NewCompany";
import PortfolioView from "./pages/PortfolioView";
import TimelineView from "./pages/TimelineView";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewCompany />} />
        <Route path="/companies/:companyId" element={<CompanyDetail />} />
        <Route path="/entities/:entityKey" element={<TimelineView />} />
        <Route path="/portfolios" element={<PortfolioView />} />
        <Route path="/portfolios/:portfolioId" element={<PortfolioView />} />
        <Route
          path="*"
          element={
            <div className="panel p-8 text-center">
              <p className="text-sm text-muted">Nothing here.</p>
              <Link to="/" className="btn-ghost mt-4">
                Back to companies
              </Link>
            </div>
          }
        />
      </Routes>
    </AppShell>
  );
}
