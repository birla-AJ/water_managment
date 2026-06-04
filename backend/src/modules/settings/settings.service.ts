import { prisma } from '../../config/prisma';

class SettingsService {
  async getAll() {
    const settings = await prisma.setting.findMany();
    return settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }

  async get(key: string) {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? null;
  }

  async upsert(key: string, value: object) {
    const s = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return s.value;
  }
}

export const settingsService = new SettingsService();
