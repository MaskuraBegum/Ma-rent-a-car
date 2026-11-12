import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Trips from "./pages/Trips.jsx";
import TripForm from "./pages/TripForm.jsx";
import Drivers from "./pages/Drivers.jsx";
import Vendors from "./pages/Vendors.jsx";
import Cars from "./pages/Cars.jsx";
import Clients from "./pages/Clients.jsx";
import Book from "./pages/Book.jsx";

export default function App() {
  return (
    <Routes>
      {/* public page for customers: no menu, no login */}
      <Route path="/book" element={<Book />} />

      <Route element={<Layout />}>
        <Route index element={<Trips />} />
        <Route path="trips/new" element={<TripForm />} />
        <Route path="trips/:id/edit" element={<TripForm />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="cars" element={<Cars />} />
        <Route path="clients" element={<Clients />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
