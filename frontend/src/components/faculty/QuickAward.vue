<template>
  <div class="quick-award card">
    <h2 class="section-title">Quick Faculty Award</h2>
    <p class="section-subtitle">
      Award EDU tokens and recognition without leaving the dashboard
    </p>

    <form @submit.prevent="handleAward" class="award-form">
      <div class="form-row">
        <!-- Student -->
        <div class="form-group">
          <label for="student" class="form-label">Student</label>
          <select
            id="student"
            v-model="form.studentId"
            class="form-select"
            required
            :disabled="loading || awarding"
          >
            <option value="">Choose a student...</option>
            <option
              v-for="student in students"
              :key="student._id"
              :value="student._id"
            >
              {{ student.name }} • {{ student.email }} {{ student.walletConnected ? '(✓ Wallet Connected)' : '(⚠️ No Wallet)' }}
            </option>
          </select>
        </div>

        <!-- Achievement / Reason -->
        <div class="form-group">
          <label for="achievement" class="form-label">Achievement / Reason</label>
          <select
            id="achievement"
            v-model="form.achievementId"
            class="form-select"
            required
            :disabled="loading || awarding"
            @change="handleAchievementChange"
          >
            <option value="">Choose an achievement or custom reason...</option>
            <option
              v-for="achievement in achievements"
              :key="achievement._id"
              :value="achievement._id"
            >
              {{ achievement.title }} ({{ achievement.tokenReward }} tokens)
            </option>
            <option value="custom">✏️ Custom Reason / Special Recognition...</option>
          </select>
          <input
            v-if="form.achievementId === 'custom'"
            v-model="form.customReason"
            type="text"
            placeholder="Enter custom reason..."
            class="form-input mt-2"
            required
            :disabled="loading || awarding"
          />
        </div>

        <!-- EDU Amount -->
        <div class="form-group amount-group">
          <label for="amount" class="form-label">EDU Amount</label>
          <input
            id="amount"
            v-model.number="form.amount"
            type="number"
            min="1"
            class="form-input"
            required
            :disabled="loading || awarding"
          />
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="
              loading || awarding || !form.studentId || !form.achievementId || !form.amount
            "
          >
            {{ awarding ? "Awarding On-Chain..." : `Award ${form.amount || 0} EDU` }}
          </button>
        </div>
      </div>

      <!-- Optional Note -->
      <div class="form-row-note mt-2">
        <input
          v-model="form.note"
          type="text"
          placeholder="Optional faculty note / comment for student..."
          class="form-input form-input-note"
          :disabled="loading || awarding"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getStudents } from "@/services/admin.service";
import { useAchievementsStore } from "@/stores/achievements";
import { createFacultyReward } from "@/services/facultyReward.service";

const emit = defineEmits(["award-success"]);

const achievementsStore = useAchievementsStore();
const students = ref([]);
const achievements = ref([]);
const loading = ref(false);
const awarding = ref(false);

const form = ref({
  studentId: "",
  achievementId: "",
  customReason: "",
  amount: 50,
  note: "",
});

function handleAchievementChange() {
  if (form.value.achievementId && form.value.achievementId !== "custom") {
    const ach = achievements.value.find((a) => a._id === form.value.achievementId);
    if (ach && ach.tokenReward) {
      form.value.amount = ach.tokenReward;
    }
  }
}

async function loadData() {
  loading.value = true;
  try {
    const studentsData = await getStudents();
    students.value = studentsData.students || [];

    await achievementsStore.fetchPublicAchievements();
    achievements.value = achievementsStore.achievements || [];
  } catch (error) {
    console.error("Error loading data:", error);
    window.$toast?.("Error loading data: " + error.message, "error");
  } finally {
    loading.value = false;
  }
}

async function handleAward() {
  awarding.value = true;
  try {
    let reason = "Academic Excellence";
    let achId = null;
    if (form.value.achievementId === "custom") {
      reason = form.value.customReason?.trim() || "Special Academic Recognition";
    } else {
      const ach = achievements.value.find((a) => a._id === form.value.achievementId);
      reason = ach ? ach.title : "Academic Excellence";
      achId = ach?._id;
    }

    await createFacultyReward({
      studentId: form.value.studentId,
      achievementId: achId,
      achievementReason: reason,
      amount: form.value.amount,
      note: form.value.note ? form.value.note.trim() : "",
    });

    window.$toast?.("Faculty recognition awarded and verified on blockchain!", "success");

    // Reset form
    form.value = {
      studentId: "",
      achievementId: "",
      customReason: "",
      amount: 50,
      note: "",
    };

    emit("award-success");
  } catch (error) {
    console.error("Error awarding achievement:", error);
    window.$toast?.(
      error.response?.data?.msg || error.message || "Error awarding achievement",
      "error"
    );
  } finally {
    awarding.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.quick-award {
  margin-bottom: 2rem;
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.section-subtitle {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0 0 1.25rem 0;
}

.award-form {
  max-width: 100%;
}

.form-row {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 100px auto;
  gap: 1rem;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.form-select,
.form-input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-actions {
  display: flex;
  align-items: flex-end;
}

.form-row-note {
  margin-top: 0.75rem;
}

.form-input-note {
  width: 100%;
  font-size: var(--font-size-sm);
}

.btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

@media (max-width: 900px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .btn {
    width: 100%;
  }
}
</style>
