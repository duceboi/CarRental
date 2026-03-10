import { useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  NavLink,
} from "react-router-dom";
import { NETWORK_NAME } from "./abi/contract";
import ProtectedRoute from "./components/ProtectedRoute";
import { Web3Context, Web3Provider } from "./context/Web3Context";
import Login from "./pages/LoginPage/Login";
import OwnerCars from "./pages/Owner/Cars/OwnerCars";
import OwnerDashboard from "./pages/Owner/Dashboard/OwnerDashboard";
import OwnerActiveRentals from "./pages/Owner/Rentals/OwnerActiveRentals";
import RenterDashboard from "./pages/Renter/Dashboard/RenterDashboard";

const ownerLinks = [
  { to: "/owner", label: "Overview" },
  { to: "/owner/cars", label: "Fleet" },
  { to: "/owner/rentals", label: "Active rentals" },
];

const renterLinks = [{ to: "/renter", label: "Dashboard" }];

function truncateAddress(address) {
  if (!address) return "Wallet offline";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRoleFromPath(pathname) {
  if (pathname.startsWith("/owner")) return "owner";
  if (pathname.startsWith("/renter")) return "renter";
  return localStorage.getItem("role");
}

function Navigation() {
  const location = useLocation();
  const { account } = useContext(Web3Context);

  if (location.pathname === "/login") return null;

  const role = getRoleFromPath(location.pathname);
  const links = role === "owner" ? ownerLinks : renterLinks;

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("walletAddress");
    window.location.href = "/login";
  };

  return (
    <header className="app-topbar">
      <div className="topbar-inner">
        <div className="topbar-group">
          <NavLink className="brand" to={role === "owner" ? "/owner" : "/renter"}>
            <span className="brand-mark">CR</span>
            <span className="brand-copy">
              <span className="brand-title">Car Rental DApp</span>
              <span className="brand-subtitle">Premium on-chain rental workspace</span>
            </span>
          </NavLink>

          <nav className="topbar-nav" aria-label="Primary">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/owner" || link.to === "/renter"}
                className={({ isActive }) => `topbar-link${isActive ? " active" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="topbar-meta">
          <span className="network-badge">{NETWORK_NAME}</span>
          <span className="wallet-badge">{truncateAddress(account)}</span>
          <button className="ui-button ui-button--ghost" onClick={handleLogout}>
            Disconnect
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <Navigation />

        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/owner"
            element={
              <ProtectedRoute role="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/cars"
            element={
              <ProtectedRoute role="owner">
                <OwnerCars />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/rentals"
            element={
              <ProtectedRoute role="owner">
                <OwnerActiveRentals />
              </ProtectedRoute>
            }
          />

          <Route
            path="/renter"
            element={
              <ProtectedRoute role="renter">
                <RenterDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </Web3Provider>
  );
}
