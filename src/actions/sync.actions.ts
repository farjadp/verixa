"use server";
// ============================================================================
// sync.actions.ts
// Version: 1.0.0 — 2026-03-25
// Why: Registry Sync — reads CICC scraper SQLite DB and upserts ConsultantProfile
//      records into the Verixa Prisma DB. Admin-only action.
// Rule: CICC DB is read-only (readonly link). Verixa Prisma DB is write target.
// ============================================================================

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { guessDemographics } from "@/lib/demographics";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncResult {
  total: number;
  imported: number;   // new profiles created
  updated: number;    // existing profiles updated
  skipped: number;    // already up-to-date
  errors: number;
  errorDetails: string[];
  durationMs: number;
}

export interface DemographicsBreakdown {
  language: string;
  region: string;
  count: number;
}

export interface TopCountry {
  name: string;
  count: number;
}

export interface SyncPreview {
  registryTotal: number;
  registryActive: number;
  registryDone: number;   // Scrape_Status = 'Done'
  registryPending: number;
  verixaTotal: number;
  newCount: number;       // in scraper but not in verixa
  updateCount: number;    // in both but data differs
  demographics: DemographicsBreakdown[];
  topCountries: TopCountry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function openScraperDb() {
  let dbPath = "/tmp/cicc_data.db";
  if (!fs.existsSync(dbPath)) {
    dbPath = path.resolve(process.cwd(), "../cicc_scraper/cicc_data.db");
  }
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

function makeSlug(fullName: string, licenseNumber: string): string {
  return (
    fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
    "-" +
    licenseNumber.toLowerCase()
  );
}

// ─── Preview (dry run stats before syncing) ──────────────────────────────────

export async function getRegistrySyncPreview(): Promise<SyncPreview> {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  let scraperDb: Database.Database | null = null;
  try {
    scraperDb = openScraperDb();

    const registryTotal = (scraperDb.prepare("SELECT COUNT(*) as c FROM consultants").get() as any).c;
    const registryActive = (scraperDb.prepare("SELECT COUNT(*) as c FROM consultants WHERE Status='Active'").get() as any).c;
    const registryDone   = (scraperDb.prepare("SELECT COUNT(*) as c FROM consultants WHERE Scrape_Status='Done'").get() as any).c;
    const registryPending = (scraperDb.prepare("SELECT COUNT(*) as c FROM consultants WHERE Scrape_Status='Pending'").get() as any).c;

    const verixaTotal = await prisma.consultantProfile.count();

    // Which license numbers are NOT yet in Verixa?
    const verixaLicenses = (
      await prisma.consultantProfile.findMany({ select: { licenseNumber: true } })
    ).map((p) => p.licenseNumber);

    const allScraperDone = scraperDb
      .prepare(
        "SELECT License_Number, Full_Name, Status, Company, Province, Country FROM consultants WHERE Scrape_Status='Done'"
      )
      .all() as any[];

    const verixaSet = new Set(verixaLicenses);
    const newCount = allScraperDone.filter((r) => !verixaSet.has(r.License_Number)).length;
    const updateCount = allScraperDone.filter((r) => verixaSet.has(r.License_Number)).length;

    const demoMap = new Map<string, DemographicsBreakdown>();
    const countryMap = new Map<string, number>();
    
    for (const r of allScraperDone) {
      const name = r.Full_Name || "";
      const { region, language } = guessDemographics(name);
      const key = `${region}|${language}`;
      if (!demoMap.has(key)) {
        demoMap.set(key, { region, language, count: 0 });
      }
      demoMap.get(key)!.count++;
      
      const cRaw = r.Country?.trim();
      const country = cRaw ? (cRaw.toUpperCase() === "CAN" ? "Canada" : cRaw) : "Canada";
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    }
    const demographics = Array.from(demoMap.values()).sort((a, b) => b.count - a.count);
    
    const topCountries = Array.from(countryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { registryTotal, registryActive, registryDone, registryPending, verixaTotal, newCount, updateCount, demographics, topCountries };
  } finally {
    scraperDb?.close();
  }
}

// ─── Full Sync ───────────────────────────────────────────────────────────────

export async function runRegistrySync(options: {
  onlyNew?: boolean;      // if true, skip existing profiles (faster)
  activeOnly?: boolean;   // if true, only import Active consultants
  limit?: number;         // cap how many to process (for testing)
}): Promise<SyncResult> {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  const { onlyNew = false, activeOnly = false, limit } = options;
  const start = Date.now();

  const result: SyncResult = {
    total: 0, imported: 0, updated: 0, skipped: 0, errors: 0,
    errorDetails: [], durationMs: 0,
  };

  let scraperDb: Database.Database | null = null;
  try {
    scraperDb = openScraperDb();

    let query = "SELECT * FROM consultants WHERE Scrape_Status='Done'";
    if (activeOnly) query += " AND Status='Active'";
    if (limit)      query += ` LIMIT ${limit}`;

    const records = scraperDb.prepare(query).all() as any[];
    result.total = records.length;

    // Fetch existing Verixa license numbers for fast lookup
    const existing = await prisma.consultantProfile.findMany({
      select: { licenseNumber: true, fullName: true, status: true, company: true, province: true },
    });
    const existingMap = new Map(existing.map((e) => [e.licenseNumber, e]));

    const toCreate: any[] = [];
    const toUpdate: { licenseNumber: string; data: any }[] = [];

    for (const rec of records) {
      const license = rec.License_Number?.trim();
      if (!license) { result.skipped++; continue; }

      const exists = existingMap.get(license);

      if (exists && onlyNew) {
        result.skipped++;
        continue;
      }

      const data = {
        fullName:      rec.Full_Name?.trim() || "Unknown",
        slug:          makeSlug(rec.Full_Name?.trim() || license, license),
        status:        rec.Status?.trim() || "Unknown",
        company:       rec.Company?.trim() || null,
        province:      rec.Province?.trim() || null,
        country:       rec.Country?.trim() || null,
        licenseNumber: license,
      };

      if (exists) {
        const changed =
          exists.fullName !== data.fullName ||
          exists.status   !== data.status   ||
          (exists.company  ?? null) !== data.company  ||
          (exists.province ?? null) !== data.province;

        if (!changed) {
          result.skipped++;
          continue;
        }

        toUpdate.push({ licenseNumber: license, data });
      } else {
        toCreate.push(data);
      }
    }

    // 1. Bulk Create (Extremely Fast, up to 10k per second)
    const CREATE_CHUNK = 2000;
    for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
      const chunk = toCreate.slice(i, i + CREATE_CHUNK);
      try {
        const res = await prisma.consultantProfile.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        result.imported += res.count;
      } catch (err: any) {
        result.errors++;
        result.errorDetails.push(`Bulk create error (chunk ${i}): ${err.message}`);
      }
    }

    // 2. Batched Updates (Concurrent execution to stay within 60s timeout)
    const UPDATE_CHUNK = 50;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
      const chunk = toUpdate.slice(i, i + UPDATE_CHUNK);
      try {
        await Promise.all(
          chunk.map((item) =>
            prisma.consultantProfile.update({
              where: { licenseNumber: item.licenseNumber },
              data: item.data,
            })
          )
        );
        result.updated += chunk.length;
      } catch (err: any) {
        result.errors++;
        result.errorDetails.push(`Bulk update error (chunk ${i}): ${err.message}`);
      }
    }
  } finally {
    scraperDb?.close();
  }

  result.durationMs = Date.now() - start;
  revalidatePath("/dashboard/admin/sync");
  revalidatePath("/dashboard/admin/consultants");
  return result;
}

// ─── Sync Log (last result persisted as PlatformSetting) ─────────────────────

export async function getLastSyncLog() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

  const setting = await prisma.platformSetting.findUnique({ where: { key: "lastSyncResult" } });
  if (!setting) return null;
  try {
    return JSON.parse(setting.value) as SyncResult & { syncedAt: string };
  } catch {
    return null;
  }
}

export async function saveLastSyncLog(result: SyncResult) {
  await prisma.platformSetting.upsert({
    where: { key: "lastSyncResult" },
    update: { value: JSON.stringify({ ...result, syncedAt: new Date().toISOString() }) },
    create: { key: "lastSyncResult", value: JSON.stringify({ ...result, syncedAt: new Date().toISOString() }) },
  });
}

// ─── File Upload ─────────────────────────────────────────────────────────────

export async function uploadDatabaseFile(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");

    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    fs.writeFileSync("/tmp/cicc_data.db", buffer);

    // Test connection
    const db = new Database("/tmp/cicc_data.db", { readonly: true, fileMustExist: true });
    db.close();

    return { success: true, message: "Database uploaded successfully" };
  } catch (error: any) {
    console.error("Upload error:", error);
    return { success: false, message: error.message };
  }
}
