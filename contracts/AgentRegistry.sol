// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @dev 智能体注册合约 - 管理AI智能体的身份和元数据
 */
contract AgentRegistry is Ownable, Pausable, ReentrancyGuard {
    
    struct Agent {
        address owner;           // 智能体所有者地址
        string name;             // 智能体名称
        string metadataURI;      // 元数据URI（IPFS等）
        AgentType agentType;     // 智能体类型
        bool isActive;           // 是否激活
        uint256 balance;         // 账户余额
        uint256 reputation;      // 声誉分数
        uint256 createdAt;       // 创建时间
        uint256 updatedAt;       // 更新时间
    }
    
    enum AgentType {
        MARKETING,      // 营销智能体
        SUPPLY_CHAIN,   // 供应链智能体
        CONTENT,        // 内容创作智能体
        COMPUTE,        // 算力服务智能体
        ANALYTICS,      // 数据分析智能体
        CUSTOM          // 自定义类型
    }
    
    // 状态变量
    mapping(address => Agent) public agents;
    address[] public agentAddresses;
    mapping(string => address) public nameToAddress;
    
    // 事件
    event AgentRegistered(
        address indexed agentAddress,
        address indexed owner,
        string name,
        AgentType agentType
    );
    
    event AgentUpdated(
        address indexed agentAddress,
        string metadataURI
    );
    
    event AgentDeactivated(
        address indexed agentAddress
    );
    
    event AgentActivated(
        address indexed agentAddress
    );
    
    event DepositReceived(
        address indexed agentAddress,
        uint256 amount
    );
    
    event Withdrawal(
        address indexed agentAddress,
        uint256 amount
    );
    
    // 修饰符
    modifier onlyActiveAgent(address agentAddress) {
        require(agents[agentAddress].isActive, "Agent is not active");
        _;
    }
    
    modifier onlyAgentOwner(address agentAddress) {
        require(
            agents[agentAddress].owner == msg.sender || 
            agents[agentAddress].owner == agentAddress,
            "Not the agent owner"
        );
        _;
    }
    
    /**
     * @dev 注册新的智能体
     * @param agentAddress 智能体地址（可以是EOA或合约地址）
     * @param name 智能体名称
     * @param metadataURI 元数据URI
     * @param agentType 智能体类型
     */
    function registerAgent(
        address agentAddress,
        string memory name,
        string memory metadataURI,
        AgentType agentType
    ) public whenNotPaused nonReentrant {
        require(agentAddress != address(0), "Invalid agent address");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(nameToAddress[name]).length == 0, "Name already taken");
        require(agents[agentAddress].owner == address(0), "Agent already registered");
        
        Agent memory newAgent = Agent({
            owner: msg.sender,
            name: name,
            metadataURI: metadataURI,
            agentType: agentType,
            isActive: true,
            balance: 0,
            reputation: 100, // 初始声誉100
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        agents[agentAddress] = newAgent;
        agentAddresses.push(agentAddress);
        nameToAddress[name] = agentAddress;
        
        emit AgentRegistered(agentAddress, msg.sender, name, agentType);
    }
    
    /**
     * @dev 更新智能体元数据
     * @param agentAddress 智能体地址
     * @param metadataURI 新的元数据URI
     */
    function updateAgentMetadata(
        address agentAddress,
        string memory metadataURI
    ) public onlyAgentOwner(agentAddress) {
        require(agents[agentAddress].isActive, "Agent not active");
        
        agents[agentAddress].metadataURI = metadataURI;
        agents[agentAddress].updatedAt = block.timestamp;
        
        emit AgentUpdated(agentAddress, metadataURI);
    }
    
    /**
     * @dev 激活智能体
     */
    function activateAgent(address agentAddress) public onlyAgentOwner(agentAddress) {
        require(!agents[agentAddress].isActive, "Agent already active");
        
        agents[agentAddress].isActive = true;
        agents[agentAddress].updatedAt = block.timestamp;
        
        emit AgentActivated(agentAddress);
    }
    
    /**
     * @dev 停用智能体
     */
    function deactivateAgent(address agentAddress) public onlyAgentOwner(agentAddress) {
        require(agents[agentAddress].isActive, "Agent not active");
        require(agents[agentAddress].balance == 0, "Cannot deactivate with balance");
        
        agents[agentAddress].isActive = false;
        agents[agentAddress].updatedAt = block.timestamp;
        
        emit AgentDeactivated(agentAddress);
    }
    
    /**
     * @dev 存入资金
     */
    function deposit() public payable onlyActiveAgent(msg.sender) {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        agents[msg.sender].balance += msg.value;
        
        emit DepositReceived(msg.sender, msg.value);
    }
    
    /**
     * @dev 提取资金
     * @param amount 提取金额
     */
    function withdraw(uint256 amount) public onlyActiveAgent(msg.sender) nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(agents[msg.sender].balance >= amount, "Insufficient balance");
        
        agents[msg.sender].balance -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev 更新声誉分数
     */
    function updateReputation(address agentAddress, int256 delta) public onlyOwner {
        require(agents[agentAddress].owner != address(0), "Agent not registered");
        
        uint256 oldReputation = agents[agentAddress].reputation;
        
        if (delta > 0) {
            agents[agentAddress].reputation = oldReputation + uint256(delta);
        } else if (delta < 0) {
            uint256 decrease = uint256(-delta);
            if (decrease >= oldReputation) {
                agents[agentAddress].reputation = 0;
            } else {
                agents[agentAddress].reputation = oldReputation - decrease;
            }
        }
        
        agents[agentAddress].updatedAt = block.timestamp;
    }
    
    /**
     * @dev 批量转账（用于结算）
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(
            recipients.length == amounts.length,
            "Arrays length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(
                address(this).balance >= amounts[i],
                "Insufficient contract balance"
            );
            
            (bool success, ) = payable(recipients[i]).call{value: amounts[i]}("");
            require(success, "Transfer failed");
        }
    }
    
    /**
     * @dev 获取智能体信息
     */
    function getAgent(address agentAddress) public view returns (Agent memory) {
        require(agents[agentAddress].owner != address(0), "Agent not registered");
        return agents[agentAddress];
    }
    
    /**
     * @dev 获取所有活跃智能体地址
     */
    function getActiveAgentAddresses() public view returns (address[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeAddresses = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive) {
                activeAddresses[index] = agentAddresses[i];
                index++;
            }
        }
        
        return activeAddresses;
    }
    
    /**
     * @dev 按类型获取智能体地址
     */
    function getAgentsByType(AgentType agentType) public view returns (address[] memory) {
        uint256 count = 0;
        
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive && agents[agentAddresses[i]].agentType == agentType) {
                count++;
            }
        }
        
        address[] memory result = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive && agents[agentAddresses[i]].agentType == agentType) {
                result[index] = agentAddresses[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev 获取智能体数量
     */
    function getAgentCount() public view returns (uint256) {
        return agentAddresses.length;
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() public onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急提取合约余额（仅限所有者）
     */
    function emergencyWithdraw() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }
}
