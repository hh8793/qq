// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SubscriptionManager
 * @dev 订阅管理合约 - 管理周期性订阅和自动扣款
 */
contract SubscriptionManager is Ownable, Pausable, ReentrancyGuard {
    
    struct Subscription {
        uint256 id;
        address subscriber;
        address provider;
        uint256 serviceId;
        uint256 amount;
        uint256 billingCycle; // 以秒为单位（如 30天 = 2592000）
        uint256 nextBillingDate;
        bool isActive;
        uint256 createdAt;
    }
    
    struct SubscriptionPayment {
        uint256 subscriptionId;
        uint256 amount;
        uint256 timestamp;
        bool success;
    }
    
    // 状态变量
    IERC20 public paymentToken;
    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256[]) public subscriberSubscriptions;
    mapping(address => uint256[]) public providerSubscriptions;
    mapping(uint256 => SubscriptionPayment[]) public paymentHistory;
    
    uint256 public subscriptionCount;
    uint256 public totalRevenue;
    uint256 public platformFeeRate = 200; // 2%
    
    uint256 public minBillingCycle = 1 days;
    uint256 public maxBillingCycle = 365 days;
    
    // 事件
    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed provider,
        uint256 serviceId,
        uint256 amount,
        uint256 nextBillingDate
    );
    
    event SubscriptionCancelled(uint256 indexed subscriptionId, address indexed subscriber);
    
    event PaymentProcessed(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed provider,
        uint256 amount,
        uint256 platformFee,
        uint256 actualAmount
    );
    
    event PaymentFailed(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        uint256 amount
    );
    
    event SubscriptionUpdated(
        uint256 indexed subscriptionId,
        uint256 newAmount,
        uint256 newBillingCycle
    );
    
    event PlatformFeeRateChanged(uint256 oldRate, uint256 newRate);
    
    // 修饰符
    modifier onlySubscriptionOwner(uint256 subscriptionId) {
        require(
            subscriptions[subscriptionId].subscriber == msg.sender,
            "Not subscription owner"
        );
        _;
    }
    
    modifier onlySubscriptionProvider(uint256 subscriptionId) {
        require(
            subscriptions[subscriptionId].provider == msg.sender,
            "Not subscription provider"
        );
        _;
    }
    
    modifier onlyActiveSubscription(uint256 subscriptionId) {
        require(subscriptionId < subscriptionCount, "Invalid subscription");
        require(subscriptions[subscriptionId].isActive, "Subscription not active");
        _;
    }
    
    /**
     * @dev 构造函数
     */
    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Invalid token address");
        paymentToken = IERC20(_paymentToken);
    }
    
    /**
     * @dev 创建订阅
     * @param provider 服务提供者
     * @param serviceId 服务ID
     * @param amount 每期金额
     * @param billingCycle 计费周期（秒）
     */
    function createSubscription(
        address provider,
        uint256 serviceId,
        uint256 amount,
        uint256 billingCycle
    ) 
        public 
        whenNotPaused
        nonReentrant
    {
        require(provider != address(0), "Invalid provider");
        require(provider != msg.sender, "Cannot subscribe to self");
        require(amount > 0, "Amount must be greater than 0");
        require(
            billingCycle >= minBillingCycle && billingCycle <= maxBillingCycle,
            "Invalid billing cycle"
        );
        
        uint256 subscriptionId = subscriptionCount++;
        uint256 nextBillingDate = block.timestamp + billingCycle;
        
        // 预先支付第一期
        uint256 platformFee = (amount * platformFeeRate) / 10000;
        uint256 actualAmount = amount - platformFee;
        
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Initial payment failed"
        );
        
        require(
            paymentToken.transfer(provider, actualAmount),
            "Transfer to provider failed"
        );
        
        // 创建订阅
        subscriptions[subscriptionId] = Subscription({
            id: subscriptionId,
            subscriber: msg.sender,
            provider: provider,
            serviceId: serviceId,
            amount: amount,
            billingCycle: billingCycle,
            nextBillingDate: nextBillingDate,
            isActive: true,
            createdAt: block.timestamp
        });
        
        subscriberSubscriptions[msg.sender].push(subscriptionId);
        providerSubscriptions[provider].push(subscriptionId);
        
        // 记录支付历史
        paymentHistory[subscriptionId].push(SubscriptionPayment({
            subscriptionId: subscriptionId,
            amount: actualAmount,
            timestamp: block.timestamp,
            success: true
        }));
        
        totalRevenue += actualAmount;
        
        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            provider,
            serviceId,
            amount,
            nextBillingDate
        );
        
        emit PaymentProcessed(subscriptionId, msg.sender, provider, amount, platformFee, actualAmount);
    }
    
    /**
     * @dev 处理订阅支付（任何人都可以触发）
     * @param subscriptionId 订阅ID
     */
    function processPayment(uint256 subscriptionId) 
        public 
        onlyActiveSubscription(subscriptionId)
        whenNotPaused
        nonReentrant
    {
        Subscription storage subscription = subscriptions[subscriptionId];
        
        require(
            block.timestamp >= subscription.nextBillingDate,
            "Not yet due for payment"
        );
        
        uint256 platformFee = (subscription.amount * platformFeeRate) / 10000;
        uint256 actualAmount = subscription.amount - platformFee;
        
        // 尝试扣款
        bool paymentSuccess = paymentToken.transferFrom(
            subscription.subscriber,
            address(this),
            subscription.amount
        );
        
        if (paymentSuccess) {
            // 转账给提供者
            paymentSuccess = paymentToken.transfer(subscription.provider, actualAmount);
        }
        
        if (paymentSuccess) {
            // 更新下一计费日期
            subscription.nextBillingDate = block.timestamp + subscription.billingCycle;
            
            // 记录支付历史
            paymentHistory[subscriptionId].push(SubscriptionPayment({
                subscriptionId: subscriptionId,
                amount: actualAmount,
                timestamp: block.timestamp,
                success: true
            }));
            
            totalRevenue += actualAmount;
            
            emit PaymentProcessed(
                subscriptionId,
                subscription.subscriber,
                subscription.provider,
                subscription.amount,
                platformFee,
                actualAmount
            );
        } else {
            // 支付失败，取消订阅
            subscription.isActive = false;
            
            paymentHistory[subscriptionId].push(SubscriptionPayment({
                subscriptionId: subscriptionId,
                amount: 0,
                timestamp: block.timestamp,
                success: false
            }));
            
            emit PaymentFailed(subscriptionId, subscription.subscriber, subscription.amount);
        }
    }
    
    /**
     * @dev 批量处理订阅支付
     */
    function batchProcessPayments(uint256[] calldata subscriptionIds) 
        public 
        whenNotPaused
        nonReentrant
    {
        for (uint256 i = 0; i < subscriptionIds.length; i++) {
            processPayment(subscriptionIds[i]);
        }
    }
    
    /**
     * @dev 取消订阅
     */
    function cancelSubscription(uint256 subscriptionId) 
        public 
        onlyActiveSubscription(subscriptionId)
        onlySubscriptionOwner(subscriptionId)
        whenNotPaused
        nonReentrant
    {
        subscriptions[subscriptionId].isActive = false;
        
        emit SubscriptionCancelled(subscriptionId, msg.sender);
    }
    
    /**
     * @dev 更新订阅（仅提供者可以修改）
     */
    function updateSubscription(
        uint256 subscriptionId,
        uint256 newAmount,
        uint256 newBillingCycle
    ) 
        public 
        onlyActiveSubscription(subscriptionId)
        onlySubscriptionProvider(subscriptionId)
        whenNotPaused
    {
        require(newAmount > 0, "Amount must be greater than 0");
        require(
            newBillingCycle >= minBillingCycle && newBillingCycle <= maxBillingCycle,
            "Invalid billing cycle"
        );
        
        subscriptions[subscriptionId].amount = newAmount;
        subscriptions[subscriptionId].billingCycle = newBillingCycle;
        
        emit SubscriptionUpdated(subscriptionId, newAmount, newBillingCycle);
    }
    
    /**
     * @dev 获取订阅信息
     */
    function getSubscription(uint256 subscriptionId) 
        public 
        view 
        onlyActiveSubscription(subscriptionId)
        returns (Subscription memory) 
    {
        return subscriptions[subscriptionId];
    }
    
    /**
     * @dev 获取订阅者的所有订阅
     */
    function getSubscriberSubscriptions(address subscriber) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return subscriberSubscriptions[subscriber];
    }
    
    /**
     * @dev 获取提供者的所有订阅
     */
    function getProviderSubscriptions(address provider) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return providerSubscriptions[provider];
    }
    
    /**
     * @dev 获取订阅的支付历史
     */
    function getPaymentHistory(uint256 subscriptionId) 
        public 
        view 
        returns (SubscriptionPayment[] memory) 
    {
        return paymentHistory[subscriptionId];
    }
    
    /**
     * @dev 获取待处理的订阅（到期的活跃订阅）
     */
    function getDueSubscriptions() 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256 count = 0;
        
        for (uint256 i = 0; i < subscriptionCount; i++) {
            if (
                subscriptions[i].isActive &&
                block.timestamp >= subscriptions[i].nextBillingDate
            ) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < subscriptionCount; i++) {
            if (
                subscriptions[i].isActive &&
                block.timestamp >= subscriptions[i].nextBillingDate
            ) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev 获取统计信息
     */
    function getStatistics() 
        public 
        view 
        returns (
            uint256 totalSubscriptions,
            uint256 activeSubscriptions,
            uint256 totalPayments,
            uint256 successfulPayments,
            uint256 failedPayments,
            uint256 _totalRevenue
        ) 
    {
        for (uint256 i = 0; i < subscriptionCount; i++) {
            totalSubscriptions++;
            
            if (subscriptions[i].isActive) {
                activeSubscriptions++;
            }
            
            SubscriptionPayment[] memory history = paymentHistory[i];
            for (uint256 j = 0; j < history.length; j++) {
                totalPayments++;
                
                if (history[j].success) {
                    successfulPayments++;
                } else {
                    failedPayments++;
                }
            }
        }
        
        return (
            totalSubscriptions,
            activeSubscriptions,
            totalPayments,
            successfulPayments,
            failedPayments,
            totalRevenue
        );
    }
    
    /**
     * @dev 设置平台费用率
     */
    function setPlatformFeeRate(uint256 newFeeRate) public onlyOwner {
        require(newFeeRate <= 1000, "Fee rate too high"); // 最高10%
        
        uint256 oldRate = platformFeeRate;
        platformFeeRate = newFeeRate;
        
        emit PlatformFeeRateChanged(oldRate, newFeeRate);
    }
    
    /**
     * @dev 设置计费周期范围
     */
    function setBillingCycleRange(
        uint256 _minBillingCycle,
        uint256 _maxBillingCycle
    ) 
        public 
        onlyOwner 
    {
        require(_minBillingCycle >= 1 days, "Min cycle too short");
        require(_maxBillingCycle <= 365 days, "Max cycle too long");
        require(_minBillingCycle < _maxBillingCycle, "Invalid range");
        
        minBillingCycle = _minBillingCycle;
        maxBillingCycle = _maxBillingCycle;
    }
    
    /**
     * @dev 提取平台费用（如果支持）
     */
    function withdrawPlatformFees(uint256 amount) public onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(
            paymentToken.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        
        require(
            paymentToken.transfer(owner(), amount),
            "Transfer failed"
        );
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
