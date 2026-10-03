<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header">
          <h1>Faculty Dashboard</h1>
          <p class="text-secondary">Award achievements to students</p>
        </div>

        <!-- Faculty Activity Stats -->
        <FacultyStats />

        <!-- Quick Faculty Recognition Award -->
        <QuickAward @award-success="handleAwardSuccess" />

        <!-- Faculty Profile Section -->
        <FacultyDetails />

        <!-- Recent Activity Feed -->
        <RecentActivity ref="activityRef" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import FacultyDetails from "@/components/faculty/FacultyDetails.vue";
import FacultyStats from "@/components/faculty/FacultyStats.vue";
import QuickAward from "@/components/faculty/QuickAward.vue";
import RecentActivity from "@/components/faculty/RecentActivity.vue";

const activityRef = ref(null);

function handleAwardSuccess() {
  if (activityRef.value?.loadActivity) {
    activityRef.value.loadActivity();
  }
}
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background: var(--bg-secondary);
}

.dashboard-content {
  display: flex;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  margin-bottom: 2rem;
}
</style>
