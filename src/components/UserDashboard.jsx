import { useState } from "react";

const UserDashboard = () => {
  const [token, setToken] = useState(localStorage.getItem("authToken") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [license, setLicense] = useState(localStorage.getItem("licenseKey") || "");
  const [status, setStatus] = useState(null); // null | "valid" | "invalid" | "error"

  const verify = async (e) => {
    e.preventDefault();
    const key = license.trim();
    if (!key) return;
    try {
      const res = await fetch("/api/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem("licenseKey", key);
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    } catch (err) {
      console.error("failed to verify license", err);
      setStatus("error");
    }
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        setToken(data.token);
        setUsername("");
        setPassword("");
        setLoginError(false);
      } else {
        setLoginError(true);
      }
    } catch (err) {
      console.error("login failed", err);
      setLoginError(true);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken("");
  };

  const clear = () => {
    localStorage.removeItem("licenseKey");
    setLicense("");
    setStatus(null);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">User Panel</h1>
      {!token ? (
        <form onSubmit={login} className="flex flex-col">
          <input
            className="border p-2 mb-4 rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            type="password"
            className="border p-2 mb-4 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">
            Login
          </button>
          {loginError && <p className="text-red-500 mt-2">Invalid credentials.</p>}
        </form>
      ) : status === "valid" ? (
        <div className="bg-green-100 p-4 rounded shadow">
          <p className="mb-4">License <span className="font-mono break-all">{license}</span> is valid.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={clear}
            >
              Remove License
            </button>
            <button
              type="button"
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={verify} className="flex flex-col">
          <input
            className="border p-2 mb-4 rounded"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="Enter license key"
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">
            Verify
          </button>
          {status === "invalid" && (
            <p className="text-red-500 mt-2">Invalid license key.</p>
          )}
          {status === "error" && (
            <p className="text-red-500 mt-2">Verification failed. Try again later.</p>
          )}
          <button
            type="button"
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
            onClick={logout}
          >
            Logout
          </button>
        </form>
      )}
    </div>
  );
};

export default UserDashboard;
