// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AgentRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SettlementContract
 * @dev 结算合约 - 实现跨智能体间的自动结算和支付逻辑
 */
contract SettlementContract is Ownable, Pausable, ReentrancyGuard {
    
    AgentRegistry public agentRegistry;
    IERC20 public settlementToken;
    
    struct Transaction {
        uint256 id;
        address fromAgent;
        address toAgent;
        uint256 amount;
        string serviceType;
        string transactionHash;
        TransactionStatus status;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    struct Service {
        uint256 id;
        address providerAgent;
        string serviceType;
        uint256 pricePerUnit;
        ServicePricingType pricingType;
        bool isAvailable;
        bytes32 kpiHash; // KPI验证规则哈希
    }
    
    enum TransactionStatus {
        PENDING,
        COMPLETED,
        FAILED,
        REFUNDED
    }
    
    enum ServicePricingType {
        FIXED,
        PER_UNIT,
        PERFORMANCE_BASED,
        SUBSCRIPTION
    }
    
    // 状态变量
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public agentTransactions;
    mapping(uint256 => Service) public services;
    mapping(address => uint256[]) public agentServices;
    mapping(bytes32 => bool) public usedTransactionHashes;
    
    uint256 public transactionCount;
    uint256 public serviceCount;
    uint256 public totalSettledAmount;
    
    uint256 public platformFeeRate = 200; // 2% (基点，10000 = 100%)
    uint256 public platformBalance;
    
    // 事件
    event TransactionInitiated(
        uint256 indexed transactionId,
        address indexed fromAgent,
        address indexed toAgent,
        uint256 amount,
        string serviceType
    );
    
    event TransactionCompleted(
        uint256 indexed transactionId,
        uint256 actualAmount,
        uint256 platformFee
    );
    
    event TransactionFailed(
        uint256 indexed transactionId,
        string reason
    );
    
    event TransactionRefunded(
        uint256 indexed transactionId,
        uint256 refundAmount
    );
    
    event ServiceRegistered(
        uint256 indexed serviceId,
        address indexed providerAgent,
        string serviceType,
        uint256 pricePerUnit
    );
    
    event ServiceUpdated(
        uint256 indexed serviceId,
        uint256 newPrice
    );
    
    event KPIVerified(
        uint256 indexed transactionId,
        bool verified,
        bytes32 kpiHash
    );
    
    event PlatformFeeWithdrawn(
        address indexed recipient,
        uint256 amount
    );
    
    // 修饰符
    modifier onlyRegisteredAgent(address agentAddress) {
        require(
            agentRegistry.getAgent(agentAddress).owner != address(0),
            "Agent not registered"
        );
        _;
    }
    
    modifier onlyValidService(uint256 serviceId) {
        require(services[serviceId].providerAgent != address(0), "Invalid service");
        _;
    }
    
    /**
     * @dev 构造函数
     */
    constructor(address _agentRegistry, address _settlementToken) {
        require(_agentRegistry != address(0), "Invalid registry address");
        require(_settlementToken != address(0), "Invalid token address");
        
        agentRegistry = AgentRegistry(_agentRegistry);
        settlementToken = IERC20(_settlementToken);
    }
    
    /**
     * @dev 发起交易（服务即结算）
     * @param toAgent 服务提供者地址
     * @param serviceId 服务ID
     * @param units 服务单位数量
     * @param serviceType 服务类型
     * @param transactionHash 唯一交易哈希
     */
    function initiateSettlement(
        address toAgent,
        uint256 serviceId,
        uint256 units,
        string memory serviceType,
        string memory transactionHash
    ) 
        public 
        onlyRegisteredAgent(msg.sender)
        onlyRegisteredAgent(toAgent)
        onlyValidService(serviceId)
        whenNotPaused
        nonReentrant
    {
        require(bytes(transactionHash).length > 0, "Invalid transaction hash");
        require(
            !usedTransactionHashes[keccak256(bytes(transactionHash))],
            "Transaction hash already used"
        );
        require(services[serviceId].isAvailable, "Service not available");
        
        Service memory service = services[serviceId];
        uint256 totalAmount;
        
        // 根据定价类型计算金额
        if (service.pricingType == ServicePricingType.FIXED) {
            totalAmount = service.pricePerUnit;
        } else if (service.pricingType == ServicePricingType.PER_UNIT) {
            totalAmount = service.pricePerUnit * units;
        } else if (service.pricingType == ServicePricingType.SUBSCRIPTION) {
            totalAmount = service.pricePerUnit;
        } else {
            // PERFORMANCE_BASED 需要后续验证
            totalAmount = 0;
        }
        
        require(totalAmount > 0 || service.pricingType == ServicePricingType.PERFORMANCE_BASED, "Invalid amount");
        
        // 计算平台费用
        uint256 platformFee = (totalAmount * platformFeeRate) / 10000;
        uint256 actualAmount = totalAmount - platformFee;
        
        // 执行转账
        if (totalAmount > 0) {
            require(
                settlementToken.transferFrom(msg.sender, address(this), totalAmount),
                "Transfer failed"
            );
        }
        
        // 创建交易记录
        uint256 transactionId = transactionCount++;
        
        transactions[transactionId] = Transaction({
            id: transactionId,
            fromAgent: msg.sender,
            toAgent: toAgent,
            amount: actualAmount,
            serviceType: serviceType,
            transactionHash: transactionHash,
            status: TransactionStatus.PENDING,
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        
        agentTransactions[msg.sender].push(transactionId);
        agentTransactions[toAgent].push(transactionId);
        usedTransactionHashes[keccak256(bytes(transactionHash))] = true;
        
        emit TransactionInitiated(
            transactionId,
            msg.sender,
            toAgent,
            totalAmount,
            serviceType
        );
        
        // 如果不是按效付费，立即完成交易
        if (service.pricingType != ServicePricingType.PERFORMANCE_BASED) {
            _completeTransaction(transactionId, actualAmount, platformFee);
        }
    }
    
    /**
     * @dev 完成交易
     */
    function _completeTransaction(
        uint256 transactionId,
        uint256 actualAmount,
        uint256 platformFee
    ) internal {
        Transaction storage transaction = transactions[transactionId];
        
        require(transaction.status == TransactionStatus.PENDING, "Transaction not pending");
        
        // 转账给接收方
        if (actualAmount > 0) {
            require(
                settlementToken.transfer(transaction.toAgent, actualAmount),
                "Transfer to recipient failed"
            );
        }
        
        // 转入平台费用
        if (platformFee > 0) {
            platformBalance += platformFee;
        }
        
        // 更新状态
        transaction.status = TransactionStatus.COMPLETED;
        totalSettledAmount += actualAmount;
        
        emit TransactionCompleted(transactionId, actualAmount, platformFee);
    }
    
    /**
     * @dev 验证KPI并结算（效果导向订阅）
     * @param transactionId 交易ID
     * @param kpiData KPI数据
     * @param verified 是否通过验证
     */
    function verifyAndSettle(
        uint256 transactionId,
        bytes memory kpiData,
        bool verified
    ) 
        public 
        onlyValidTransaction(transactionId)
        whenNotPaused
        nonReentrant
    {
        Transaction storage transaction = transactions[transactionId];
        Service memory service = services[0]; // 需要通过serviceId查询
        
        require(transaction.status == TransactionStatus.PENDING, "Transaction not pending");
        require(service.pricingType == ServicePricingType.PERFORMANCE_BASED, "Not performance-based");
        
        bytes32 kpiHash = keccak256(kpiData);
        
        emit KPIVerified(transactionId, verified, kpiHash);
        
        if (verified) {
            // 验证通过，计算实际金额并结算
            // 这里简化处理，实际应根据KPI数据计算
            uint256 actualAmount = transaction.amount;
            uint256 platformFee = (actualAmount * platformFeeRate) / 10000;
            
            _completeTransaction(transactionId, actualAmount - platformFee, platformFee);
        } else {
            // 验证失败
            transaction.status = TransactionStatus.FAILED;
            
            // 退还资金
            require(
                settlementToken.transfer(transaction.fromAgent, transaction.amount),
                "Refund failed"
            );
            
            emit TransactionFailed(transactionId, "KPI verification failed");
        }
    }
    
    /**
     * @dev 注册服务
     */
    function registerService(
        string memory serviceType,
        uint256 pricePerUnit,
        ServicePricingType pricingType,
        bytes32 kpiHash
    ) 
        public 
        onlyRegisteredAgent(msg.sender)
        whenNotPaused 
    {
        require(bytes(serviceType).length > 0, "Invalid service type");
        require(pricePerUnit > 0, "Price must be greater than 0");
        
        uint256 serviceId = serviceCount++;
        
        services[serviceId] = Service({
            id: serviceId,
            providerAgent: msg.sender,
            serviceType: serviceType,
            pricePerUnit: pricePerUnit,
            pricingType: pricingType,
            isAvailable: true,
            kpiHash: kpiHash
        });
        
        agentServices[msg.sender].push(serviceId);
        
        emit ServiceRegistered(serviceId, msg.sender, serviceType, pricePerUnit);
    }
    
    /**
     * @dev 更新服务价格
     */
    function updateServicePrice(
        uint256 serviceId,
        uint256 newPrice
    ) 
        public 
        onlyValidService(serviceId)
        whenNotPaused
    {
        require(services[serviceId].providerAgent == msg.sender, "Not service owner");
        require(newPrice > 0, "Price must be greater than 0");
        
        services[serviceId].pricePerUnit = newPrice;
        
        emit ServiceUpdated(serviceId, newPrice);
    }
    
    /**
     * @dev 设置服务可用性
     */
    function setServiceAvailability(
        uint256 serviceId,
        bool isAvailable
    ) 
        public 
        onlyValidService(serviceId)
    {
        require(services[serviceId].providerAgent == msg.sender, "Not service owner");
        
        services[serviceId].isAvailable = isAvailable;
    }
    
    /**
     * @dev 批量结算
     */
    function batchSettle(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) 
        public 
        onlyOwner 
        nonReentrant
    {
        require(
            recipients.length == amounts.length,
            "Arrays length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(
                settlementToken.balanceOf(address(this)) >= amounts[i],
                "Insufficient contract balance"
            );
            
            require(
                settlementToken.transfer(recipients[i], amounts[i]),
                "Transfer failed"
            );
        }
    }
    
    /**
     * @dev 设置平台费用率
     */
    function setPlatformFeeRate(uint256 newFeeRate) public onlyOwner {
        require(newFeeRate <= 1000, "Fee rate too high"); // 最高10%
        
        platformFeeRate = newFeeRate;
    }
    
    /**
     * @dev 提取平台费用
     */
    function withdrawPlatformFees(uint256 amount) public onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(platformBalance >= amount, "Insufficient platform balance");
        
        platformBalance -= amount;
        
        require(
            settlementToken.transfer(owner(), amount),
            "Transfer failed"
        );
        
        emit PlatformFeeWithdrawn(owner(), amount);
    }
    
    /**
     * @dev 获取交易信息
     */
    function getTransaction(uint256 transactionId) 
        public 
        view 
        onlyValidTransaction(transactionId)
        returns (Transaction memory) 
    {
        return transactions[transactionId];
    }
    
    /**
     * @dev 获取智能体的所有交易
     */
    function getAgentTransactions(address agent) 
        public 
        view 
        onlyRegisteredAgent(agent)
        returns (uint256[] memory) 
    {
        return agentTransactions[agent];
    }
    
    /**
     * @dev 获取服务信息
     */
    function getService(uint256 serviceId) 
        public 
        view 
        onlyValidService(serviceId)
        returns (Service memory) 
    {
        return services[serviceId];
    }
    
    /**
     * @dev 获取智能体的所有服务
     */
    function getAgentServices(address agent) 
        public 
        view 
        onlyRegisteredAgent(agent)
        returns (uint256[] memory) 
    {
        return agentServices[agent];
    }
    
    /**
     * @dev 获取统计信息
     */
    function getStatistics() 
        public 
        view 
        returns (
            uint256 totalTransactions,
            uint256 completedTransactions,
            uint256 pendingTransactions,
            uint256 failedTransactions,
            uint256 totalAmount
        ) 
    {
        for (uint256 i = 0; i < transactionCount; i++) {
            totalTransactions++;
            
            if (transactions[i].status == TransactionStatus.COMPLETED) {
                completedTransactions++;
                totalAmount += transactions[i].amount;
            } else if (transactions[i].status == TransactionStatus.PENDING) {
                pendingTransactions++;
            } else if (transactions[i].status == TransactionStatus.FAILED) {
                failedTransactions++;
            }
        }
        
        return (
            totalTransactions,
            completedTransactions,
            pendingTransactions,
            failedTransactions,
            totalAmount
        );
    }
    
    // 修饰符
    modifier onlyValidTransaction(uint256 transactionId) {
        require(transactionId < transactionCount, "Invalid transaction");
        _;
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
}
