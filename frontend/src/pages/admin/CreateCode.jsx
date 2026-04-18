import { useState } from "react";

export default function CreateCode() {
  const [code, setCode] = useState("");

  const handleCreate = () => {
    alert("Code created: " + code);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Create Code</h1>
      <input
        type="text"
        placeholder="Enter code"
        className="border p-2 mr-2"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        onClick={handleCreate}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Create
      </button>
    </div>
  );
}
