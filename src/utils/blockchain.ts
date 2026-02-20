import { ethers, ContractTransactionResponse, Contract } from 'ethers';
import { logger } from './logger';

/**
 * 等待交易确认
 */
export async function waitForTransaction(
  tx: ContractTransactionResponse,
  confirmations: number = 1
): Promise<ethers.ContractTransactionReceipt> {
  try {
    logger.info(`Waiting for transaction ${tx.hash} to be confirmed...`);
    const receipt = await tx.wait(confirmations);
    logger.info(`Transaction ${tx.hash} confirmed in block ${receipt?.blockNumber}`);
    return receipt as ethers.ContractTransactionReceipt;
  } catch (error) {
    logger.error(`Transaction failed: ${error}`);
    throw error;
  }
}

/**
 * 估算Gas费用
 */
export async function estimateGas(
  contract: Contract,
  method: string,
  args: any[]
): Promise<bigint> {
  try {
    const gasEstimate = await contract[method].estimateGas(...args);
    return gasEstimate;
  } catch (error) {
    logger.error(`Failed to estimate gas: ${error}`);
    throw error;
  }
}

/**
 * 执行合约方法（带重试）
 */
export async function executeContractMethod(
  contract: Contract,
  method: string,
  args: any[],
  options: { gasLimit?: bigint; value?: bigint } = {},
  maxRetries: number = 3
): Promise<ContractTransactionResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Executing ${method} (attempt ${attempt}/${maxRetries})`);
      
      // 估算Gas
      if (!options.gasLimit) {
        const gasEstimate = await estimateGas(contract, method, args);
        options.gasLimit = gasEstimate * 120n / 100n; // 增加20%缓冲
      }

      // 执行交易
      const tx = await contract[method](...args, options);
      logger.info(`Transaction sent: ${tx.hash}`);
      
      return tx;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Attempt ${attempt} failed: ${error}`);
      
      if (attempt < maxRetries) {
        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * 监听合约事件
 */
export function listenToContractEvent(
  contract: Contract,
  eventName: string,
  callback: (...args: any[]) => void
): void {
  contract.on(eventName, (...args) => {
    logger.info(`Event ${eventName} triggered:`, args);
    callback(...args);
  });
}

/**
 * 停止监听事件
 */
export function stopListeningToContractEvent(
  contract: Contract,
  eventName: string
): void {
  contract.off(eventName);
}

/**
 * 获取当前Gas价格
 */
export async function getCurrentGasPrice(provider: ethers.JsonRpcProvider): Promise<bigint> {
  try {
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || 0n;
  } catch (error) {
    logger.error('Failed to get current gas price:', error);
    throw error;
  }
}

/**
 * 验证地址格式
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * 格式化Wei为Ether
 */
export function formatEther(wei: string | number | bigint): string {
  return ethers.formatEther(wei);
}

/**
 * 格式化Ether为Wei
 */
export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether);
}

/**
 * 生成随机数
 */
export function generateNonce(): number {
  return Math.floor(Math.random() * 1000000000);
}

/**
 * 生成交易哈希
 */
export function generateTransactionHash(...args: any[]): string {
  const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    args.map(() => 'string'),
    args.map(String)
  ));
  return hash.substring(0, 66); // 返回66字符的十六进制字符串
}

/**
 * 休眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取区块信息
 */
export async function getBlockInfo(
  provider: ethers.JsonRpcProvider,
  blockNumberOrHash: string | number = 'latest'
): Promise<ethers.Block> {
  try {
    const block = await provider.getBlock(blockNumberOrHash);
    if (!block) {
      throw new Error('Block not found');
    }
    return block;
  } catch (error) {
    logger.error('Failed to get block info:', error);
    throw error;
  }
}

/**
 * 获取账户余额
 */
export async function getBalance(
  provider: ethers.JsonRpcProvider,
  address: string
): Promise<bigint> {
  try {
    const balance = await provider.getBalance(address);
    return balance;
  } catch (error) {
    logger.error('Failed to get balance:', error);
    throw error;
  }
}
