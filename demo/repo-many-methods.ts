/** Demo: Repository with many small methods — consider splitting or grouping */
export class UserRepo {
  async findById(id: string) {
    return { id };
  }
  async findByEmail(email: string) {
    return { email };
  }
  async findByName(name: string) {
    return { name };
  }
  async findAll() {
    return [];
  }
  async create(data: unknown) {
    return data;
  }
  async update(id: string, data: unknown) {
    return { id, ...data };
  }
  async delete(id: string) {
    return { id };
  }
  async count() {
    return 0;
  }
  async exists(id: string) {
    return false;
  }
  async search(query: string) {
    return [];
  }
  async findActive() {
    return [];
  }
  async findInactive() {
    return [];
  }
}
