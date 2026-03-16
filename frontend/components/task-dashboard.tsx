"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  apiFetch,
  clearAccessToken,
  clearStoredUser,
  getStoredAccessToken,
  getStoredUser,
  tryRefreshToken
} from "../lib/api";
import type { Task, TaskResponse, User } from "../lib/types";

type FormState = {
  title: string;
  description: string;
};

const emptyForm: FormState = {
  title: "",
  description: ""
};

export function TaskDashboard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const boot = async () => {
      const storedUser = getStoredUser<User>();
      const storedAccessToken = getStoredAccessToken();

      if (storedUser) {
        setUser(storedUser);
      }

      if (storedAccessToken) {
        setIsCheckingAuth(false);
        return;
      }

      const refreshed = await tryRefreshToken();

      if (!refreshed) {
        clearAccessToken();
        clearStoredUser();
        router.replace("/login");
        return;
      }

      setIsCheckingAuth(false);
    };

    void boot();
  }, [router]);

  useEffect(() => {
    if (!isCheckingAuth) {
      void loadTasks(page, status, search);
    }
  }, [isCheckingAuth, page, status, search]);

  const loadTasks = async (
    nextPage: number,
    nextStatus: string,
    nextSearch: string
  ) => {
    try {
      const payload = await apiFetch<TaskResponse>(
        `/tasks?page=${nextPage}&pageSize=6&status=${nextStatus}&search=${encodeURIComponent(
          nextSearch
        )}`,
        {
          auth: true
        }
      );

      setTasks(payload.items);
      setTotalPages(payload.pagination.totalPages);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error ? loadError.message : "Unable to load tasks"
      );
    }
  };

  const resetEditor = () => {
    setForm(emptyForm);
    setEditingTaskId(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(() => {
      void (async () => {
        try {
          const endpoint = editingTaskId ? `/tasks/${editingTaskId}` : "/tasks";
          const method = editingTaskId ? "PATCH" : "POST";
          const payload = await apiFetch<{ message: string }>(endpoint, {
            method,
            auth: true,
            body: JSON.stringify(form)
          });

          toast.success(payload.message);
          resetEditor();
          await loadTasks(page, status, search);
        } catch (submitError) {
          toast.error(
            submitError instanceof Error ? submitError.message : "Unable to save task"
          );
        }
      })();
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? ""
    });
  };

  const handleDelete = (taskId: string) => {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await apiFetch<{ message: string }>(`/tasks/${taskId}`, {
            method: "DELETE",
            auth: true
          });

          toast.success(payload.message);
          await loadTasks(page, status, search);
        } catch (deleteError) {
          toast.error(
            deleteError instanceof Error ? deleteError.message : "Unable to delete task"
          );
        }
      })();
    });
  };

  const handleToggle = (taskId: string) => {
    startTransition(() => {
      void (async () => {
        try {
          const payload = await apiFetch<{ message: string }>(
            `/tasks/${taskId}/toggle`,
            {
              method: "PATCH",
              auth: true
            }
          );

          toast.success(payload.message);
          await loadTasks(page, status, search);
        } catch (toggleError) {
          toast.error(
            toggleError instanceof Error ? toggleError.message : "Unable to update task"
          );
        }
      })();
    });
  };

  const handleLogout = () => {
    startTransition(() => {
      void (async () => {
        try {
          await apiFetch("/auth/logout", {
            method: "POST"
          });
        } finally {
          clearAccessToken();
          clearStoredUser();
          router.replace("/login");
        }
      })();
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="shell">
        <div className="panel card">Checking your session...</div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="dashboard">
        <header className="panel dashboard-header">
          <div>
            <span className="eyebrow">Secure Task Dashboard</span>
            <h1>{user ? `${user.name.split(" ")[0]}'s workflow` : "Your tasks"}</h1>
            <p>Search, filter, paginate, and update tasks without leaving the page.</p>
          </div>

          <div className="toolbar-actions">
            <button className="ghost-button" onClick={() => void loadTasks(page, status, search)}>
              Refresh
            </button>
            <button className="danger-button" onClick={handleLogout} disabled={isPending}>
              Logout
            </button>
          </div>
        </header>

        <div className="dashboard-body">
          <aside className="panel card task-form">
            <span className="eyebrow">{editingTaskId ? "Edit Task" : "Add Task"}</span>
            <h2>{editingTaskId ? "Update task" : "Create a task"}</h2>
            <p className="task-meta">Keep titles short so search stays quick.</p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                />
              </div>

              <div className="task-actions">
                <button className="button" type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : editingTaskId ? "Save changes" : "Add task"}
                </button>
                {editingTaskId ? (
                  <button className="ghost-button" type="button" onClick={resetEditor}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </aside>

          <section className="panel card">
            <div className="tasks-toolbar">
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search by title"
              />

              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value);
                }}
              >
                <option value="all">All tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>

              <button className="ghost-button" onClick={resetEditor}>
                Clear form
              </button>
            </div>

            <div className="tasks-list">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  No tasks match the current filters.
                </div>
              ) : (
                tasks.map((task) => (
                  <article className="task-item" key={task.id}>
                    <div className="task-top">
                      <div>
                        <div className="task-title-row">
                          <h3>{task.title}</h3>
                          <span className={`task-badge ${task.completed ? "" : "pending"}`}>
                            {task.completed ? "Completed" : "Pending"}
                          </span>
                        </div>
                        <div className="task-meta">
                          Updated {new Date(task.updatedAt).toLocaleString()}
                        </div>
                        {task.description ? (
                          <p className="task-description">{task.description}</p>
                        ) : null}
                      </div>

                      <div className="task-actions">
                        <button
                          className="ghost-button"
                          onClick={() => handleToggle(task.id)}
                          disabled={isPending}
                        >
                          {task.completed ? "Mark pending" : "Mark done"}
                        </button>
                        <button className="ghost-button" onClick={() => handleEdit(task)}>
                          Edit
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => handleDelete(task.id)}
                          disabled={isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="pagination">
              <button
                className="ghost-button"
                disabled={page <= 1 || isPending}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span className="task-meta">
                Page {page} of {totalPages}
              </span>
              <button
                className="ghost-button"
                disabled={page >= totalPages || isPending}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
