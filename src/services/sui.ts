import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { RPC_CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { retryWithBackoff } from '../utils/retry';

export class SuiService {
  private client: SuiClient;
  private keypair: Ed25519Keypair | null = null;

  constructor() {
    this.client = new SuiClient({
      url: RPC_CONFIG.primary,
    });
  }

  initializeWallet(privateKey: string): void {
    try {
      this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
      Logger.info('Sui wallet initialized');
    } catch (error) {
      Logger.error('Failed to initialize Sui wallet', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<bigint> {
    return retryWithBackoff(async () => {
      const balance = await this.client.getBalance({
        owner: address,
      });
      return BigInt(balance.totalBalance);
    });
  }

  async getSuiBalance(address: string): Promise<number> {
    const balance = await this.getBalance(address);
    return Number(balance) / 1e9; // Convert from MIST to SUI
  }

  async executeTransaction(txb: Transaction): Promise<string> {
    if (!this.keypair) {
      throw new Error('Wallet not initialized');
    }

    return retryWithBackoff(async () => {
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair!,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'failure') {
        throw new Error(`Transaction failed: ${result.effects.status.error}`);
      }

      return result.digest;
    });
  }

  async executeTransactionWithResult(txb: Transaction): Promise<any> {
    if (!this.keypair) {
      throw new Error('Wallet not initialized');
    }

    return retryWithBackoff(async () => {
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair!,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'failure') {
        throw new Error(`Transaction failed: ${result.effects.status.error}`);
      }

      return result;
    });
  }

  async simulateTransaction(txb: Transaction): Promise<any> {
    if (!this.keypair) {
      throw new Error('Wallet not initialized');
    }

    return retryWithBackoff(async () => {
      // Convert Transaction to bytes for dry run
      const txBytes = await txb.build({ client: this.client });
      return await this.client.dryRunTransactionBlock({
        transactionBlock: txBytes,
      });
    });
  }

  async getTransactionResult(txDigest: string): Promise<any> {
    return retryWithBackoff(async () => {
      return await this.client.getTransactionBlock({
        digest: txDigest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    });
  }

  getAddress(): string {
    if (!this.keypair) {
      throw new Error('Wallet not initialized');
    }
    return this.keypair.toSuiAddress();
  }

  getClient(): SuiClient {
    return this.client;
  }
}

