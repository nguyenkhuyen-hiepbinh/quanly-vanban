import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";

const DEFAULT_ORG_NAME = "Đơn vị / Trường học";

export async function getOrgName(): Promise<string> {
  const db = getDb();
  const row = await db.select().from(settings).where(eq(settings.key, "orgName")).get();
  return row?.value || DEFAULT_ORG_NAME;
}

export async function setOrgName(value: string): Promise<void> {
  const db = getDb();
  const existing = await db.select().from(settings).where(eq(settings.key, "orgName")).get();
  if (existing) {
    await db.update(settings).set({ value }).where(eq(settings.key, "orgName")).run();
  } else {
    await db.insert(settings).values({ key: "orgName", value }).run();
  }
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const db = getDb();
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDb();
  const existing = await db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    await db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    await db.insert(settings).values({ key, value }).run();
  }
}
