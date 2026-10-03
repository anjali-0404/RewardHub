<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <router-link
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        class="sidebar-link"
        active-class="active"
      >
        <component :is="link.icon" class="link-icon" />
        <span class="link-text">{{ link.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import DashboardIcon from "@/components/icons/DashboardIcon.vue";
import UsersIcon from "@/components/icons/UsersIcon.vue";
import TrophyIcon from "@/components/icons/TrophyIcon.vue";
import GiftIcon from "@/components/icons/GiftIcon.vue";
import WalletIcon from "@/components/icons/WalletIcon.vue";
import AwardIcon from "@/components/icons/AwardIcon.vue";

const authStore = useAuthStore();

const navLinks = computed(() => {
  const role = authStore.userRole;

  if (role === "admin") {
    return [
      { path: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
      { path: "/admin/users", label: "Manage Users", icon: UsersIcon },
      { path: "/admin/achievements", label: "Achievements", icon: TrophyIcon },
      { path: "/admin/perks", label: "Perks", icon: GiftIcon },
    ];
  }

  if (role === "faculty") {
    return [
      { path: "/faculty/dashboard", label: "Dashboard", icon: DashboardIcon },
      { path: "/faculty/award", label: "Award", icon: AwardIcon },
      { path: "/faculty/claims", label: "Review Claims", icon: TrophyIcon },
      {
        path: "/faculty/achievements",
        label: "Achievements",
        icon: TrophyIcon,
      },
      { path: "/faculty/perks", label: "Perks", icon: GiftIcon },
    ];
  }

  if (role === "student") {
    return [
      { path: "/student/dashboard", label: "Dashboard", icon: DashboardIcon },
      {
        path: "/student/achievements",
        label: "My Achievements",
        icon: TrophyIcon,
      },
      { path: "/student/perks", label: "Perks", icon: GiftIcon },
      { path: "/student/wallet", label: "Wallet", icon: WalletIcon },
    ];
  }

  return [];
});
</script>

<style scoped>
.sidebar {
  width: 260px;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border-color);
  height: calc(100vh - 65px);
  position: sticky;
  top: 65px;
  overflow-y: auto;
}

.sidebar-nav {
  padding: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1.25rem;
  margin: 0 0.75rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-base);
  border-radius: var(--border-radius);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.sidebar-link:hover {
  background-color: var(--gray-50);
  color: var(--text-primary);
  transform: translateX(2px);
}

.sidebar-link.active {
  background: linear-gradient(
    135deg,
    var(--primary-subtle) 0%,
    rgba(6, 182, 212, 0.05) 100%
  );
  color: var(--primary-color);
  font-weight: var(--font-weight-semibold);
  box-shadow: inset 3px 0 0 var(--primary-color);
}

.link-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.link-text {
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .sidebar {
    width: 70px;
  }

  .link-text {
    display: none;
  }

  .sidebar-link {
    justify-content: center;
    padding: 0.875rem;
    margin: 0 0.5rem;
  }
}
</style>
