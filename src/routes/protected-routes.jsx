
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

const ProtectRoutes = ({ children }) => {
  const { isSignedIn } = useAuth();


  if (!isSignedIn) {
    return <Navigate to={"/signin"} replace />;
  }

  return children;
};

export default ProtectRoutes;
