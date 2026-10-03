<template>
  <div class="dashboard-layout">
    <AppHeader />
    <div class="dashboard-content">
      <AppSidebar />
      <main class="main-content">
        <div class="page-header header-flex">
          <div>
            <h1>My Achievements</h1>
            <p class="text-secondary">Upload achievements for faculty review</p>
          </div>
          <button @click="showSubmitForm = !showSubmitForm" class="btn btn-primary btn-sm">
            {{ showSubmitForm ? "Hide Form" : "+ Submit Achievement" }}
          </button>
        </div>

        <!-- Submit / Upload Form -->
        <div v-if="showSubmitForm" class="card submit-card">
          <h3>Submit an Achievement for Review</h3>
          <p class="text-secondary form-hint">
            Pick an achievement from the catalog or describe a custom one, add
            proof (certificate / repo / doc link), and a faculty member will
            approve it — tokens are minted to your wallet on approval.
          </p>
          <form @submit.prevent="handleSubmitClaim" class="submit-form">
            <div class="form-group">
              <label class="form-label">Achievement (catalog)</label>
              <select v-model="claimForm.achievementId" class="form-select" :disabled="submitting">
                <option value="">-- Custom achievement (describe below) --</option>
                <option v-for="a in catalog" :key="a._id" :value="a._id">
                  {{ a.title }} ({{ a.tokenReward }} tokens)
                </option>
              </select>
            </div>
            <div v-if="!claimForm.achievementId" class="form-row">
              <div class="form-group">
                <label class="form-label">Title <span class="required">*</span></label>
                <input v-model="claimForm.title" class="form-input" placeholder="e.g. Hackathon Winner" :disabled="submitting" />
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <input v-model="claimForm.description" class="form-input" placeholder="What did you achieve?" :disabled="submitting" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Evidence Link (URL)</label>
                <input v-model="claimForm.evidenceUrl" class="form-input" placeholder="https://..." :disabled="submitting" />
              </div>
              <div class="form-group">
                <label class="form-label">Note for Faculty</label>
                <input v-model="claimForm.note" class="form-input" placeholder="Anything the reviewer should know" :disabled="submitting" />
              </div>
            </div>
            <button type="submit" class="btn btn-primary" :disabled="submitting || !canSubmit">
              {{ submitting ? "Submitting..." : "Submit for Review" }}
            </button>
          </form>
        </div>

        <!-- My Submissions (pending / rejected / approved claims) -->
        <div v-if="myClaims.length > 0" class="submissions-section">
          <h2>My Submissions</h2>
          <div class="achievements-grid">
            <div v-for="c in myClaims" :key="c._id" class="achievement-card card claim-card">
              <h3>{{ claimTitle(c) }}</h3>
              <p>{{ claimDesc(c) }}</p>
              <div v-if="c.evidenceUrl" class="evidence-row">
                <a :href="c.evidenceUrl" target="_blank" rel="noopener" class="evidence-link">View Evidence ↗</a>
              </div>
              <div class="achievement-meta">
                <span class="badge badge-primary">{{ claimTokens(c) }} tokens</span>
                <span :class="['badge', getStatusClass(c.status)]">{{ statusLabel(c.status) }}</span>
              </div>
              <p v-if="c.reviewNote" class="review-note">Faculty: {{ c.reviewNote }}</p>
              <p class="text-secondary" style="font-size: 0.75rem; margin-top: 0.5rem">
                Submitted: {{ formatDate(c.createdAt) }}
              </p>
            </div>
          </div>
        </div>

        <h2 v-if="achievements.length > 0" class="section-title">Confirmed Achievements</h2>
        <LoadingSpinner v-if="loading" />

        <div v-else-if="achievements.length === 0" class="empty-state">
          <p>No achievements yet. Keep working hard!</p>
        </div>

        <div v-else class="achievements-grid">
          <div
            v-for="achievement in achievements"
            :key="achievement._id"
            class="achievement-card card"
          >
            <h3>{{ achievement.achievementId?.title || "Achievement" }}</h3>
            <p>{{ achievement.achievementId?.description }}</p>
            <div class="achievement-meta">
              <span class="badge badge-primary"
                >{{ achievement.achievementId?.tokenReward }} tokens</span
              >
              <span :class="['badge', getStatusClass(achievement.status)]">
                {{ achievement.status }}
              </span>
            </div>
            <p
              class="text-secondary"
              style="font-size: 0.75rem; margin-top: 0.5rem"
            >
              Awarded: {{ formatDate(achievement.dateAwarded) }}
            </p>
          </div>
        </div>

        <!-- Faculty Recognition / Achievements -->
        <FacultyRecognitions />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import AppHeader from "@/components/common/AppHeader.vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import FacultyRecognitions from "@/components/student/FacultyRecognitions.vue";
