/**
 * db.ts — Prisma-based registry queries (migrated from SQLite)
 * All consultant data lives in ConsultantProfile on PostgreSQL.
 * Field names are mapped to the legacy SQLite interface for compatibility.
 */
import { prisma } from '@/lib/prisma';

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

function toConsultant(p: {
  licenseNumber: string;
  fullName: string;
  status: string;
  company?: string | null;
  rawEmail?: string | null;
  rawPhone?: string | null;
  province?: string | null;
  country?: string | null;
}): Consultant {
  return {
    License_Number: p.licenseNumber,
    Full_Name: p.fullName,
    Status: p.status,
    Company: p.company || '',
    Email: p.rawEmail || '',
    Phone: p.rawPhone || '',
    Province: p.province || '',
    Country: p.country || '',
    Scrape_Status: '',
  };
}

export async function searchConsultants(query: {
  search?: string;
  status?: string;
  province?: string;
  page?: number;
  limit?: number;
}) {
  const { search = '', status = '', province = '', page = 1, limit = 20 } = query;

  const where: any = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) where.status = { equals: status, mode: 'insensitive' };
  if (province) where.province = { equals: province, mode: 'insensitive' };

  try {
    const [total, results] = await Promise.all([
      prisma.consultantProfile.count({ where }),
      prisma.consultantProfile.findMany({
        where,
        select: {
          licenseNumber: true, fullName: true, status: true,
          company: true, rawEmail: true, rawPhone: true,
          province: true, country: true,
        },
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: results.map(toConsultant),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('searchConsultants error:', error);
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
}

export async function getUniqueProvinces(): Promise<string[]> {
  try {
    const results = await prisma.consultantProfile.findMany({
      where: { province: { not: null } },
      select: { province: true },
      distinct: ['province'],
      orderBy: { province: 'asc' },
    });
    return results.map(r => r.province).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function getConsultantByLicense(licenseNumber: string): Promise<Consultant | null> {
  try {
    const p = await prisma.consultantProfile.findUnique({
      where: { licenseNumber },
      select: {
        licenseNumber: true, fullName: true, status: true,
        company: true, rawEmail: true, rawPhone: true,
        province: true, country: true,
      },
    });
    return p ? toConsultant(p) : null;
  } catch (e) {
    console.error('getConsultantByLicense error:', e);
    return null;
  }
}

export async function getTotalConsultantsCount(): Promise<number> {
  try {
    return await prisma.consultantProfile.count();
  } catch {
    return 0;
  }
}

export async function getFeaturedConsultants(limit: number = 6): Promise<Consultant[]> {
  try {
    const results = await prisma.consultantProfile.findMany({
      where: { status: { contains: 'Active', mode: 'insensitive' } },
      select: {
        licenseNumber: true, fullName: true, status: true,
        company: true, rawEmail: true, rawPhone: true,
        province: true, country: true,
      },
      take: limit,
    });
    return results.map(toConsultant);
  } catch {
    return [];
  }
}

export async function getRelatedConsultants(
  province: string,
  excludeLicense: string,
  limit: number = 3
): Promise<Consultant[]> {
  try {
    const selectFields = {
      licenseNumber: true, fullName: true, status: true,
      company: true, rawEmail: true, rawPhone: true,
      province: true, country: true,
    };

    let results = await prisma.consultantProfile.findMany({
      where: {
        status: { contains: 'Active', mode: 'insensitive' },
        province,
        licenseNumber: { not: excludeLicense },
      },
      select: selectFields,
      take: limit,
    });

    if (results.length === 0) {
      results = await prisma.consultantProfile.findMany({
        where: {
          status: { contains: 'Active', mode: 'insensitive' },
          licenseNumber: { not: excludeLicense },
        },
        select: selectFields,
        take: limit,
      });
    }

    return results.map(toConsultant);
  } catch {
    return [];
  }
}

export async function getUniqueStatuses(): Promise<string[]> {
  try {
    const results = await prisma.consultantProfile.findMany({
      select: { status: true },
      distinct: ['status'],
      orderBy: { status: 'asc' },
    });
    return results.map(r => r.status).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getRegistryStats() {
  try {
    const [total, active, withEmail, withPhone] = await Promise.all([
      prisma.consultantProfile.count(),
      prisma.consultantProfile.count({ where: { status: { contains: 'Active', mode: 'insensitive' } } }),
      prisma.consultantProfile.count({ where: { rawEmail: { not: null } } }),
      prisma.consultantProfile.count({ where: { rawPhone: { not: null } } }),
    ]);
    return { total, active, withEmail, withPhone };
  } catch {
    return { total: 0, active: 0, withEmail: 0, withPhone: 0 };
  }
}
