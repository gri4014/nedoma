import { Logger } from '../../utils/logger';
interface DashboardStats {
  totalRestaurants: number;
  activeOrders: number;
  activeTables: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  timestamp: string;
}

class DashboardStatsService {
  private static instance: DashboardStatsService;
  private logger: Logger;
  private updateTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 1000; // 1 second debounce
  private lastStats: DashboardStats | null = null;
  private lastUpdateTime: Date | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  private constructor() {
    this.logger = new Logger('DashboardStatsService');
    this.setupEventListeners();
  }

  public static getInstance(): DashboardStatsService {
    if (!DashboardStatsService.instance) {
      DashboardStatsService.instance = new DashboardStatsService();
    }
    return DashboardStatsService.instance;
  }

  private setupEventListeners(): void {
    // No event listeners needed for now
  }

  private isCacheValid(): boolean {
    if (!this.lastStats || !this.lastUpdateTime) return false;
    const now = new Date();
    return now.getTime() - this.lastUpdateTime.getTime() < this.CACHE_TTL;
  }

  public async getStats(): Promise<DashboardStats> {
    try {
      // Return cached stats if valid
      if (this.isCacheValid() && this.lastStats) {
        return this.lastStats;
      }

      const stats: DashboardStats = {
        totalRestaurants: 0,
        activeOrders: 0,
        activeTables: 0,
        systemHealth: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Update cache
      this.lastStats = stats;
      this.lastUpdateTime = new Date();

      return stats;
    } catch (error) {
      this.logger.error('Failed to fetch dashboard stats:', error);
      
      // Return last known stats if available, otherwise throw
      if (this.lastStats) {
        return {
          ...this.lastStats,
          systemHealth: 'warning',
          timestamp: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }

  public async emitDashboardStats(): Promise<void> {
    try {
      const stats = await this.getStats();
      
      // Just log stats for now
      this.logger.debug('Dashboard stats update:', stats);
    } catch (error) {
      this.logger.error('Failed to emit dashboard stats:', error);
      
      // Just log error for now
      this.logger.error('Failed to emit dashboard stats:', error);
    }
  }

  // Force an immediate update, bypassing debounce and cache
  public async forceUpdate(): Promise<void> {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    this.lastStats = null; // Clear cache
    await this.emitDashboardStats();
  }
}

// Export singleton instance
export const dashboardStatsService = DashboardStatsService.getInstance();
