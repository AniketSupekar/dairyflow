import { Link } from "react-router-dom";
import { Home, Box, MapPin, Users, Truck, FileText, CreditCard } from "lucide-react";

const modules = [
  { name: "Products", to: "/admin/products", icon: <Box size={20} /> },
  { name: "Lanes", to: "/admin/lanes", icon: <MapPin size={20} /> },
  { name: "Customers", to: "/admin/customers", icon: <Users size={20} /> },
  { name: "Delivery Team", to: "/admin/delivery-boys", icon: <Truck size={20} /> },
  { name: "Deliveries", to: "/admin/deliveries", icon: <FileText size={20} /> },
  { name: "Financials", to: "/admin/billing", icon: <FileText size={18} /> },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Manage your dairy operations from here.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link
            key={module.name}
            to={module.to}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
                {module.icon}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800">
              {module.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage {module.name.toLowerCase()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;