
import { Outlet } from "react-router-dom";
import Header from "@/components/header.jsx";

export const PublicLayout = () => {
  return (
    <div className="w-full">
        <Header />
      <Outlet />


    </div>
  );
};
