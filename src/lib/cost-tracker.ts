// Global cost tracking for Valyu API calls during analysis
class CostTracker {
  private costs: Map<string, number> = new Map();
  private currentSession: string | null = null;
  
  startSession(sessionId: string) {
    this.costs.set(sessionId, 0);
    this.currentSession = sessionId;
  }
  
  setCurrentSession(sessionId: string | null) {
    this.currentSession = sessionId;
  }
  
  getCurrentSession(): string | null {
    return this.currentSession;
  }
  
  addCost(sessionId: string, cost: number) {
    const current = this.costs.get(sessionId) || 0;
    this.costs.set(sessionId, current + cost);
    console.log(`[CostTracker] Session ${sessionId}: Added $${cost}, Total: $${current + cost}`);
  }
  
  addCostToCurrentSession(cost: number) {
    if (this.currentSession) {
      this.addCost(this.currentSession, cost);
    }
  }
  
  getTotalCost(sessionId: string): number {
    return this.costs.get(sessionId) || 0;
  }
  
  clearSession(sessionId: string) {
    if (this.currentSession === sessionId) {
      this.currentSession = null;
    }
    this.costs.delete(sessionId);
  }
}

export const costTracker = new CostTracker();