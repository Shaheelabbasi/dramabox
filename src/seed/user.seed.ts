import { randomBytes, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

const scrypt = promisify(scryptCallback);

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
};

export const seedUser = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);

  const adminEmail = 'admin@dramabox.local';
  const adminPassword = 'Admin@$3421';

  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.email}`);
    return existingAdmin;
  }

  const adminUser = userRepo.create({
    email: adminEmail,
    password: await hashPassword(adminPassword),
    role: 'admin',
    deviceId: null,
  });

  const savedAdmin = await userRepo.save(adminUser);
  console.log(`Seeded admin user: ${savedAdmin.email}`);

  return savedAdmin;
};
