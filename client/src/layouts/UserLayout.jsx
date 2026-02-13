import { Outlet, Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const UserLayout = () => {
  const { logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">

      <header className="bg-white shadow-md p-4 flex justify-between">
        <h2 className="font-bold">Delivery Panel</h2>
        <button onClick={logout} className="text-red-500">
          Logout
        </button>
      </header>

      <main className="flex-1 p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-md flex justify-around py-2">
        <Link to="/user">Deliveries</Link>
      </nav>
    </div>
  );
};

export default UserLayout;