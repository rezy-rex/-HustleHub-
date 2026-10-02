import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { userRepository } from '../modules/auth/user.repository';
import { gigRepository } from '../modules/gigs/gig.repository';
import { logger } from '../utils/logger';

async function seed() {
  await connectDB();

  console.log(`\n========================================`);
  console.log(`Connected to database: ${mongoose.connection.db?.databaseName}`);
  console.log(`========================================\n`);

  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const testUsers = [
    { name: 'Thuso', email: 'thuso@hustlehub.com', role: 'admin' as const },
    { name: 'Sixolile', email: 'sixolile@hustlehub.com', role: 'freelancer' as const },
    { name: 'Odirile', email: 'odirile@hustlehub.com', role: 'client' as const },
    { name: 'Lesedi', email: 'lesedi@hustlehub.com', role: 'freelancer' as const },
  ];

  const createdUsers: Record<string, string> = {};

  for (const u of testUsers) {
    let existing = await userRepository.findByEmail(u.email);
    if (!existing) {
      const created = await userRepository.create({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      });
      createdUsers[u.name] = created.id;
      console.log(`✓ Created user: ${u.name} (${u.email}) [${u.role}]`);
    } else {
      // Ensure name is up to date in DB
      await mongoose.connection.collection('users').updateOne(
        { email: u.email },
        { $set: { name: u.name, passwordHash } }
      );
      createdUsers[u.name] = existing.id;
      console.log(`ℹ User updated: ${u.name} (${u.email}) [${existing.role}]`);
    }
  }

  // Clear existing gigs to refresh with rich categories, images, and freelancer associations
  await mongoose.connection.collection('gigs').deleteMany({});
  console.log(`✓ Refreshed gigs collection`);

  const diverseGigs = [
    // --- Graphic Design ---
    {
      freelancerKey: 'Lesedi',
      category: 'Graphic Design',
      title: 'Modern Brand Identity & Vector Logo Design',
      description: 'Comprehensive brand styling including 3 logo concepts, vector SVG/EPS assets, brand color palette, typography guidelines, and social media icons.',
      price: 2500,
      coverImage: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
    },
    {
      freelancerKey: 'Lesedi',
      category: 'Graphic Design',
      title: 'Social Media Marketing Graphics & Carousel Packs',
      description: 'Engaging, custom-branded Canva and Photoshop templates for Instagram, LinkedIn, and Facebook. Includes 15 feed posts, 5 story sets, and banner graphics.',
      price: 1200,
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    },

    // --- Copywriting ---
    {
      freelancerKey: 'Sixolile',
      category: 'Copywriting',
      title: 'High-Converting Sales Copy & Website Content',
      description: 'Persuasive, SEO-optimized copy for your landing page, about us, and product service sections. Written to hook audience attention and drive conversion rates.',
      price: 1800,
      coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
    },
    {
      freelancerKey: 'Sixolile',
      category: 'Copywriting',
      title: 'SEO Blog Article Writing & Content Strategy',
      description: 'Three in-depth, research-backed 1,200-word articles optimized for search engines with keyword mapping, meta descriptions, and engaging editorial tone.',
      price: 950,
      coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    },

    // --- Accounting ---
    {
      freelancerKey: 'Lesedi',
      category: 'Accounting',
      title: 'Monthly Bookkeeping & Financial Statement Preparation',
      description: 'End-to-end small business bookkeeping using Xero or QuickBooks. Includes monthly bank reconciliations, profit & loss, balance sheets, and cash flow reports.',
      price: 3200,
      coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    },
    {
      freelancerKey: 'Sixolile',
      category: 'Accounting',
      title: 'SARS Tax Return Filing & Compliance Advisory',
      description: 'Complete personal and provisional business tax returns filed with SARS. Includes allowable expense deduction optimization and tax clearance certificate guidance.',
      price: 2200,
      coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    },

    // --- Software Development ---
    {
      freelancerKey: 'Sixolile',
      category: 'Software Development',
      title: 'Custom Full-Stack Web Application (React & Node.js)',
      description: 'Production-ready web application built with React, TypeScript, Node.js Express, and MongoDB. Includes secure JWT auth, responsive layout, and RESTful API endpoints.',
      price: 5500,
      coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    },
    {
      freelancerKey: 'Lesedi',
      category: 'Software Development',
      title: 'Mobile-First E-Commerce Online Store Setup',
      description: 'Turnkey online store with PayFast / Ozow payment gateway, automated checkout, order notifications, and product inventory management.',
      price: 4000,
      coverImage: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
    },
  ];

  for (const gigData of diverseGigs) {
    const freelancerId = createdUsers[gigData.freelancerKey];
    if (freelancerId) {
      await gigRepository.create({
        freelancerId,
        freelancerName: gigData.freelancerKey,
        category: gigData.category,
        title: gigData.title,
        description: gigData.description,
        price: gigData.price,
        coverImage: gigData.coverImage,
      });
      console.log(`✓ Added gig: "${gigData.title}" [${gigData.category}] by ${gigData.freelancerKey} (R ${gigData.price})`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Seeding complete! Test accounts ready:`);
  console.log(`----------------------------------------`);
  testUsers.forEach((u) => {
    console.log(`Name: ${u.name.padEnd(10)} | Email: ${u.email.padEnd(24)} | Role: ${u.role.padEnd(10)} | Password: ${password}`);
  });
  console.log(`========================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seeding failed', err);
  process.exit(1);
});
