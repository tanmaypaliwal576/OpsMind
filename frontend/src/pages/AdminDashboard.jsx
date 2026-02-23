import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/analytics")
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(err => console.error(err));
  }, []);

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg font-medium">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-3xl font-bold mb-10">
        Admin Analytics Dashboard
      </h1>

      {/* ================= TOP KPI CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow border">
          <p className="text-sm text-gray-500 uppercase">
            Total Conversations
          </p>
          <p className="text-3xl font-bold mt-3">
            {analytics.totalConversations}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border">
          <p className="text-sm text-gray-500 uppercase">
            Total Documents
          </p>
          <p className="text-3xl font-bold mt-3">
            {analytics.totalDocuments}
          </p>
        </div>
      </div>

      {/* ================= BAR CHART SECTION ================= */}
      <div className="bg-white p-8 rounded-xl shadow border mb-12">
        <h2 className="text-xl font-semibold mb-6">
          Queries per Document
        </h2>

        <div className="w-full h-80">
          <ResponsiveContainer>
            <BarChart data={analytics.mostQueriedDocuments}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>

              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="totalQueries"
                radius={[10, 10, 0, 0]}
                fill="url(#colorGradient)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= RECENT QUERIES ================= */}
      <div className="bg-white p-8 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-6">
          Recent Queries
        </h2>

        <div className="space-y-4">
          {analytics.recentQueries.map((q, index) => (
            <div
              key={index}
              className="border-b pb-4 last:border-none"
            >
              <p className="font-semibold text-gray-700">
                {q.documentId}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {q.question}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;