import {
  getMyAchievements,
  submitClaim,
} from "@/services/studentAchievement.service";
import { useAchievementsStore } from "@/stores/achievements";
import { formatDate } from "@/utils/helpers";
import { parseApiError } from "@/utils/errorParser";

const achievements = ref([]);
const myClaims = ref([]);
const catalog = ref([]);
const loading = ref(false);
const showSubmitForm = ref(false);
const submitting = ref(false);

const achievementsStore = useAchievementsStore();

const claimForm = ref({
  achievementId: "",
  title: "",
  description: "",
  evidenceUrl: "",
  note: "",
});

const canSubmit = computed(() => {
  if (claimForm.value.achievementId) return true;
  return !!claimForm.value.title.trim();
});

function getStatusClass(status) {
  if (status === "confirmed") return "badge-success";
  if (status === "failed" || status === "rejected") return "badge-danger";
  return "badge-warning";
}

function statusLabel(status) {
  if (status === "pending_approval") return "Pending Faculty Review";
  if (status === "pending_onchain") return "Minting...";
  return status;
}

function claimTitle(c) {
  return c.achievementId?.title || c.claimTitle || "Achievement";
}

function claimDesc(c) {
  return c.achievementId?.description || c.claimDescription || c.note || "";
}

function claimTokens(c) {
  return c.achievementId?.tokenReward ?? 0;
}

async function handleSubmitClaim() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const payload = {
      evidenceUrl: claimForm.value.evidenceUrl.trim(),
      note: claimForm.value.note.trim(),
    };
    if (claimForm.value.achievementId) {
      payload.achievementId = claimForm.value.achievementId;
    } else {
      payload.title = claimForm.value.title.trim();
      payload.description = claimForm.value.description.trim();
    }
    const res = await submitClaim(payload);
    window.$toast?.(res.msg || "Submitted for review!", "success");
    claimForm.value = { achievementId: "", title: "", description: "", evidenceUrl: "", note: "" };
    showSubmitForm.value = false;
    await loadAchievements();
  } catch (error) {
    window.$toast?.(parseApiError(error), "error");
  } finally {
    submitting.value = false;
  }
}

async function loadAchievements() {
  loading.value = true;
  try {
    const [data, pub] = await Promise.all([
      getMyAchievements(),
      achievementsStore.fetchPublicAchievements().catch(() => null),
    ]);
    const all = data.achievements || [];
    // Only show confirmed achievements to students
    achievements.value = all.filter((a) => a.status === "confirmed");
    // Student-uploaded claims (pending review, rejected, or approved)
    myClaims.value = all.filter((a) => a.isClaim);
    catalog.value = achievementsStore.achievements || pub?.achievements || [];
  } catch (error) {
    console.error("Error loading achievements:", error);
    window.$toast?.("Error loading achievements: " + error.message, "error");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAchievements();
});
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

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.achievement-card h3 {
  margin-bottom: 0.5rem;
}

.achievement-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.submit-card {
  margin-bottom: 2rem;
}

.submit-card h3 {
  margin-bottom: 0.25rem;
}

.form-hint {
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
}

.submit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.required {
  color: var(--danger-color);
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.submissions-section {
  margin-bottom: 2rem;
}

.submissions-section h2,
.section-title {
  margin-bottom: 1rem;
}

.claim-card {
  border-left: 3px solid var(--warning-color, #f59e0b);
}

.evidence-row {
  margin-top: 0.5rem;
}

.evidence-link {
  font-size: 0.8rem;
  font-weight: 600;
}

.review-note {
  font-size: 0.8rem;
  font-style: italic;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
