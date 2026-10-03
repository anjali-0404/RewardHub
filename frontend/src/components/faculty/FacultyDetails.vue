<template>
  <div class="faculty-details card">
    <div class="card-header">
      <h2>Faculty Profile</h2>
      <button
        v-if="!isEditing"
        @click="startEditing"
        class="btn btn-secondary btn-sm"
      >
        Edit Profile
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <LoadingSpinner />
      <p>Loading profile...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="text-error">{{ error }}</p>
      <button @click="fetchProfile" class="btn btn-primary btn-sm">
        Retry
      </button>
    </div>

    <div v-else class="details-content">
      <!-- View Mode -->
      <div v-if="!isEditing" class="details-grid">
        <div class="detail-item">
          <label>Faculty ID</label>
          <div class="detail-value">
            <span class="monospace">{{ formatFacultyId(profile._id) }}</span>
            <span class="badge badge-secondary">Read-only</span>
          </div>
        </div>

        <div class="detail-item">
          <label>Name</label>
          <div class="detail-value">{{ profile.name }}</div>
        </div>

        <div class="detail-item">
          <label>Email</label>
          <div class="detail-value">
            <span>{{ profile.email }}</span>
            <span class="badge badge-secondary">Read-only</span>
          </div>
        </div>

        <div class="detail-item">
          <label>Role</label>
          <div class="detail-value">
            <span class="badge badge-primary">{{ profile.role }}</span>
            <span class="badge badge-secondary">Read-only</span>
          </div>
        </div>

        <div class="detail-item">
          <label>Designation</label>
          <div class="detail-value">{{ profile.designation || "Faculty Member" }}</div>
        </div>

        <div class="detail-item">
          <label>Department</label>
          <div class="detail-value">{{ profile.department || "Academic Department" }}</div>
        </div>

        <div class="detail-item">
          <label>Wallet Address</label>
          <div class="detail-value">
            <span v-if="profile.walletAddress" class="monospace">
              {{ profile.walletAddress }}
            </span>
            <span v-else class="text-secondary">Not connected</span>
          </div>
        </div>

        <div class="detail-item">
          <label>Account Created</label>
          <div class="detail-value">
            <span>{{ formatDate(profile.createdAt) }}</span>
            <span class="badge badge-secondary">Read-only</span>
          </div>
        </div>
      </div>

      <!-- Edit Mode -->
      <form v-else @submit.prevent="handleSubmit" class="edit-form">
        <div class="form-group">
          <label for="name"> Name <span class="text-error">*</span> </label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': validationErrors.name }"
            placeholder="Enter your name"
            required
          />
          <span v-if="validationErrors.name" class="error-message">
            {{ validationErrors.name }}
          </span>
        </div>

        <div class="form-group">
          <label for="designation">Designation</label>
          <input
            id="designation"
            v-model="formData.designation"
            type="text"
            class="form-control"
            placeholder="e.g. Associate Professor"
          />
        </div>

        <div class="form-group">
          <label for="department">Department</label>
          <input
            id="department"
            v-model="formData.department"
            type="text"
            class="form-control"
            placeholder="e.g. Computer Science & Engineering"
          />
        </div>

        <div class="form-group">
          <label for="walletAddress">Wallet Address</label>
          <input
            id="walletAddress"
            v-model="formData.walletAddress"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': validationErrors.walletAddress }"
            placeholder="0x..."
          />
          <span v-if="validationErrors.walletAddress" class="error-message">
            {{ validationErrors.walletAddress }}
          </span>
          <small class="form-hint">
            Optional. Must be a valid Ethereum address.
          </small>
        </div>

        <div class="form-info">
          <p class="text-secondary">
            <strong>Note:</strong> Email, Faculty ID, Role, and Account Creation
            Date cannot be changed.
          </p>
        </div>

        <div class="form-actions">
          <button
            type="button"
            @click="cancelEditing"
            class="btn btn-secondary"
            :disabled="saving"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="saving || !isFormValid"
          >
            {{ saving ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import { getCurrentUser, updateProfile } from "@/services/user.service";
import { getErrorMessage } from "@/utils/errorHandler";

const profile = ref(null);
const loading = ref(true);
const error = ref(null);
const isEditing = ref(false);
const saving = ref(false);

const formData = reactive({
  name: "",
  walletAddress: "",
  designation: "",
  department: "",
});

const validationErrors = reactive({
  name: "",
  walletAddress: "",
});

// Fetch user profile
async function fetchProfile() {
  loading.value = true;
  error.value = null;

  try {
    const data = await getCurrentUser();
    profile.value = data.user;
  } catch (err) {
    error.value = getErrorMessage(err) || "Failed to load profile";
  } finally {
    loading.value = false;
  }
}

// Start editing mode
function startEditing() {
  formData.name = profile.value.name;
  formData.walletAddress = profile.value.walletAddress || "";
  formData.designation = profile.value.designation || "";
  formData.department = profile.value.department || "";
  validationErrors.name = "";
  validationErrors.walletAddress = "";
  isEditing.value = true;
}

// Cancel editing
function cancelEditing() {
  isEditing.value = false;
  validationErrors.name = "";
  validationErrors.walletAddress = "";
}

// Validate form
function validateForm() {
  let isValid = true;
  validationErrors.name = "";
  validationErrors.walletAddress = "";

  // Validate name
  if (!formData.name || formData.name.trim().length < 2) {
    validationErrors.name = "Name must be at least 2 characters";
    isValid = false;
  } else if (formData.name.trim().length > 100) {
    validationErrors.name = "Name must be less than 100 characters";
    isValid = false;
  }

  // Validate wallet address (if provided)
  if (formData.walletAddress && formData.walletAddress.trim()) {
    const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressPattern.test(formData.walletAddress.trim())) {
      validationErrors.walletAddress = "Invalid Ethereum wallet address";
      isValid = false;
    }
  }

  return isValid;
}

// Check if form is valid
const isFormValid = computed(() => {
  return (
    formData.name &&
    formData.name.trim().length >= 2 &&
    formData.name.trim().length <= 100 &&
    (!formData.walletAddress ||
      /^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress.trim()))
  );
});

