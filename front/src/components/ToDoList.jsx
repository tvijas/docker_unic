import React, { useState, useEffect } from 'react';
import baseRequest from "../network/baseRequest"
import { format, parseISO, isAfter } from 'date-fns';
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { FaEdit, FaTrash, FaCheck } from 'react-icons/fa';

const TodoList = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ name: '', deadLine: '' });
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await baseRequest.get('/api/task', {
        withCredentials: true
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await baseRequest.post('/api/task', {
        ...newTask,
        deadLine: `${newTask.deadLine}:00`.replace("T", " "), // Append seconds to match the required format
        isFinished: false
      }, {
        withCredentials: true
      });
      setNewTask({ name: '', deadLine: '' });
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const updateTask = async (id, updatedTask) => {
    try {
      await baseRequest.put(`/api/task/${id}`, null, {
        params: {
          ...updatedTask,
          deadLine: `${updatedTask.deadLine}:00`, // Append seconds to match the required format
        },
        withCredentials: true
      });
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const finishTask = async (id) => {
    try {
      await baseRequest.patch(`/api/task/${id}`, null, {
        withCredentials: true
      });
      fetchTasks();
    } catch (error) {
      console.error('Error finishing task:', error);
    }
  };

  const deleteTask = async (id) => {
    try {
      await baseRequest.delete(`/api/task/${id}`, {
        withCredentials: true
      });
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const renderTaskList = (taskList) => (
    <ul>
      {taskList.map(task => (
        <li key={task.id}>
          {editingTask === task.id ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              updateTask(task.id, { name: task.name, deadLine: task.deadLine });
            }}>
              <input
                type="text"
                value={task.name}
                onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
              />
              <input
                type="datetime-local"
                value={task.deadLine.slice(0, -3)} // Remove seconds for datetime-local input
                onChange={(e) => setTasks(tasks.map(t => t.id === task.id ? { ...t, deadLine: e.target.value } : t))}
              />
              <button type="submit">Save</button>
            </form>
          ) : (
            <>
              {task.name} - {format(parseISO(task.deadLine), 'yyyy-MM-dd HH:mm:ss')}
              <button onClick={() => setEditingTask(task.id)}><FaEdit /></button>
              <button onClick={() => deleteTask(task.id)}><FaTrash /></button>
              {!task.isFinished && <button onClick={() => finishTask(task.id)}><FaCheck /></button>}
            </>
          )}
        </li>
      ))}
    </ul>
  );

  const upcomingTasks = tasks.filter(task => !task.isFinished && !task.isExpired);
  const completedTasks = tasks.filter(task => task.isFinished);
  const expiredTasks = tasks.filter(task => task.isExpired);

  return (
    <div>
      <h1>Todo List</h1>
      <form onSubmit={createTask}>
        <input
          type="text"
          placeholder="Task name"
          value={newTask.name}
          onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
          required
        />
        <input
          type="datetime-local"
          value={newTask.deadLine}
          onChange={(e) => setNewTask({ ...newTask, deadLine: e.target.value })}
          required
        />
        <button type="submit">Add Task</button>
      </form>

      <Tabs>
        <TabList>
          <Tab>Upcoming</Tab>
          <Tab>Completed</Tab>
          <Tab>Expired</Tab>
        </TabList>

        <TabPanel>
          <h2>Upcoming Tasks</h2>
          {renderTaskList(upcomingTasks)}
        </TabPanel>
        <TabPanel>
          <h2>Completed Tasks</h2>
          {renderTaskList(completedTasks)}
        </TabPanel>
        <TabPanel>
          <h2>Expired Tasks</h2>
          {renderTaskList(expiredTasks)}
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default TodoList;