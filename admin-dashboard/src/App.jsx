import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Exercises from "./pages/Exercises";
import UserDetail from "./pages/UserDetail";
import "./App.css";

function Protected({ children }) {
  const token = localStorage.getItem("adminToken");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/users" element={<Protected><Users /></Protected>} />
        <Route path="/exercises" element={<Protected><Exercises /></Protected>} />
        <Route path="/users/:id" element={<Protected><UserDetail /></Protected>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}