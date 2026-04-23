import { useState } from "react";

export default function VerifyRequests() {
  const [requests, setRequests] = useState([
    { id: 1, email: "user@gmail.com" },
  ]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Verify Requests</h1>
      {requests.map((r) => (
        <div key={r.id} className="flex justify-between p-3 border mb-2">
          <span>{r.email}</span>
          <div>
            <button className="bg-green-500 text-white px-3 py-1 mr-2 rounded">
              Approve
            </button>
            <button className="bg-red-500 text-white px-3 py-1 rounded">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}