import Database from 'better-sqlite3';
import path from 'path';

// Resolve the absolute path to the SQLite database
// In dev, process.cwd() is the Next.js root. We go up one level to the crawler dir.
const DB_PATH = path.resolve(process.cwd(), '../cicc_scraper/cicc_data.db');

let db: Database.Database;

try {
  // Open strictly in readonly mode for safety
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
} catch (error) {
  console.error("Failed to connect to SQLite DB:", error);
  // Fallback to in-memory if DB doesn't exist just to prevent fatal crashes at build time
  db = new Database(':memory:');
}

export interface Consultant {
  License_Number: string;
  Full_Name: string;
  Status: string;
  Company: string;
  Email: string;
  Phone: string;
  Province: string;
  Country: string;
  Scrape_Status: string;
}

export function searchConsultants(query: {
  search?: string;
  status?: string;
  province?: string;
  page?: number;
  limit?: number;
}) {
  const { search = '', status = '', province = '', page = 1, limit = 20 } = query;
  
  let baseQuery = `SELECT * FROM consultants WHERE 1=1`;
  const params: any[] = [];

  if (search) {
    baseQuery += ` AND (Full_Name LIKE ? OR License_Number LIKE ? OR Company LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (status) {
    baseQuery += ` AND Status = ?`;
    params.push(status);
  }

  if (province) {
    baseQuery += ` AND Province = ?`;
    params.push(province);
  }

  try {
    // Count total rows matching criteria
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow ? totalRow.total : 0;
    
    // Fetch paginated data
    const offset = (page - 1) * limit;
    baseQuery += ` ORDER BY Full_Name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const results = db.prepare(baseQuery).all(...params) as Consultant[];

    return {
      data: results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("DB Query Error:", error);
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
}

export function getUniqueProvinces(): string[] {
  try {
    const rows = db.prepare(`SELECT DISTINCT Province FROM consultants WHERE Province IS NOT NULL AND Province != '' ORDER BY Province ASC`).all() as { Province: string }[];
    return rows.map(r => r.Province);
  } catch (e) {
    return [];
  }
}

export function getConsultantByLicense(licenseNumber: string): Consultant | null {
  try {
    const consultant = db.prepare(`SELECT * FROM consultants WHERE License_Number = ?`).get(licenseNumber) as Consultant;
    return consultant || null;
  } catch (e) {
    console.error("DB Query Error (getConsultantByLicense):", e);
    return null;
  }
}

export function getTotalConsultantsCount(): number {
  try {
    const row = db.prepare(`SELECT COUNT(*) as total FROM consultants`).get() as { total: number };
    return row ? row.total : 0;
  } catch (e) {
    return 0;
  }
}

export function getFeaturedConsultants(limit: number = 6): Consultant[] {
  try {
    // Select Active consultants randomly for now, or based on a specific criteria if needed.
    const rows = db.prepare(`
      SELECT * FROM consultants 
      WHERE Status LIKE '%Active%' 
      ORDER BY RANDOM() 
      LIMIT ?
    `).all(limit) as Consultant[];
    return rows;
  } catch (e) {
    console.error("DB Query Error (getFeaturedConsultants):", e);
    return [];
  }
}

export function getUniqueStatuses(): string[] {
  try {
    const rows = db.prepare(`SELECT DISTINCT Status FROM consultants WHERE Status IS NOT NULL AND Status != '' ORDER BY Status ASC`).all() as { Status: string }[];
    return rows.map(r => r.Status);
  } catch (e) {
    return [];
  }
}

export function getRegistryStats() {
  try {
    const totalRow = db.prepare(`SELECT COUNT(*) as c FROM consultants`).get() as { c: number };
    const activeRow = db.prepare(`SELECT COUNT(*) as c FROM consultants WHERE Status='Active'`).get() as { c: number };
    const emailRow = db.prepare(`SELECT COUNT(*) as c FROM consultants WHERE Email IS NOT NULL AND Email != '' AND Email != 'N/A'`).get() as { c: number };
    const phoneRow = db.prepare(`SELECT COUNT(*) as c FROM consultants WHERE Phone IS NOT NULL AND Phone != '' AND Phone != 'N/A'`).get() as { c: number };

    return {
      total: totalRow?.c || 0,
      active: activeRow?.c || 0,
      withEmail: emailRow?.c || 0,
      withPhone: phoneRow?.c || 0
    };
  } catch (e) {
    console.error("Error fetching registry stats:", e);
    return { total: 0, active: 0, withEmail: 0, withPhone: 0 };
  }
}
