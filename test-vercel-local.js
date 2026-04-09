require('dotenv').config({ path: '.env.vercel.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const posts = await prisma.blogPost.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { title: true, coverImage: true, createdAt: true, isPublished: true, content: true }
        });
        console.log(posts.map(p => ({ title: p.title, img: p.coverImage || 'MISSING', len: p.content?.length, created: p.createdAt })));
    } catch(e) { console.error(e) } finally { await prisma.$disconnect(); }
})();
