const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config();

(async () => {
    try {
        const posts = await prisma.blogPost.findMany({ 
            orderBy: { createdAt: 'desc' }, 
            take: 5, 
            select: { title: true, coverImage: true, createdAt: true, isPublished: true, content: true } 
        });
        posts.forEach(p => {
            console.log("-------------------");
            console.log("Title:", p.title);
            console.log("Image:", p.coverImage || "❌ MISSING");
            console.log("Content len:", p.content?.length);
        });
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
})();
