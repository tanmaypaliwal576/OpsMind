import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const email = form.email.trim().toLowerCase();
  const password = form.password;

  if (!email || !password) {
    toast.error("All fields are required");
    setLoading(false);
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Invalid credentials");
    }

    // Save token
    localStorage.setItem("rag_token", data.token);
    localStorage.setItem("rag_user", JSON.stringify(data.user));

    toast.success("Login successful");
    navigate("/chat");

  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};

 return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black text-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-center px-16 border-r border-white/10 bg-zinc-950"
      >
        <h1 className="text-5xl font-bold mb-6">Welcome to Your Dashboard</h1>
        <p className="text-gray-400 max-w-md">
          Pick up where you left off and stay in control of your work.
        </p>
      </motion.div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <h2 className="text-3xl font-semibold mb-6">Sign In</h2>

        
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3"
            />

            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3 pr-20"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full bg-white text-black rounded-lg py-3 font-semibold"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-gray-400 mt-6">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-white">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}