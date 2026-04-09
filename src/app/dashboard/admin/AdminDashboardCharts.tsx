"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const data = [
  { name: "Jan", bookings: 400, verifications: 240 },
  { name: "Feb", bookings: 300, verifications: 139 },
  { name: "Mar", bookings: 200, verifications: 980 },
  { name: "Apr", bookings: 278, verifications: 390 },
  { name: "May", bookings: 189, verifications: 480 },
  { name: "Jun", bookings: 239, verifications: 380 },
  { name: "Jul", bookings: 349, verifications: 430 },
];

const COLORS = ["#3B82F6", "#2FA4A9", "#10B981"]; // Blue for Clients, Gold for Consultants, Green for Verified

export default function AdminDashboardCharts({ totalClients, totalConsultants }: { totalClients: number, totalConsultants: number }) {
  const pieData = [
    { name: "Clients", value: totalClients || 45 },
    { name: "Consultants", value: totalConsultants || 12 },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full h-full pb-4">
      {/* Area Chart: Platform Activity Trend */}
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2FA4A9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2FA4A9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: "#0F2A44", borderColor: "#333", borderRadius: "12px", color: "#fff" }}
              itemStyle={{ color: "#fff" }}
            />
            <Area type="monotone" dataKey="bookings" stroke="#2FA4A9" fillOpacity={1} fill="url(#colorBookings)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart: User Distribution */}
      <div className="w-full md:w-[30%] min-h-[250px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: "#0F2A44", borderColor: "#333", borderRadius: "12px", color: "#fff" }}
              itemStyle={{ color: "#fff" }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10px", color: "#9ca3af" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
