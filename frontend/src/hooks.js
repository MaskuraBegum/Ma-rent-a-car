import { useEffect, useState } from "react";
import { api } from "./api.js";

// Active drivers, cars, vendors and clients for the dropdowns
export function useLookups() {
  const [data, setData] = useState({ drivers: [], cars: [], vendors: [], clients: [], loading: true });

  useEffect(() => {
    let live = true;
    Promise.all(["drivers", "cars", "vendors", "clients"].map((n) => api.get(`/${n}?active=true&limit=200`)))
      .then(([d, c, v, cl]) => {
        if (live) setData({ drivers: d.items, cars: c.items, vendors: v.items, clients: cl.items, loading: false });
      })
      .catch(() => live && setData((s) => ({ ...s, loading: false })));
    return () => {
      live = false;
    };
  }, []);

  return data;
}
