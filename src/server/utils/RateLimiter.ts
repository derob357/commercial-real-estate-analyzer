export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private pendingRequests: Array<{ resolve: () => void; timestamp: number }> = [];

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.refillRate = maxRequests / timeWindowMs; // tokens per millisecond
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    return new Promise((resolve) => {
      this.refillTokens();
      
      if (this.tokens > 0) {
        this.tokens--;
        resolve();
      } else {
        // Queue the request
        this.pendingRequests.push({ resolve, timestamp: Date.now() });
        this.processPendingRequests();
      }
    });
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private processPendingRequests(): void {
    // Process pending requests every 100ms
    setTimeout(() => {
      this.refillTokens();
      
      while (this.tokens > 0 && this.pendingRequests.length > 0) {
        const request = this.pendingRequests.shift();
        if (request) {
          this.tokens--;
          request.resolve();
        }
      }
      
      if (this.pendingRequests.length > 0) {
        this.processPendingRequests();
      }
    }, 100);
  }

  getStatus(): { tokens: number; maxTokens: number; pendingRequests: number } {
    this.refillTokens();
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      pendingRequests: this.pendingRequests.length
    };
  }
}