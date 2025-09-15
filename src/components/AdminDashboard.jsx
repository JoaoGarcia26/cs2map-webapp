import { useEffect, useState } from "react";

const AdminDashboard = () => {
  const [licenses, setLicenses] = useState([]);
  const [newKey, setNewKey] = useState("");

  const loadLicenses = async () => {
    try {
      const res = await fetch("/api/licenses");
      const data = await res.json();
      setLicenses(data.licenses || []);
    } catch (err) {
      console.error("failed to load licenses", err);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  const addLicense = async (e) => {
    e.preventDefault();
    const key = newKey.trim();
    if (!key) return;
    try {
      await fetch("/api/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setNewKey("");
      loadLicenses();
    } catch (err) {
      console.error("failed to add license", err);
    }
  };

  const deleteLicense = async (key) => {
    try {
      await fetch(`/api/licenses/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      loadLicenses();
    } catch (err) {
      console.error("failed to delete license", err);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">License Dashboard</h1>
      <form onSubmit={addLicense} className="mb-6 flex">
        <input
          className="border rounded-l p-2 flex-1"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="New license key"
        />
        <button className="bg-blue-500 text-white px-4 rounded-r" type="submit">
          Add
        </button>
      </form>
      <p className="mb-2 text-sm text-gray-600">Total licenses: {licenses.length}</p>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="p-2 text-left">Key</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {licenses.map((key) => (
            <tr key={key} className="border-t">
              <td className="p-2 font-mono break-all">{key}</td>
              <td className="p-2 text-right">
                <button
                  className="text-red-500 hover:underline"
                  type="button"
                  onClick={() => deleteLicense(key)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
