// backend/scripts/seedTestData.js
// Comprehensive test data seeding script for RewardHub

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Achievement = require("../models/Achievement");
const Reward = require("../models/Reward");
const StudentAchievement = require("../models/StudentAchievement");
const Redemption = require("../models/Redemption");

// Test wallet addresses from Ganache (default first 10 accounts)
const GANACHE_WALLETS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Admin wallet
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Student 1
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Student 2
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Student 3
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Student 4
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", // Student 5
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9", // Faculty 1
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955", // Faculty 2
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", // Faculty 3
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // Student 6
];

async function seedData() {
  try {
    console.log("🌱 Starting test data seeding...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await User.deleteMany({});
    await Achievement.deleteMany({});
    await Reward.deleteMany({});
    await StudentAchievement.deleteMany({});
    await Redemption.deleteMany({});
    console.log("✅ Existing data cleared\n");

    // Hash password for all users
    const hashedPassword = await bcrypt.hash("password123", 10);

    // ============================================
    // 1. CREATE ADMIN USERS
    // ============================================
    console.log("👨‍💼 Creating admin users...");
    
    const admin = await User.create({
      name: "Admin User",
      email: "admin@rewardhub.com",
      password: hashedPassword,
      role: "admin",
      walletAddress: GANACHE_WALLETS[0].toLowerCase(),
      walletConnected: true,
    });

    console.log(`   ✅ Admin: ${admin.email} (${admin.walletAddress})\n`);

    // ============================================
    // 2. CREATE FACULTY USERS
    // ============================================
    console.log("👨‍🏫 Creating faculty users...");
    
    const faculties = await User.insertMany([
      {
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@rewardhub.com",
        password: hashedPassword,
        role: "faculty",
        walletAddress: GANACHE_WALLETS[6].toLowerCase(),
        walletConnected: true,
        designation: "Associate Professor",
        department: "Computer Science & Engineering",
      },
      {
        name: "Prof. Michael Chen",
        email: "michael.chen@rewardhub.com",
        password: hashedPassword,
        role: "faculty",
        walletAddress: GANACHE_WALLETS[7].toLowerCase(),
        walletConnected: true,
        designation: "Professor & Department Chair",
        department: "Information Technology",
      },
      {
        name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@rewardhub.com",
        password: hashedPassword,
        role: "faculty",
        walletAddress: GANACHE_WALLETS[8].toLowerCase(),
        walletConnected: true,
        designation: "Assistant Professor",
        department: "Software Engineering & AI",
      },
    ]);

    faculties.forEach(f => {
      console.log(`   ✅ Faculty: ${f.email} (${f.walletAddress})`);
    });
    console.log();

    // ============================================
    // 3. CREATE STUDENT USERS (with and without wallets)
    // ============================================
    console.log("👨‍🎓 Creating student users...");
    
    const students = await User.insertMany([
      // Students WITH wallets (can receive awards)
      {
        name: "Alice Thompson",
        email: "alice.thompson@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: GANACHE_WALLETS[1].toLowerCase(),
        walletConnected: true,
      },
      {
        name: "Bob Martinez",
        email: "bob.martinez@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: GANACHE_WALLETS[2].toLowerCase(),
        walletConnected: true,
      },
      {
        name: "Charlie Davis",
        email: "charlie.davis@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: GANACHE_WALLETS[3].toLowerCase(),
        walletConnected: true,
      },
      {
        name: "Diana Wilson",
        email: "diana.wilson@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: GANACHE_WALLETS[4].toLowerCase(),
        walletConnected: true,
      },
      {
        name: "Ethan Brown",
        email: "ethan.brown@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: GANACHE_WALLETS[5].toLowerCase(),
        walletConnected: true,
      },
      {
        name: "Fiona Garcia",
        email: "fiona.garcia@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: GANACHE_WALLETS[9].toLowerCase(),
        walletConnected: true,
      },
      
      // Students WITHOUT wallets (can't receive awards yet)
      {
        name: "George Miller",
        email: "george.miller@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: null,
        walletConnected: false,
      },
      {
        name: "Hannah Lee",
        email: "hannah.lee@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: null,
        walletConnected: false,
      },
      {
        name: "Ian Taylor",
        email: "ian.taylor@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: null,
        walletConnected: false,
      },
      {
        name: "Julia Anderson",
        email: "julia.anderson@student.com",
        password: hashedPassword,
        role: "student",
        walletAddress: null,
        walletConnected: false,
      },
    ]);

    students.forEach(s => {
      const walletStatus = s.walletConnected ? `✅ ${s.walletAddress}` : "❌ No wallet";
      console.log(`   ✅ Student: ${s.email} (${walletStatus})`);
    });
    console.log();

    // ============================================
    // 4. CREATE ACHIEVEMENTS
    // ============================================
    console.log("🏆 Creating achievements...");
    
    const achievements = await Achievement.insertMany([
      {
        title: "Perfect Attendance",
        description: "Complete attendance for the entire semester",
        tokenReward: 100,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Top Performer",
        description: "Achieve highest grade in class",
        tokenReward: 200,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Community Helper",
        description: "Volunteer 20+ hours in community service",
        tokenReward: 150,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Research Excellence",
        description: "Publish research paper or complete major project",
        tokenReward: 250,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Leadership Award",
        description: "Lead a student organization or major initiative",
        tokenReward: 180,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Innovation Prize",
        description: "Create innovative solution or product",
        tokenReward: 300,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Quiz Champion",
        description: "Score 100% on 5 consecutive quizzes",
        tokenReward: 75,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Team Player",
        description: "Outstanding collaboration in group projects",
        tokenReward: 125,
        createdBy: admin._id,
        onChainCreated: false,
      },
    ]);

    achievements.forEach(a => {
      console.log(`   ✅ Achievement: ${a.title} (${a.tokenReward} tokens)`);
    });
    console.log();

    // ============================================
    // 5. CREATE PERKS/REWARDS
    // ============================================
    console.log("🎁 Creating perks/rewards...");
    
    const perks = await Reward.insertMany([
      {
        title: "Free Coffee",
        description: "One free coffee from campus café",
        tokenCost: 50,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Priority Registration",
        description: "Register for classes one day early",
        tokenCost: 200,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Parking Pass",
        description: "One month premium parking pass",
        tokenCost: 300,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Library Private Room",
        description: "4-hour private study room booking",
        tokenCost: 100,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Campus Store Gift Card",
        description: "$25 gift card for campus bookstore",
        tokenCost: 250,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Gym Membership",
        description: "One semester premium gym membership",
        tokenCost: 400,
        createdBy: admin._id,
        onChainCreated: false,
      },
      {
        title: "Textbook Voucher",
        description: "$50 off any textbook purchase",
        tokenCost: 150,
        createdBy: admin._id,
        onChainCreated: false,
      },
    ]);

    perks.forEach(p => {
      console.log(`   ✅ Perk: ${p.title} (${p.tokenCost} tokens)`);
    });
    console.log();

    // ============================================
    // 6. SUMMARY
    // ============================================
    console.log("=" .repeat(60));
    console.log("📊 SEED DATA SUMMARY");
    console.log("=" .repeat(60));
    console.log(`👨‍💼 Admin Users:           1`);
    console.log(`👨‍🏫 Faculty Users:         ${faculties.length}`);
    console.log(`👨‍🎓 Student Users:         ${students.length}`);
    console.log(`   - With Wallets:        ${students.filter(s => s.walletConnected).length}`);
    console.log(`   - Without Wallets:     ${students.filter(s => !s.walletConnected).length}`);
    console.log(`🏆 Achievements:          ${achievements.length}`);
    console.log(`🎁 Perks/Rewards:         ${perks.length}`);
    console.log("=" .repeat(60));
    console.log();

    // ============================================
    // 7. TEST CREDENTIALS
    // ============================================
    console.log("🔑 TEST CREDENTIALS (password: password123)");
    console.log("=" .repeat(60));
    console.log(`Admin:    admin@rewardhub.com`);
    console.log(`Faculty:  sarah.johnson@rewardhub.com`);
    console.log(`          michael.chen@rewardhub.com`);
    console.log(`          emily.rodriguez@rewardhub.com`);
    console.log(`Student:  alice.thompson@student.com (has wallet)`);
    console.log(`          bob.martinez@student.com (has wallet)`);
    console.log(`          george.miller@student.com (no wallet)`);
    console.log("=" .repeat(60));
    console.log();

    // ============================================
    // 8. GANACHE WALLET MAPPING
    // ============================================
    console.log("💰 GANACHE WALLET MAPPING");
    console.log("=" .repeat(60));
    console.log(`Admin:       ${GANACHE_WALLETS[0]}`);
    console.log(`Alice:       ${GANACHE_WALLETS[1]}`);
    console.log(`Bob:         ${GANACHE_WALLETS[2]}`);
    console.log(`Charlie:     ${GANACHE_WALLETS[3]}`);
    console.log(`Diana:       ${GANACHE_WALLETS[4]}`);
    console.log(`Ethan:       ${GANACHE_WALLETS[5]}`);
    console.log(`Fiona:       ${GANACHE_WALLETS[9]}`);
    console.log(`Dr. Sarah:   ${GANACHE_WALLETS[6]}`);
    console.log(`Prof. Mike:  ${GANACHE_WALLETS[7]}`);
    console.log(`Dr. Emily:   ${GANACHE_WALLETS[8]}`);
    console.log("=" .repeat(60));
    console.log();

    console.log("✅ Test data seeding completed successfully!\n");

    // Return data for use in tests
    return {
      admin,
      faculties,
      students,
      achievements,
      perks,
      wallets: GANACHE_WALLETS,
    };

  } catch (err) {
    console.error("❌ Error seeding data:", err);
    throw err;
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run if called directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log("\n🎉 All done! You can now test the API endpoints.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n💥 Fatal error:", err);
      process.exit(1);
    });
}

module.exports = seedData;
