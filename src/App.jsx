import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import WeightLog from "./pages/WeightLog";
import Nutrition from "./pages/Nutrition";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import DarkModeToggle from "./components/DarkModeToggle";
import BurgerMenu from "./components/BurgerMenu";

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeToggle />
      <BurgerMenu />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/weight-log" element={<WeightLog />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
