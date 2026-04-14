import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const apiUrl = "http://localhost:3000/api/auth";

    const handleLogin = (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!username || !password) {
            setError("Please enter username and password");
            return;
        }

        fetch(`${apiUrl}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        })
        .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
                setMessage("Login successful!");
                // Store user to simulate session
                localStorage.setItem("user", JSON.stringify(data.data));
                setTimeout(() => {
                    navigate("/");
                }, 1000);
            } else {
                setError(data.message || "Failed to login");
            }
        })
        .catch((err) => {
            setError("Failed to connect to server");
        });
    };

    return (
        <div className="auth-app-container">
            <h1 className="todo-header" style={{fontSize: "2rem", marginBottom: "1rem"}}>Welcome Back</h1>
            <p className="text-center text-muted" style={{marginBottom: "2rem"}}>Enter your credentials to access your tasks.</p>

            <form onSubmit={handleLogin} className="d-flex flex-column gap-3">
                {message && <div className="p-3 rounded status-success text-center" style={{fontWeight: 500}}>{message}</div>}
                {error && <div className="p-3 rounded status-error text-center" style={{fontWeight: 500}}>{error}</div>}

                <div>
                    <label style={{marginBottom: "0.5rem", display: "block", color: "var(--text-main)"}}>Username</label>
                    <input 
                        type="text" 
                        className="form-control custom-input" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder="Your username" 
                    />
                </div>
                <div>
                    <label style={{marginBottom: "0.5rem", display: "block", color: "var(--text-main)"}}>Password</label>
                    <div className="position-relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            className="form-control custom-input" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Your password" 
                            style={{paddingRight: "2.5rem"}}
                        />
                        <button 
                            type="button" 
                            className="btn position-absolute border-0 p-0 text-muted" 
                            style={{right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent'}}
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? "Hide Password" : "Show Password"}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </button>
                    </div>
                </div>
                
                <button type="submit" className="btn btn-primary-custom w-100 mt-2">
                    Login
                </button>
            </form>

            <div className="text-center mt-4 text-muted">
                Don't have an account? <Link to="/register" className="auth-link">Register</Link>
            </div>
        </div>
    );
}
