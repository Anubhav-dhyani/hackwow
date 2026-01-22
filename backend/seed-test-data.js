/**
 * Seed Test Data Script
 * 
 * Creates test seats for local development
 * Run with: node seed-test-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models (simplified for seeding)
const seatSchema = new mongoose.Schema({
  appId: String,
  domain: String,
  entityId: String,
  seatNumber: String,
  row: String,
  section: String,
  status: String,
  price: Number,
  metadata: Object
});

const Seat = mongoose.model('Seat', seatSchema, 'seats');

const testSeats = [
  // VIP Section - Row A
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "A1",
    row: "A",
    section: "VIP",
    status: "AVAILABLE",
    price: 150,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Premium seating", "Complimentary drinks", "Meet & Greet"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "A2",
    row: "A",
    section: "VIP",
    status: "AVAILABLE",
    price: 150,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Premium seating", "Complimentary drinks", "Meet & Greet"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "A3",
    row: "A",
    section: "VIP",
    status: "AVAILABLE",
    price: 150,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Premium seating", "Complimentary drinks", "Meet & Greet"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "A4",
    row: "A",
    section: "VIP",
    status: "AVAILABLE",
    price: 150,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Premium seating", "Complimentary drinks", "Meet & Greet"]
    }
  },

  // General Section - Row B
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "B1",
    row: "B",
    section: "GENERAL",
    status: "AVAILABLE",
    price: 75,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Standard seating", "Good view"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "B2",
    row: "B",
    section: "GENERAL",
    status: "AVAILABLE",
    price: 75,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Standard seating", "Good view"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "B3",
    row: "B",
    section: "GENERAL",
    status: "AVAILABLE",
    price: 75,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Standard seating", "Good view"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "B4",
    row: "B",
    section: "GENERAL",
    status: "AVAILABLE",
    price: 75,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Standard seating", "Good view"]
    }
  },

  // Economy Section - Row C
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "C1",
    row: "C",
    section: "ECONOMY",
    status: "AVAILABLE",
    price: 40,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Economy seating", "Far view"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "C2",
    row: "C",
    section: "ECONOMY",
    status: "AVAILABLE",
    price: 40,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Economy seating", "Far view"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "C3",
    row: "C",
    section: "ECONOMY",
    status: "AVAILABLE",
    price: 40,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Economy seating", "Far view"]
    }
  },
  {
    appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
    domain: "EVENT",
    entityId: "concert-2026",
    seatNumber: "C4",
    row: "C",
    section: "ECONOMY",
    status: "AVAILABLE",
    price: 40,
    metadata: {
      venue: "Madison Square Garden",
      event: "Rock Concert 2026",
      date: "2026-06-15",
      features: ["Economy seating", "Far view"]
    }
  }
];

async function seedData() {
  try {
    console.log('🌱 Starting seed process...\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Clear existing seats for this event (optional - comment out to keep existing)
    console.log('🗑️  Clearing existing test seats...');
    const deleted = await Seat.deleteMany({ 
      appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
      entityId: "concert-2026" 
    });
    console.log(`   Deleted ${deleted.deletedCount} existing seats\n`);

    // Insert test seats
    console.log('✨ Creating test seats...');
    const result = await Seat.insertMany(testSeats);
    console.log(`✅ Created ${result.length} test seats\n`);

    // Display summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SEED SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Event: concert-2026`);
    console.log(`Venue: Madison Square Garden`);
    console.log(`Date: 2026-06-15`);
    console.log(`\nSeats Created:`);
    console.log(`  VIP Section (Row A):     4 seats @ $150`);
    console.log(`  General Section (Row B): 4 seats @ $75`);
    console.log(`  Economy Section (Row C): 4 seats @ $40`);
    console.log(`  Total:                   12 seats`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Test query
    console.log('\n🔍 Testing seat query...');
    const seats = await Seat.find({ 
      appId: "APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac",
      entityId: "concert-2026",
      status: "AVAILABLE"
    });
    console.log(`✅ Found ${seats.length} available seats\n`);

    // Show sample API request
    console.log('📝 Test API Request:');
    console.log('   GET http://localhost:5000/seats?entityId=concert-2026');
    console.log('   Headers:');
    console.log('     x-app-id: APP-1df5ce93-1ca8-4e19-986f-6cd9c01465ac');
    console.log('     x-api-key: sk_live_0cebdf6452f3d5693a683eadf55f6f092717cac3d34482c2e56106 9fb2784af0');
    console.log('     Authorization: Bearer <your-jwt-token>\n');

    console.log('🎉 Seed completed successfully!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run seed
seedData();
