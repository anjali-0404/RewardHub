import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FacultyRecognitions from "@/components/student/FacultyRecognitions.vue";
import * as facultyRewardService from "@/services/facultyReward.service";

// Mock the faculty reward service
vi.mock("@/services/facultyReward.service", () => ({
  getMyFacultyRewards: vi.fn(),
  acknowledgeFacultyReward: vi.fn(),
}));

// Mock the wallet service (component refreshes balance after loading rewards;
// an unmocked axios call never settles in happy-dom and keeps `loading` true)
vi.mock("@/services/wallet.service", () => ({
  getCalculatedBalance: vi.fn().mockResolvedValue({ availableBalance: 0 }),
  getWalletStatus: vi.fn().mockResolvedValue({ walletConnected: false }),
  disconnectWallet: vi.fn().mockResolvedValue({ user: {} }),
  getTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
}));

describe("FacultyRecognitions.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockRewards = [
    {
      _id: "660000000000000000000001",
      rewardId: "REW-M4K1-X992",
      studentId: "student-1",
      facultyId: "faculty-1",
      studentWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      facultyWallet: "0x976ea74026e726554db657fa54763abd0c3a0aa9",
      facultyDetails: {
        name: "Dr. Sarah Johnson",
        designation: "Associate Professor",
        department: "Computer Science & Engineering",
        email: "sarah.johnson@rewardhub.com",
      },
      achievementReason: "Research Excellence in Distributed Ledgers",
      note: "Exceptional contribution to the consensus mechanism research.",
      amount: 150,
      timestamp: "2026-09-25T10:00:00.000Z",
      transactionHash: "0x3a12b98f5a6c11d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef0",
      transactionStatus: "confirmed",
      acknowledgementStatus: "pending",
      acknowledgementTimestamp: null,
    },
    {
      _id: "660000000000000000000002",
      rewardId: "REW-M4K2-Y883",
      studentId: "student-1",
      facultyId: "faculty-2",
      studentWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      facultyWallet: "0x14dc79964da2c08b23698b3d3cc7ca32193d9955",
      facultyDetails: {
        name: "Prof. Michael Chen",
        designation: "Professor & Department Chair",
        department: "Information Technology",
        email: "michael.chen@rewardhub.com",
      },
      achievementReason: "Outstanding Hackathon Performance",
      note: "First place win in the campus web3 hackathon.",
      amount: 250,
      timestamp: "2026-09-24T15:30:00.000Z",
      transactionHash: "0x7b23c01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e",
      transactionStatus: "confirmed",
      acknowledgementStatus: "acknowledged",
      acknowledgementTimestamp: "2026-09-24T16:00:00.000Z",
    },
  ];

  it("renders empty state when student has no recognitions", async () => {
    facultyRewardService.getMyFacultyRewards.mockResolvedValueOnce({
      count: 0,
      totalTokensEarned: 0,
      rewards: [],
    });

    const wrapper = mount(FacultyRecognitions);
    await flushPromises();

    expect(wrapper.text()).toContain("No Faculty Recognitions Yet");
    expect(wrapper.find(".empty-state").exists()).toBe(true);
  });

  it("renders recognition cards with achievement/reason, EDU amount, faculty details, and blockchain status", async () => {
    facultyRewardService.getMyFacultyRewards.mockResolvedValueOnce({
      count: 2,
      totalTokensEarned: 400,
      rewards: mockRewards,
    });

    const wrapper = mount(FacultyRecognitions);
    await flushPromises();

    // Check achievement reason
    expect(wrapper.text()).toContain("Research Excellence in Distributed Ledgers");
    expect(wrapper.text()).toContain("Outstanding Hackathon Performance");

    // Check EDU amount
    expect(wrapper.text()).toContain("150");
    expect(wrapper.text()).toContain("250");
    expect(wrapper.text()).toContain("400 EDU"); // total earned summary

    // Check faculty details
    expect(wrapper.text()).toContain("Dr. Sarah Johnson");
    expect(wrapper.text()).toContain("Associate Professor");
    expect(wrapper.text()).toContain("Computer Science & Engineering");

    // Check notes
    expect(wrapper.text()).toContain("Exceptional contribution to the consensus mechanism research.");

    // Check blockchain verification badge
    expect(wrapper.text()).toContain("Verified On-Chain");
    expect(wrapper.text()).toContain("REW-M4K1-X992");
  });

  it("shows Acknowledge button for pending rewards and ✓ Acknowledged for acknowledged rewards", async () => {
    facultyRewardService.getMyFacultyRewards.mockResolvedValueOnce({
      count: 2,
      totalTokensEarned: 400,
      rewards: mockRewards,
    });

    const wrapper = mount(FacultyRecognitions);
    await flushPromises();

    // First reward is pending acknowledgement
    const cards = wrapper.findAll(".recognition-card");
    expect(cards[0].find(".btn-ack").exists()).toBe(true);
    expect(cards[0].find(".btn-ack").text()).toContain("Acknowledge");

    // Second reward is already acknowledged
    expect(cards[1].find(".ack-badge-confirmed").exists()).toBe(true);
    expect(cards[1].text()).toContain("Acknowledged");
  });

  it("calls acknowledge API and updates status when Acknowledge button is clicked", async () => {
    facultyRewardService.getMyFacultyRewards.mockResolvedValueOnce({
      count: 2,
      totalTokensEarned: 400,
      rewards: JSON.parse(JSON.stringify(mockRewards)),
    });

    const updatedReward = {
      ...mockRewards[0],
      acknowledgementStatus: "acknowledged",
      acknowledgementTimestamp: "2026-09-25T11:00:00.000Z",
    };

    facultyRewardService.acknowledgeFacultyReward.mockResolvedValueOnce({
      msg: "Reward successfully acknowledged!",
      reward: updatedReward,
    });

    const wrapper = mount(FacultyRecognitions);
    await flushPromises();

    const ackButton = wrapper.find(".btn-ack");
    expect(ackButton.exists()).toBe(true);

    await ackButton.trigger("click");
    await flushPromises();

    expect(facultyRewardService.acknowledgeFacultyReward).toHaveBeenCalledWith("REW-M4K1-X992");
    expect(wrapper.text()).toContain("Acknowledged");
  });

  it("opens blockchain verification modal on clicking Verify On-Chain", async () => {
    facultyRewardService.getMyFacultyRewards.mockResolvedValueOnce({
      count: 2,
      totalTokensEarned: 400,
      rewards: mockRewards,
    });

    const wrapper = mount(FacultyRecognitions);
    await flushPromises();

    const verifyBtn = wrapper.find(".btn-verify-link");
    expect(verifyBtn.exists()).toBe(true);

    await verifyBtn.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Blockchain Verification Proof");
    expect(wrapper.text()).toContain("Reward ID:");
    expect(wrapper.text()).toContain("REW-M4K1-X992");
  });
});
