import { Outlet } from "react-router-dom";
import Header from "@/components/header.jsx";

export const Generate = () => {
  return (
    <div className="flex-col md:px-12">
        <Header/>
      <Outlet />
    </div>
  );
};
