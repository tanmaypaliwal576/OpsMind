import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

export default function AdminAnalytics() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userConversations, setUserConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= Role Protection ================= */
  useEffect(() => {
    const token = localStorage.getItem("rag_token");
    const user = JSON.parse(localStorage.getItem("rag_user"));

    if (!token || !user) return navigate("/login");
    if (user.role !== "admin") return navigate("/chat");
  }, [navigate]);

  /* ================= Fetch Analytics ================= */
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const token = localStorage.getItem("rag_token");

        const res = await fetch(
          "http://localhost:5000/api/admin/analytics",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Failed");

        const json = await res.json();
        setData(json.data);
      } catch {
        setError("Unable to load analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  /* ================= Chart Data ================= */

  const sortedDocs = useMemo(() => {
    if (!data?.mostQueriedDocuments) return [];
    return [...data.mostQueriedDocuments].sort(
      (a, b) => b.totalQueries - a.totalQueries
    );
  }, [data]);

  const confidenceTrend = useMemo(() => {
    if (!data?.recentQueries) return [];
    return data.recentQueries.map((q, index) => ({
      name: `Q${index + 1}`,
      confidence: Number(q.confidence?.toFixed(2)) || 0,
    }));
  }, [data]);

  /* ================= Fetch Conversations Per User ================= */
  const handleUserClick = async (userId) => {
    try {
      const token = localStorage.getItem("rag_token");

      const res = await fetch(
        `http://localhost:5000/api/admin/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error();

      const json = await res.json();

      setSelectedUser(userId);
      setUserConversations(json.conversations || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading analytics...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-500">
        {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white px-10 py-12">

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
        <button
          onClick={() => navigate("/chat")}
          className="text-sm bg-zinc-900 border border-white/10 px-5 py-2 rounded-lg hover:bg-white hover:text-black transition"
        >
          ← Back to Chat
        </button>
      </div>

      {/* KPI */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        <Card title="Total Conversations" value={data.totalConversations} />
        <Card title="Total Documents" value={data.totalDocuments} />
        <Card title="Avg Confidence" value={data.avgConfidence?.toFixed(2)} />
      </div>

      {/* ================= Most Queried Documents ================= */}
      <Section title="Most Queried Documents">
        {sortedDocs.length === 0 ? (
          <EmptyState message="No document usage data available." />
        ) : (
          <div className="h-96 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedDocs}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />

                <XAxis
                  dataKey="_id"
                  stroke="#a1a1aa"
                  label={{
                    value: "Document Name",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#a1a1aa",
                  }}
                />

                <YAxis
                  stroke="#a1a1aa"
                  label={{
                    value: "Number of Queries",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#a1a1aa",
                  }}
                />

                <Tooltip />
                <Bar
                  dataKey="totalQueries"
                  fill="#ffffff"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ================= Confidence Trend ================= */}
      <Section title="Confidence Trend (Recent Queries)">
        {confidenceTrend.length === 0 ? (
          <EmptyState message="No confidence data available." />
        ) : (
          <div className="h-80 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={confidenceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />

                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  label={{
                    value: "Recent Queries",
                    position: "insideBottom",
                    offset: -5,
                    fill: "#a1a1aa",
                  }}
                />

                <YAxis
                  domain={[0, 1]}
                  stroke="#a1a1aa"
                  label={{
                    value: "Confidence Score",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#a1a1aa",
                  }}
                />

                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke="#ffffff"
                  fill="#ffffff33"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ================= Users List ================= */}
      <Section title="Users">
        {data.users?.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          data.users.map((user) => (
            <div
              key={user._id}
              onClick={() => handleUserClick(user._id)}
              className="cursor-pointer px-6 py-4 border-b border-white/10 hover:bg-zinc-900 transition flex justify-between"
            >
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-400">{user.email}</div>
              </div>
              <div className="text-sm text-gray-400">
                {user.conversationCount} conversations
              </div>
            </div>
          ))
        )}
      </Section>

      {/* ================= Selected User Conversations ================= */}
      {selectedUser && (
        <Section title="User Conversations">
          {userConversations.length === 0 ? (
            <EmptyState message="No conversations held by this user." />
          ) : (
            userConversations.map((conv, index) => (
              <div
                key={index}
                className="px-6 py-4 border-b border-white/10"
              >
                <div className="font-medium">{conv.question}</div>
                <div className="text-sm text-gray-400">
                  Confidence: {conv.confidence?.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(conv.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </Section>
      )}
    </div>
  );
}

/* ================= Components ================= */

const Card = ({ title, value }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="bg-zinc-900 border border-white/10 rounded-xl p-6"
  >
    <p className="text-gray-400 text-sm">{title}</p>
    <h2 className="text-3xl font-semibold mt-2">{value}</h2>
  </motion.div>
);

const Section = ({ title, children }) => (
  <div className="mb-16">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
      {children}
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="px-6 py-10 text-center text-gray-400">
    {message}
  </div>
);