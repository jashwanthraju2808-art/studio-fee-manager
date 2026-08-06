import { useEffect, useState } from "react";
import { getMembers, searchMembers } from "./api/memberApi";

function App() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await getMembers();
      setMembers(response.data);
    } catch (error) {
      console.error("Error loading members:", error);
      alert("Unable to connect to FastAPI backend.");
    }
  };

  const handleSearch = async (value) => {
    setSearch(value);

    if (value.trim() === "") {
      loadMembers();
      return;
    }

    try {
      const response = await searchMembers(value);
      setMembers(response.data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  return (
    <div className="container mt-5">

      <h2 className="text-center mb-4">
        🧘 Studio Fee Manager
      </h2>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Search by Name or Phone"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <table className="table table-bordered table-hover shadow">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Phone</th>
            <th>Fee</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {members.length > 0 ? (
            members.map((member) => (
              <tr key={member.id}>
                <td>{member.id}</td>
                <td>{member.first_name}</td>
                <td>{member.last_name}</td>
                <td>{member.phone_number}</td>
                <td>₹{member.fee}</td>

                <td>
                  <button
                    className="btn btn-primary btn-sm me-2"
                    onClick={() => alert(`Edit Member ID: ${member.id}`)}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    className="btn btn-danger btn-sm me-2"
                    onClick={() => alert(`Delete Member ID: ${member.id}`)}
                  >
                    🗑 Delete
                  </button>

                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => alert(`Payment for ${member.first_name}`)}
                  >
                    💰 Payment
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="text-center">
                No members found
              </td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  );
}

export default App;