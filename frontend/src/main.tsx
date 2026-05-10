import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ReservationForm } from "./pages/ReservationForm";
import { ManageReservation } from "./pages/ManageReservation";
import { Admin } from "./pages/Admin";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReservationForm />} />
        <Route path="/manage/:token" element={<ManageReservation />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
