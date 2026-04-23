import React from 'react'

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 shadow rounded-2xl bg-white">Users: 120</div>
        <div className="p-4 shadow rounded-2xl bg-white">Requests: 15</div>
        <div className="p-4 shadow rounded-2xl bg-white">Codes: 30</div>
      </div>
    </div>
  );
}
