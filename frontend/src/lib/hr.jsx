import { useEffect, useState } from "react";
import { api } from "../api.js";
import { inputCls } from "../components/ui.jsx";
import { dhakaToday } from "../utils.js";

export const monthNow = () => dhakaToday().slice(0, 7);
export const splitKey = (k) => {
  const [employeeModel, employee] = k.split(":");
  return { employeeModel, employee };
};
export const empName = (r) => r.employee?.name || "-";
export const STATUS_TONE = {
  pending: "amber", approved: "green", rejected: "red", cleared: "slate",
  draft: "slate", paid: "green", deducted: "blue", waived: "slate",
};
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

export function useEmployees() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/hr/employees").then((r) => setItems(r.items)).catch(() => {});
  }, []);
  return items;
}

export function EmployeeSelect({ employees, value, onChange, required, allLabel }) {
  return (
    <select required={required} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{allLabel || "Select employee"}</option>
      {employees.map((e) => (
        <option key={e.key} value={allLabel ? e.employee : e.key}>
          {e.name} - {e.designation}
        </option>
      ))}
    </select>
  );
}

// "Label (বাংলা)" for field labels
export const L = ({ en, bn }) => (
  <>
    {en} <span className="text-xs font-normal text-slate-500">({bn})</span>
  </>
);

export const PageTitle = ({ en, bn }) => (
  <h1 className="mb-4 text-xl font-semibold">
    {en} <span className="text-sm font-normal text-slate-500">({bn})</span>
  </h1>
);