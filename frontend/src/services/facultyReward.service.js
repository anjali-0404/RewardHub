import api from "./api";

/**
 * Faculty Reward & Recognition Service
 * Handles awarding EDU tokens, querying recognition history, and student acknowledgements
 */

// POST /api/faculty-rewards (Faculty awards student)
export const createFacultyReward = async (rewardData) => {
  const response = await api.post("/faculty-rewards", rewardData);
  return response.data;
};

// GET /api/faculty-rewards/student/me (Student views their recognitions)
export const getMyFacultyRewards = async (params = {}) => {
  const response = await api.get("/faculty-rewards/student/me", { params });
  return response.data;
};

// PATCH /api/faculty-rewards/:id/acknowledge (Student acknowledges receipt)
export const acknowledgeFacultyReward = async (id) => {
  const response = await api.patch(`/faculty-rewards/${id}/acknowledge`);
  return response.data;
};

// GET /api/faculty-rewards/faculty/me (Faculty views awarded history)
export const getFacultyAwardedRewards = async (params = {}) => {
  const response = await api.get("/faculty-rewards/faculty/me", { params });
  return response.data;
};

// GET /api/faculty-rewards/:id (Get single reward details)
export const getFacultyRewardById = async (id) => {
  const response = await api.get(`/faculty-rewards/${id}`);
  return response.data;
};

// POST /api/faculty-rewards/:id/retry (Faculty retries failed tx)
export const retryFacultyReward = async (id) => {
  const response = await api.post(`/faculty-rewards/${id}/retry`);
  return response.data;
};
