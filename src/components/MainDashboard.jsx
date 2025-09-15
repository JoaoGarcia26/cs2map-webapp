/* eslint-disable react/prop-types */
import { useState } from "react";
import AdminDashboard from "./AdminDashboard";

const MainDashboard = () => {
  const [view, setView] = useState("home");

  const logout = () => {
    localStorage.removeItem("authToken");
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-gray-800 text-white p-4 flex flex-col gap-4">
        <h2 className="text-xl font-bold">Menu</h2>
        <nav className="flex flex-col gap-2">
          <button
            className="text-left hover:bg-gray-700 p-2 rounded"
            onClick={() => setView("home")}
          >
            Dashboard
          </button>
          <button
            className="text-left hover:bg-gray-700 p-2 rounded"
            onClick={() => setView("keys")}
          >
            Gerenciar Keys
          </button>
        </nav>
        <button
          className="mt-auto bg-red-500 text-white p-2 rounded"
          onClick={logout}
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-6 bg-gray-50">
        {view === "keys" ? (
          <AdminDashboard />
        ) : (
          <div>
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p>Bem-vindo ao painel.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainDashboard;

