
import { Outlet } from "react-router-dom";

export const PublicLayout = () => {
  return (
    <div className="w-full">

      <Outlet />

    </div>
  );
};
