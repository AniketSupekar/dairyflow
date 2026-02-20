import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);

  // Wait until AuthContext finishes checking token
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role?.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;