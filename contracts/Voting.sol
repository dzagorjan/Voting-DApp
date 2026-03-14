// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {
    address public owner;
    bool public isOpen;

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] private candidates;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed candidateId, string name);
    event VotingOpened();
    event VotingClosed();
    event Voted(address indexed voter, uint256 indexed candidateId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenOpen() {
        require(isOpen, "Voting is closed");
        _;
    }

    constructor(string[] memory initialCandidates) {
        owner = msg.sender;
        for (uint256 i = 0; i < initialCandidates.length; i++) {
            _addCandidate(initialCandidates[i]);
        }
        isOpen = false;
    }

    function _addCandidate(string memory name) internal {
        require(bytes(name).length > 0, "Empty name");
        candidates.push(Candidate({name: name, voteCount: 0}));
        emit CandidateAdded(candidates.length - 1, name);
    }

    function addCandidate(string calldata name) external onlyOwner {
        require(!isOpen, "Can't add while open");
        _addCandidate(name);
    }

    function openVoting() external onlyOwner {
        require(!isOpen, "Already open");
        require(candidates.length >= 2, "Need at least 2 candidates");
        isOpen = true;
        emit VotingOpened();
    }

    function closeVoting() external onlyOwner {
        require(isOpen, "Already closed");
        isOpen = false;
        emit VotingClosed();
    }

    function vote(uint256 candidateId) external whenOpen {
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateId < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;

        emit Voted(msg.sender, candidateId);
    }

    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 candidateId) external view returns (string memory name, uint256 voteCount) {
        require(candidateId < candidates.length, "Invalid candidate");
        Candidate memory c = candidates[candidateId];
        return (c.name, c.voteCount);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }
}