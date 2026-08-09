import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGuard   from "./components/AuthGuard";
import Layout      from "./components/Layout";
import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import Members     from "./pages/Members";
import Payments    from "./pages/Payments";
import Attendance  from "./pages/Attendance";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — all pages inside Layout */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index           element={<Dashboard />}  />
          <Route path="members"    element={<Members />}    />
          <Route path="payments"   element={<Payments />}   />
          <Route path="attendance" element={<Attendance />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
