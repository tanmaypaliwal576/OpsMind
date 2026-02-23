import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const password = form.password;

  if (!name || !email || !password || !form.confirmPassword) {
    toast.error("All fields are required");
    setLoading(false);
    return;
  }

  if (name.length < 3) {
    toast.error("Name must be at least 3 characters");
    setLoading(false);
    return;
  }

  if (password.length < 6) {
    toast.error("Password must be at least 6 characters");
    setLoading(false);
    return;
  }

  if (password !== form.confirmPassword) {
    toast.error("Passwords do not match");
    setLoading(false);
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Signup failed");
    }

    // Save token
    localStorage.setItem("rag_token", data.token);
    localStorage.setItem("rag_user", JSON.stringify(data.user));

    toast.success("Account created successfully");
    navigate("/chat");

  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};
return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black text-white">
      {/* LEFT SIDE */}
      <motion.div
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-center px-16 border-r border-white/10 bg-zinc-950"
      >
        <h1 className="text-5xl font-bold mb-6">Build Your Workspace</h1>
        <p className="text-gray-400 max-w-md">
          Organize tasks, manage teams, and scale your productivity.
        </p>
      </motion.div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <h2 className="text-3xl font-semibold mb-6">Create Account</h2>

       
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NAME */}
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3"
            />

            {/* EMAIL */}
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3"
            />

            {/* PASSWORD */}
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3 pr-20"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
              >
                {showConfirmPass ? "Hide" : "Show"}
              </button>
            </div>
            
            

            {/* SUBMIT */}
            <button
              disabled={loading}
              className="w-full bg-white text-black rounded-lg py-3 font-semibold"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <p className="text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-white">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}