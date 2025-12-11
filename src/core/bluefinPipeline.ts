import { DatabaseService } from '../services/database';
import { TelegramService } from '../services/telegram';
import { GLOBAL_CONFIG } from '../config';
import { Logger } from '../utils/logger';

export class BluefinPipeline {
  private db: DatabaseService;
  private telegram: TelegramService;

  constructor(db: DatabaseService, telegram: TelegramService) {
    this.db = db;
    this.telegram = telegram;
  }

  async recordDeposit(asset: 'USDC' | 'SUI', amount: number, txDigest?: string): Promise<void> {
    // This would be called manually via Telegram command /deposited
    // In Phase 4, this could be automated
    
    // Reset skim wallet balance
    const status = this.db.getSkimWalletStatus(GLOBAL_CONFIG.skimThresholds);
    
    if (asset === 'USDC') {
      this.db.updateSkimWalletBalance(-status.usdcBalance, 0);
    } else if (asset === 'SUI') {
      this.db.updateSkimWalletBalance(0, -status.suiBalance);
    }

    Logger.info(`Bluefin deposit recorded`, { asset, amount, txDigest });
  }

  async getDepositStatus(): Promise<{
    usdcBalance: number;
    suiBalance: number;
    usdcThreshold: number;
    suiThreshold: number;
    readyForDeposit: boolean;
  }> {
    const status = this.db.getSkimWalletStatus(GLOBAL_CONFIG.skimThresholds);
    return {
      usdcBalance: status.usdcBalance,
      suiBalance: status.suiBalance,
      usdcThreshold: status.usdcThreshold,
      suiThreshold: status.suiThreshold,
      readyForDeposit: status.readyForDeposit,
    };
  }
}

