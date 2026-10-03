import { createRouter, createWebHistory } from "vue-router";
import { STORAGE_KEYS, USER_ROLES } from "@/utils/constants";

// Auth views
import LoginView from "@/views/auth/LoginView.vue";
import RegisterView from "@/views/auth/RegisterView.vue";

// Admin views
import AdminDashboard from "@/views/admin/DashboardView.vue";
import ManageUsers from "@/views/admin/ManageUsersView.vue";
import ManageAchievements from "@/views/admin/ManageAchievementsView.vue";
import ManagePerks from "@/views/admin/ManagePerksView.vue";

// Faculty views
import FacultyDashboard from "@/views/faculty/DashboardView.vue";
import AwardAchievements from "@/views/faculty/AwardAchievementsView.vue";
import ReviewClaims from "@/views/faculty/ReviewClaimsView.vue";

// Student views
import StudentDashboard from "@/views/student/DashboardView.vue";
import MyAchievements from "@/views/student/MyAchievementsView.vue";
import PerksView from "@/views/student/PerksView.vue";
import WalletView from "@/views/student/WalletView.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: "/register",
    name: "Register",
    component: RegisterView,
    meta: { requiresAuth: false },
  },
  // Admin routes
  {
    path: "/admin/dashboard",
    name: "AdminDashboard",
    component: AdminDashboard,
    meta: { requiresAuth: true, role: USER_ROLES.ADMIN },
  },
  {
    path: "/admin/users",
    name: "ManageUsers",
    component: ManageUsers,
    meta: { requiresAuth: true, role: USER_ROLES.ADMIN },
  },
  {
    path: "/admin/achievements",
    name: "ManageAchievements",
    component: ManageAchievements,
    meta: { requiresAuth: true, role: USER_ROLES.ADMIN },
  },
  {
    path: "/admin/perks",
    name: "ManagePerks",
    component: ManagePerks,
    meta: { requiresAuth: true, role: USER_ROLES.ADMIN },
  },
  // Faculty routes
  {
    path: "/faculty/dashboard",
    name: "FacultyDashboard",
    component: FacultyDashboard,
    meta: { requiresAuth: true, role: USER_ROLES.FACULTY },
  },
  {
    path: "/faculty/award",
    name: "AwardAchievements",
    component: AwardAchievements,
    meta: { requiresAuth: true, role: USER_ROLES.FACULTY },
  },
  {
    path: "/faculty/claims",
    name: "ReviewClaims",
    component: ReviewClaims,
    meta: { requiresAuth: true, role: USER_ROLES.FACULTY },
  },
  {
    path: "/faculty/achievements",
    name: "FacultyManageAchievements",
    component: ManageAchievements,
    meta: { requiresAuth: true, role: USER_ROLES.FACULTY },
  },
  {
    path: "/faculty/perks",
    name: "FacultyManagePerks",
    component: ManagePerks,
    meta: { requiresAuth: true, role: USER_ROLES.FACULTY },
  },
  // Student routes
  {
    path: "/student/dashboard",
    name: "StudentDashboard",
    component: StudentDashboard,
    meta: { requiresAuth: true, role: USER_ROLES.STUDENT },
  },
  {
    path: "/student/achievements",
    name: "MyAchievements",
    component: MyAchievements,
    meta: { requiresAuth: true, role: USER_ROLES.STUDENT },
  },
  {
    path: "/student/perks",
    name: "PerksView",
    component: PerksView,
    meta: { requiresAuth: true, role: USER_ROLES.STUDENT },
  },
  {
    path: "/student/wallet",
    name: "WalletView",
    component: WalletView,
    meta: { requiresAuth: true, role: USER_ROLES.STUDENT },
  },
  // Unauthorized page
  {
    path: "/unauthorized",
    name: "Unauthorized",
    component: () => import("@/views/UnauthorizedView.vue"),
  },
  // 404 page
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const userRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);

  // Check if route requires authentication
  if (to.meta.requiresAuth && !token) {
    next("/login");
    return;
  }

  // Check if user has required role
  if (to.meta.role && to.meta.role !== userRole) {
    next("/unauthorized");
    return;
  }

  // Redirect authenticated users away from login/register
  if ((to.path === "/login" || to.path === "/register") && token) {
    // Redirect based on role
    if (userRole === USER_ROLES.ADMIN) {
      next("/admin/dashboard");
    } else if (userRole === USER_ROLES.FACULTY) {
      next("/faculty/dashboard");
    } else if (userRole === USER_ROLES.STUDENT) {
      next("/student/dashboard");
    } else {
      next();
    }
    return;
  }

  next();
});

export default router;
