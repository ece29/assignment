export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskResponse = {
  items: Task[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
