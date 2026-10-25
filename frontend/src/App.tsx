import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import About from "./pages/About";
import Analytics from "./pages/Analytics";
import Assess from "./pages/Assess";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import ModelInfo from "./pages/ModelInfo";
import RiskMap from "./pages/RiskMap";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<RiskMap />} />
          <Route path="/assess" element={<Assess />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/model" element={<ModelInfo />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