// Handle form submission
async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  saving.value = true;

  try {
    const updateData = {
      name: formData.name.trim(),
      walletAddress: formData.walletAddress.trim() || "",
      designation: formData.designation.trim(),
      department: formData.department.trim(),
    };

    const response = await updateProfile(updateData);
    profile.value = response.user;
    isEditing.value = false;
    window.$toast?.("Profile updated successfully!", "success");
  } catch (err) {
    const errorMsg = getErrorMessage(err) || "Failed to update profile";
    window.$toast?.(errorMsg, "error");
  } finally {
    saving.value = false;
  }
}

// Format faculty ID (show first 8 and last 4 characters)
function formatFacultyId(id) {
  if (!id || id.length < 12) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

onMounted(() => {
  fetchProfile();
});
</script>

<style scoped>
.faculty-details {
  margin-bottom: 2rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.card-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.loading-state p {
  margin-top: 1rem;
  color: var(--text-secondary);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  min-height: 2.5rem;
}

.monospace {
  font-family: "Courier New", monospace;
  font-size: var(--font-size-sm);
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.badge-primary {
  background: var(--primary-color);
  color: white;
}

.badge-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.form-control {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-control.is-invalid {
  border-color: var(--error-color);
}

.form-control.is-invalid:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.error-message {
  color: var(--error-color);
  font-size: var(--font-size-sm);
  margin-top: 0.25rem;
}

.form-hint {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-top: 0.25rem;
}

.form-info {
  padding: 1rem;
  background: var(--bg-tertiary);
  border-left: 3px solid var(--primary-color);
  border-radius: var(--border-radius-sm);
}

.form-info p {
  margin: 0;
  font-size: var(--font-size-sm);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
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

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
