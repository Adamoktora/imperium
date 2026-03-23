// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ImperiumDecisionLog
/// @notice On-chain log of AI agent decisions for Imperium financial command center
/// @dev Deployed on Base Sepolia. Every AI analysis, rebalance decision, and risk alert
///      is hashed and committed on-chain as immutable proof of agent activity.
contract ImperiumDecisionLog {
    string public constant AGENT_NAME = "Imperium";
    string public constant VERSION = "1.0.0";
    address public immutable agent;
    uint256 public decisionCount;

    event Decision(
        address indexed agent,
        bytes32 indexed decisionHash,
        string action,
        uint256 timestamp
    );

    constructor() {
        agent = msg.sender;
    }

    /// @notice Log an AI decision on-chain
    /// @param decisionHash SHA-256 hash of the full decision data
    /// @param action Human-readable action description
    function log(bytes32 decisionHash, string calldata action) external {
        decisionCount++;
        emit Decision(msg.sender, decisionHash, action, block.timestamp);
    }
}
