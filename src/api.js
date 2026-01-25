const API_URL = import.meta.env.VITE_API_URL;

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function register(name, email, password, phone) {
  return fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone })
  });
}

export async function getDashboardData() {
  const res = await fetch(`${API_URL}/dashboard`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  });
  return res.json();
}

export async function saveWeight(weight) {
  const res = await fetch(`${API_URL}/weight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ weight })
  });
  return res.json();
}

export async function markAttendance() {
  const res = await fetch(`${API_URL}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  });
  return res.json();
}

export async function generateMealPlan(details) {
  const res = await fetch(`${API_URL}/nutrition-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify(details)
  });
  return res.json();
}

export async function getAdminStats() {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

export async function getAdminUsers() {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

export async function getAdminUserDetails(id) {
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

export async function extendMembership(id, days) {
  const res = await fetch(`${API_URL}/admin/users/${id}/extend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ days })
  });
  return res.json();
}

export async function toggleUserActive(id) {
  const res = await fetch(`${API_URL}/admin/users/${id}/toggle-active`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

// Profile
export async function getUserProfile() {
  const res = await fetch(`${API_URL}/profile`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateUserProfile(data) {
  const res = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function shareMealPlanEmail(planHtml, goal) {
  const res = await fetch(`${API_URL}/share/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ planHtml, goal })
  });
  return res.json();
}


export async function getAdminGraphs() {
  const res = await fetch(`${API_URL}/admin/graphs`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

export async function submitFeedback(message) {
  const res = await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

export async function updateUserAdmin(id, data) {
  const res = await fetch(`${API_URL}/admin/users/${id}/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function overrideAttendance(id, date, action) {
  const res = await fetch(`${API_URL}/admin/users/${id}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ date, action })
  });
  return res.json();
}

// Legacy payment endpoints (for backwards compatibility)
export async function createOrder() {
  const res = await fetch(`${API_URL}/payment/order`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

export async function verifyPayment(data) {
  const res = await fetch(`${API_URL}/payment/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ==========================================
// RAZORPAY LIVE PAYMENT FUNCTIONS
// ==========================================

// Create Razorpay Order (new endpoint)
export async function createPaymentOrder(amount = 500) {
  const res = await fetch(`${API_URL}/payments/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ amount })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create payment order");
  }

  return res.json();
}

// Verify Razorpay Payment (new endpoint)
export async function verifyPaymentSignature(paymentData) {
  const res = await fetch(`${API_URL}/payments/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify(paymentData)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Payment verification failed");
  }

  return res.json();
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function verifyOtp(email, otp) {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  });
  return res.json();
}

export async function resetPassword(email, otp, password) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, password })
  });
  return res.json();
}

// Google Auth - sync Firebase user with backend
export async function googleAuth(userData) {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });
  return res.json();
}

