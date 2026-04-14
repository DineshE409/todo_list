import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function Todo() {

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [todos, setTodos] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [updateId, setUpdateId] = useState(-1);

    const pad = n => n < 10 ? '0' + n : n;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [showForm, setShowForm] = useState(false);

    const [updateTitle, setUpdateTitle] = useState("");
    const [updateDescription, setUpdateDescription] = useState("");
    const navigate = useNavigate();

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user ? user.id : "";
    const userName = user ? user.username : "Guest";

    const apiUrl = "https://todo-list-backend-0sul.onrender.com/api/auth";

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    const handleAdd = () => {
        setError("");
        if (!title || !description) {
            alert("Please enter title and description");
            return;
        }

        fetch(`${apiUrl}/todos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title, description, userId })
        }).then((res) => {
            if (res.ok) {
                setTitle("");
                setDescription("");
                setShowForm(false);
                setMessage("Todo added successfully");
                getTodos();
                setTimeout(() => {
                    setMessage("");
                }, 3000);
            }
            else {
                setError("Failed to add todo");
            }
        }).catch((err) => {
            setError("Failed to add todo");
        });
    };


    useEffect(() => {
        getTodos();
    }, [selectedDate]); // Refetch magically when date shifts

    const handleLog = (taskId, status) => {
        if (!userId) return;

        // Draft mode local optimistic update only! (Waits for submit button)
        setTodos((prevTodos) =>
            prevTodos.map(item => item._id === taskId ? { ...item, todayStatus: status } : item)
        );
    };

    const handleSaveLogs = () => {
        if (!userId) return;

        const logsPayload = todos
            .filter(todo => todo.todayStatus) // Only target explicitly logged Yes/No states
            .map(todo => ({ taskId: todo._id, status: todo.todayStatus }));

        if (logsPayload.length === 0) {
            setWarning("Please select Yes/No for at least one task before submitting.");
            setTimeout(() => setWarning(""), 3500);
            return;
        }

        fetch(`${apiUrl}/todos/log-bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId, date: selectedDate, logs: logsPayload })
        })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (ok) {
                    setMessage("Submitted successfully");
                    setError("");
                    setTimeout(() => setMessage(""), 3000);
                } else {
                    setError(data.message || "Failed to bulk save logs");
                    setTimeout(() => setError(""), 3000);
                }
            }).catch(() => {
                setError("Failed to bulk save logs");
                setTimeout(() => setError(""), 3000);
            });
    };

    const getTodos = () => {
        if (!userId) return;
        fetch(`${apiUrl}/todos?userId=${userId}&date=${selectedDate}`, {
            method: "GET",
        })
            .then((res) => res.json())
            .then((res) => {
                setTodos(res.data);
            })
            .catch((err) => {
                setError("Failed to fetch todos");
            });
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;

        if (sourceIndex === destinationIndex) return;

        // Optimistic UI update
        const reorderedTodos = Array.from(todos);
        const [removed] = reorderedTodos.splice(sourceIndex, 1);
        reorderedTodos.splice(destinationIndex, 0, removed);

        // Update order property internally mapped to array index
        const updatedItems = reorderedTodos.map((item, index) => ({ ...item, order: index }));
        setTodos(updatedItems);

        // Sync with backend
        const payload = updatedItems.map((item) => ({ _id: item._id, order: item.order }));

        fetch(`${apiUrl}/todos/reorder`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId, items: payload })
        }).catch((err) => {
            setError("Failed to save new order");
            getTodos(); // Revert on failure
        });
    };

    const handleEdit = (item) => {
        setUpdateId(item._id);
        setUpdateTitle(item.title);
        setUpdateDescription(item.description);
        setError("");
    };

    const handleEditCancel = () => {
        setUpdateId(-1);
    };

    const handleUpdate = () => {
        setError("");

        if (!updateTitle || !updateDescription) {
            setError("Please enter title and description");
            return;
        }

        fetch(`${apiUrl}/todos/${updateId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title: updateTitle, description: updateDescription, userId })
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok }) => {
                if (ok) {
                    setTodos((prevTodos) =>
                        prevTodos.map((item) =>
                            item._id === updateId
                                ? { ...item, title: updateTitle, description: updateDescription }
                                : item
                        )
                    );
                    setMessage("Todo updated successfully");
                    setUpdateId(-1);
                    setUpdateTitle("");
                    setUpdateDescription("");
                    setTimeout(() => {
                        setMessage("");
                    }, 3000);
                } else {
                    setError("Failed to update todo");
                }
            })
            .catch(() => {
                setError("Failed to update todo");
            });
    };

    const handleDelete = (id) => {
        setError("");

        fetch(`${apiUrl}/todos/${id}?userId=${userId}`, {
            method: "DELETE",
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok }) => {
                if (ok) {
                    setTodos((prevTodos) => prevTodos.filter((item) => item._id !== id));
                    setMessage("Todo deleted successfully");
                    setTimeout(() => {
                        setMessage("");
                    }, 3000);
                } else {
                    setError("Failed to delete todo");
                }
            })
            .catch(() => {
                setError("Failed to delete todo");
            });
    };


    return (
        <div className="todo-app-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex flex-column">
                    <div className="d-flex align-items-center gap-3">
                        <h1 className="todo-header mb-0">Tasks Hub</h1>
                        <button className="btn btn-primary-custom btn-sm" onClick={() => navigate("/dashboard")}>
                            Dashboard 📊
                        </button>
                    </div>
                    <span className="text-muted mt-2" style={{ fontSize: '1.1rem', fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                        Welcome, <strong style={{
                            background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            fontSize: "1.3rem",
                            letterSpacing: "0.5px",
                            paddingBottom: "2px"
                        }}>{userName}</strong> 👋
                    </span>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    {!showForm && (
                        <button className="btn btn-success btn-sm" onClick={() => setShowForm(true)}>
                            + Add Task
                        </button>
                    )}
                    <button className="btn btn-edit-custom text-danger btn-sm" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>

            {message && <div className="status-message status-success">{message}</div>}
            {error && <div className="status-message status-error">{error}</div>}
            {warning && <div className="status-message status-warning">{warning}</div>}

            {showForm && (
                <div className="todo-input-group position-relative mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="mb-0">Add New Task</h3>
                        <button className="btn-close btn-close-white" aria-label="Close" onClick={() => {
                            setShowForm(false);
                            setTitle("");
                            setDescription("");
                            setError("");
                        }}></button>
                    </div>
                    <div className="d-flex flex-column gap-3 mb-2">
                        <input
                            type="text"
                            className="form-control custom-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task Title..."
                        />
                        <textarea
                            className="form-control custom-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Task Details..."
                            rows="2"
                        />
                    </div>
                    <div className="d-flex justify-content-end mt-4 gap-3">
                        <button className="btn btn-outline-secondary px-4" onClick={() => {
                            setShowForm(false);
                            setTitle("");
                            setDescription("");
                            setError("");
                        }}>
                            Cancel
                        </button>
                        <button className="btn btn-primary-custom px-4" onClick={handleAdd}>
                            Save Task
                        </button>
                    </div>
                </div>
            )}

            <div className="todo-list-container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="todo-list-header mb-0">Your Tasks</h3>
                    <div className="d-flex align-items-center gap-2">
                        <label className="text-white mb-0 text-muted" style={{ fontSize: '0.9rem' }}>Log Date:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm border-secondary text-white bg-dark"
                            style={{ width: 'auto' }}
                            value={selectedDate}
                            max={todayStr}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>

                {todos.length === 0 ? (
                    <div className="empty-state">
                        <p>No tasks yet. Start by adding above!</p>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="todolist">
                            {(provided) => (
                                <div
                                    className="d-flex flex-column gap-3"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {todos.map((item, index) => (
                                        <Draggable key={item._id} draggableId={item._id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    className="todo-item d-flex justify-content-between align-items-center"
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        opacity: snapshot.isDragging ? 0.8 : 1,
                                                        transform: snapshot.isDragging ? provided.draggableProps.style.transform : provided.draggableProps.style.transform || 'none'
                                                    }}
                                                >

                                                    {updateId === item._id ? (
                                                        <div className="w-100 me-3">
                                                            <div className="d-flex flex-column gap-2 mb-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-control custom-input"
                                                                    value={updateTitle}
                                                                    onChange={(e) => setUpdateTitle(e.target.value)}
                                                                    placeholder="Update Title"
                                                                />
                                                                <textarea
                                                                    className="form-control custom-input"
                                                                    value={updateDescription}
                                                                    onChange={(e) => setUpdateDescription(e.target.value)}
                                                                    placeholder="Update Details"
                                                                    rows="2"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex align-items-center me-3" style={{ flex: 1, minWidth: 0 }}>
                                                            {/* Drag Handle Icon/Area */}
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                style={{ cursor: "grab", marginRight: "1rem", color: "var(--text-muted)" }}
                                                            >
                                                                ☰
                                                            </div>
                                                            <div className="d-flex flex-column" style={{ flex: 1, minWidth: 0 }}>
                                                                <span className="todo-item-title text-truncate">{item.title}</span>
                                                                <span className="todo-item-desc text-break">{item.description}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="d-flex gap-2 flex-shrink-0 align-items-center">
                                                        {item.todayStatus === 'yes' ? (
                                                            <div className="badge bg-success bg-opacity-25 text-success border border-success p-2">✅ Yes</div>
                                                        ) : item.todayStatus === 'no' ? (
                                                            <div className="badge bg-danger bg-opacity-25 text-danger border border-danger p-2">❌ No</div>
                                                        ) : null}

                                                        {/* Inline buttons handle logging logic */}

                                                        <div className="d-flex gap-1 me-2 bg-dark bg-opacity-25 rounded p-1">
                                                            <button
                                                                className={`btn btn-sm ${item.todayStatus === 'yes' ? 'btn-success' : 'btn-outline-success'}`}
                                                                onClick={() => handleLog(item._id, 'yes')}
                                                                title="Completed today"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                className={`btn btn-sm ${item.todayStatus === 'no' ? 'btn-danger' : 'btn-outline-danger'}`}
                                                                onClick={() => handleLog(item._id, 'no')}
                                                                title="Missed today"
                                                            >
                                                                ✗
                                                            </button>
                                                        </div>

                                                        {updateId !== item._id ? (
                                                            <>
                                                                <button className="btn btn-edit-custom" onClick={() => handleEdit(item)}>
                                                                    Edit
                                                                </button>
                                                                <button className="btn btn-danger-custom" onClick={() => handleDelete(item._id)}>
                                                                    Delete
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="btn btn-primary-custom" onClick={handleUpdate}>
                                                                    Save
                                                                </button>
                                                                <button className="btn btn-danger-custom" onClick={handleEditCancel}>
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}

                {todos.length > 0 && (
                    <div className="d-flex justify-content-end mt-4 pt-3 border-top border-secondary">
                        <button className="btn btn-success px-4 py-2 fw-bold" onClick={handleSaveLogs} style={{ boxShadow: '0 4px 15px rgba(25, 135, 84, 0.3)' }}>
                            Submit Daily Logs ✅
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
