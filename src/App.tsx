import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ETFList from "./pages/ETFList";
import ETFDetail from "./pages/ETFDetail";
import ETFCompare from "./pages/ETFCompare";
import Dividend from "./pages/Dividend";
import Company from "./pages/Company";
import Market from "./pages/Market";
import About from "./pages/About";
import Portfolio from "./pages/Portfolio";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive =
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`px-4 py-2 text-sm font-medium rounded transition ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Link to="/" className="font-bold text-lg text-gray-900 mr-6">
            ETF 데이터
          </Link>
          <NavLink to="/">스크리닝</NavLink>
          <NavLink to="/compare">비교</NavLink>
          <NavLink to="/dividend">배당</NavLink>
          <NavLink to="/portfolio">포트폴리오</NavLink>
          <NavLink to="/market">시장</NavLink>
          <NavLink to="/about">안내</NavLink>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<ETFList />} />
        <Route path="/etf/:ticker" element={<ETFDetail />} />
        <Route path="/compare" element={<ETFCompare />} />
        <Route path="/dividend" element={<Dividend />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/market" element={<Market />} />
        <Route path="/company/:name" element={<Company />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}
