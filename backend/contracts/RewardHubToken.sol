// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardHubToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("RewardHubToken", "RHT") Ownable(initialOwner) {}

    // ========================
    // = Structs & Mappings   =
    // ========================

    struct Achievement {
        string title;
        uint256 rewardAmount;
        bool isActive;
    }

    struct Perk {
        string title;
        uint256 cost;
        bool isAvailable;
    }

    mapping(address => bool) public isStudent;
    mapping(address => string[]) public studentAchievements;
    mapping(address => mapping(string => bool)) public earned;

    mapping(string => Achievement) public achievements;
    mapping(string => Perk) public perks;

    // ========================
    // = Events               =
    // ========================

    event StudentRegistered(address student);
    event AchievementAdded(string title, uint256 rewardAmount);
    event AchievementUpdated(string oldTitle, string newTitle, uint256 newRewardAmount);
    event AchievementDeactivated(string title);
    event AchievementGranted(address indexed student, string title, uint256 reward);
    event PerkAdded(string title, uint256 cost);
    event PerkUpdated(string oldTitle, string newTitle, uint256 newCost);
    event PerkDeactivated(string title);
    event PerkRedeemed(address indexed student, string title, uint256 cost);
    event FacultyRewardGranted(
        address indexed student,
        address indexed faculty,
        string rewardId,
        string reason,
        uint256 amount
    );

    // ========================
    // = Admin Functions      =
    // ========================

    function registerStudent(address student) external onlyOwner {
        require(!isStudent[student], "Already registered");
        isStudent[student] = true;
        emit StudentRegistered(student);
    }

    function addAchievement(string calldata title, uint256 rewardAmount) external onlyOwner {
        achievements[title] = Achievement(title, rewardAmount, true);
        emit AchievementAdded(title, rewardAmount);
    }

    function updateAchievement(
        string calldata oldTitle,
        string calldata newTitle,
        uint256 newRewardAmount
    ) external onlyOwner {
        require(achievements[oldTitle].isActive, "Achievement not found or inactive");
        
        // Deactivate old version
        achievements[oldTitle].isActive = false;
        
        // Create new version
        achievements[newTitle] = Achievement(newTitle, newRewardAmount, true);
        
        emit AchievementUpdated(oldTitle, newTitle, newRewardAmount);
    }

    function deactivateAchievement(string calldata title) external onlyOwner {
        require(achievements[title].isActive, "Achievement not found or already inactive");
        achievements[title].isActive = false;
        emit AchievementDeactivated(title);
    }

    function addPerk(string calldata title, uint256 cost) external onlyOwner {
        perks[title] = Perk(title, cost, true);
        emit PerkAdded(title, cost);
    }

    function updatePerk(
        string calldata oldTitle,
        string calldata newTitle,
        uint256 newCost
    ) external onlyOwner {
        require(perks[oldTitle].isAvailable, "Perk not found or unavailable");
        
        // Deactivate old version
        perks[oldTitle].isAvailable = false;
        
        // Create new version
        perks[newTitle] = Perk(newTitle, newCost, true);
        
        emit PerkUpdated(oldTitle, newTitle, newCost);
    }

    function deactivatePerk(string calldata title) external onlyOwner {
        require(perks[title].isAvailable, "Perk not found or already unavailable");
        perks[title].isAvailable = false;
        emit PerkDeactivated(title);
    }

    // ========================
    // = Main Functions       =
    // ========================

    function grantAchievement(address student, string calldata title) external onlyOwner {
        require(isStudent[student], "Student not registered");
        require(achievements[title].isActive, "Achievement not found or inactive");
        require(!earned[student][title], "Already earned");

        uint256 reward = achievements[title].rewardAmount;
        _mint(student, reward * 1e18);

        earned[student][title] = true;
        studentAchievements[student].push(title);

        emit AchievementGranted(student, title, reward);
    }

    function redeemPerk(address student, string calldata title) external onlyOwner {
        require(isStudent[student], "Not a student");
        require(perks[title].isAvailable, "Perk not available");

        uint256 cost = perks[title].cost;
        uint256 costWithDecimals = cost * 1e18;
        require(balanceOf(student) >= costWithDecimals, "Not enough tokens");

        _burn(student, costWithDecimals);

        emit PerkRedeemed(student, title, cost);
    }

    function getAchievements(address student) external view returns (string[] memory) {
        return studentAchievements[student];
    }

    function hasEarned(address student, string calldata title) external view returns (bool) {
        return earned[student][title];
    }

    function rewardStudent(
        address student,
        address faculty,
        string calldata rewardId,
        string calldata reason,
        uint256 amount
    ) external onlyOwner {
        if (!isStudent[student]) {
            isStudent[student] = true;
            emit StudentRegistered(student);
        }
        _mint(student, amount * 1e18);
        studentAchievements[student].push(reason);
        emit FacultyRewardGranted(student, faculty, rewardId, reason, amount);
    }
}
