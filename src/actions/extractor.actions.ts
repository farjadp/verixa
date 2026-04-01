"use server";

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const DB_PATH = path.join(process.cwd(), 'prisma', 'cicc_data.db');

const FREE_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
  'icloud.com', 'aol.com', 'live.com', 'msn.com', 
  'ymail.com', 'googlemail.com', 'protonmail.com', 'mail.com'
]);

// Basic admin verifier
const verifyAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
};

export interface ExtractedContact {
  id: string; // License_Number
  name: string;
  email: string;
  phone: string;
  company: string;
  isCorporate: boolean;
}

export async function extractAllContacts(): Promise<{ data: ExtractedContact[]; total: number; corporateCount: number; publicCount: number }> {
  await verifyAdmin();

  if (!fs.existsSync(DB_PATH)) {
    throw new Error("Local dataset CICC DB not found. Ensure crawler execution first.");
  }

  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  
  try {
    const rawData = db.prepare(`
      SELECT License_Number, Full_Name, Email, Phone, Company 
      FROM consultants 
      WHERE Email IS NOT NULL AND Email != ''
    `).all() as { License_Number: string; Full_Name: string; Email: string; Phone: string; Company: string }[];

    let corporateCount = 0;
    let publicCount = 0;

    const data: ExtractedContact[] = rawData.map(row => {
      const emailObj = row.Email.toLowerCase().trim();
      
      // Attempt to slice domain
      let domain = "";
      if (emailObj.includes("@")) {
        domain = emailObj.split("@")[1];
      }

      const isCorporate = domain ? !FREE_DOMAINS.has(domain) : false;

      if (isCorporate) corporateCount++;
      else publicCount++;

      return {
        id: row.License_Number,
        name: row.Full_Name,
        email: emailObj,
        phone: row.Phone || "",
        company: row.Company || "",
        isCorporate
      };
    });

    return { 
      data, 
      total: data.length, 
      corporateCount, 
      publicCount 
    };

  } catch (error) {
    console.error("Extraction failed:", error);
    throw new Error("Failed to extract data from the database.");
  } finally {
    db.close();
  }
}
