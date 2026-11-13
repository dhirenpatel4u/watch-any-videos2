import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Watch from "./pages/Watch";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>

        {/* HOME */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* LIVE VIDEO */}

        <Route
          path="/watch/live/:username"
          element={<Watch />}
        />


        {/* NORMAL VIDEO */}

        <Route
          path="/watch/:id"
          element={<Watch />}
        />


        {/* FALLBACK */}

        <Route
          path="*"
          element={<Home />}
        />

      </Routes>
    </>
  );
}
