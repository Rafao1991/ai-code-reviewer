/**
 * Demo fixture: sequential awaits, long function, inline retry logic.
 * Use: code-reviewer analyze demo/order-service.ts
 */
export class OrderService {
  async processOrder(orderId: string) {
    const order = await this.fetchOrder(orderId);
    const user = await this.fetchUser(order.userId);
    const inventory = await this.checkInventory(order.items);
    // ... 80 more lines of business logic would go here ...
    let retries = 3;
    while (retries > 0) {
      try {
        await this.saveToDatabase(order);
        break;
      } catch (error) {
        retries--;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  private async fetchOrder(id: string) {
    return { id, userId: 'u1', items: [] };
  }

  private async fetchUser(id: string) {
    return { id, name: 'User' };
  }

  private async checkInventory(items: unknown[]) {
    return items;
  }

  private async saveToDatabase(order: unknown) {
    return order;
  }
}
