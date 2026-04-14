import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const now = new Date();
    // Default to absolute previous calendar month
    const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const [metrics, setMetrics] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth.toString());
    const [selectedYear, setSelectedYear] = useState(defaultYear.toString());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const apiUrl = "http://localhost:3000/api/auth";
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id : "";

    const currentYear = now.getFullYear();
    const years = Array.from({length: 5}, (_, i) => currentYear - i); // e.g. [2026, 2025, 2024, 2023, 2022]
    
    const months = [
        {value: "1", label: "January"}, {value: "2", label: "February"},
        {value: "3", label: "March"}, {value: "4", label: "April"},
        {value: "5", label: "May"}, {value: "6", label: "June"},
        {value: "7", label: "July"}, {value: "8", label: "August"},
        {value: "9", label: "September"}, {value: "10", label: "October"},
        {value: "11", label: "November"}, {value: "12", label: "December"}
    ];

    useEffect(() => {
        if (!userId) {
            navigate("/login");
            return;
        }
        setLoading(true);
        fetch(`${apiUrl}/todos/metrics?userId=${userId}&month=${selectedMonth}&year=${selectedYear}`)
            .then(res => res.json())
            .then(res => {
                if(res.data) {
                    setMetrics(res.data);
                } else {
                    setError("Could not load metrics.");
                }
            })
            .catch(() => setError("Failed to fetch metrics"))
            .finally(() => setLoading(false));
    }, [userId, navigate, selectedMonth, selectedYear]);

    return (
        <div className="auth-app-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="todo-header mb-0">Monthly Analytics</h2>
                <button className="btn btn-outline-light" onClick={() => navigate("/")}>
                    Back to Tasks
                </button>
            </div>

            {error && <div className="status-message status-error">{error}</div>}

            <div className="d-flex justify-content-center gap-3 mb-4">
                <select 
                    className="form-select bg-dark text-white border-secondary" 
                    style={{width: 'auto'}}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                    className="form-select bg-dark text-white border-secondary" 
                    style={{width: 'auto'}}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="text-center text-white mt-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : metrics ? (
                metrics.totalYes === 0 && metrics.totalNo === 0 ? (
                    <div className="text-center mt-2">
                        <h4 className="text-muted mb-4">Target Range: {metrics.targetMonth}</h4>
                        <div className="empty-state bg-dark bg-opacity-25 rounded border border-secondary" style={{padding: '2rem'}}>
                            <h4>No Data Found</h4>
                            <p className="mb-0">You did not track any habits during this timeframe.</p>
                        </div>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-4 text-white">
                        <div className="text-center mb-3">
                            <h4 className="text-muted">Target Range</h4>
                            <h3>{metrics.targetMonth}</h3>
                        </div>

                        <div className="row g-3">
                            <div className="col-6">
                                <div className="p-3 bg-dark bg-opacity-50 rounded text-center border border-secondary">
                                    <h5 className="text-muted mb-1">Completion</h5>
                                    <h2 className={metrics.completionPercentage > 50 ? "text-success" : "text-warning"}>
                                        {metrics.completionPercentage}%
                                    </h2>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="p-3 bg-dark bg-opacity-50 rounded text-center border border-secondary">
                                    <h5 className="text-muted mb-1">Best Streak</h5>
                                    <h2 className="text-info">{metrics.bestStreak} 🔥</h2>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="p-3 bg-dark bg-opacity-50 rounded text-center border border-secondary">
                                    <h5 className="text-muted mb-1">Total Met</h5>
                                    <h2 className="text-success">{metrics.totalYes}</h2>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="p-3 bg-dark bg-opacity-50 rounded text-center border border-secondary">
                                    <h5 className="text-muted mb-1">Total Missed</h5>
                                    <h2 className="text-danger">{metrics.totalNo}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="text-center text-white mt-5">
                    <p>Loading your analytics...</p>
                </div>
            )}
        </div>
    );
}
