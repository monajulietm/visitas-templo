import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { ReservationForm } from "./pages/ReservationForm";
import { ManageReservation } from "./pages/ManageReservation";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReservationForm />} />
        <Route path="/manage/:token" element={<ManageReservation />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
