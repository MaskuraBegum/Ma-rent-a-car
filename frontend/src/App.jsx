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
import LedgerBalances from "./pages/LedgerBalances.jsx";
import LedgerParty from "./pages/LedgerParty.jsx";
import Dashboard from "./pages/Dashboard.jsx";   
import PurchaseForm from "./pages/PurchaseForm.jsx";
import PurchaseList from "./pages/PurchaseList.jsx";
import PurchaseView from "./pages/PurchaseView.jsx";
import InventoryItems from "./pages/InventoryItems.jsx";
import InventoryItemForm from "./pages/InventoryItemForm.jsx";
import InventoryLookup from "./pages/InventoryLookup.jsx";

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
        <Route path="ledger/:type" element={<LedgerBalances />} />
        <Route path="ledger/:type/:id" element={<LedgerParty />} />
        <Route path="dashboard" element={<Dashboard />} /> 
        <Route path="purchases" element={<PurchaseList />} />
        <Route path="purchases/new" element={<PurchaseForm />} />
        <Route path="purchases/:id" element={<PurchaseView />} />
        <Route path="purchases/:id/edit" element={<PurchaseForm />} />
        <Route path="inventory/items" element={<InventoryItems />} />
        <Route path="inventory/items/new" element={<InventoryItemForm />} />
        <Route path="inventory/items/:id/edit" element={<InventoryItemForm />} />
        <Route path="inventory/categories" element={<InventoryLookup kind="categories" />} />
        <Route path="inventory/units" element={<InventoryLookup kind="units" />} />
      </Route>
    </Routes>
  );
}
