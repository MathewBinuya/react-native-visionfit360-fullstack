import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../lib/api";

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadExercises = () => {
    api.get("/exercises")
      .then((res) => setExercises(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load exercises"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadExercises(); }, []);

  const toggleWorking = async (ex) => {
    try {
      const res = await api.put(`/exercises/${ex._id}`, { working: !ex.working });
      setExercises(exercises.map((e) => (e._id === ex._id ? res.data : e)));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update");
    }
  };

  const deleteExercise = async (id, label) => {
    if (!window.confirm(`Delete exercise "${label}"?`)) return;
    try {
      await api.delete(`/exercises/${id}`);
      setExercises(exercises.filter((e) => e._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Exercises</h1>
        {error && <div className="error">{error}</div>}

        <div className="card">
          <h2>AR Exercises ({exercises.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Group</th>
                  <th>Target Reps</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={ex._id}>
                    <td>{ex.label}</td>
                    <td>{ex.group}</td>
                    <td>{ex.targetReps}</td>
                    <td>{ex.working ? "Active" : "Coming soon"}</td>
                    <td style={{ display: "flex", gap: "8px" }}>
                      <button className="btn-small" onClick={() => toggleWorking(ex)}>
                        {ex.working ? "Disable" : "Enable"}
                      </button>
                      <button className="btn-danger" onClick={() => deleteExercise(ex._id, ex.label)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {exercises.length === 0 && (
                  <tr><td colSpan="5" style={{ color: "var(--gray)" }}>No exercises in database yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}