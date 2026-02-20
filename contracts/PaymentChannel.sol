// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PaymentChannel
 * @dev 支付通道合约 - 实现链下签名验证的高频小额支付通道
 */
contract PaymentChannel is Ownable, Pausable, ReentrancyGuard {
    
    using ECDSA for bytes32;
    
    struct Channel {
        address sender;
        address recipient;
        uint256 balance;
        uint256 amountWithdrawn;
        uint256 expiration;
        bool isOpen;
    }
    
    struct Payment {
        uint256 channelId;
        uint256 amount;
        uint256 nonce;
        bytes signature;
    }
    
    // 状态变量
    IERC20 public token;
    mapping(uint256 => Channel) public channels;
    mapping(uint256 => uint256) public usedNonces;
    
    uint256 public channelCount;
    uint256 public channelExpirationPeriod = 7 days;
    uint256 public minChannelBalance = 0.01 ether;
    
    // 事件
    event ChannelOpened(
        uint256 indexed channelId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 expiration
    );
    
    event PaymentClaimed(
        uint256 indexed channelId,
        address indexed recipient,
        uint256 amount,
        uint256 totalWithdrawn
    );
    
    event ChannelClosed(
        uint256 indexed channelId,
        address indexed sender,
        uint256 refundAmount
    );
    
    event ChannelExtended(
        uint256 indexed channelId,
        uint256 newExpiration
    );
    
    event FundsAdded(
        uint256 indexed channelId,
        address indexed sender,
        uint256 amount
    );
    
    // 修饰符
    modifier onlyChannelParticipant(uint256 channelId) {
        require(channels[channelId].isOpen, "Channel not open");
        require(
            msg.sender == channels[channelId].sender ||
            msg.sender == channels[channelId].recipient,
            "Not a channel participant"
        );
        _;
    }
    
    modifier onlyChannelSender(uint256 channelId) {
        require(channels[channelId].isOpen, "Channel not open");
        require(msg.sender == channels[channelId].sender, "Not channel sender");
        _;
    }
    
    modifier onlyChannelRecipient(uint256 channelId) {
        require(channels[channelId].isOpen, "Channel not open");
        require(msg.sender == channels[channelId].recipient, "Not channel recipient");
        _;
    }
    
    modifier onlyValidChannel(uint256 channelId) {
        require(channelId < channelCount, "Invalid channel");
        _;
    }
    
    /**
     * @dev 构造函数
     */
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }
    
    /**
     * @dev 开启支付通道
     * @param recipient 接收方地址
     * @param amount 初始金额
     * @param expiration 到期时间（可选，默认7天）
     */
    function openChannel(
        address recipient,
        uint256 amount,
        uint256 expiration
    ) 
        public 
        whenNotPaused 
        nonReentrant
    {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot open channel to self");
        require(amount >= minChannelBalance, "Amount below minimum");
        
        if (expiration == 0) {
            expiration = block.timestamp + channelExpirationPeriod;
        } else {
            require(expiration > block.timestamp, "Expiration must be in future");
        }
        
        // 转账到通道
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // 创建通道
        uint256 channelId = channelCount++;
        
        channels[channelId] = Channel({
            sender: msg.sender,
            recipient: recipient,
            balance: amount,
            amountWithdrawn: 0,
            expiration: expiration,
            isOpen: true
        });
        
        emit ChannelOpened(channelId, msg.sender, recipient, amount, expiration);
    }
    
    /**
     * @dev 领取支付（链下签名验证）
     * @param channelId 通道ID
     * @param amount 支付金额
     * @param nonce 随机数
     * @param signature 发送方签名
     */
    function claimPayment(
        uint256 channelId,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) 
        public 
        onlyValidChannel(channelId)
        onlyChannelRecipient(channelId)
        whenNotPaused
        nonReentrant
    {
        Channel storage channel = channels[channelId];
        
        require(channel.isOpen, "Channel not open");
        require(block.timestamp <= channel.expiration, "Channel expired");
        require(nonce != usedNonces[nonce], "Nonce already used");
        
        uint256 totalWithdrawn = channel.amountWithdrawn + amount;
        require(totalWithdrawn <= channel.balance, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");
        
        // 验证签名
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                channelId,
                amount,
                nonce,
                address(this),
                block.chainid
            )
        );
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(signer == channel.sender, "Invalid signature");
        
        // 更新状态
        channel.amountWithdrawn = totalWithdrawn;
        usedNonces[nonce] = nonce;
        
        // 转账给接收方
        require(
            token.transfer(channel.recipient, amount),
            "Transfer failed"
        );
        
        emit PaymentClaimed(channelId, channel.recipient, amount, totalWithdrawn);
        
        // 如果余额已全部领取，自动关闭通道
        if (totalWithdrawn == channel.balance) {
            _closeChannel(channelId, 0);
        }
    }
    
    /**
     * @dev 批量领取支付
     */
    function batchClaimPayment(
        Payment[] calldata payments
    ) 
        public 
        whenNotPaused
        nonReentrant
    {
        for (uint256 i = 0; i < payments.length; i++) {
            claimPayment(
                payments[i].channelId,
                payments[i].amount,
                payments[i].nonce,
                payments[i].signature
            );
        }
    }
    
    /**
     * @dev 关闭通道（仅发送方）
     */
    function closeChannel(uint256 channelId) 
        public 
        onlyValidChannel(channelId)
        onlyChannelSender(channelId)
        whenNotPaused
        nonReentrant
    {
        Channel storage channel = channels[channelId];
        
        require(channel.isOpen, "Channel already closed");
        require(block.timestamp > channel.expiration, "Channel not expired");
        
        uint256 refundAmount = channel.balance - channel.amountWithdrawn;
        
        _closeChannel(channelId, refundAmount);
    }
    
    /**
     * @dev 紧急关闭通道（接收方）
     */
    function emergencyCloseChannel(uint256 channelId) 
        public 
        onlyValidChannel(channelId)
        onlyChannelRecipient(channelId)
        whenNotPaused
        nonReentrant
    {
        Channel storage channel = channels[channelId];
        
        require(channel.isOpen, "Channel already closed");
        require(channel.amountWithdrawn > 0, "No payments claimed");
        require(
            block.timestamp > channel.expiration + 1 days,
            "Too early for emergency close"
        );
        
        uint256 refundAmount = channel.balance - channel.amountWithdrawn;
        
        _closeChannel(channelId, refundAmount);
    }
    
    /**
     * @dev 内部关闭通道
     */
    function _closeChannel(uint256 channelId, uint256 refundAmount) internal {
        Channel storage channel = channels[channelId];
        
        channel.isOpen = false;
        
        // 退还剩余资金给发送方
        if (refundAmount > 0) {
            require(
                token.transfer(channel.sender, refundAmount),
                "Refund failed"
            );
        }
        
        emit ChannelClosed(channelId, channel.sender, refundAmount);
    }
    
    /**
     * @dev 延长通道到期时间
     */
    function extendChannel(
        uint256 channelId,
        uint256 newExpiration
    ) 
        public 
        onlyValidChannel(channelId)
        onlyChannelSender(channelId)
        whenNotPaused
    {
        require(channels[channelId].isOpen, "Channel not open");
        require(newExpiration > block.timestamp, "Expiration must be in future");
        require(newExpiration > channels[channelId].expiration, "New expiration must be later");
        
        channels[channelId].expiration = newExpiration;
        
        emit ChannelExtended(channelId, newExpiration);
    }
    
    /**
     * @dev 向通道添加资金
     */
    function addFunds(uint256 channelId, uint256 amount) 
        public 
        onlyValidChannel(channelId)
        onlyChannelSender(channelId)
        whenNotPaused
        nonReentrant
    {
        require(channels[channelId].isOpen, "Channel not open");
        require(amount > 0, "Amount must be greater than 0");
        
        // 转账到通道
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        channels[channelId].balance += amount;
        
        emit FundsAdded(channelId, msg.sender, amount);
    }
    
    /**
     * @dev 获取通道信息
     */
    function getChannel(uint256 channelId) 
        public 
        view 
        onlyValidChannel(channelId)
        returns (Channel memory) 
    {
        return channels[channelId];
    }
    
    /**
     * @dev 获取发送方的所有通道
     */
    function getSenderChannels(address sender) 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256 count = 0;
        
        for (uint256 i = 0; i < channelCount; i++) {
            if (channels[i].sender == sender && channels[i].isOpen) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < channelCount; i++) {
            if (channels[i].sender == sender && channels[i].isOpen) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev 获取接收方的所有通道
     */
    function getRecipientChannels(address recipient) 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256 count = 0;
        
        for (uint256 i = 0; i < channelCount; i++) {
            if (channels[i].recipient == recipient && channels[i].isOpen) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < channelCount; i++) {
            if (channels[i].recipient == recipient && channels[i].isOpen) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev 计算支付签名哈希（链下使用）
     */
    function getPaymentHash(
        uint256 channelId,
        uint256 amount,
        uint256 nonce
    ) 
        public 
        view 
        returns (bytes32) 
    {
        return keccak256(
            abi.encodePacked(
                channelId,
                amount,
                nonce,
                address(this),
                block.chainid
            )
        );
    }
    
    /**
     * @dev 验证支付签名
     */
    function verifyPayment(
        uint256 channelId,
        uint256 amount,
        uint256 nonce,
        bytes memory signature,
        address expectedSigner
    ) 
        public 
        view 
        returns (bool) 
    {
        bytes32 messageHash = getPaymentHash(channelId, amount, nonce);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        return signer == expectedSigner;
    }
    
    /**
     * @dev 设置最小通道余额
     */
    function setMinChannelBalance(uint256 _minChannelBalance) public onlyOwner {
        require(_minChannelBalance > 0, "Invalid minimum balance");
        minChannelBalance = _minChannelBalance;
    }
    
    /**
     * @dev 设置通道有效期
     */
    function setChannelExpirationPeriod(uint256 _period) public onlyOwner {
        require(_period >= 1 days, "Period too short");
        require(_period <= 365 days, "Period too long");
        channelExpirationPeriod = _period;
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
