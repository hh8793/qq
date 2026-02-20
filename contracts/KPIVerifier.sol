// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title KPIVerifier
 * @dev KPI验证合约 - 实现基于预设KPI的智能核验机制
 */
contract KPIVerifier is AccessControl, Pausable, ReentrancyGuard {
    
    using ECDSA for bytes32;
    
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    struct KPIMetric {
        string name;
        string description;
        MetricType metricType;
        uint256 targetValue;
        uint256 minValue;
        uint256 maxValue;
        bool isActive;
    }
    
    struct KPIRule {
        uint256 id;
        uint256[] metricIds;
        Operator operator;
        uint256 threshold;
        uint256 weight;
        bool isActive;
    }
    
    struct KPIReport {
        uint256 id;
        address reporter;
        address subjectAgent;
        uint256 ruleId;
        uint256[] metricValues;
        bool verified;
        uint256 score;
        uint256 timestamp;
        bytes32 dataHash;
    }
    
    enum MetricType {
        COUNTER,        // 计数器（如线索数量）
        PERCENTAGE,     // 百分比（如转化率）
        RATING,         // 评分（如1-5星）
        BOOLEAN,        // 布尔值（0或1）
        CURRENCY        // 货币金额
    }
    
    enum Operator {
        GREATER_THAN,       // 大于
        LESS_THAN,          // 小于
        EQUAL_TO,           // 等于
        GREATER_OR_EQUAL,   // 大于等于
        LESS_OR_EQUAL       // 小于等于
    }
    
    // 状态变量
    mapping(uint256 => KPIMetric) public metrics;
    mapping(uint256 => KPIRule) public rules;
    mapping(uint256 => KPIReport) public reports;
    
    mapping(address => uint256[]) public agentReports;
    mapping(uint256 => uint256[]) public ruleReports;
    
    uint256 public metricCount;
    uint256 public ruleCount;
    uint256 public reportCount;
    
    mapping(bytes32 => bool) public usedDataHashes;
    
    // 事件
    event MetricCreated(
        uint256 indexed metricId,
        string name,
        MetricType metricType,
        uint256 targetValue
    );
    
    event MetricUpdated(uint256 indexed metricId, uint256 targetValue);
    
    event RuleCreated(
        uint256 indexed ruleId,
        uint256[] metricIds,
        Operator operator,
        uint256 threshold
    );
    
    event ReportSubmitted(
        uint256 indexed reportId,
        address indexed reporter,
        address indexed subjectAgent,
        uint256 ruleId,
        uint256 score,
        bool verified
    );
    
    event ReportVerified(
        uint256 indexed reportId,
        address indexed verifier,
        bool verified
    );
    
    event ReportDisputed(
        uint256 indexed reportId,
        address indexed disputer,
        string reason
    );
    
    // 修饰符
    modifier onlyVerifier() {
        require(hasRole(VERIFIER_ROLE, msg.sender), "Not a verifier");
        _;
    }
    
    modifier onlyOracle() {
        require(hasRole(ORACLE_ROLE, msg.sender), "Not an oracle");
        _;
    }
    
    modifier validMetric(uint256 metricId) {
        require(metricId < metricCount, "Invalid metric");
        require(metrics[metricId].isActive, "Metric not active");
        _;
    }
    
    modifier validRule(uint256 ruleId) {
        require(ruleId < ruleCount, "Invalid rule");
        require(rules[ruleId].isActive, "Rule not active");
        _;
    }
    
    /**
     * @dev 构造函数
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }
    
    /**
     * @dev 创建KPI指标
     */
    function createMetric(
        string memory name,
        string memory description,
        MetricType metricType,
        uint256 targetValue,
        uint256 minValue,
        uint256 maxValue
    ) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(minValue <= maxValue, "Invalid value range");
        
        uint256 metricId = metricCount++;
        
        metrics[metricId] = KPIMetric({
            name: name,
            description: description,
            metricType: metricType,
            targetValue: targetValue,
            minValue: minValue,
            maxValue: maxValue,
            isActive: true
        });
        
        emit MetricCreated(metricId, name, metricType, targetValue);
    }
    
    /**
     * @dev 更新KPI指标目标值
     */
    function updateMetricTarget(
        uint256 metricId,
        uint256 newTargetValue
    ) 
        public 
        validMetric(metricId)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            newTargetValue >= metrics[metricId].minValue,
            "Target below minimum"
        );
        require(
            newTargetValue <= metrics[metricId].maxValue,
            "Target above maximum"
        );
        
        metrics[metricId].targetValue = newTargetValue;
        
        emit MetricUpdated(metricId, newTargetValue);
    }
    
    /**
     * @dev 创建KPI规则
     */
    function createRule(
        uint256[] memory metricIds,
        Operator operator,
        uint256 threshold,
        uint256 weight
    ) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(metricIds.length > 0, "No metrics specified");
        require(threshold > 0, "Threshold must be greater than 0");
        require(weight > 0 && weight <= 100, "Weight must be between 1 and 100");
        
        // 验证所有指标都存在且活跃
        for (uint256 i = 0; i < metricIds.length; i++) {
            require(metricIds[i] < metricCount, "Invalid metric");
            require(metrics[metricIds[i]].isActive, "Metric not active");
        }
        
        uint256 ruleId = ruleCount++;
        
        rules[ruleId] = KPIRule({
            id: ruleId,
            metricIds: metricIds,
            operator: operator,
            threshold: threshold,
            weight: weight,
            isActive: true
        });
        
        emit RuleCreated(ruleId, metricIds, operator, threshold);
    }
    
    /**
     * @dev 提交KPI报告
     */
    function submitReport(
        address subjectAgent,
        uint256 ruleId,
        uint256[] memory metricValues,
        bytes memory data
    ) 
        public 
        whenNotPaused
        nonReentrant
    {
        require(subjectAgent != address(0), "Invalid agent");
        require(ruleId < ruleCount, "Invalid rule");
        require(rules[ruleId].isActive, "Rule not active");
        
        KPIRule memory rule = rules[ruleId];
        require(
            metricValues.length == rule.metricIds.length,
            "Metric values count mismatch"
        );
        
        // 验证指标值范围
        for (uint256 i = 0; i < metricValues.length; i++) {
            uint256 metricId = rule.metricIds[i];
            require(
                metricValues[i] >= metrics[metricId].minValue,
                "Value below minimum"
            );
            require(
                metricValues[i] <= metrics[metricId].maxValue,
                "Value above maximum"
            );
        }
        
        bytes32 dataHash = keccak256(abi.encodePacked(
            subjectAgent,
            ruleId,
            metricValues,
            block.timestamp,
            msg.sender
        ));
        
        require(!usedDataHashes[dataHash], "Data hash already used");
        usedDataHashes[dataHash] = true;
        
        // 计算得分
        uint256 score = _calculateScore(ruleId, metricValues);
        
        // 自动验证（基于规则阈值）
        bool verified = _autoVerify(ruleId, score);
        
        uint256 reportId = reportCount++;
        
        reports[reportId] = KPIReport({
            id: reportId,
            reporter: msg.sender,
            subjectAgent: subjectAgent,
            ruleId: ruleId,
            metricValues: metricValues,
            verified: verified,
            score: score,
            timestamp: block.timestamp,
            dataHash: dataHash
        });
        
        agentReports[subjectAgent].push(reportId);
        ruleReports[ruleId].push(reportId);
        
        emit ReportSubmitted(reportId, msg.sender, subjectAgent, ruleId, score, verified);
    }
    
    /**
     * @dev 计算得分
     */
    function _calculateScore(
        uint256 ruleId,
        uint256[] memory metricValues
    ) 
        internal 
        view 
        returns (uint256) 
    {
        KPIRule memory rule = rules[ruleId];
        uint256 totalScore = 0;
        
        for (uint256 i = 0; i < metricValues.length; i++) {
            uint256 metricId = rule.metricIds[i];
            uint256 targetValue = metrics[metricId].targetValue;
            uint256 actualValue = metricValues[i];
            
            // 计算每个指标的得分（基于与目标值的偏差）
            uint256 deviation;
            if (actualValue >= targetValue) {
                deviation = actualValue - targetValue;
            } else {
                deviation = targetValue - actualValue;
            }
            
            uint256 maxDeviation = targetValue / 10; // 允许10%的偏差
            uint256 metricScore = 100;
            
            if (deviation > 0) {
                metricScore = deviation > maxDeviation ? 0 : (100 * (maxDeviation - deviation)) / maxDeviation;
            }
            
            totalScore += metricScore;
        }
        
        return totalScore / metricValues.length;
    }
    
    /**
     * @dev 自动验证
     */
    function _autoVerify(uint256 ruleId, uint256 score) internal view returns (bool) {
        KPIRule memory rule = rules[ruleId];
        
        // 根据操作符和阈值验证
        if (rule.operator == Operator.GREATER_THAN) {
            return score > rule.threshold;
        } else if (rule.operator == Operator.LESS_THAN) {
            return score < rule.threshold;
        } else if (rule.operator == Operator.EQUAL_TO) {
            return score == rule.threshold;
        } else if (rule.operator == Operator.GREATER_OR_EQUAL) {
            return score >= rule.threshold;
        } else if (rule.operator == Operator.LESS_OR_EQUAL) {
            return score <= rule.threshold;
        }
        
        return false;
    }
    
    /**
     * @dev 手动验证报告
     */
    function verifyReport(uint256 reportId, bool verified) 
        public 
        onlyVerifier 
        whenNotPaused
    {
        require(reportId < reportCount, "Invalid report");
        require(!reports[reportId].verified, "Already verified");
        
        reports[reportId].verified = verified;
        
        emit ReportVerified(reportId, msg.sender, verified);
    }
    
    /**
     * @dev 预言机验证报告（带签名）
     */
    function oracleVerifyReport(
        uint256 reportId,
        bool verified,
        bytes memory signature
    ) 
        public 
        whenNotPaused
    {
        require(reportId < reportCount, "Invalid report");
        
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                reportId,
                verified,
                address(this),
                block.chainid
            )
        );
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(hasRole(ORACLE_ROLE, signer), "Invalid oracle signature");
        
        reports[reportId].verified = verified;
        
        emit ReportVerified(reportId, signer, verified);
    }
    
    /**
     * @dev 争议报告
     */
    function disputeReport(uint256 reportId, string memory reason) 
        public 
        whenNotPaused
    {
        require(reportId < reportCount, "Invalid report");
        require(
            msg.sender == reports[reportId].subjectAgent ||
            msg.sender == reports[reportId].reporter,
            "Not authorized to dispute"
        );
        
        emit ReportDisputed(reportId, msg.sender, reason);
    }
    
    /**
     * @dev 获取报告信息
     */
    function getReport(uint256 reportId) 
        public 
        view 
        returns (KPIReport memory) 
    {
        require(reportId < reportCount, "Invalid report");
        return reports[reportId];
    }
    
    /**
     * @dev 获取智能体的所有报告
     */
    function getAgentReports(address agent) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return agentReports[agent];
    }
    
    /**
     * @dev 获取规则的所有报告
     */
    function getRuleReports(uint256 ruleId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return ruleReports[ruleId];
    }
    
    /**
     * @dev 获取KPI指标
     */
    function getMetric(uint256 metricId) 
        public 
        view 
        validMetric(metricId)
        returns (KPIMetric memory) 
    {
        return metrics[metricId];
    }
    
    /**
     * @dev 获取KPI规则
     */
    function getRule(uint256 ruleId) 
        public 
        view 
        validRule(ruleId)
        returns (KPIRule memory) 
    {
        return rules[ruleId];
    }
    
    /**
     * @dev 获取统计信息
     */
    function getStatistics() 
        public 
        view 
        returns (
            uint256 totalReports,
            uint256 verifiedReports,
            uint256 unverifiedReports,
            uint256 averageScore
        ) 
    {
        for (uint256 i = 0; i < reportCount; i++) {
            totalReports++;
            
            if (reports[i].verified) {
                verifiedReports++;
                averageScore += reports[i].score;
            } else {
                unverifiedReports++;
            }
        }
        
        if (verifiedReports > 0) {
            averageScore = averageScore / verifiedReports;
        }
        
        return (totalReports, verifiedReports, unverifiedReports, averageScore);
    }
    
    /**
     * @dev 添加验证者
     */
    function addVerifier(address verifier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
    }
    
    /**
     * @dev 移除验证者
     */
    function removeVerifier(address verifier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }
    
    /**
     * @dev 添加预言机
     */
    function addOracle(address oracle) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ORACLE_ROLE, oracle);
    }
    
    /**
     * @dev 移除预言机
     */
    function removeOracle(address oracle) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ORACLE_ROLE, oracle);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
