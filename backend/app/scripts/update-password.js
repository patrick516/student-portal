// app/scripts/update-password.js
require("dotenv").config();
const bcrypt = require("bcrypt");
const { prisma } = require("../config/prisma");

// Usage: node update-password.js EMAIL NEWPASSWORD
async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error(
      "❌ Usage: node app/scripts/update-password.js <email> <newPassword>"
    );
    process.exit(1);
  }

  try {
    console.log(`🔄 Updating password for ${email} ...`);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    console.log(`✅ Password updated successfully for: ${user.email}`);
  } catch (err) {
    if (err.code === "P2025") {
      console.error("❌ No user found with that email.");
    } else {
      console.error("❌ Error updating password:", err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
