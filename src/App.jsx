import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { PublicLayout } from "@/layouts/public-layout.jsx";

import HomePage from "@/routes/home.jsx";

const App = () => {
  return (
      <Router>
        <Routes>

          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
          </Route>

        </Routes>

      </Router>
  );
};

export default App;
