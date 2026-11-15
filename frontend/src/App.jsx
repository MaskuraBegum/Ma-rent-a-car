import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Trips from "./pages/Trips.jsx";
import TripForm from "./pages/TripForm.jsx";
import Drivers from "./pages/Drivers.jsx";
import Vendors from "./pages/Vendors.jsx";
import Cars from "./pages/Cars.jsx";
import Clients from "./pages/Clients.jsx";
import Book from "./pages/Book.jsx";
import Expenses from "./pages/Expenses.jsx";
import Reports from "./pages/Reports.jsx";
import InvoiceForm from "./pages/InvoiceForm.jsx";
import InvoiceList from "./pages/InvoiceList.jsx";
import InvoiceView from "./pages/InvoiceView.jsx";
import Statement from "./pages/Statement.jsx";
import MaintenanceForm from "./pages/MaintenanceForm.jsx";
import MaintenanceList from "./pages/MaintenanceList.jsx";

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
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="invoices/:type" element={<InvoiceList />} />
        <Route path="invoices/:type/new" element={<InvoiceForm />} />
        <Route path="invoices/:type/:id" element={<InvoiceView />} />
        <Route path="invoices/:type/:id/edit" element={<InvoiceForm />} />
        <Route path="statements/:type" element={<Statement />} />
        <Route path="maintenance" element={<MaintenanceList />} />
        <Route path="maintenance/new" element={<MaintenanceForm />} />
        <Route path="maintenance/:id/edit" element={<MaintenanceForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
